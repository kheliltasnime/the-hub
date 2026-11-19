import 'package:dio/dio.dart';
import '../../core/api/api_client.dart';
import 'models/order_models.dart';

/// Levée quand /orders/checkout renvoie { requiresConfirmation: true, ... }
/// au lieu d'une vraie commande (mode rush actif + créneau proche, cf.
/// orders.service.ts) — permet à l'écran Panier d'afficher un vrai
/// dialogue de confirmation plutôt que de planter sur un orderId absent.
class RushModeWarning implements Exception {
  final String message;
  RushModeWarning(this.message);
}

/// Couche d'accès aux endpoints Commander — contrat v7 §2.2.
/// Note nommage : les routes panier utilisent /orders/cart/:menuItemId
/// dans le contrat texte, mais /orders/cart/item/:id dans les logs de
/// démarrage backend observés — j'utilise cette 2ᵉ forme (celle réellement
/// mappée par NestJS), à confirmer avec Tasnime si ça échoue (cf. écart
/// déjà noté dans le rapport v8 : "Nommage des routes panier — à valider").
class OrdersRepository {
  final Dio _dio = ApiClient.instance.dio;

  Future<List<Enseigne>> fetchEnseignes() async {
    try {
      final response = await _dio.get('/orders/enseignes');
      return (response.data['data'] as List)
          .map((e) => Enseigne.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<MenuData> fetchMenu(String enseigneId) async {
    try {
      final response = await _dio.get('/orders/menu/$enseigneId');
      return MenuData.fromJson(response.data['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<MenuItem>> searchMenu(String enseigneId, String query) async {
    try {
      final response = await _dio.get('/orders/menu/$enseigneId/search',
          queryParameters: {'q': query});
      return (response.data['data'] as List)
          .map((e) => MenuItem.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Cart> fetchCart() async {
    try {
      final response = await _dio.get('/orders/cart');
      return Cart.fromJson(response.data['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Cart> addToCart(
      {required String menuItemId, required int quantite}) async {
    try {
      final response = await _dio.post('/orders/cart/add', data: {
        'menuItemId': menuItemId,
        'quantite': quantite,
      });
      return Cart.fromJson(response.data['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Cart> updateCartItem(
      {required String menuItemId, required int quantite}) async {
    try {
      final response = await _dio
          .patch('/orders/cart/item/$menuItemId', data: {'quantite': quantite});
      return Cart.fromJson(response.data['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Cart> removeCartItem(String menuItemId) async {
    try {
      final response = await _dio.delete('/orders/cart/item/$menuItemId');
      return Cart.fromJson(response.data['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Cart> clearCart() async {
    try {
      final response = await _dio.delete('/orders/cart');
      return Cart.fromJson(response.data['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// POST /orders/checkout — vérifie/débite le Wallet, crée la commande.
  /// Cas particulier découvert dans le vrai code backend (orders.service.ts) :
  /// si l'enseigne est en mode rush et le créneau proche, la réponse n'a PAS
  /// d'orderId — juste { requiresConfirmation: true, code, message } — il
  /// faut alors relancer avec confirmMalgreRush: true pour vraiment passer
  /// la commande. On modélise ça avec une exception dédiée (RushModeWarning)
  /// plutôt que de laisser CheckoutResult.fromJson planter sur un orderId absent.
  Future<CheckoutResult> checkout({bool confirmMalgreRush = false}) async {
    try {
      final response = await _dio.post('/orders/checkout', data: {
        'confirmMalgreRush': confirmMalgreRush,
      });
      final data = response.data['data'] as Map<String, dynamic>;
      if (data['requiresConfirmation'] == true) {
        throw RushModeWarning(
          data['message'] as String? ??
              'Forte affluence — votre commande pourrait prendre plus de temps.',
        );
      }
      return CheckoutResult.fromJson(data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// GET /orders/:id/qr
  Future<OrderQr> fetchQr(String orderId) async {
    try {
      final response = await _dio.get('/orders/$orderId/qr');
      return OrderQr.fromJson(response.data['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// GET /orders/:id/status — repli REST (UC6, scénario A1 : WebSocket perdu).
  Future<OrderStatus> fetchStatus(String orderId) async {
    try {
      final response = await _dio.get('/orders/$orderId/status');
      return OrderStatus.fromJson(
          response.data['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// POST /orders/:id/cancel — disponible uniquement au statut RECUE.
  Future<OrderStatus> cancelOrder(String orderId) async {
    try {
      final response = await _dio.post('/orders/$orderId/cancel');
      return OrderStatus.fromJson(
          response.data['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
