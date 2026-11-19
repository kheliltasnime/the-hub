import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/app_bottom_nav.dart';
import '../../core/api/api_client.dart';
import '../auth/auth_provider.dart';
import '../orders/orders_provider.dart';
import 'home_provider.dart';
import 'models/home_models.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final initials = _initialsFrom(user?.fullName ?? '');

    return Scaffold(
      backgroundColor: AppColors.secondary,
      bottomNavigationBar: const AppBottomNav(currentIndex: 0),
      body: SafeArea(
        bottom: false,
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
                child: _HeroCard(
                    fullName: user?.fullName ?? '', initials: initials)),
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.only(top: 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _SectionTitle(title: 'Raccourcis rapides'),
                    SizedBox(height: 12),
                    _QuickShortcuts(),
                    SizedBox(height: 28),
                    _SectionTitle(title: 'Recommandé pour toi'),
                    SizedBox(height: 12),
                    _RecommendedList(),
                    SizedBox(height: 28),
                    _SectionTitle(title: 'Prochains événements'),
                    SizedBox(height: 12),
                    _EventsList(),
                    SizedBox(height: 28),
                    _SectionTitle(title: 'Mes réservations'),
                    SizedBox(height: 12),
                    _ReservationsTabs(),
                    SizedBox(height: 32),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _initialsFrom(String fullName) {
    final parts = fullName
        .trim()
        .split(RegExp(r'\s+'))
        .where((p) => p.isNotEmpty)
        .toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return (parts.first.substring(0, 1) + parts.last.substring(0, 1))
        .toUpperCase();
  }
}

/// Carte héro sombre : salutation + avatar, puis carte or Solde/Fidélité.
class _HeroCard extends ConsumerWidget {
  final String fullName;
  final String initials;

  const _HeroCard({required this.fullName, required this.initials});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final trimmedParts = fullName.trim().split(RegExp(r'\s+'));
    final firstName = trimmedParts.isNotEmpty ? trimmedParts.first : '';
    final balance = ref.watch(walletBalanceProvider);
    final loyaltyPoints = ref.watch(loyaltyPointsProvider);

    return Container(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: AppColors.splashGradient,
        ),
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Bonjour $firstName',
                style: AppTypography.headline(size: 26)
                    .copyWith(color: Colors.white),
              ),
              GestureDetector(
                onTap: () => context.push('/profile'),
                child: CircleAvatar(
                  radius: 20,
                  backgroundColor: Colors.white.withOpacity(0.15),
                  child: Text(
                    initials,
                    style: AppTypography.body(size: 14, color: Colors.white)
                        .copyWith(fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AppColors.primary,
              borderRadius: BorderRadius.circular(18),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('SOLDE ACTUEL',
                          style: AppTypography.label(
                              size: 11, color: Colors.white70)),
                      const SizedBox(height: 6),
                      Text(
                        '${balance.toStringAsFixed(2)} DT',
                        style: AppTypography.headline(size: 26)
                            .copyWith(color: Colors.white),
                      ),
                      const SizedBox(height: 10),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: 0.6,
                          minHeight: 4,
                          backgroundColor: Colors.white.withOpacity(0.25),
                          valueColor:
                              const AlwaysStoppedAnimation(Colors.white),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text('FIDÉLITÉ',
                        style: AppTypography.label(
                            size: 11, color: Colors.white70)),
                    const SizedBox(height: 6),
                    Text(
                      '$loyaltyPoints pts',
                      style: AppTypography.body(size: 16, color: Colors.white)
                          .copyWith(fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;

  const _SectionTitle({required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title.toUpperCase(), style: AppTypography.label(size: 12)),
        ],
      ),
    );
  }
}

class _QuickShortcuts extends ConsumerWidget {
  const _QuickShortcuts();

  static const _items = [
    (icon: Icons.print_outlined, label: 'Imprimerie', route: '/explore'),
    (icon: Icons.coffee_outlined, label: 'Commander', route: '/order'),
    (icon: Icons.laptop_mac_outlined, label: 'Coworking', route: '/explore'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SizedBox(
      height: 84,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        itemCount: _items.length + 3,
        separatorBuilder: (_, __) => const SizedBox(width: 20),
        itemBuilder: (context, i) {
          if (i == 0) {
            return GestureDetector(
              onTap: () => context.go('/rooftop'),
              child: const _ShortcutIcon(
                icon: Icons.wb_sunny_outlined,
                label: 'Rooftop',
              ),
            );
          }
          if (i == 1) return const _CartShortcut();
          if (i == 2) return const _TrackingShortcut();
          final item = _items[i - 3];
          return GestureDetector(
            onTap: () => context.go(item.route),
            child: _ShortcutIcon(
              icon: item.icon,
              label: item.label,
            ),
          );
        },
      ),
    );
  }
}

class _ShortcutIcon extends StatelessWidget {
  final IconData icon;
  final String label;
  final int? badge;

  const _ShortcutIcon({required this.icon, required this.label, this.badge});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Stack(
          clipBehavior: Clip.none,
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: AppColors.tertiary,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                      color: Colors.black.withOpacity(0.05), blurRadius: 6)
                ],
              ),
              child: Icon(icon, color: AppColors.neutral, size: 22),
            ),
            if (badge != null && badge! > 0)
              Positioned(
                right: -4,
                top: -4,
                child: Container(
                  constraints:
                      const BoxConstraints(minWidth: 19, minHeight: 19),
                  padding: const EdgeInsets.symmetric(horizontal: 5),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.secondary, width: 2),
                  ),
                  child: Text(
                    '$badge',
                    style: AppTypography.label(size: 9, color: Colors.white),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 6),
        Text(label, style: AppTypography.label(size: 11)),
      ],
    );
  }
}

