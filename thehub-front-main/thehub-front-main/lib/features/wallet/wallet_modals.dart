import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../core/theme/app_theme.dart';
import '../auth/auth_provider.dart';
import 'wallet_provider.dart';

class RechargeBottomSheet extends ConsumerStatefulWidget {
  const RechargeBottomSheet({super.key});

  @override
  ConsumerState<RechargeBottomSheet> createState() =>
      _RechargeBottomSheetState();
}

class _RechargeBottomSheetState extends ConsumerState<RechargeBottomSheet> {
  final TextEditingController _amountController =
      TextEditingController(text: '50');
  int _selectedAmount = 50;
  bool _isLoading = false;

  Future<void> _handleTopup() async {
    final amount = double.tryParse(_amountController.text);
    if (amount == null || amount < 5) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Montant minimum : 5 DT')),
      );
      return;
    }

    setState(() => _isLoading = true);
    try {
      await ref.read(walletRepositoryProvider).topup(amount);
      ref.invalidate(walletDetailsProvider);
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(
                  'Recharge de ${amount.toStringAsFixed(2)} DT effectuée !')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Échec du rechargement : $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text('Recharger votre Wallet',
              style: AppTypography.headline(size: 18)),
          const SizedBox(height: 4),
          Text(
            'Saisissez le montant ou choisissez un pack rapide.',
            style: AppTypography.body(size: 13)
                .copyWith(color: AppColors.grayMedium),
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFFFAF7F2),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                Text('DT', style: AppTypography.headline(size: 22)),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _amountController,
                    keyboardType: TextInputType.number,
                    style: AppTypography.headline(size: 26),
                    decoration: const InputDecoration(
                      border: InputBorder.none,
                      isDense: true,
                    ),
                    onChanged: (val) {
                      setState(() {
                        _selectedAmount = int.tryParse(val) ?? 0;
                      });
                    },
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    'MINIMUM 5 DT',
                    style: AppTypography.label(size: 9)
                        .copyWith(color: Colors.red),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Text('MONTANTS SUGGÉRÉS', style: AppTypography.label(size: 11)),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [10, 20, 50, 100].map((amt) {
              final isSelected = _selectedAmount == amt;
              return ChoiceChip(
                label: Text('$amt DT'),
                selected: isSelected,
                selectedColor: Colors.white,
                backgroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                  side: BorderSide(
                    color: isSelected
                        ? const Color(0xFFC5A059)
                        : Colors.grey.shade300,
                    width: isSelected ? 2 : 1,
                  ),
                ),
                labelStyle: AppTypography.body(size: 13).copyWith(
                  color:
                      isSelected ? const Color(0xFFC5A059) : AppColors.neutral,
                ),
                onSelected: (_) {
                  setState(() {
                    _selectedAmount = amt;
                    _amountController.text = '$amt';
                  });
                },
              );
            }).toList(),
          ),
          const SizedBox(height: 28),
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFC5A059),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16)),
              ),
              onPressed: _isLoading ? null : _handleTopup,
              child: _isLoading
                  ? const CircularProgressIndicator(color: Colors.white)
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('RECHARGER',
                            style: AppTypography.label(size: 14)
                                .copyWith(color: Colors.white)),
                        const SizedBox(width: 8),
                        const Icon(Icons.arrow_forward,
                            color: Colors.white, size: 18),
                      ],
                    ),
            ),
          ),
          const SizedBox(height: 12),
          Center(
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.check_circle, color: Colors.green, size: 14),
                const SizedBox(width: 4),
                Text(
                  'PAIEMENT 100% SÉCURISÉ',
                  style: AppTypography.label(size: 10)
                      .copyWith(color: AppColors.grayMedium),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class QrCodeBottomSheet extends ConsumerWidget {
  const QrCodeBottomSheet({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final qrAsync = ref.watch(qrPayDataProvider);
    final walletAsync = ref.watch(walletDetailsProvider);

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 20),
          Text('Paiement par QR Code', style: AppTypography.headline(size: 20)),
          const SizedBox(height: 4),
          Text(
            'Scannez pour régler instantanément',
            style: AppTypography.body(size: 13)
                .copyWith(color: AppColors.grayMedium),
          ),
          const SizedBox(height: 24),
          qrAsync.when(
            data: (qrData) => Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFFFFFBF3),
                borderRadius: BorderRadius.circular(24),
              ),
              child: QrImageView(
                data: qrData.qrToken,
                version: QrVersions.auto,
                size: 160,
                backgroundColor: Colors.white,
                eyeStyle: const QrEyeStyle(
                  eyeShape: QrEyeShape.square,
                  color: Color(0xFF231F20),
                ),
                dataModuleStyle: const QrDataModuleStyle(
                  dataModuleShape: QrDataModuleShape.square,
                  color: Color(0xFF231F20),
                ),
              ),
            ),
            loading: () => const SizedBox(
              height: 160,
              child: Center(
                  child: CircularProgressIndicator(color: Color(0xFFC5A059))),
            ),
            error: (_, __) =>
                const Icon(Icons.error_outline, size: 60, color: Colors.red),
          ),
          const SizedBox(height: 16),
          Text(
            user?.fullName ?? 'Membre The Hub',
            style: AppTypography.body(size: 16)
                .copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 4),
          walletAsync.maybeWhen(
            data: (w) => Text(
              'Solde: ${w.balance.toStringAsFixed(3)} TND',
              style: AppTypography.headline(size: 16)
                  .copyWith(color: const Color(0xFFC5A059)),
            ),
            orElse: () => const SizedBox.shrink(),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.green.shade50,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.check_circle, color: Colors.green, size: 16),
                const SizedBox(width: 6),
                Text(
                  'Token dynamique sécurisé',
                  style: AppTypography.label(size: 11)
                      .copyWith(color: Colors.green.shade800),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('FERMER',
                style: AppTypography.label(size: 12)
                    .copyWith(color: AppColors.grayMedium)),
          ),
        ],
      ),
    );
  }
}
