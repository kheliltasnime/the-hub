import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/app_bottom_nav.dart';
import '../../core/widgets/app_page_header.dart';
import 'models/order_models.dart';
import 'orders_provider.dart';

class CommanderScreen extends ConsumerStatefulWidget {
  const CommanderScreen({super.key});

  @override
  ConsumerState<CommanderScreen> createState() => _CommanderScreenState();
}

class _CommanderScreenState extends ConsumerState<CommanderScreen> {
  String _selectedFilter = 'Tous';

  @override
  Widget build(BuildContext context) {
    final enseignesAsync = ref.watch(enseignesProvider);

    return Scaffold(
      backgroundColor: AppColors.secondary,
      bottomNavigationBar: const AppBottomNav(currentIndex: 2),
      body: SafeArea(
        child: Column(
          children: [
            const AppPageHeader(title: 'Commander'),
            const SizedBox(height: 12),
            _SearchBar(),
            const SizedBox(height: 12),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                children: [
                  const SizedBox(height: 4),
                  Text('Toutes les enseignes',
                      style: AppTypography.headline(size: 20)),
                  const SizedBox(height: 12),
                  enseignesAsync.when(
                    data: (enseignes) {
                      // Filtres masqués tant que le backend ne fournit pas de
                      // catégorie par enseigne (GET /orders/enseignes ne
                      // renvoie aujourd'hui que id/nom/rushMode — cf. audit
                      // front/backend). Un filtre affiché sur un champ
                      // toujours null renvoyait "Aucune enseigne pour ce
                      // filtre" sur tout sauf "Tous", pour n'importe quel
                      // choix de l'utilisateur.
                      //
                      // Dès que `category` sera exposé par l'API, les tabs
                      // réapparaîtront automatiquement, construits à partir
                      // des vraies valeurs reçues plutôt que d'une liste
                      // devinée à la main.
                      final categories = enseignes
                          .map((e) => e.category)
                          .whereType<String>()
                          .toSet()
                          .toList()
                        ..sort();

                      final filtered =
                          (_selectedFilter == 'Tous' || categories.isEmpty)
                              ? enseignes
                              : enseignes
                                  .where((e) => e.category == _selectedFilter)
                                  .toList();

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (categories.isNotEmpty) ...[
                            _FilterTabs(
                              filters: ['Tous', ...categories],
                              selected: _selectedFilter,
                              onSelect: (f) =>
                                  setState(() => _selectedFilter = f),
                              padding: EdgeInsets.zero,
                            ),
                            const SizedBox(height: 12),
                          ],
                          if (filtered.isEmpty)
                            Padding(
                              padding: const EdgeInsets.symmetric(vertical: 24),
                              child: Text('Aucune enseigne pour ce filtre.',
                                  style: AppTypography.body(
                                      color: AppColors.grayMedium)),
                            )
                          else
                            Column(
                                children: filtered
                                    .map((e) => _EnseigneCard(enseigne: e))
                                    .toList()),
                        ],
                      );
                    },
                    loading: () => const Padding(
                      padding: EdgeInsets.symmetric(vertical: 32),
                      child: Center(
                          child: CircularProgressIndicator(
                              color: AppColors.primary)),
                    ),
                    error: (err, _) => Padding(
                      padding: const EdgeInsets.symmetric(vertical: 24),
                      child: Text('Impossible de charger les enseignes.',
                          style: AppTypography.body(color: AppColors.error)),
                    ),
                  ),
                  const SizedBox(height: 28),
                  Text('Mes Commandes',
                      style: AppTypography.headline(size: 20)),
                  const SizedBox(height: 12),
                  const _MyOrdersSection(),
                  const SizedBox(height: 32),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SearchBar extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
            color: AppColors.tertiary, borderRadius: BorderRadius.circular(12)),
        child: Row(
          children: [
            const Icon(Icons.search, color: AppColors.grayMedium, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: TextField(
                decoration: InputDecoration(
                  border: InputBorder.none,
                  hintText: 'Rechercher un plat, une boisson...',
                  hintStyle:
                      AppTypography.body(size: 13, color: AppColors.grayMedium),
                ),
              ),
            ),
            const Icon(Icons.tune, color: AppColors.grayMedium, size: 20),
          ],
        ),
      ),
    );
  }
}

class _FilterTabs extends StatelessWidget {
  final List<String> filters;
  final String selected;
  final ValueChanged<String> onSelect;
  final EdgeInsetsGeometry padding;