class _CartShortcut extends ConsumerWidget {
  const _CartShortcut();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cartItemCount = ref.watch(cartItemCountProvider);
    return GestureDetector(
      onTap: () => context.push('/order/cart'),
      child: _ShortcutIcon(
        icon: Icons.shopping_bag_outlined,
        label: 'Panier',
        badge: cartItemCount,
      ),
    );
  }
}

class _TrackingShortcut extends ConsumerWidget {
  const _TrackingShortcut();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return GestureDetector(
      onTap: () async {
        final order = await ref.read(latestOrderProvider.future);
        if (!context.mounted) return;
        if (order == null) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Aucune commande à suivre.')),
          );
          return;
        }
        context.push('/order/tracking/${order.orderId}');
      },
      child: const _ShortcutIcon(
        icon: Icons.track_changes_outlined,
        label: 'Suivi',
      ),
    );
  }
}

class _RecommendedList extends ConsumerWidget {
  const _RecommendedList();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final recommendations = ref.watch(recommendedItemsProvider);
    return recommendations.when(
      loading: () => const SizedBox(
        height: 128,
        child: Center(child: CircularProgressIndicator()),
      ),
      error: (_, __) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: Text('Impossible de charger les recommandations.',
            style: AppTypography.body(color: AppColors.grayMedium)),
      ),
      data: (items) {
        if (items.isEmpty) {
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Text('Aucun article recommandé pour le moment.',
                style: AppTypography.body(color: AppColors.grayMedium)),
          );
        }
        return SizedBox(
          height: 128,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(width: 14),
            itemBuilder: (context, i) => _RecommendedCard(item: items[i]),
          ),
        );
      },
    );
  }
}

class _RecommendedCard extends ConsumerStatefulWidget {
  final RecommendedItem item;

  const _RecommendedCard({required this.item});

  @override
  ConsumerState<_RecommendedCard> createState() => _RecommendedCardState();
}

class _RecommendedCardState extends ConsumerState<_RecommendedCard> {
  bool _adding = false;

  Future<void> _addToCart() async {
    setState(() => _adding = true);
    try {
      await ref.read(cartProvider.notifier).add(
            menuItemId: widget.item.item.id,
            quantite: 1,
          );
      if (mounted) {
        final messenger = ScaffoldMessenger.of(context);
        final snackBarController = messenger.showSnackBar(
          SnackBar(
            content: const Text('Article ajouté au panier.'),
            duration: const Duration(seconds: 2),
            action: SnackBarAction(
              label: 'Voir le panier',
              onPressed: () => context.push('/order/cart'),
            ),
          ),
        );
        Future<void>.delayed(const Duration(seconds: 2), () {
          snackBarController.close();
        });
      }
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
    final item = widget.item.item;
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () => context.push('/order/item', extra: item),
      child: Container(
        width: 280,
        decoration: BoxDecoration(
          color: AppColors.tertiary,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8)
          ],
        ),
        child: Row(
          children: [
            ClipRRect(
              borderRadius:
                  const BorderRadius.horizontal(left: Radius.circular(16)),
              child: item.imageUrl != null
                  ? Image.network(item.imageUrl!,
                      width: 96, height: 128, fit: BoxFit.cover)
                  : Container(
                      width: 96,
                      height: 128,
                      color: AppColors.secondary,
                      child: const Icon(Icons.restaurant,
                          color: AppColors.grayMedium),
                    ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(item.nom,
                        style: AppTypography.body(size: 14)
                            .copyWith(fontWeight: FontWeight.w700),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                    Text(widget.item.enseigneName,
                        style: AppTypography.label(size: 11),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('${item.prix.toStringAsFixed(2)} DT',
                            style: AppTypography.body(size: 13)
                                .copyWith(fontWeight: FontWeight.w700)),
                        GestureDetector(
                          onTap: _adding ? null : _addToCart,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                                color: _adding
                                    ? AppColors.grayMedium
                                    : AppColors.primary,
                                borderRadius: BorderRadius.circular(20)),
                            child: Text(_adding ? '...' : '+ Ajouter',
                                style: AppTypography.label(
                                    size: 10, color: Colors.white)),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EventsList extends ConsumerWidget {
  const _EventsList();

  static const _mois = [
    'JAN',
    'FÉV',
    'MAR',
    'AVR',
    'MAI',
    'JUIN',
    'JUIL',
    'AOÛT',
    'SEP',
    'OCT',
    'NOV',
    'DÉC'
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final events = ref.watch(upcomingEventsProvider);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        children: events
            .map((e) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                        color: AppColors.tertiary,
                        borderRadius: BorderRadius.circular(16)),
                    child: Row(
                      children: [
                        Container(
                          width: 52,
                          height: 52,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                              color: AppColors.secondary,
                              borderRadius: BorderRadius.circular(12)),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(_mois[e.date.month - 1],
                                  style: AppTypography.label(
                                      size: 10, color: AppColors.primary)),
                              Text('${e.date.day}',
                                  style: AppTypography.body(size: 16)
                                      .copyWith(fontWeight: FontWeight.w700)),
                            ],
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(e.title,
                                  style: AppTypography.body(size: 14)
                                      .copyWith(fontWeight: FontWeight.w700)),
                              const SizedBox(height: 2),
                              Text('${e.time} — ${e.location}',
                                  style: AppTypography.label(size: 11)),
                            ],
                          ),
                        ),
                        OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            minimumSize: const Size(0, 32),
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            side: const BorderSide(color: AppColors.primary),
                            foregroundColor: AppColors.primary,
                          ),
                          onPressed: () => context.push('/event', extra: e),
                          child: Text('Réserver',
                              style: AppTypography.label(
                                  size: 12, color: AppColors.primary)),
                        ),
                      ],
                    ),
                  ),
                ))
            .toList(),
      ),
    );
  }
}

