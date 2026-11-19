import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';

export type SpaceUpdatedPayload = {
  spaceId: string;
  available: boolean;
};

export type ReservationConflictPayload = {
  spaceId: string;
  reservationId?: string;
  reason: string;
};

/**
 * IMPORTANT (CDC §6.4 technique) : la disponibilité coworking est diffusée sur le
 * MÊME namespace WebSocket que le tracking de commande :
 *   ws://api.thehubghazela.tn/tracking?token=<access_token>
 *
 * Si un TrackingGateway existe déjà (pour order:status_updated, order:ready...),
 * fusionne les handlers ci-dessous dedans plutôt que de dupliquer la connexion —
 * un seul socket par client doit suffire pour tout écouter (order:* et coworking:*).
 *
 * Auth : le token est vérifié à la connexion. Si tu as déjà un guard WS pour le
 * tracking de commande, applique-le aussi ici (ou fusionne les gateways comme dit
 * ci-dessus, ce qui règle la question automatiquement).
 */
@WebSocketGateway({
  namespace: '/tracking',
  cors: { origin: '*' }, // à restreindre à tes domaines en prod
})
export class CoworkingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(CoworkingGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    this.logger.debug(`Client connecté : ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client déconnecté : ${client.id}`);
  }

  /**
   * Le client s'abonne à un espace précis (écran liste espaces ou détail espace)
   * pour ne recevoir que les mises à jour qui le concernent.
   */
  @SubscribeMessage('coworking:subscribe_space')
  handleSubscribeSpace(@ConnectedSocket() client: Socket, @MessageBody() data: { spaceId: string }) {
    client.join(this.spaceRoom(data.spaceId));
  }

  @SubscribeMessage('coworking:unsubscribe_space')
  handleUnsubscribeSpace(@ConnectedSocket() client: Socket, @MessageBody() data: { spaceId: string }) {
    client.leave(this.spaceRoom(data.spaceId));
  }

  /**
   * Écran admin (dashboard / calendrier réservations) : s'abonne pour recevoir
   * les conflits de réservation en temps réel (§3.5 technique admin).
   */
  @SubscribeMessage('admin:subscribe_reservations')
  handleSubscribeAdmin(@ConnectedSocket() client: Socket) {
    client.join('admin:reservations');
  }

  @SubscribeMessage('admin:unsubscribe_reservations')
  handleUnsubscribeAdmin(@ConnectedSocket() client: Socket) {
    client.leave('admin:reservations');
  }

  /**
   * Écoute l'événement métier interne émis par CoworkingService (via EventEmitter2)
   * et le diffuse aux clients abonnés à cet espace, au format exact attendu par le
   * CDC : { spaceId, available }.
   */
  @OnEvent('coworking.space_updated')
  handleSpaceUpdated(payload: SpaceUpdatedPayload) {
    this.server.to(this.spaceRoom(payload.spaceId)).emit('coworking:space_updated', payload);
  }

  /**
   * Namespace admin (§3.5 technique) : reservation:conflict, déclenché sur race
   * condition (créneau/blocage pris entre la lecture et l'écriture en transaction).
   */
  @OnEvent('coworking.reservation_conflict')
  handleReservationConflict(payload: ReservationConflictPayload) {
    this.server.to('admin:reservations').emit('reservation:conflict', payload);
  }

  private spaceRoom(spaceId: string): string {
    return `space:${spaceId}`;
  }
}