  const _FilterTabs({
    required this.filters,
    required this.selected,
    required this.onSelect,
    this.padding = const EdgeInsets.symmetric(horizontal: 20),
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 40,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: padding,
        itemCount: filters.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final f = filters[i];
          final isSelected = f == selected;
          return GestureDetector(
            onTap: () => onSelect(f),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primary : AppColors.tertiary,
                borderRadius: BorderRadius.circular(20),
              ),
              alignment: Alignment.center,
              child: Text(
                f,
                style: AppTypography.label(
                    size: 12,
                    color: isSelected ? Colors.white : AppColors.neutral),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _EnseigneCard extends StatelessWidget {
  final Enseigne enseigne;

  const _EnseigneCard({required this.enseigne});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/order/menu/${enseigne.id}'),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
            color: AppColors.tertiary, borderRadius: BorderRadius.circular(16)),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: enseigne.imageUrl != null
                  ? Image.network(enseigne.imageUrl!,
                      width: 64, height: 64, fit: BoxFit.cover)
                  : Container(
                      width: 64,
                      height: 64,
                      color: AppColors.secondary,
                      child: const Icon(Icons.storefront_outlined,
                          color: AppColors.grayMedium),
                    ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(enseigne.nom,
                            style: AppTypography.body(size: 15)
                                .copyWith(fontWeight: FontWeight.w700)),
                      ),
                      if (enseigne.isOpen ?? true)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                              color: AppColors.secondary,
                              borderRadius: BorderRadius.circular(10)),
                          child: Text('Ouvert',
                              style: AppTypography.label(
                                  size: 10, color: AppColors.primary)),
                        ),
                    ],
                  ),
                  if (enseigne.category != null)
                    Text(enseigne.category!,
                        style: AppTypography.label(size: 11)),
                  if (enseigne.rating != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Row(
                        children: [
                          const Icon(Icons.star,
                              size: 12, color: AppColors.primary),
                          const SizedBox(width: 3),
                          Text('${enseigne.rating}',
                              style: AppTypography.label(size: 11)),
                        ],
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

/// MOCK — pas d'endpoint "liste de mes commandes" trouvé dans le contrat.
/// À remplacer dès qu'un GET /orders/me (ou équivalent) existe côté backend.
class _MyOrdersSection extends StatefulWidget {
  const _MyOrdersSection();

  @override
  State<_MyOrdersSection> createState() => _MyOrdersSectionState();
}

class _MyOrdersSectionState extends State<_MyOrdersSection> {
  bool _showHistorique = false;

  // Mock temporaire — à remplacer par le vrai orderId dès que cette section
  // sera connectée à une vraie commande active (cf. TODO plus bas).
  static const _mockOrderId = 'ORD-5541';

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            _OrderTab(
                label: 'En cours',
                selected: !_showHistorique,
                onTap: () => setState(() => _showHistorique = false)),
            const SizedBox(width: 20),
            _OrderTab(
                label: 'Historique',
                selected: _showHistorique,
                onTap: () => setState(() => _showHistorique = true)),
          ],
        ),
        const SizedBox(height: 14),
        if (!_showHistorique)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
                color: AppColors.tertiary,
                borderRadius: BorderRadius.circular(16)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('The Brew',
                        style: AppTypography.body(size: 15)
                            .copyWith(fontWeight: FontWeight.w700)),
                    Text('12.50 DT',
                        style: AppTypography.body(size: 15)
                            .copyWith(fontWeight: FontWeight.w700)),
                  ],
                ),
                Text('#$_mockOrderId', style: AppTypography.label(size: 11)),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Container(
                        width: 6,
                        height: 6,
                        decoration: const BoxDecoration(
                            color: AppColors.primary, shape: BoxShape.circle)),
                    const SizedBox(width: 6),
                    Text('En préparation',
                        style: AppTypography.label(
                            size: 12, color: AppColors.primary)),
                  ],
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    // TODO(données réelles) : '_mockOrderId' est en dur tant
                    // que cette section n'est pas branchée sur une vraie
                    // commande (pas d'endpoint GET /orders/me côté backend —
                    // cf. discussion précédente). La navigation fonctionne,
                    // mais l'écran de suivi affichera "Commande introuvable"
                    // pour cet ID fictif tant que ce n'est pas remplacé par
                    // un vrai orderId.
                    onPressed: () =>
                        context.push('/order/tracking/$_mockOrderId'),
                    child: const Text('Suivre la commande / QR Code'),
                  ),
                ),
              ],
            ),
          )
        else
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
                color: AppColors.tertiary,
                borderRadius: BorderRadius.circular(16)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Green Spot',
                        style: AppTypography.body(size: 15)
                            .copyWith(fontWeight: FontWeight.w700)),
                    Text('18.00 DT',
                        style: AppTypography.body(size: 15)
                            .copyWith(fontWeight: FontWeight.w700)),
                  ],
                ),
                Text('#ORD-4820 • Hier', style: AppTypography.label(size: 11)),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.check_circle_outline,
                        size: 14, color: AppColors.grayMedium),
                    const SizedBox(width: 6),
                    Text('Terminée', style: AppTypography.label(size: 12)),
                  ],
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: () {},
                    child: const Text('Commander à nouveau'),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _OrderTab extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _OrderTab(
      {required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Text(
            label,
            style: AppTypography.body(
                    size: 13,
                    color: selected ? AppColors.primary : AppColors.grayMedium)
                .copyWith(
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w400),
          ),
          const SizedBox(height: 4),
          Container(
              height: 2,
              width: 50,
              color: selected ? AppColors.primary : Colors.transparent),
        ],
      ),
    );
  }
}
