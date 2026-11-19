import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/app_bottom_nav.dart';
import '../../core/widgets/app_page_header.dart';
import 'explore_provider.dart';
import 'models/explore_models.dart';
import 'booking_bottom_sheet.dart';

class ExploreScreen extends ConsumerWidget {
  const ExploreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final spacesAsync = ref.watch(coworkingSpacesProvider);

    return Scaffold(
      backgroundColor: AppColors.secondary,
      bottomNavigationBar: const AppBottomNav(currentIndex: 1),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async => ref.refresh(coworkingSpacesProvider.future),
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              const SliverToBoxAdapter(
                child: AppPageHeader(title: 'Explorer'),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: AppColors.tertiary,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(
                              Icons.arrow_back_ios_new,
                              color: AppColors.neutral,
                              size: 18,
                            ),
                          ),
                          const SizedBox(width: 16),
                          Text(
                            'Agence de Com',
                            style: AppTypography.headline(size: 22),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.tertiary,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Studio & Com Hub',
                              style: AppTypography.headline(size: 18),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'ESPACES COWORKING',
                              style: AppTypography.label(size: 12)
                                  .copyWith(color: AppColors.primary),
                            ),
                            const SizedBox(height: 12),
                            Text(
                              'Réserve un espace — paiement wallet immédiat',
                              style: AppTypography.body(size: 13)
                                  .copyWith(color: AppColors.grayMedium),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              ...spacesAsync.when(
                loading: () => [
                  const SliverFillRemaining(
                    hasScrollBody: false,
                    child: Center(child: CircularProgressIndicator()),
                  ),
                ],
                error: (err, _) => [
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            err is ApiException
                                ? err.message
                                : 'Impossible de charger les espaces',
                            textAlign: TextAlign.center,
                            style: AppTypography.body(size: 14)
                                .copyWith(color: AppColors.error),
                          ),
                          const SizedBox(height: 16),
                          TextButton(
                            onPressed: () =>
                                ref.invalidate(coworkingSpacesProvider),
                            child: const Text('Réessayer'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
                data: (spaces) {
                  if (spaces.isEmpty) {
                    return [
                      SliverFillRemaining(
                        hasScrollBody: false,
                        child: Center(
                          child: Text(
                            'Aucun espace disponible',
                            style: AppTypography.body(size: 14)
                                .copyWith(color: AppColors.grayMedium),
                          ),
                        ),
                      ),
                    ];
                  }
                  return [
                    SliverPadding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (context, index) {
                            final space = spaces[index];
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 20),
                              child: _SpaceCard(space: space),
                            );
                          },
                          childCount: spaces.length,
                        ),
                      ),
                    ),
                    const SliverToBoxAdapter(child: SizedBox(height: 24)),
                  ];
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SpaceCard extends StatelessWidget {
  final CoworkingSpace space;

  const _SpaceCard({required this.space});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.tertiary,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
            child: Image.network(
              space.imageUrl,
              height: 180,
              width: double.infinity,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                height: 180,
                color: AppColors.grayMedium.withOpacity(0.2),
                child: const Icon(Icons.business,
                    color: AppColors.grayMedium, size: 48),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        space.name,
                        style: AppTypography.headline(size: 18),
                      ),
                    ),
                    if (space.status != null)
                      Text(
                        space.status!,
                        style: AppTypography.label(size: 10)
                            .copyWith(color: AppColors.primary),
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  space.description,
                  style: AppTypography.body(size: 13)
                      .copyWith(color: AppColors.grayMedium),
                ),
                const SizedBox(height: 12),
                Text(
                  space.pricing,
                  style: AppTypography.body(size: 14)
                      .copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    onPressed: () {
                      showModalBottomSheet(
                        context: context,
                        isScrollControlled: true,
                        backgroundColor: Colors.transparent,
                        builder: (_) => BookingBottomSheet(space: space),
                      );
                    },
                    child: Text(
                      'Réserver cet espace',
                      style: AppTypography.label(size: 14, color: Colors.white),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
