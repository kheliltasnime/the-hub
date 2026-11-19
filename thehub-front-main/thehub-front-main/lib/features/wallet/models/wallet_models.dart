class WalletData {
  final double balance;
  final int loyaltyPoints;
  final String cardNumber;
  final List<WalletTransaction> recentTransactions;

  const WalletData({
    required this.balance,
    required this.loyaltyPoints,
    required this.cardNumber,
    required this.recentTransactions,
  });

  factory WalletData.fromJson(Map<String, dynamic> json) {
    return WalletData(
      balance: (json['balance'] as num?)?.toDouble() ?? 0.0,
      loyaltyPoints: json['loyaltyPoints'] as int? ?? 0,
      cardNumber: json['cardNumber'] as String? ?? '•••• •••• •••• 0000',
      recentTransactions: (json['recentTransactions'] as List<dynamic>?)
              ?.map(
                  (e) => WalletTransaction.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

class WalletTransaction {
  final String id;
  final String title;
  final String subtitle;
  final double amount;
  final bool isCredit;
  final String iconType;
  final DateTime? occurredAt;

  const WalletTransaction({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.amount,
    required this.isCredit,
    required this.iconType,
    this.occurredAt,
  });

  factory WalletTransaction.fromJson(Map<String, dynamic> json) {
    final type = (json['type'] as String? ?? '').toLowerCase();
    final isCredit = type == 'topup' ||
        type == 'refund' ||
        (json['isCredit'] as bool? ?? false);
    final rawAmount = (json['amount'] as num?)?.toDouble() ?? 0.0;
    final rawTitle = json['title'] as String? ??
        json['description'] as String? ??
        (isCredit ? 'Recharge Wallet' : 'Paiement / Débit');
    final rawSubtitle = json['subtitle'] as String? ??
        json['timestamp'] as String? ??
        json['createdAt'] as String? ??
        json['date'] as String? ??
        '';
    final rawDate = json['createdAt'] ?? json['timestamp'] ?? json['date'];

    return WalletTransaction(
      id: json['transactionId'] as String? ?? json['id'] as String? ?? '',
      title: rawTitle,
      subtitle: rawSubtitle,
      amount: rawAmount,
      isCredit: isCredit,
      iconType: json['iconType'] as String? ?? (isCredit ? 'topup' : 'debit'),
      occurredAt:
          rawDate == null ? null : DateTime.tryParse(rawDate.toString()),
    );
  }
}

class QrPayData {
  final String qrToken;
  final String expiresAt;

  const QrPayData({
    required this.qrToken,
    required this.expiresAt,
  });

  factory QrPayData.fromJson(Map<String, dynamic> json) {
    final payload =
        json['data'] is Map ? json['data'] as Map<String, dynamic> : json;

    return QrPayData(
      qrToken: payload['qrToken'] as String? ?? '',
      expiresAt: payload['expiresAt'] as String? ?? '',
    );
  }
}

class WalletBalance {
  final double amount;

  WalletBalance({required this.amount});

  factory WalletBalance.fromJson(Map<String, dynamic> json) {
    return WalletBalance(
      amount: (json['balance'] as num).toDouble(),
    );
  }
}
