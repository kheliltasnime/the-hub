import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'models/order_models.dart';
import 'order_history_local_store.dart';
import 'orders_repository.dart';

final ordersRepositoryProvider = Provider((ref) => OrdersRepository());

/// GET /orders/enseignes
final enseignesProvider = FutureProvider<List<Enseigne>>((ref) {
  return ref.read(ordersRepositoryProvider).fetchEnseignes();
});

/// GET /orders/menu/:enseigne — un provider par enseigne (family), pour ne
/// pas recharger le menu d'une enseigne déjà consultée pendant la session.
final menuProvider = FutureProvider.family<MenuData, String>((ref, enseigneId) {
  return ref.read(ordersRepositoryProvider).fetchMenu(enseigneId);
});

/// État du panier — chargé au démarrage, mis à jour après chaque action.
/// AsyncValue<Cart> plutôt qu'un état custom : profite du .when() dans l'UI
/// pour gérer loading/error proprement, cohérent avec le reste de l'app.
class CartNotifier extends StateNotifier<AsyncValue<Cart>> {
  CartNotifier(this._repository) : super(const AsyncValue.loading()) {
    refresh();
  }

  final OrdersRepository _repository;

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    try {
      final cart = await _repository.fetchCart();
      state = AsyncValue.data(cart);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> add({required String menuItemId, required int quantite}) async {
    try {
      final cart = await _repository.addToCart(
          menuItemId: menuItemId, quantite: quantite);
      state = AsyncValue.data(cart);
    } catch (e) {
      rethrow; // laisse l'écran appelant afficher l'erreur précise (ex: CART_SINGLE_ENSEIGNE_ONLY)
    }
  }

  Future<void> updateQuantity(
      {required String menuItemId, required int quantite}) async {
    try {
      final cart = await _repository.updateCartItem(
          menuItemId: menuItemId, quantite: quantite);
      state = AsyncValue.data(cart);
    } catch (e) {
      rethrow;
    }
  }

  Future<void> remove(String menuItemId) async {
    try {
      final cart = await _repository.removeCartItem(menuItemId);
      state = AsyncValue.data(cart);
    } catch (e) {
      rethrow;
    }
  }

  Future<void> clear() async {
    try {
      final cart = await _repository.clearCart();
      state = AsyncValue.data(cart);
    } catch (e) {
      rethrow;
    }
  }

  /// Après un checkout réussi, le panier backend est vide -> on rafraîchit
  /// l'état local pour rester synchronisé sans appel réseau supplémentaire.
  /// On enregistre aussi la commande dans l'historique local de l'appareil
  /// (voir order_history_local_store.dart) — seul moyen actuel de la
  /// retrouver plus tard, faute d'endpoint GET /orders côté backend.
  Future<CheckoutResult> checkout({bool confirmMalgreRush = false}) async {
    final result =
        await _repository.checkout(confirmMalgreRush: confirmMalgreRush);
    await OrderHistoryLocalStore().add(
      StoredOrderRef(
          orderId: result.orderId,
          total: result.total,
          createdAt: DateTime.now()),
    );
    await refresh();
    return result;
  }
}

final cartProvider =
    StateNotifierProvider<CartNotifier, AsyncValue<Cart>>((ref) {
  return CartNotifier(ref.read(ordersRepositoryProvider));
});

/// Nombre d'articles au panier, pratique pour un badge sur l'icône Commander
/// de la bottom nav plus tard.
final cartItemCountProvider = Provider<int>((ref) {
  final cart = ref.watch(cartProvider).valueOrNull;
  if (cart == null) return 0;
  return cart.items.fold(0, (sum, item) => sum + item.quantite);
});

/// Commande locale enrichie de son vrai statut backend (via un appel
/// GET /orders/:id/status par commande stockée).
class OrderHistoryEntry {
  final StoredOrderRef ref;
  final String? statut; // null si le statut n'a pas pu être récupéré

  OrderHistoryEntry({required this.ref, required this.statut});

  bool get isActive =>
      statut == null || !['CLOTUREE', 'ANNULEE'].contains(statut);
}

/// Historique local enrichi — voir order_history_local_store.dart pour le
/// contexte (solution de contournement, pas un vrai historique serveur).
final orderHistoryProvider =
    FutureProvider<List<OrderHistoryEntry>>((ref) async {
  final refs = await OrderHistoryLocalStore().getAll();
  final repository = ref.read(ordersRepositoryProvider);

  final entries = await Future.wait(refs.map((r) async {
    try {
      final status = await repository.fetchStatus(r.orderId);
      return OrderHistoryEntry(ref: r, statut: status.statut);
    } catch (_) {
      // Statut indisponible (commande ancienne purgée, réseau, etc.) ->
      // on la garde quand même dans la liste plutôt que de la faire
      // disparaître silencieusement.
      return OrderHistoryEntry(ref: r, statut: null);
    }
  }));
  return entries;
});

final latestOrderProvider =
    FutureProvider.autoDispose<StoredOrderRef?>((ref) async {
  final orders = await OrderHistoryLocalStore().getAll();
  return orders.isEmpty ? null : orders.first;
});
