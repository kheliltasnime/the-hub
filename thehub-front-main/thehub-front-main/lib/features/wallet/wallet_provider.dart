import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'models/wallet_models.dart';
import 'wallet_repository.dart';

final walletRepositoryProvider = Provider<WalletRepository>((ref) {
  return WalletRepository();
});

final walletDetailsProvider =
    FutureProvider.autoDispose<WalletData>((ref) async {
  final repository = ref.watch(walletRepositoryProvider);
  return repository.getWalletDetails();
});

final qrPayDataProvider = FutureProvider.autoDispose<QrPayData>((ref) async {
  final repository = ref.watch(walletRepositoryProvider);
  return repository.getQrPay();
});

class RechargeNotifier extends StateNotifier<AsyncValue<TopupResponse>> {
  final WalletRepository _repository;

  RechargeNotifier(this._repository) : super(const AsyncValue.loading());

  Future<void> recharge(double amount) async {
    state = const AsyncValue.loading();
    try {
      final result = await _repository.topup(amount);
      state = AsyncValue.data(result);
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
    }
  }

  void reset() {
    state = const AsyncValue.loading();
  }
}

final rechargeProvider =
    StateNotifierProvider<RechargeNotifier, AsyncValue<TopupResponse>>((ref) {
  final repository = ref.watch(walletRepositoryProvider);
  return RechargeNotifier(repository);
});
