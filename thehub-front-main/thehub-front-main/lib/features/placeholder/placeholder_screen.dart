import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/app_bottom_nav.dart';
import '../../core/widgets/app_page_header.dart';

/// Écran temporaire pour les onglets pas encore construits (Explorer,
/// Communauté, etc.). Réutilise le header standardisé (flèche retour +
/// initiales + cloche de notifications) et la barre de navigation basse.
class PlaceholderScreen extends StatelessWidget {
  final String title;
  final int navIndex;
  final IconData icon;

  const PlaceholderScreen({
    super.key,
    required this.title,
    required this.navIndex,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.secondary,
      bottomNavigationBar: AppBottomNav(currentIndex: navIndex),
      body: SafeArea(
        child: Column(
          children: [
            AppPageHeader(title: title),
            Expanded(
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(icon,
                        size: 48, color: AppColors.primary.withOpacity(0.5)),
                    const SizedBox(height: 16),
                    Text(title, style: AppTypography.headline(size: 24)),
                    const SizedBox(height: 8),
                    Text('Bientôt disponible',
                        style:
                            AppTypography.body(color: AppColors.grayMedium)),
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