import { OnEvent } from '@nestjs/event-emitter';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

// ⚠️ IMPORTANT : si un gateway existe déjà sur le namespace '/admin' (pour
// kpi:updated, sav:new_ticket, reservation:conflict...), Socket.IO n'autorise
// PAS deux @WebSocketGateway sur le même namespace. Dans ce cas, déplacez les
// deux méthodes @OnEvent ci-dessous dans ce gateway existant plutôt que de
// garder ce fichier séparé.
@WebSocketGateway({ namespace: '/admin', cors: { origin: '*' } })
export class StockRealtimeGateway {
  @WebSocketServer()
  server!: Server;

  // §7.4 CDC technique : { itemId, level, threshold }
  @OnEvent('stock.alert')
  handleStockAlert(payload: {
    itemId: string;
    level: string;
    threshold: number;
  }) {
    this.server.emit('stock:alert', {
      itemId: payload.itemId,
      level: payload.level,
      threshold: payload.threshold,
    });
  }

  // Bloc 1 page d'accueil (§5.1) — statut agrégé toutes enseignes confondues
  @OnEvent('stock.global_status_changed')
  handleGlobalStatusChanged(payload: { status: string; criticalCount: number; warningCount: number }) {
    this.server.emit('kpi:updated', {
      block: 'stock',
      value: payload.status,
      delta: { criticalCount: payload.criticalCount, warningCount: payload.warningCount },
    });
  }
}