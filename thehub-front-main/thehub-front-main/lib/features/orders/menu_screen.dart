import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';
import '../../core/api/api_client.dart';
import '../auth/auth_provider.dart';
import 'models/order_models.dart';
import 'orders_provider.dart';

/// Le backend regroupe actuellement les catégories par categorieId (uuid)
/// plutôt que par nom, contrairement à ce que décrit le contrat v7
/// ("categories": { "Plats": [...] }) — écart à faire remonter côté
/// backend. En attendant, on masque l'UUID brut à l'écran.
final _uuidPattern = RegExp(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', caseSensitive: false);

String _displayCategoryLabel(String key, int index) {
  return _uuidPattern.hasMatch(key) ? 'Catégorie ${index + 1}' : key;
}

class MenuScreen extends ConsumerStatefulWidget {
  final String enseigneId;

  const MenuScreen({super.key, required this.enseigneId});

  @override
  ConsumerState<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends ConsumerState<MenuScreen> {
  String? _selectedCategory;

  @override
  Widget build(BuildContext context) {
    final menuAsync = ref.watch(menuProvider(widget.enseigneId));
    final cartAsync = ref.watch(cartProvider);

    return Scaffold(
      backgroundColor: AppColors.secondary,
      body: SafeArea(
        child: menuAsync.when(
          data: (menu) {
            if (menu.categories.isEmpty) {
              return Column(
                children: [
                  _MenuHeader(enseigne: menu.enseigne),
                  Expanded(
                    child: Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Text(
                          'Aucun article disponible pour le moment dans ce menu.',
                          textAlign: TextAlign.center,
                          style: AppTypography.body(color: AppColors.grayMedium),
                        ),
                      ),
                    ),
                  ),
                ],
              );
            }

            _selectedCategory ??= menu.categories.first.categorie;
            final activeGroup = menu.categories.firstWhere(
              (g) => g.categorie == _selectedCategory,
              orElse: () => menu.categories.first,
            );

            return Column(
              children: [
                _MenuHeader(enseigne: menu.enseigne),
                const SizedBox(height: 12),
                const _MenuSearchBar(),
                const SizedBox(height: 12),
                _CategoryTabs(
                  categories: menu.categories.map((g) => g.categorie).toList(),
                  selected: _selectedCategory!,
                  onSelect: (c) => setState(() => _selectedCategory = c),
                ),
                const SizedBox(height: 8),
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
                    children: [
                      Text(
                        _displayCategoryLabel(activeGroup.categorie, menu.categories.indexOf(activeGroup)),
                        style: AppTypography.headline(size: 20),
                      ),
                      const SizedBox(height: 12),
                      ...activeGroup.items.map((item) => _MenuItemRow(item: item)),
                      const SizedBox(height: 80),
                    ],
                  ),
                ),
              ],
            );
          },
          loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
          error: (err, stack) {
            // ignore: avoid_print
            print('🔴 Erreur chargement menu: $err');
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('Impossible de charger ce menu.', style: AppTypography.body(color: AppColors.error)),
                    const SizedBox(height: 8),
                    Text('$err', style: AppTypography.label(size: 11, color: AppColors.grayMedium), textAlign: TextAlign.center),
                    const SizedBox(height: 12),
                    TextButton(onPressed: () => context.pop(), child: const Text('Retour')),
                  ],
                ),
              ),
            );
          },
        ),
      ),
      bottomNavigationBar: cartAsync.maybeWhen(
        data: (cart) => cart.isEmpty ? null : _CartBar(cart: cart),
        orElse: () => null,
      ),
    );
  }
}

class _MenuHeader extends ConsumerWidget {
  final Enseigne enseigne;

