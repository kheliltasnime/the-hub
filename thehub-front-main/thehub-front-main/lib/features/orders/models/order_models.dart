/// Modèles — module Commander (UC3/UC4/UC5).
library;

/// Les champs numériques (Decimal côté Prisma : prix, rating, total...)
/// sont parfois sérialisés en String par le backend plutôt qu'en nombre
/// JSON (comportement classique de Prisma.Decimal) -> on parse de façon
/// tolérante partout où c'est possible, plutôt que de faire confiance à
/// `as num?` qui plante sur une String.
double _parseDouble(dynamic v, {double fallback = 0}) {
  if (v == null) return fallback;
  if (v is num) return v.toDouble();
  return double.tryParse(v.toString()) ?? fallback;
}

double? _parseDoubleOrNull(dynamic v) {
  if (v == null) return null;
  if (v is num) return v.toDouble();
  return double.tryParse(v.toString());
}

class Enseigne {
  final String id;
  final String nom;
  final bool rushMode;
  final String? description;
  final String? category;
  final double? rating;
  final String? imageUrl;
  final bool? isOpen;

  Enseigne({
    required this.id,
    required this.nom,
    required this.rushMode,
    this.description,
    this.category,
    this.rating,
    this.imageUrl,
    this.isOpen,
  });

  factory Enseigne.fromJson(Map<String, dynamic> json) => Enseigne(
        id: json['id'] as String,
        nom: json['nom'] as String,
        rushMode: json['rushMode'] as bool? ?? false,
        description: json['description'] as String?,
        category: json['category'] as String?,
        rating: _parseDoubleOrNull(json['rating']),
        imageUrl: json['imageUrl'] as String?,
        isOpen: json['isOpen'] as bool?,
      );
}

class MenuItem {
  final String id;
  final String nom;
  final String? description;
  final double prix;
  final String? imageUrl;
  final bool disponible;

  MenuItem({
    required this.id,
    required this.nom,
    this.description,
    required this.prix,
    this.imageUrl,
    this.disponible = true,
  });

  factory MenuItem.fromJson(Map<String, dynamic> json) => MenuItem(
        id: json['id'] as String,
        nom: json['nom'] as String? ?? json['name'] as String? ?? '',
        description: json['description'] as String?,
        prix: _parseDouble(json['prix'] ?? json['prix_dt']),
        imageUrl: json['imageUrl'] as String? ?? json['photoUrl'] as String?,
        disponible: json['disponible'] as bool? ?? true,
      );
}

class MenuCategoryGroup {
  final String categorie;
  final List<MenuItem> items;

  MenuCategoryGroup({required this.categorie, required this.items});
}

class MenuData {
  final Enseigne enseigne;
  final List<MenuCategoryGroup> categories;

  MenuData({required this.enseigne, required this.categories});

  /// GET /orders/menu/:enseigne — Réponse : { data: { enseigne: {...}, categories: { "Plats": [...] } } }
  factory MenuData.fromJson(Map<String, dynamic> json) {
    final categoriesMap = json['categories'] as Map<String, dynamic>;
    return MenuData(
      enseigne: Enseigne.fromJson(json['enseigne'] as Map<String, dynamic>),
      categories: categoriesMap.entries
          .map((e) => MenuCategoryGroup(
                categorie: e.key,
                items: (e.value as List).map((i) => MenuItem.fromJson(i as Map<String, dynamic>)).toList(),
              ))
          .toList(),
    );
  }
}

class CartItem {
  final String menuItemId;
  final String nom;
  final double prix;
  final int quantite;
  final String? imageUrl;

  CartItem({
    required this.menuItemId,
    required this.nom,
    required this.prix,
    required this.quantite,
    this.imageUrl,
  });

  double get total => prix * quantite;

