import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';
import '../../core/api/api_client.dart';
import '../auth/auth_provider.dart';
import '../home/home_provider.dart';
import 'models/order_models.dart';
import 'orders_provider.dart';
import 'orders_repository.dart';

class CartScreen extends ConsumerStatefulWidget {
  const CartScreen({super.key});

  @override
  ConsumerState<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends ConsumerState<CartScreen> {
  bool _checkingOut = false;
  String _pickupMode = 'emporter';

  Future<void> _checkout({bool confirmMalgreRush = false}) async {
    setState(() => _checkingOut = true);
    try {
      final result = await ref
          .read(cartProvider.notifier)
          .checkout(confirmMalgreRush: confirmMalgreRush);
      ref.invalidate(walletBalanceProvider);
      if (mounted) {
        context.pushReplacement('/order/confirmation', extra: result);
      }
    } on RushModeWarning catch (e) {
      if (mounted) {
        setState(() => _checkingOut = false);
        final confirmed = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Forte affluence'),
            content: Text(e.message),
            actions: [
              TextButton(
                  onPressed: () => Navigator.of(context).pop(false),
                  child: const Text('Annuler')),
              ElevatedButton(
                  onPressed: () => Navigator.of(context).pop(true),
                  child: const Text('Confirmer quand même')),
            ],
          ),
        );
        if (confirmed == true) {
          await _checkout(confirmMalgreRush: true);
        }
      }
      return;
    } on ApiException catch (e) {
      if (mounted) {
        String message = e.message;
        if (e.code == 'INSUFFICIENT_BALANCE') {
          message =
              'Solde Wallet insuffisant. Rechargez votre compte pour continuer.';
        } else if (e.code == 'WALLET_UNAVAILABLE') {
          message =
              'Paiement temporairement indisponible — réessayez dans un instant.';
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(message), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _checkingOut = false);
    }
  }

  Future<void> _clearCart() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Vider le panier ?'),
        content: const Text('Tous les articles seront supprimés du panier.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Vider'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    try {
      await ref.read(cartProvider.notifier).clear();
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message), backgroundColor: AppColors.error),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final cartAsync = ref.watch(cartProvider);
    final balance = ref.watch(walletBalanceProvider);

    return Scaffold(
      backgroundColor: AppColors.secondary,
      body: SafeArea(
        child: cartAsync.when(
          data: (cart) {
            if (cart.isEmpty && !_checkingOut) {
              return Column(
                children: [
                  const _Header(title: 'Mon Panier'),
                  Expanded(
                    child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.shopping_bag_outlined,
                              size: 48, color: AppColors.grayMedium),
                          const SizedBox(height: 12),
                          Text('Votre panier est vide.',
                              style: AppTypography.body(
                                  color: AppColors.grayMedium)),
                        ],
                      ),
                    ),
                  ),
                ],
              );
            }

            return Column(
              children: [
                _Header(
                  title: 'Mon Panier',
                  action: IconButton(
                    tooltip: 'Vider le panier',
                    icon: const Icon(Icons.delete_outline),
                    onPressed: _clearCart,
                  ),
                ),
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    children: [
                      const SizedBox(height: 8),
                      ...cart.items.map((item) => _CartItemRow(item: item)),
                      const SizedBox(height: 20),
                      Text('MODE DE RÉCUPÉRATION',
                          style: AppTypography.label(size: 11)),
                      const SizedBox(height: 8),
                      _PickupModeSelector(
                        selected: _pickupMode,
                        onSelect: (m) => setState(() => _pickupMode = m),
                      ),
                      const SizedBox(height: 20),
                      Text('MOYEN DE PAIEMENT',
                          style: AppTypography.label(size: 11)),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppColors.tertiary,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                              color: AppColors.primary.withOpacity(0.3)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.account_balance_wallet_outlined,
                                color: AppColors.primary),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                'Hub Wallet (Solde : ${balance.toStringAsFixed(2)} DT)',
                                style: AppTypography.body(size: 13),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                      _TotalsSummary(subtotal: cart.total),
                      const SizedBox(height: 100),
                    ],
                  ),
                ),
              ],
            );
          },
          loading: () => const Center(
              child: CircularProgressIndicator(color: AppColors.primary)),
          error: (_, __) => Center(
            child: Text('Impossible de charger le panier.',
                style: AppTypography.body(color: AppColors.error)),
          ),
        ),
      ),
      bottomNavigationBar: cartAsync.maybeWhen(
        data: (cart) => cart.isEmpty
            ? null
            : SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: ElevatedButton(
                    onPressed: _checkingOut ? null : _checkout,
                    child: _checkingOut
                        ? const SizedBox(
                            height: 18,
                            width: 18,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white))
                        : Text(
                            'Payer & Valider la commande (${cart.total.toStringAsFixed(2)} DT)'),
                  ),
                ),
              ),
        orElse: () => null,
      ),
    );
  }
}

