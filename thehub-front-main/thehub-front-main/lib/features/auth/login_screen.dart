import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';
// ✅ Import pour ApiException
import 'auth_provider.dart';
import 'google_oauth_service.dart';
import 'package:dio/dio.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final success = await ref.read(authProvider.notifier).login(
          email: _emailController.text.trim(),
          password: _passwordController.text,
        );
    if (!mounted) return;
    if (success) context.go('/home');
  }

  /// Connexion Google native (conforme CDC)
  Future<void> _handleGoogleSignIn() async {
    print('🟢 1. Début connexion Google');

    final googleService = GoogleOAuthService();
    print('🟢 2. Service Google créé');

    final idToken = await googleService.signInWithGoogle();

    print('🟢 3. ID Token: ${idToken != null ? "OUI" : "NON"}');

    if (idToken == null) {
      print('🟡 4. Token null - utilisateur a annulé');
      return;
    }

    print('🟢 4. Token: ${idToken.substring(0, 30)}...');

    try {
      print('🟢 5. Envoi au backend...');
      final user = await ref
          .read(authRepositoryProvider)
          .loginWithGoogleIdToken(idToken);
      print('🟢 6. Réponse reçue: ${user.email}');

      if (mounted) {
        await ref.read(authProvider.notifier).checkExistingSession();
        if (mounted) {
          print('🟢 7. Connexion réussie !');
          context.go('/home');
        }
      }
    } catch (e) {
      print('🔴 ERREUR: $e');
      if (e is DioException) {
        print('🔴 STATUS: ${e.response?.statusCode}');
        print('🔴 DÉTAIL BACKEND: ${e.response?.data}');
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Erreur: $e'), backgroundColor: AppColors.neutral),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    ref.listen(authProvider, (previous, next) {
      if (next.errorMessage != null &&
          next.errorMessage != previous?.errorMessage) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(next.errorMessage!),
              backgroundColor: AppColors.neutral),
        );
      }
    });

    return Scaffold(
      backgroundColor: AppColors.secondary,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 8),
                IconButton(
                  icon: const Icon(Icons.arrow_back, color: AppColors.neutral),
                  onPressed: () =>
                      context.canPop() ? context.pop() : context.go('/splash'),
                ),
                const SizedBox(height: 16),
                Text('Bon retour', style: AppTypography.headline(size: 30)),
                const SizedBox(height: 6),
                Text(
                  'Connectez-vous pour accéder à vos services.',
                  style: AppTypography.body(color: AppColors.grayMedium),
                ),
                const SizedBox(height: 32),
                Text('Adresse Email', style: AppTypography.label()),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration:
                      const InputDecoration(hintText: 'nom@exemple.com'),
                  validator: (value) => (value == null || !value.contains('@'))
                      ? 'Adresse email invalide'
                      : null,
                ),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Mot de passe', style: AppTypography.label()),
                    GestureDetector(
                      onTap: () => context.go('/forgot-password'),
                      child: Text(
                        'Mot de passe oublié ?',
                        style: AppTypography.label(
                            size: 12, color: AppColors.primary),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  decoration: InputDecoration(
                    hintText: '••••••••',
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscurePassword
                            ? Icons.visibility_off_outlined
                            : Icons.visibility_outlined,
                        color: AppColors.grayMedium,
                      ),
                      onPressed: () =>
                          setState(() => _obscurePassword = !_obscurePassword),
                    ),
                  ),
                  validator: (value) => (value == null || value.length < 8)
                      ? 'Mot de passe trop court (8 min.)'
                      : null,
                ),
                const SizedBox(height: 28),
                ElevatedButton(
                  onPressed: authState.isLoading ? null : _submit,
                  child: authState.isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('SE CONNECTER'),
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    const Expanded(child: Divider(color: AppColors.grayMedium)),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      child: Text('OU CONTINUER AVEC',
                          style: AppTypography.label(size: 11)),
                    ),
                    const Expanded(child: Divider(color: AppColors.grayMedium)),
                  ],
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    // BOUTON GOOGLE - Version native (conforme CDC)
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          backgroundColor: AppColors.tertiary,
                          side: BorderSide(
                              color: AppColors.neutral.withOpacity(0.1)),
                        ),
                        onPressed:
                            authState.isLoading ? null : _handleGoogleSignIn,
                        icon: Image.network(
                          'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg',
                          height: 20,
                          width: 20,
                          errorBuilder: (context, error, stackTrace) =>
                              const Icon(Icons.g_mobiledata, size: 20),
                        ),
                        label:
                            Text('Google', style: AppTypography.body(size: 13)),
                      ),
                    ),
                    const SizedBox(width: 12),

                    // BOUTON APPLE
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          backgroundColor: AppColors.tertiary,
                          side: BorderSide(
                              color: AppColors.neutral.withOpacity(0.1)),
                        ),
                        onPressed: () {
                          // TODO: Apple Sign In
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content:
                                  Text('Connexion Apple bientôt disponible'),
                            ),
                          );
                        },
                        icon: const Icon(Icons.apple,
                            size: 20, color: AppColors.neutral),
                        label:
                            Text('Apple', style: AppTypography.body(size: 13)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                Center(
                  child: GestureDetector(
                    onTap: () => context.go('/register'),
                    child: RichText(
                      text: TextSpan(
                        style: AppTypography.body(
                            size: 13, color: AppColors.grayMedium),
                        children: [
                          const TextSpan(text: "Pas encore de compte ? "),
                          TextSpan(
                            text: 'S\'inscrire gratuitement',
                            style: AppTypography.body(
                                    size: 13, color: AppColors.primary)
                                .copyWith(fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