  factory CartItem.fromJson(Map<String, dynamic> json) {
    // Le nom exact du champ prix unitaire n'est pas garanti par le contrat
    // -> plusieurs clés plausibles tentées, avec repli sur total/quantité.
    double? price = _parseDoubleOrNull(json['prix']) ??
        _parseDoubleOrNull(json['prixUnitaire']) ??
        _parseDoubleOrNull(json['unitPrice']) ??
        _parseDoubleOrNull(json['price']);

    final quantite = json['quantite'] as int? ?? 1;

    if (price == null || price == 0) {
      final lineTotal = _parseDoubleOrNull(json['total']) ?? _parseDoubleOrNull(json['sousTotal']);
      if (lineTotal != null && quantite > 0) {
        price = lineTotal / quantite;
      }
    }

    return CartItem(
      menuItemId: json['menuItemId'] as String? ?? json['id'] as String,
      nom: json['nom'] as String? ?? '',
      prix: price ?? 0,
      quantite: quantite,
      imageUrl: json['imageUrl'] as String? ?? json['photoUrl'] as String?,
    );
  }
}

class Cart {
  final String? enseigneId;
  final List<CartItem> items;
  final double total;

  Cart({required this.enseigneId, required this.items, required this.total});

  bool get isEmpty => items.isEmpty;

  factory Cart.fromJson(Map<String, dynamic> json) => Cart(
        enseigneId: json['enseigneId'] as String?,
        items: (json['items'] as List? ?? [])
            .map((i) => CartItem.fromJson(i as Map<String, dynamic>))
            .toList(),
        total: _parseDouble(json['total']),
      );
}

class CheckoutResult {
  final String orderId;
  final String statut;
  final double total;

  CheckoutResult({required this.orderId, required this.statut, required this.total});

  factory CheckoutResult.fromJson(Map<String, dynamic> json) => CheckoutResult(
        orderId: json['orderId'] as String,
        statut: json['statut'] as String,
        total: _parseDouble(json['total']),
      );
}

/// POST /orders/checkout peut renvoyer DEUX formes de réponse différentes
/// (même code HTTP 200) selon que l'enseigne est en rush mode et le créneau
/// proche :
/// 1. Une vraie commande créée -> CheckoutResult (orderId, statut, total).
/// 2. Un avertissement à confirmer -> { requiresConfirmation, code, message },
///    SANS orderId -> ne doit jamais être parsé comme un CheckoutResult.
///
/// CheckoutOutcome distingue les deux cas pour que l'appelant ne puisse pas
/// accidentellement lire orderId/statut/total sur un avertissement.
sealed class CheckoutOutcome {
  const CheckoutOutcome();

  factory CheckoutOutcome.fromJson(Map<String, dynamic> json) {
    if (json['requiresConfirmation'] == true) {
      return CheckoutRushWarning(
        code: json['code'] as String? ?? 'RUSH_MODE_WARNING',
        message: json['message'] as String? ?? 'Forte affluence en ce moment.',
      );
    }
    return CheckoutSuccess(CheckoutResult.fromJson(json));
  }
}

class CheckoutSuccess extends CheckoutOutcome {
  final CheckoutResult result;
  const CheckoutSuccess(this.result);
}

class CheckoutRushWarning extends CheckoutOutcome {
  final String code;
  final String message;
  const CheckoutRushWarning({required this.code, required this.message});
}

/// GET /orders/:id/status — repli REST si la connexion WebSocket tombe
/// (scénario A1 d'UC6). Forme exacte non entièrement documentée ; on ne
/// dépend que du champ "statut", toujours présent d'après le contrat.
class OrderStatus {
  final String statut;

  OrderStatus({required this.statut});

  factory OrderStatus.fromJson(Map<String, dynamic> json) =>
      OrderStatus(statut: json['statut'] as String);
}

/// GET /orders/:id/qr — forme exacte non documentée dans le contrat vu à
/// ce jour, hypothèse raisonnable calquée sur le pattern qrToken mentionné
/// pour le Wallet (§ Bloc 3). À ajuster si le vrai payload diffère.
class OrderQr {
  final String qrToken;
  final DateTime? expiresAt;

  OrderQr({required this.qrToken, this.expiresAt});

  factory OrderQr.fromJson(Map<String, dynamic> json) => OrderQr(
        qrToken: json['qrToken'] as String? ?? json['token'] as String? ?? '',
        expiresAt: json['expiresAt'] != null ? DateTime.tryParse(json['expiresAt'] as String) : null,
      );
}