import 'package:dio/dio.dart';
import '../../core/api/api_client.dart';
import 'models/wallet_models.dart';

class WalletBalance {
  final double balance;

  WalletBalance({required this.balance});

  factory WalletBalance.fromJson(Map<String, dynamic> json) =>
      WalletBalance(balance: (json['balance'] as num).toDouble());
}

class TopupResponse {
  final String transactionId;
  final double newBalance;

  TopupResponse({required this.transactionId, required this.newBalance});

  factory TopupResponse.fromJson(Map<String, dynamic> json) => TopupResponse(
        transactionId: json['transactionId'] as String,
        newBalance: (json['newBalance'] as num).toDouble(),
      );
}

/// GET /wallet/balance — Bloc 3, terminé et testé côté backend (rapport v7/v8).
/// Format de réponse supposé aligné sur la structure standard du contrat
/// ({ data: { balance } }, cache Redis TTL 30s côté serveur) — à confirmer
/// avec Tasnime si le champ balance a un nom différent une fois testé.
class WalletRepository {
  final Dio _dio = ApiClient.instance.dio;

  List<WalletTransaction> parseTransactions(dynamic payload) {
    final map =
        payload is Map ? payload.cast<String, dynamic>() : <String, dynamic>{};
    final directList = map['transactions'];
    final wrappedList = map['data'] is Map
        ? (map['data'] as Map).cast<String, dynamic>()['transactions']
        : null;

    final items = directList is List
        ? directList
        : wrappedList is List
            ? wrappedList
            : const <dynamic>[];

    final transactions = items
        .whereType<Map>()
        .map((item) =>
            WalletTransaction.fromJson(Map<String, dynamic>.from(item)))
        .toList();
    transactions.sort((a, b) {
      if (a.occurredAt == null && b.occurredAt == null) return 0;
      if (a.occurredAt == null) return 1;
      if (b.occurredAt == null) return -1;
      return b.occurredAt!.compareTo(a.occurredAt!);
    });
    return transactions;
  }

  Future<WalletBalance> fetchBalance() async {
    try {
      final response = await _dio.get('/wallet/balance');
      return WalletBalance.fromJson(
          response.data['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// POST /wallet/topup — Recharge du wallet
  /// Body: { amount: number }
  /// Response: { transactionId: string, newBalance: number }
  Future<TopupResponse> topup(double amount) async {
    try {
      final response = await _dio.post(
        '/wallet/topup',
        data: {'amount': amount},
      );
      return TopupResponse.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<WalletData> getWalletDetails() async {
    try {
      final balanceResponse = await fetchBalance();
      final transactionsResponse = await _dio.get('/wallet/transactions');

      final transactions = parseTransactions(transactionsResponse.data);

      return WalletData(
        balance: balanceResponse.balance,
        loyaltyPoints: 0, // À implémenter si endpoint disponible
        cardNumber: '•••• •••• •••• 0000',
        recentTransactions: transactions,
      );
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<QrPayData> getQrPay() async {
    try {
      final response = await _dio.get('/wallet/qr');
      final payload = response.data is Map
          ? response.data as Map<String, dynamic>
          : <String, dynamic>{};
      return QrPayData.fromJson(payload);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
