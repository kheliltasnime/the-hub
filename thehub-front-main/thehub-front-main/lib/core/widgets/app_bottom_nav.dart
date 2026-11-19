import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme/app_theme.dart';

class AppBottomNav extends StatelessWidget {
  final int currentIndex;

  const AppBottomNav({super.key, required this.currentIndex});

  static const _tabs = [
    (icon: Icons.home_rounded, label: 'Accueil', route: '/home'),
    (icon: Icons.explore_outlined, label: 'Explorer', route: '/explore'),
    (icon: Icons.shopping_bag_outlined, label: 'Commander', route: '/order'),
    (icon: Icons.groups_outlined, label: 'Communauté', route: '/community'),
    (icon: Icons.credit_card_outlined, label: 'Ma Carte', route: '/card'),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.tertiary,
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 12, offset: const Offset(0, -2)),
        ],
      ),
      child: SafeArea(
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: List.generate(_tabs.length, (i) {
            final tab = _tabs[i];
            final selected = i == currentIndex;
            final color = selected ? AppColors.primary : AppColors.grayMedium;
            return Expanded(
              child: InkWell(
                onTap: selected ? null : () => context.go(tab.route),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(tab.icon, color: color, size: 24),
                      const SizedBox(height: 4),
                      Text(
                        tab.label,
                        style: AppTypography.label(size: 10, color: color),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }),
        ),
      ),
    );
  }
}