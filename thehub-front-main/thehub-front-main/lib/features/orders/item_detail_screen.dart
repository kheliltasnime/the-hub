import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';
import '../../core/api/api_client.dart';
import '../auth/auth_provider.dart';
import 'models/order_models.dart';
import 'orders_provider.dart';

/// Écran de détail article — volontairement SANS options de personnalisation
/// (taille, type de lait, suppléments) malgré ce que montre la maquette :
/// POST /orders/cart/add n'accepte que { menuItemId, quantite } dans le
/// contrat actuel. Afficher des sélecteurs qui ne seraient pas envoyés au
/// backend serait trompeur. À enrichir si/quand le contrat évolue.
class ItemDetailScreen extends ConsumerStatefulWidget {
  final MenuItem item;

  const ItemDetailScreen({super.key, required this.item});

  @override
  ConsumerState<ItemDetailScreen> createState() => _ItemDetailScreenState();
}

class _ItemDetailScreenState extends ConsumerState<ItemDetailScreen> {
  int _quantity = 1;
  bool _adding = false;

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

  Future<void> _addToCart() async {
    setState(() => _adding = true);
    try {
      await ref.read(cartProvider.notifier).add(menuItemId: widget.item.id, quantite: _quantity);
      if (mounted) context.pop();
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _adding = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final item = widget.item;
    final total = item.prix * _quantity;
    final user = ref.watch(authProvider).user;
    final initials = _initials(user?.fullName ?? '');

    return Scaffold(
      backgroundColor: AppColors.secondary,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              child: Row(
                children: [
                  IconButton(
                    tooltip: 'Retour',
                    icon: const Icon(Icons.arrow_back,
                        color: AppColors.neutral),
                    onPressed: () => context.pop(),
                  ),
                  const Spacer(),
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
                  const SizedBox(width: 8),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: EdgeInsets.zero,
                children: [
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(
                        bottom: Radius.circular(20)),
                    child: item.imageUrl != null
                        ? Image.network(item.imageUrl!,
                            width: double.infinity,
                            height: 220,
                            fit: BoxFit.cover)
                        : Container(
                            height: 220,
                            color: AppColors.tertiary,
                            child: const Icon(Icons.local_cafe_outlined,
                                size: 48, color: AppColors.grayMedium)),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                                child: Text(item.nom,
                                    style:
                                        AppTypography.headline(size: 22))),
                            Text('${item.prix.toStringAsFixed(2)} DT',
                                style: AppTypography.body(
                                        size: 16,
                                        color: AppColors.primary)
                                    .copyWith(
                                        fontWeight: FontWeight.w700)),
                          ],
                        ),
                        if (item.description != null) ...[
                          const SizedBox(height: 8),
                          Text(item.description!,
                              style:
                                  AppTypography.body(color: AppColors.grayMedium)),
                        ],
                        if (!item.disponible) ...[
                          const SizedBox(height: 16),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                                color: AppColors.error.withOpacity(0.08),
                                borderRadius: BorderRadius.circular(10)),
                            child: Text(
                                'Cet article n\'est pas disponible actuellement.',
                                style: AppTypography.body(
                                    size: 13, color: AppColors.error)),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
            if (item.disponible)
              Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  children: [
                    _QuantityStepper(
                      quantity: _quantity,
                      onChanged: (q) => setState(() => _quantity = q),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: _adding ? null : _addToCart,
                        child: _adding
                            ? const SizedBox(
                                height: 18,
                                width: 18,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2, color: Colors.white))
                            : Text(
                                'Ajouter au panier · ${total.toStringAsFixed(2)} DT'),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _QuantityStepper extends StatelessWidget {
  final int quantity;
  final ValueChanged<int> onChanged;

  const _QuantityStepper({required this.quantity, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: AppColors.neutral.withOpacity(0.15)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.remove, size: 18),
            onPressed: quantity > 1 ? () => onChanged(quantity - 1) : null,
          ),
          Text('$quantity', style: AppTypography.body(size: 15).copyWith(fontWeight: FontWeight.w700)),
          IconButton(
            icon: const Icon(Icons.add, size: 18),
            onPressed: () => onChanged(quantity + 1),
          ),
        ],
      ),
    );
  }
}