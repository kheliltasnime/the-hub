import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';
import '../auth/auth_provider.dart';

/// Écran de démarrage — conforme à la maquette (fond clair + photo, logo,
/// 2 CTA), pas au dégradé sombre décrit dans le texte du CDC.
///
/// Logique : on vérifie la session en tâche de fond dès l'ouverture.
///   - Session valide  -> redirection auto et immédiate vers /home (pas
///     besoin d'afficher les CTA à quelqu'un déjà connecté).
///   - Pas de session  -> on affiche cet écran d'accueil avec les 2 boutons,
///     l'utilisateur choisit lui-même Login ou Register (contrairement à
///     un splash qui timeout tout seul).
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  bool _checking = true;

  @override
  void initState() {
    super.initState();
    _checkSession();
  }

  Future<void> _checkSession() async {
    await ref.read(authProvider.notifier).checkExistingSession();
    if (!mounted) return;

    setState(() => _checking = false);
  }

  @override
  Widget build(BuildContext context) {
    if (_checking) {
      return const Scaffold(
        backgroundColor: AppColors.secondary,
        body:
            Center(child: CircularProgressIndicator(color: AppColors.primary)),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.secondary,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            children: [
              const Spacer(flex: 3),
              // TODO: remplacer par l'icône de la charte (logo hexagonal à
              // points) une fois l'asset SVG fourni par le design.
              const Icon(Icons.hub_outlined,
                  color: AppColors.primary, size: 48),
              const SizedBox(height: 16),
              Text('The Hub Ghazela', style: AppTypography.headline(size: 28)),
              const SizedBox(height: 8),
              Text(
                'Espace de Coworking Premium & Connecté',
                textAlign: TextAlign.center,
                style: AppTypography.body(color: AppColors.grayMedium),
              ),
              const Spacer(flex: 4),
              ElevatedButton(
                onPressed: () => context.go('/login'),
                child: const Text('Se connecter →'),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () => context.go('/register'),
                child: const Text('Créer un compte'),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
