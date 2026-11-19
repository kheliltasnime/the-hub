import { Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/app.exception';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WalletGatewayService } from '../wallet-gateway/wallet-gateway.service';
import { RedisService } from '../common/redis/redis.service';
import { JwtService } from '@nestjs/jwt';
import { CreateWalkInOrderDto } from './dto/create-walkin-order.dto';
@Injectable()
export class OrderService {
   constructor(
     private readonly prisma: PrismaService,
     private readonly eventEmitter: EventEmitter2,
     private readonly walletGateway: WalletGatewayService,
     private readonly redis: RedisService,
      private readonly jwt: JwtService,
   ) {}

   async getEnseignes() {
     return this.prisma.enseigne.findMany({
       where: { actif: true },
       select: { id: true, nom: true, rushMode: true },
     });
   }

   async getMenu(enseigneId: string) {
     const enseigne = await this.prisma.enseigne.findUnique({ where: { id: enseigneId } });
     if (!enseigne) throw new NotFoundException('Enseigne introuvable');

     const items = await this.prisma.menuItem.findMany({
       where: { enseigneId, disponible: true },
       orderBy: { categorieId: 'asc' },
     });

     const categories = items.reduce<Record<string, typeof items>>((acc, item) => {
       (acc[item.categorieId] ??= []).push(item);
       return acc;
     }, {});

     return {
       enseigne: { id: enseigne.id, nom: enseigne.nom, rushMode: enseigne.rushMode },
       categories,
     };
   }

   async searchMenu(enseigneId: string, query?: string) {
     if (!query) return [];
     return this.prisma.menuItem.findMany({
       where: { enseigneId, disponible: true, nom: { contains: query, mode: 'insensitive' } },
     });
   }

   // ---------- UC4 — Gérer le panier (Order avec statut PANIER) ----------

   private async findActiveCart(userId: string) {
     return this.prisma.order.findFirst({
       where: { userId, statut: 'PANIER' },
       include: { items: { include: { menuItem: true } } },
     });
   }

   private formatCart(order: any | null) {
     if (!order) return { enseigneId: null, items: [], total: 0 };
     const items = order.items.map((i: any) => ({
       menuItemId: i.menuItemId,
       nom: i.menuItem.nom,
       quantite: i.quantite,
       prixUnitaire: Number(i.prixUnitaire),
     }));
     const total = items.reduce((sum: number, i: any) => sum + i.prixUnitaire * i.quantite, 0);
     return { enseigneId: order.enseigneId, items, total };
   }

   private async recalculateTotal(orderId: string) {
     const items = await this.prisma.orderItem.findMany({ where: { orderId } });
     const total = items.reduce((sum, i) => sum + Number(i.prixUnitaire) * i.quantite, 0);
     await this.prisma.order.update({ where: { id: orderId }, data: { totalPrix: total } });
   }

   async getCart(userId: string) {
     const cart = await this.findActiveCart(userId);
     return this.formatCart(cart);
   }

   async addToCart(userId: string, dto: AddToCartDto) {
     const menuItem = await this.prisma.menuItem.findUnique({ where: { id: dto.menuItemId } });
     if (!menuItem || !menuItem.disponible) {
       throw new AppException('MENU_ITEM_UNAVAILABLE', 'Cet article est indisponible', 409);
     }

     let cart = await this.findActiveCart(userId);

     if (cart && cart.enseigneId !== menuItem.enseigneId) {
       throw new AppException(
         'CART_SINGLE_ENSEIGNE_ONLY',
         "Le panier ne peut contenir des articles que d'une seule enseigne à la fois",
         409,
       );
     }

     if (!cart) {
       cart = await this.prisma.order.create({
         data: {
           userId,
           enseigneId: menuItem.enseigneId,
           statut: 'PANIER',
           totalPrix: menuItem.prix,
           items: {
             create: [{ menuItemId: menuItem.id, quantite: dto.quantite, prixUnitaire: menuItem.prix }],
           },
         },
         include: { items: { include: { menuItem: true } } },
       });
       await this.recalculateTotal(cart.id);
       cart = await this.findActiveCart(userId);
     } else {
       const existing = cart.items.find((i: any) => i.menuItemId === dto.menuItemId);
       if (existing) {
         await this.prisma.orderItem.update({
           where: { id: existing.id },
           data: { quantite: existing.quantite + dto.quantite },
         });
       } else {
         await this.prisma.orderItem.create({
           data: { orderId: cart.id, menuItemId: menuItem.id, quantite: dto.quantite, prixUnitaire: menuItem.prix },
         });
       }
       await this.recalculateTotal(cart.id);
       cart = await this.findActiveCart(userId);
     }

     this.eventEmitter.emit('cart.item_added', {
       userId,
       entityId: dto.menuItemId,
       metadata: { quantite: dto.quantite, enseigneId: menuItem.enseigneId },
     });
     return this.formatCart(cart);
   }

   async updateCartItem(userId: string, menuItemId: string, quantite: number) {
     const cart = await this.findActiveCart(userId);
     if (!cart) throw new AppException('CART_ITEM_NOT_FOUND', 'Article absent du panier', 404);

     const item = cart.items.find((i: any) => i.menuItemId === menuItemId);
     if (!item) throw new AppException('CART_ITEM_NOT_FOUND', 'Article absent du panier', 404);

     if (quantite === 0) {
       await this.prisma.orderItem.delete({ where: { id: item.id } });
       this.eventEmitter.emit('cart.item_removed', { userId, entityId: menuItemId });
     } else {
       await this.prisma.orderItem.update({ where: { id: item.id }, data: { quantite } });
       this.eventEmitter.emit('cart.item_updated', { userId, entityId: menuItemId, metadata: { quantite } });
     }

     const remaining = await this.prisma.orderItem.count({ where: { orderId: cart.id } });
     if (remaining === 0) {
       await this.prisma.order.delete({ where: { id: cart.id } });
       return { enseigneId: null, items: [], total: 0 };
     }

     await this.recalculateTotal(cart.id);
     return this.formatCart(await this.findActiveCart(userId));
   }

   async removeCartItem(userId: string, menuItemId: string) {
     return this.updateCartItem(userId, menuItemId, 0);
   }

   async clearCart(userId: string) {
     const cart = await this.prisma.order.findFirst({ where: { userId, statut: 'PANIER' } });
     if (cart) {
       await this.prisma.order.delete({ where: { id: cart.id } });
       this.eventEmitter.emit('cart.cleared', { userId, entityId: cart.id });
     }
     return { enseigneId: null, items: [], total: 0 };
   }

   // ---------- UC5 — Passer commande (checkout) ----------

   async checkout(userId: string, creneauSouhaite?: string, confirmMalgreRush?: boolean) {
  const cart = await this.findActiveCart(userId);
  if (!cart || cart.items.length === 0) {
    throw new AppException('CART_EMPTY', 'Le panier est vide', 400);
  }

  const enseigne = await this.prisma.enseigne.findUnique({ where: { id: cart.enseigneId } });
  const proximityMinutes = Number(process.env.RUSH_MODE_PROXIMITY_MINUTES ?? 15);
  const creneauDate = creneauSouhaite ? new Date(creneauSouhaite) : new Date();
  const minutesUntilCreneau = (creneauDate.getTime() - Date.now()) / 60000;
  const isCreneauProche = minutesUntilCreneau <= proximityMinutes;

  if (enseigne?.rushMode && isCreneauProche && !confirmMalgreRush) {
    const normal = Number(process.env.RUSH_MODE_DELAY_NORMAL_MINUTES ?? 10);
    const rush = Number(process.env.RUSH_MODE_DELAY_RUSH_MINUTES ?? 25);
    return {
      requiresConfirmation: true,
      code: 'RUSH_MODE_WARNING',
      message: `⚠️ Forte affluence en ce moment. Votre commande pourrait prendre jusqu'à ${rush} min au lieu de ${normal} min.`,
    };
  }

  // ... tout le reste de la méthode checkout() existante, inchangé ...

     const user = await this.prisma.user.findUnique({ where: { id: userId } });
     if (!user) {
       throw new AppException('USER_NOT_FOUND', 'Utilisateur introuvable', 404);
     }

     let walletReferenceId = user.walletReferenceId;
     if (!walletReferenceId) {
       walletReferenceId = crypto.randomUUID();
       await this.prisma.user.update({
         where: { id: userId },
         data: { walletReferenceId },
       });
     }

     const total = Number(cart.totalPrix);

     const balance = await this.walletGateway.getBalance(walletReferenceId, userId);
if (balance < total) {
  throw new AppException('INSUFFICIENT_BALANCE', 'Solde insuffisant', 402);
}



     const { transactionId } = await this.walletGateway.debit(walletReferenceId, total, cart.id, userId);
     const confirmedOrder = await this.prisma.order.update({
       where: { id: cart.id },
       data: {
         statut: 'RECUE',
         walletTransactionId: transactionId,
          walletReferenceId,
       },
     });

     this.eventEmitter.emit('order.placed', {
       userId,
       entityId: confirmedOrder.id,
       metadata: {
         enseigneId: confirmedOrder.enseigneId,
         totalDt: total,
         heureCommande: new Date().toISOString(),
       },
     });
     await this.recalculateRushMode(confirmedOrder.enseigneId);

     return {
       orderId: confirmedOrder.id,
       statut: confirmedOrder.statut,
       total,
     };
   }




// ---------- UC6 — Suivi de commande en temps réel ----------

private readonly VALID_TRANSITIONS: Record<string, string[]> = {
  RECUE: ['EN_PREPARATION', 'ANNULEE'],
  EN_PREPARATION: ['PRETE', 'ANNULEE'],
  PRETE: ['CLOTUREE'],
  CLOTUREE: [],
  ANNULEE: [],
};

async updateOrderStatus(orderId: string, nouveauStatut: string, reason?: string) {
  const order = await this.prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppException('ORDER_NOT_FOUND', 'Commande introuvable', 404);

  const allowed = this.VALID_TRANSITIONS[order.statut] ?? [];
  if (!allowed.includes(nouveauStatut)) {
    throw new AppException(
      'INVALID_STATUS_TRANSITION',
      `Transition ${order.statut} -> ${nouveauStatut} non autorisée`,
      409,
    );
  }

  const data: any = { statut: nouveauStatut };

  if (nouveauStatut === 'PRETE') {
    data.qrToken = await this.jwt.signAsync(
      { type: 'order_pickup', orderId },
      { expiresIn: '2h' },
    );
  }

  const updated = await this.prisma.order.update({ where: { id: orderId }, data });
// Remboursement automatique à l'annulation, si la commande avait été payée via Wallet
  if (nouveauStatut === 'ANNULEE' && order.walletTransactionId && order.walletReferenceId) {
    try {
      await this.walletGateway.refund(
        order.walletReferenceId,
        Number(order.totalPrix),
        orderId,
        'system-cancellation',
      );
      this.eventEmitter.emit('order.refunded', {
        entityId: orderId,
        metadata: { montant: Number(order.totalPrix), reason: reason ?? 'annulation cuisine' },
      });
    } catch (err) {
      console.error(`ECHEC REMBOURSEMENT commande ${orderId} — intervention manuelle requise`, err);

      await this.prisma.ticket.create({
        data: {
          type: 'REFUND_FAILED',
          orderId,
          userId: order.userId,
          details: {
            montant: Number(order.totalPrix),
            walletReferenceId: order.walletReferenceId,
            erreur: err instanceof Error ? err.message : String(err),
          },
        },
      });
    }
  }
  // Payload de base, commun à toutes les transitions
  const payload: Record<string, any> = {
    orderId,
    status: updated.statut,
    qrToken: updated.qrToken ?? null,
  };

  // "reason" uniquement pertinent pour une annulation (CDC §6.4 : order:cancelled { orderId, reason })
  if (nouveauStatut === 'ANNULEE' && reason) {
    payload.reason = reason;
  }

  await this.redis.publish(`order:${orderId}:status`, JSON.stringify(payload));
  this.eventEmitter.emit('order.status_changed', {
  userId: order.userId, // undefined pour une commande walk-in — géré par le listener
  orderId,
  statut: updated.statut,
  reason,
});
await this.recalculateRushMode(order.enseigneId);
  return { orderId, statut: updated.statut };
}
async getOrderStatus(userId: string, orderId: string) {
  const order = await this.prisma.order.findFirst({ where: { id: orderId, userId } });
  if (!order) throw new AppException('ORDER_NOT_FOUND', 'Commande introuvable', 404);

  return {
    orderId: order.id,
    statut: order.statut,
    qrToken: order.qrToken,
    updatedAt: order.updatedAt,
  };
}
async getOrderQr(userId: string, orderId: string) {
  const order = await this.prisma.order.findFirst({ where: { id: orderId, userId } });
  if (!order) throw new AppException('ORDER_NOT_FOUND', 'Commande introuvable', 404);

  if (order.statut !== 'PRETE' || !order.qrToken) {
    throw new AppException(
      'QR_NOT_AVAILABLE',
      "Le QR de récupération n'est disponible que lorsque la commande est prête",
      409,
    );
  }

  // Décode l'expiration réelle du JWT plutôt que de la recalculer, pour rester
  // toujours exact même si la durée de vie du token venait à changer un jour.
  const decoded = this.jwt.decode(order.qrToken) as { exp?: number } | null;
  const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : null;

  return { orderId: order.id, qrToken: order.qrToken, expiresAt };
}
// ---------- Vue KDS — liste des commandes actives d'une enseigne ----------

async getKdsQueue(enseigneId: string) {
  const orders = await this.prisma.order.findMany({
    where: {
      enseigneId,
      statut: { in: ['RECUE', 'EN_PREPARATION', 'PRETE'] },
    },
    include: { items: { include: { menuItem: true } } },
    orderBy: { createdAt: 'asc' }, // tri par heure de commande, conforme CDC §2.4 (défaut)
  });

  return orders.map((order) => ({
    orderId: order.id,
    statut: order.statut,
    channel: order.channel,
    createdAt: order.createdAt,
    items: order.items.map((i) => ({
      nom: i.menuItem.nom,
      quantite: i.quantite,
    })),
  }));
}

// ---------- UC6 (suite) — Validation du QR à la caisse ----------

async collectOrder(orderId: string, qrToken: string) {
  let payload: any;
  try {
    payload = await this.jwt.verifyAsync(qrToken);
  } catch {
    throw new AppException('INVALID_QR_TOKEN', 'QR invalide ou expiré', 401);
  }

  if (payload.type !== 'order_pickup' || payload.orderId !== orderId) {
    throw new AppException('INVALID_QR_TOKEN', 'QR invalide pour cette commande', 401);
  }

  const order = await this.prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppException('ORDER_NOT_FOUND', 'Commande introuvable', 404);

  if (order.statut !== 'PRETE') {
    throw new AppException(
      'INVALID_STATUS_TRANSITION',
      `Impossible de récupérer une commande au statut ${order.statut}`,
      409,
    );
  }

  // Vérifie que le token fourni correspond bien à celui stocké — empêche la réutilisation
  // d'un ancien QR encore valide en durée mais déjà remplacé (ex: commande rouverte).
  if (order.qrToken !== qrToken) {
    throw new AppException('INVALID_QR_TOKEN', 'QR déjà utilisé ou remplacé', 401);
  }

  const updated = await this.prisma.order.update({
    where: { id: orderId },
    data: {
      statut: 'CLOTUREE',
      qrScannedAt: new Date(),
      qrToken: null, // usage unique — invalide immédiatement après scan
    },
  });

  await this.redis.publish(
    `order:${orderId}:status`,
    JSON.stringify({ orderId, status: updated.statut, qrToken: null }),
  );

  return { orderId, statut: updated.statut, qrScannedAt: updated.qrScannedAt };
}

// ---------- POS — Commande comptoir / walk-in (CDC §3.6) ----------

async createWalkInOrder(enseigneId: string, cashierId: string, dto: CreateWalkInOrderDto,clientRequestId?: string,) {
  // Idempotence : si cette action a déjà été synchronisée (retry réseau après succès
  // partiel), retourne la commande existante au lieu d'en créer une seconde.
  if (clientRequestId) {
    const existing = await this.prisma.order.findUnique({ where: { clientRequestId } });
    if (existing) {
      return { orderId: existing.id, statut: existing.statut, channel: existing.channel, total: Number(existing.totalPrix) };
    }}

  if (dto.items.length === 0) {
    throw new AppException('CART_EMPTY', "La commande doit contenir au moins un article", 400);
  }

  const menuItems = await this.prisma.menuItem.findMany({
    where: { id: { in: dto.items.map((i) => i.menuItemId) } },
  });

  for (const item of dto.items) {
    const menuItem = menuItems.find((m) => m.id === item.menuItemId);
    if (!menuItem || !menuItem.disponible) {
      throw new AppException('MENU_ITEM_UNAVAILABLE', `Article indisponible : ${item.menuItemId}`, 409);
    }
    if (menuItem.enseigneId !== enseigneId) {
      throw new AppException(
        'MENU_ITEM_WRONG_ENSEIGNE',
        "Cet article n'appartient pas à votre concept",
        409,
      );
    }
  }

  const total = dto.items.reduce((sum, item) => {
    const menuItem = menuItems.find((m) => m.id === item.menuItemId)!;
    return sum + Number(menuItem.prix) * item.quantite;
  }, 0);

  let walletTransactionId: string | undefined;
  if (dto.modePaiement === 'WALLET') {
    if (!dto.walletReferenceId) {
      throw new AppException('WALLET_REFERENCE_REQUIRED', 'walletReferenceId requis pour un paiement wallet', 400);
    }
    const balance = await this.walletGateway.getBalance(dto.walletReferenceId, cashierId);
    if (balance < total) {
      throw new AppException('INSUFFICIENT_BALANCE', 'Solde insuffisant', 402);
    }
    const { transactionId } = await this.walletGateway.debit(dto.walletReferenceId, total, `walkin-${Date.now()}`, cashierId);
    walletTransactionId = transactionId;
  }

  const order = await this.prisma.order.create({
    data: {
      enseigneId,
      cashierId,
      clientRequestId,
      channel: 'COMPTOIR',
      statut: 'RECUE',
      modePaiement: dto.modePaiement,
      walletTransactionId,
      walletReferenceId: dto.modePaiement === 'WALLET' ? dto.walletReferenceId : undefined,  // <-- ajouté
    totalPrix: total,
      items: {
        create: dto.items.map((item) => {
          const menuItem = menuItems.find((m) => m.id === item.menuItemId)!;
          return { menuItemId: item.menuItemId, quantite: item.quantite, prixUnitaire: menuItem.prix };
        }),
      },
    },
    include: { items: { include: { menuItem: true } } },
  });

  this.eventEmitter.emit('order.placed', {
    //userId: cashierId,
    entityId: order.id,
    metadata: { enseigneId, totalDt: total, channel: 'COMPTOIR', heureCommande: new Date().toISOString() ,cashierId },
  });
  await this.recalculateRushMode(enseigneId);

  return {
    orderId: order.id,
    statut: order.statut,
    channel: order.channel,
    total,
  };
}
// ---------- KDS — Synchronisation après reconnexion (mode hors-ligne) ----------

async syncKdsQueue(
  actions: Array<{ orderId: string; statut: string; reason?: string; clientTimestamp: string }>,
  enseigneId: string,
  isManager: boolean,
) {
  // Rejoue dans l'ordre chronologique du client — "dernier état pris en compte" (CDC)
  const sorted = [...actions].sort(
    (a, b) => new Date(a.clientTimestamp).getTime() - new Date(b.clientTimestamp).getTime(),
  );

 const results: Array<Record<string, any>> = [];
  for (const action of sorted) {
    try {
      const order = await this.prisma.order.findUnique({ where: { id: action.orderId } });
      if (!order) {
        results.push({ orderId: action.orderId, success: false, error: 'ORDER_NOT_FOUND' });
        continue;
      }
      if (!isManager && order.enseigneId !== enseigneId) {
        results.push({ orderId: action.orderId, success: false, error: 'FORBIDDEN' });
        continue;
      }

      const updated = await this.updateOrderStatus(action.orderId, action.statut, action.reason);
      results.push({ orderId: action.orderId, success: true, statut: updated.statut });
    } catch (err) {
      // Transition invalide (ex: commande déjà passée à un autre statut entre-temps) —
      // on continue avec les actions suivantes plutôt que d'échouer tout le lot.
      results.push({
        orderId: action.orderId,
        success: false,
        error: err instanceof AppException ? err.message : 'SYNC_ERROR',
      });
    }
  }

  return { synced: results.filter((r) => r.success).length, total: results.length, results };
}
// ---------- POS — Synchronisation après reconnexion (mode hors-ligne) ----------

async syncPosQueue(
  actions: Array<
    | { type: 'create_walkin'; clientRequestId: string; dto: CreateWalkInOrderDto }
    | { type: 'pay'; orderId: string; dto: { modePaiement: string; walletReferenceId?: string; montantRecu?: number; referenceVirement?: string } }
  >,
  enseigneId: string,
  cashierId: string,
  cashierRole: string,
) {
  const results: Array<Record<string, any>> = [];

  for (const action of actions) {
    try {
      if (action.type === 'create_walkin') {
        const order = await this.createWalkInOrder(enseigneId, cashierId, action.dto, action.clientRequestId);
        results.push({ clientRequestId: action.clientRequestId, success: true, orderId: order.orderId });
      } else {
        const paid = await this.payOrder(action.orderId, cashierId, cashierRole, action.dto);
        results.push({ orderId: action.orderId, success: true, modePaiement: paid.modePaiement });
      }
    } catch (err) {
      results.push({
        ...(action.type === 'create_walkin' ? { clientRequestId: action.clientRequestId } : { orderId: action.orderId }),
        success: false,
        error: err instanceof AppException ? err.message : 'SYNC_ERROR',
      });
    }
  }

  return { synced: results.filter((r) => r.success).length, total: results.length, results };
}
  
// ---------- Mode rush — Niveau 1 : détection côté cuisine (CDC intro) ----------

private async recalculateRushMode(enseigneId: string) {
  const threshold = Number(process.env.RUSH_MODE_THRESHOLD ?? 15);

  const activeCount = await this.prisma.order.count({
    where: { enseigneId, statut: { in: ['RECUE', 'EN_PREPARATION'] } },
  });

  const enseigne = await this.prisma.enseigne.findUnique({ where: { id: enseigneId } });
  if (!enseigne) return;

  const shouldBeRush = activeCount >= threshold;
  if (enseigne.rushMode !== shouldBeRush) {
    await this.prisma.enseigne.update({
      where: { id: enseigneId },
      data: { rushMode: shouldBeRush },
    });
    this.eventEmitter.emit('enseigne.rush_mode_changed', {
      userId: 'system',
      entityId: enseigneId,
      metadata: { rushMode: shouldBeRush, activeCount, threshold },
    });
  }
}

async getRushStatus(enseigneId: string) {
  const enseigne = await this.prisma.enseigne.findUnique({ where: { id: enseigneId } });
  if (!enseigne) throw new AppException('ENSEIGNE_NOT_FOUND', 'Enseigne introuvable', 404);

  const activeOrdersCount = await this.prisma.order.count({
    where: { enseigneId, statut: { in: ['RECUE', 'EN_PREPARATION'] } },
  });

  const threshold = Number(process.env.RUSH_MODE_THRESHOLD ?? 15);

  return {
    enseigneId,
    rushMode: enseigne.rushMode,
    activeOrdersCount,
    threshold,
  };
}



// ---------- POS — Encaissement (CDC §3.4 : modes de paiement) ----------

async payOrder(
  orderId: string,
  cashierId: string,
  cashierRole: string,
  dto: {
    modePaiement: string;
    walletReferenceId?: string;
    montantRecu?: number;
    referenceVirement?: string;
  },
) {
  const order = await this.prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppException('ORDER_NOT_FOUND', 'Commande introuvable', 404);

  if (order.modePaiement || order.walletTransactionId) {
    throw new AppException('ALREADY_PAID', 'Cette commande a déjà été payée', 409);
  }

  const total = Number(order.totalPrix);
  let walletTransactionId: string | undefined;
  let monnaieARendre: number | undefined;

  switch (dto.modePaiement) {
    case 'WALLET': {
      if (!dto.walletReferenceId) {
        throw new AppException('WALLET_REFERENCE_REQUIRED', 'walletReferenceId requis pour un paiement wallet', 400);
      }
      const balance = await this.walletGateway.getBalance(dto.walletReferenceId, cashierId);
      if (balance < total) {
        throw new AppException('INSUFFICIENT_BALANCE', 'Solde insuffisant', 402);
      }
      const { transactionId } = await this.walletGateway.debit(
        dto.walletReferenceId, total, `pay-${orderId}`, cashierId,
      );
      walletTransactionId = transactionId;
      break;
    }

    case 'ESPECES': {
      // CDC §3.3 : "Champ montant reçu (espèces) avec calcul automatique de la monnaie à rendre"
      if (dto.montantRecu === undefined) {
        throw new AppException('MONTANT_RECU_REQUIRED', 'Le montant reçu du client est requis pour un paiement espèces', 400);
      }
      if (dto.montantRecu < total) {
        throw new AppException('MONTANT_INSUFFISANT', 'Le montant reçu est inférieur au total de la commande', 400);
      }
      monnaieARendre = Number((dto.montantRecu - total).toFixed(2));
      break;
    }

    case 'VIREMENT': {
      // CDC §3.4 : "Saisie référence manuelle → validation manager requis"
      if (!dto.referenceVirement) {
        throw new AppException('REFERENCE_REQUISE', 'La référence du virement/chèque est requise', 400);
      }
      if (cashierRole !== 'pos_manager') {
        throw new AppException(
          'MANAGER_VALIDATION_REQUIRED',
          'Le paiement par virement/chèque doit être validé par un manager',
          403,
        );
      }
      break;
    }

    case 'CARTE':
      // TPE — pas d'intégration matérielle réelle à ce stade, validation directe.
      break;

    default:
      throw new AppException('MODE_PAIEMENT_NON_SUPPORTE', `Mode de paiement non pris en charge : ${dto.modePaiement}`, 400);
  }

  const updated = await this.prisma.order.update({
    where: { id: orderId },
    data: {
      modePaiement: dto.modePaiement,
      walletTransactionId,
      walletReferenceId: dto.modePaiement === 'WALLET' ? dto.walletReferenceId : undefined,
    },
  });

  this.eventEmitter.emit('order.paid', {
    entityId: orderId,
    metadata: { modePaiement: dto.modePaiement, montant: total, cashierId, referenceVirement: dto.referenceVirement },
  });

  return {
    orderId: updated.id,
    modePaiement: updated.modePaiement,
    statut: updated.statut,
    ...(monnaieARendre !== undefined ? { montantRecu: dto.montantRecu, monnaieARendre } : {}),
  };
}
















































}
