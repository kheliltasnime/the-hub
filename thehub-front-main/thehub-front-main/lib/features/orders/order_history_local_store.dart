import 'dart:convert';
import '../../core/storage/token_storage.dart';

class StoredOrderRef {
  final String orderId;
  final double total;
  final DateTime createdAt;

  StoredOrderRef({
    required this.orderId,
    required this.total,
    required this.createdAt,
  });

  Map<String, dynamic> toJson() => {
        'orderId': orderId,
        'total': total,
        'createdAt': createdAt.toIso8601String(),
      };

  factory StoredOrderRef.fromJson(Map<String, dynamic> json) => StoredOrderRef(
        orderId: json['orderId'] as String,
        total: (json['total'] as num).toDouble(),
        createdAt: DateTime.parse(json['createdAt'] as String),
      );
}

class OrderHistoryLocalStore {
  static const _ordersKey = 'paid_orders';

  Future<void> add(StoredOrderRef ref) async {
    final orders = await getAll();
    orders.removeWhere((order) => order.orderId == ref.orderId);
    orders.insert(0, ref);
    await TokenStorage.instance.writeValue(
      _ordersKey,
      jsonEncode(orders.take(20).map((order) => order.toJson()).toList()),
    );
  }

  Future<List<StoredOrderRef>> getAll() async {
    final raw = await TokenStorage.instance.readValue(_ordersKey);
    if (raw == null || raw.isEmpty) return [];
    try {
      final decoded = jsonDecode(raw) as List<dynamic>;
      return decoded
          .map((item) => StoredOrderRef.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }
}