class _Header extends ConsumerWidget {
  final String title;
  final Widget? action;

  const _Header({required this.title, this.action});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final name = user?.fullName ?? '';
    final parts = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((p) => p.isNotEmpty)
        .toList();
    final initials = parts.isEmpty
        ? '?'
        : parts.length == 1
            ? parts.first.substring(0, 1).toUpperCase()
            : '${parts.first[0]}${parts.last[0]}'.toUpperCase();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      child: Row(
        children: [
          IconButton(
            tooltip: 'Retour',
            icon: const Icon(Icons.arrow_back, color: AppColors.neutral),
            onPressed: () => context.pop(),
          ),
          Expanded(
            child: Text(title, style: AppTypography.headline(size: 18)),
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
          if (action != null) ...[
            const SizedBox(width: 4),
            action!,
          ],
        ],
      ),
    );
  }
}

class _CartItemRow extends ConsumerWidget {
  final CartItem item;

  const _CartItemRow({required this.item});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
          color: AppColors.tertiary, borderRadius: BorderRadius.circular(14)),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: item.imageUrl != null
                ? Image.network(item.imageUrl!,
                    width: 56, height: 56, fit: BoxFit.cover)
                : Container(
                    width: 56,
                    height: 56,
                    color: AppColors.secondary,
                    child: const Icon(Icons.local_cafe_outlined,
                        color: AppColors.grayMedium)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.nom,
                    style: AppTypography.body(size: 14)
                        .copyWith(fontWeight: FontWeight.w700)),
                Text('${item.prix.toStringAsFixed(2)} DT',
                    style: AppTypography.label(
                        size: 12, color: AppColors.primary)),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Supprimer l’article',
            icon: const Icon(Icons.delete_outline, color: AppColors.error),
            onPressed: () async {
              try {
                await ref.read(cartProvider.notifier).remove(item.menuItemId);
              } on ApiException catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                        content: Text(e.message),
                        backgroundColor: AppColors.error),
                  );
                }
              }
            },
          ),
          Row(
            children: [
              _stepperButton(Icons.remove, () async {
                if (item.quantite <= 1) {
                  await ref.read(cartProvider.notifier).remove(item.menuItemId);
                } else {
                  await ref.read(cartProvider.notifier).updateQuantity(
                      menuItemId: item.menuItemId, quantite: item.quantite - 1);
                }
              }),
              SizedBox(
                  width: 28,
                  child: Text('${item.quantite}',
                      textAlign: TextAlign.center,
                      style: AppTypography.body(size: 13))),
              _stepperButton(Icons.add, () async {
                await ref.read(cartProvider.notifier).updateQuantity(
                    menuItemId: item.menuItemId, quantite: item.quantite + 1);
              }),
            ],
          ),
        ],
      ),
    );
  }

  Widget _stepperButton(IconData icon, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        width: 28,
        height: 28,
        decoration: BoxDecoration(
            border: Border.all(color: AppColors.neutral.withOpacity(0.15)),
            shape: BoxShape.circle),
        child: Icon(icon, size: 14, color: AppColors.neutral),
      ),
    );
  }
}

class _PickupModeSelector extends StatelessWidget {
  final String selected;
  final ValueChanged<String> onSelect;

  const _PickupModeSelector({required this.selected, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: GestureDetector(
            onTap: () => onSelect('emporter'),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 12),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: selected == 'emporter'
                    ? AppColors.neutral
                    : AppColors.tertiary,
                borderRadius:
                    const BorderRadius.horizontal(left: Radius.circular(12)),
              ),
              child: Text('À emporter',
                  style: AppTypography.label(
                      size: 12,
                      color: selected == 'emporter'
                          ? Colors.white
                          : AppColors.neutral)),
            ),
          ),
        ),
        Expanded(
          child: GestureDetector(
            onTap: () => onSelect('livraison'),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 12),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: selected == 'livraison'
                    ? AppColors.neutral
                    : AppColors.tertiary,
                borderRadius:
                    const BorderRadius.horizontal(right: Radius.circular(12)),
              ),
              child: Text('Livraison',
                  style: AppTypography.label(
                      size: 12,
                      color: selected == 'livraison'
                          ? Colors.white
                          : AppColors.neutral)),
            ),
          ),
        ),
      ],
    );
  }
}

class _TotalsSummary extends StatelessWidget {
  final double subtotal;

  const _TotalsSummary({required this.subtotal});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _row('Sous-total', subtotal),
        _row('Service', 0),
        const Divider(height: 24),
        _row('Total', subtotal, bold: true),
      ],
    );
  }

  Widget _row(String label, double value, {bool bold = false}) {
    final style = bold
        ? AppTypography.body(size: 16)
            .copyWith(fontWeight: FontWeight.w700, color: AppColors.primary)
        : AppTypography.body(size: 14);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: style),
          Text('${value.toStringAsFixed(2)} DT', style: style),
        ],
      ),
    );
  }
}