class _ReservationsTabs extends ConsumerWidget {
  const _ReservationsTabs();

  static List<TodayReservation> _sorted(List<TodayReservation> items) {
    final copy = [...items];
    copy.sort((a, b) => a.startTime.compareTo(b.startTime));
    return copy;
  }

  static List<TodayReservation> _today(
      List<TodayReservation> items, DateTime now) {
    return _sorted(items.where((r) {
      final sameDay = r.startTime.year == now.year &&
          r.startTime.month == now.month &&
          r.startTime.day == now.day;
      return sameDay || (r.startTime.isBefore(now) && r.endTime.isAfter(now));
    }).toList());
  }

  static List<TodayReservation> _upcoming(
      List<TodayReservation> items, DateTime now) {
    return _sorted(items.where((r) => r.startTime.isAfter(now)).toList());
  }

  static List<TodayReservation> _history(
      List<TodayReservation> items, DateTime now) {
    return _sorted(items.where((r) => r.endTime.isBefore(now)).toList());
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reservationsAsync = ref.watch(allReservationsProvider);

    return reservationsAsync.when(
      data: (reservations) {
        final now = DateTime.now();
        final tabs = <List<TodayReservation>>[
          _today(reservations, now),
          _upcoming(reservations, now),
          _history(reservations, now),
        ];

        return DefaultTabController(
          length: 3,
          child: Column(
            children: [
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 20),
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: AppColors.tertiary,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: TabBar(
                  isScrollable: false,
                  labelColor: Colors.white,
                  unselectedLabelColor: AppColors.neutral,
                  indicator: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  tabs: const [
                    Tab(text: 'Aujourd\'hui'),
                    Tab(text: 'À venir'),
                    Tab(text: 'Historique'),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                height: 260,
                child: TabBarView(
                  children: tabs.map((items) {
                    if (items.isEmpty) {
                      return Center(
                        child: Text(
                          'Aucune réservation.',
                          style:
                              AppTypography.body(color: AppColors.grayMedium),
                        ),
                      );
                    }

                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: ListView.builder(
                        padding: EdgeInsets.zero,
                        itemCount: items.length,
                        itemBuilder: (context, index) => _ReservationCard(
                          reservation: items[index],
                          label: items[index].status,
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],
          ),
        );
      },
      loading: () => const Center(
        child: Padding(
          padding: EdgeInsets.all(12),
          child: CircularProgressIndicator(
              strokeWidth: 2, color: AppColors.primary),
        ),
      ),
      error: (_, __) => Text(
        'Réservations indisponibles pour le moment.',
        style: AppTypography.label(color: AppColors.grayMedium),
      ),
    );
  }
}

class _ReservationCard extends StatelessWidget {
  final TodayReservation reservation;
  final String label;

  const _ReservationCard({required this.reservation, required this.label});

  String _fmt(DateTime t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    final color =
        label == 'Historique' ? AppColors.grayMedium : AppColors.primary;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
          color: AppColors.tertiary, borderRadius: BorderRadius.circular(16)),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: const BoxDecoration(
                color: AppColors.secondary, shape: BoxShape.circle),
            child: const Icon(Icons.chair_alt_outlined,
                color: AppColors.primary, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${reservation.spaceName} — ${reservation.zone}',
                    style: AppTypography.body(size: 14)
                        .copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(
                    '${_fmt(reservation.startTime)} - ${_fmt(reservation.endTime)}',
                    style: AppTypography.label(size: 11)),
              ],
            ),
          ),
          Row(
            children: [
              Container(
                  width: 6,
                  height: 6,
                  decoration:
                      BoxDecoration(color: color, shape: BoxShape.circle)),
              const SizedBox(width: 4),
              Text(label, style: AppTypography.label(size: 11, color: color)),
            ],
          ),
        ],
      ),
    );
  }
}
