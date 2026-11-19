import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../common/redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
@WebSocketGateway({ namespace: '/tracking', cors: { origin: '*' } })
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(TrackingGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  // S'abonne une seule fois au démarrage à TOUS les canaux de statut de commande
  async onModuleInit() {
    const subscriber = this.redis.getSubscriberClient();
    await subscriber.psubscribe('order:*:status');

   subscriber.on('pmessage', (_pattern, channel, message) => {
  // channel = "order:{orderId}:status"
  const orderId = channel.split(':')[1];
  const payload = JSON.parse(message);

  // Événement générique — toujours émis, pour tout changement de statut
  this.server.to(`order:${orderId}`).emit('order:status_updated', payload);

  // Événements sémantiques additionnels pour les transitions clés (CDC §6.4)
  if (payload.status === 'PRETE') {
    this.server.to(`order:${orderId}`).emit('order:ready', payload);
  } else if (payload.status === 'ANNULEE') {
    this.server.to(`order:${orderId}`).emit('order:cancelled', payload);
  }

  this.logger.log(`Statut relayé pour la commande ${orderId} (${payload.status})`);
});
  }

  async handleConnection(client: Socket) {
  // Accepte le token via handshake.auth.token (clients Socket.IO natifs) OU
  // via le query param ?token= (conforme au CDC §6.4 : ws://.../tracking?token=<access_token>)
  const tokenFromAuth = client.handshake.auth?.token as string | undefined;
  const tokenFromQuery = client.handshake.query?.token as string | undefined;
  const token = tokenFromAuth ?? tokenFromQuery;

  if (!token) {
    client.disconnect();
    return;
  }
  try {
    const payload = await this.jwt.verifyAsync(token, { secret: process.env.JWT_SECRET });
    client.data.userId = payload.sub;
  } catch {
    client.disconnect();
  }
}

  handleDisconnect(client: Socket) {
    this.logger.log(`Client déconnecté : ${client.id}`);
  }

  // Le client émet cet événement après connexion pour suivre UNE commande précise
  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    // Vérifie que la commande appartient bien à cet utilisateur avant de le laisser écouter
    const order = await this.prisma.order.findFirst({
      where: { id: data.orderId, userId: client.data.userId },
    });
    if (!order) {
      client.emit('error', { message: 'Commande introuvable ou accès refusé' });
      return;
    }
    client.join(`order:${data.orderId}`);
    client.emit('subscribed', { orderId: data.orderId, statut: order.statut });
  }
}