import 'package:flutter_test/flutter_test.dart';
import 'package:hub_ghazela_mobile/features/wallet/models/wallet_models.dart';
import 'package:hub_ghazela_mobile/features/wallet/wallet_repository.dart';

void main() {
  group('WalletRepository', () {
    test('parses transactions from backend wrapped response payload', () {
      final repository = WalletRepository();

      final transactions = repository.parseTransactions({
        'data': {
          'transactions': [
            {
              'transactionId': 'tx_123',
              'type': 'topup',
              'amount': 25.5,
              'timestamp': '2026-08-29T10:00:00Z',
            },
            {
              'transactionId': 'tx_456',
              'type': 'debit',
              'amount': 12.0,
              'timestamp': '2026-08-29T11:00:00Z',
            },
          ],
        },
      });

      expect(transactions, hasLength(2));
      expect(transactions.first.id, 'tx_123');
      expect(transactions.first.isCredit, isTrue);
      expect(transactions.last.isCredit, isFalse);
    });

    test('parses transaction objects from direct payload', () {
      final repository = WalletRepository();

      final transactions = repository.parseTransactions({
        'transactions': [
          {
            'transactionId': 'tx_789',
            'type': 'refund',
            'amount': 8.75,
            'timestamp': '2026-08-29T12:00:00Z',
          },
        ],
      });

      expect(transactions, hasLength(1));
      expect(transactions.first.id, 'tx_789');
      expect(transactions.first.amount, 8.75);
    });

    test('parses QR payload from wrapped backend response', () {
      final payload = {
        'data': {
          'qrToken': 'token-qr-123',
          'expiresAt': '2026-08-29T12:00:00Z',
        },
      };

      final qr = QrPayData.fromJson(payload);

      expect(qr.qrToken, 'token-qr-123');
      expect(qr.expiresAt, '2026-08-29T12:00:00Z');
    });
  });
}
