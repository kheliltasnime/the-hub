import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../core/theme/app_theme.dart';
import '../auth/auth_provider.dart';
import 'models/order_models.dart';
import 'orders_provider.dart';

class OrderConfirmationScreen extends ConsumerWidget {
  final CheckoutResult result;

  const OrderConfirmationScreen({super.key, required this.result});

  String _initials(String name) {
    final parts = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((p) => p.isNotEmpty)
        .toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final name = user?.fullName ?? '';
    final initials = _initials(name);

    return Scaffold(
      backgroundColor: AppColors.secondary,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              child: Row(
                children: [
                  IconButton(
                    tooltip: 'Retour',
                    icon: const Icon(Icons.arrow_back,
                        color: AppColors.neutral),
                    onPressed: () => context.go('/order'),
                  ),
                  Expanded(
                    child: Text('Confirmation',
                        style: AppTypography.headline(size: 18)),
                  ),
                  IconButton(
                    tooltip: 'Notifications',
                    icon: const Icon(Icons.notifications_none,
                        color: AppColors.neutral),
                    onPressed: () {},
                  ),
                  GestureDetector(
                    onTap: () => context.push('/profile'),
                    child: CircleAvatar(
                      radius: 18,
                      backgroundColor: AppColors.primary,
                      child: Text(initials,
                          style: AppTypography.label(
                              size: 11, color: Colors.white)),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    const SizedBox(height: 12),
              Container(
                width: 64,
                height: 64,
                decoration: const BoxDecoration(color: AppColors.success, shape: BoxShape.circle),
                child: const Icon(Icons.check, color: Colors.white, size: 32),
              ),
              const SizedBox(height: 16),
              Text('Commande Confirmée !', style: AppTypography.headline(size: 22), textAlign: TextAlign.center),
              const SizedBox(height: 8),
              Text(
                'Votre commande a bien été reçue et est en préparation.',
                style: AppTypography.body(color: AppColors.grayMedium),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: AppColors.tertiary, borderRadius: BorderRadius.circular(16)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _summaryRow('Commande N°', '#${result.orderId.substring(0, 8).toUpperCase()}'),
                    const SizedBox(height: 8),
                    _summaryRow('Statut', result.statut),
                    const SizedBox(height: 8),
                    _summaryRow('Total payé', '${result.total.toStringAsFixed(2)} DT', highlight: true),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(color: AppColors.neutral, borderRadius: BorderRadius.circular(16)),
                child: FutureBuilder<OrderQr>(
                  future: ref.read(ordersRepositoryProvider).fetchQr(result.orderId),
                  builder: (context, snapshot) {
                    return Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('Ticket de Retrait', style: AppTypography.headline(size: 16).copyWith(color: AppColors.primary)),
                        const SizedBox(height: 6),
                        Text(
                          'Présentez ce code au comptoir pour récupérer votre commande.',
                          style: AppTypography.label(size: 11, color: Colors.white70),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.all(12),
                          color: Colors.white,
                          child: snapshot.connectionState == ConnectionState.waiting
                              ? const SizedBox(height: 140, width: 140, child: Center(child: CircularProgressIndicator(strokeWidth: 2)))
                              : snapshot.hasError || snapshot.data == null || snapshot.data!.qrToken.isEmpty
                                  ? SizedBox(
                                      height: 140,
                                      width: 140,
                                      child: Center(
                                        child: Text('QR indisponible', style: AppTypography.label(size: 11, color: AppColors.grayMedium)),
                                      ),
                                    )
                                  : QrImageView(data: snapshot.data!.qrToken, size: 140),
                        ),
                        const SizedBox(height: 12),
                        Text('CODE : ${result.orderId.substring(0, 8).toUpperCase()}', style: AppTypography.label(size: 12, color: AppColors.primary)),
                      ],
                    );
                  },
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => context.push('/order/tracking/${result.orderId}', extra: result),
                  child: const Text('Suivre la commande en temps réel'),
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () => context.go('/order'),
                  child: const Text('Retour à l\'Accueil'),
                ),
              ),
              const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _summaryRow(String label, String value, {bool highlight = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: AppTypography.label(size: 12)),
        Text(
          value,
          style: highlight
              ? AppTypography.body(size: 15, color: AppColors.primary).copyWith(fontWeight: FontWeight.w700)
              : AppTypography.body(size: 13).copyWith(fontWeight: FontWeight.w600),
        ),
      ],
    );
  }
}