  const _MenuHeader({required this.enseigne});

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
      padding: const EdgeInsets.fromLTRB(8, 8, 12, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              IconButton(
                tooltip: 'Retour',
                icon: const Icon(Icons.arrow_back, color: AppColors.neutral),
                onPressed: () => context.pop(),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(enseigne.nom,
                        style: AppTypography.headline(size: 20)),
                    if (enseigne.category != null)
                      Text(enseigne.category!,
                          style: AppTypography.label(size: 11)),
                  ],
                ),
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
          if (enseigne.rating != null)
            Padding(
              padding: const EdgeInsets.only(left: 16, top: 6),
              child: Row(
                children: [
                  const Icon(Icons.star, size: 14, color: AppColors.primary),
                  const SizedBox(width: 3),
                  Text('${enseigne.rating}',
                      style: AppTypography.label(size: 12)),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _MenuSearchBar extends StatefulWidget {
  const _MenuSearchBar();

  @override
  State<_MenuSearchBar> createState() => _MenuSearchBarState();
}

class _MenuSearchBarState extends State<_MenuSearchBar> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(color: AppColors.tertiary, borderRadius: BorderRadius.circular(12)),
        child: Row(
          children: [
            const Icon(Icons.search, color: AppColors.grayMedium, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: TextField(
                controller: _controller,
                decoration: InputDecoration(
                  border: InputBorder.none,
                  hintText: 'Rechercher dans le menu...',
                  hintStyle: AppTypography.body(size: 13, color: AppColors.grayMedium),
                ),
                // TODO: brancher sur GET /orders/menu/:enseigne/search dès que
                // l'écran a besoin d'afficher des résultats filtrés.
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CategoryTabs extends StatelessWidget {
  final List<String> categories;
  final String selected;
  final ValueChanged<String> onSelect;

  const _CategoryTabs({required this.categories, required this.selected, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 40,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        itemCount: categories.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final c = categories[i];
          final isSelected = c == selected;
          return GestureDetector(
            onTap: () => onSelect(c),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primary : AppColors.tertiary,
                borderRadius: BorderRadius.circular(20),
              ),
              alignment: Alignment.center,
              child: Text(_displayCategoryLabel(c, i), style: AppTypography.label(size: 12, color: isSelected ? Colors.white : AppColors.neutral)),
            ),
          );
        },
      ),
    );
  }
}

class _MenuItemRow extends ConsumerWidget {
  final MenuItem item;

  const _MenuItemRow({required this.item});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return GestureDetector(
      onTap: () => context.push('/order/item', extra: item),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: AppColors.tertiary, borderRadius: BorderRadius.circular(16)),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item.nom, style: AppTypography.body(size: 15).copyWith(fontWeight: FontWeight.w700)),
                  if (item.description != null) ...[
                    const SizedBox(height: 4),
                    Text(item.description!, style: AppTypography.label(size: 12), maxLines: 2, overflow: TextOverflow.ellipsis),
                  ],
                  const SizedBox(height: 8),
                  Text('${item.prix.toStringAsFixed(2)} DT', style: AppTypography.body(size: 14).copyWith(fontWeight: FontWeight.w700)),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Column(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: item.imageUrl != null
                      ? Image.network(item.imageUrl!, width: 72, height: 72, fit: BoxFit.cover)
                      : Container(width: 72, height: 72, color: AppColors.secondary, child: const Icon(Icons.local_cafe_outlined, color: AppColors.grayMedium)),
                ),
                const SizedBox(height: 8),
                GestureDetector(
                  onTap: item.disponible ? () => _quickAdd(context, ref) : null,
                  child: Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                      color: item.disponible ? AppColors.primary : AppColors.grayMedium,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.add, color: Colors.white, size: 18),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _quickAdd(BuildContext context, WidgetRef ref) async {
    try {
      await ref.read(cartProvider.notifier).add(menuItemId: item.id, quantite: 1);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${item.nom} ajouté au panier'), duration: const Duration(seconds: 1)),
        );
      }
    } on ApiException catch (e) {
      if (context.mounted) {
        // Cas notable : CART_SINGLE_ENSEIGNE_ONLY (409) si un panier existe
        // déjà pour une autre enseigne — message backend affiché tel quel.
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message), backgroundColor: AppColors.error),
        );
      }
    }
  }
}

class _CartBar extends StatelessWidget {
  final Cart cart;

  const _CartBar({required this.cart});

  @override
  Widget build(BuildContext context) {
    final count = cart.items.fold(0, (sum, i) => sum + i.quantite);
    return SafeArea(
      child: GestureDetector(
        onTap: () => context.push('/order/cart'),
        child: Container(
          margin: const EdgeInsets.all(16),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          decoration: BoxDecoration(color: AppColors.neutral, borderRadius: BorderRadius.circular(16)),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '$count article${count > 1 ? 's' : ''} au panier (${cart.total.toStringAsFixed(2)} DT)',
                style: AppTypography.body(size: 13, color: Colors.white),
              ),
              Text('Voir le panier', style: AppTypography.label(size: 12, color: const Color(0xFFE8D5A0))),
            ],
          ),
        ),
      ),
    );
  }
}