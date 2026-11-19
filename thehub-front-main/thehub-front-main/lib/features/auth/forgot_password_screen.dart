import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import 'auth_provider.dart';

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  bool _isLoading = false;
  bool _sent = false;

  bool get _canSubmit =>
      _emailController.text.trim().isNotEmpty &&
      RegExp(r'^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$')
          .hasMatch(_emailController.text.trim()) &&
      !_isLoading &&
      !_sent;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    try {
      await ref.read(authRepositoryProvider).forgotPassword(
            email: _emailController.text.trim(),
          );
      if (!mounted) return;
      setState(() => _sent = true);
      final email = _emailController.text.trim();
      context.go('/reset-password?email=${Uri.encodeQueryComponent(email)}');
    } on ApiException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.message)),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Impossible d\'envoyer le lien.')),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
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
                      context.canPop() ? context.pop() : context.go('/login'),
                ),
                const SizedBox(height: 18),
                Center(
                  child: Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.14),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.lock_reset_outlined,
                      color: AppColors.primary,
                      size: 23,
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                Center(
                  child: Text(
                    'Mot de passe oublié ? 🔑',
                    textAlign: TextAlign.center,
                    style: AppTypography.headline(size: 27),
                  ),
                ),
                const SizedBox(height: 10),
                Center(
                  child: Text(
                    _sent
                        ? 'Vérifiez votre boîte email pour réinitialiser votre mot de passe.'
                        : 'Entrez votre adresse email pour recevoir un lien de réinitialisation.',
                    textAlign: TextAlign.center,
                    style: AppTypography.body(
                      size: 12,
                      color: AppColors.grayMedium,
                    ),
                  ),
                ),
                const SizedBox(height: 28),
                Text('Adresse Email', style: AppTypography.label()),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _emailController,
                  enabled: !_sent,
                  keyboardType: TextInputType.emailAddress,
                  onChanged: (_) => setState(() {}),
                  decoration: const InputDecoration(
                    prefixIcon: Icon(Icons.mail_outline, size: 18),
                    hintText: 'exemple@email.com',
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Veuillez renseigner votre email.';
                    }
                    final email = value.trim();
                    final emailRegex = RegExp(
                      r'^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$',
                    );
                    if (!emailRegex.hasMatch(email)) {
                      return 'Adresse email invalide.';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _canSubmit ? _submit : null,
                    child: _isLoading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : Text(_sent ? 'LIEN ENVOYÉ' : 'ENVOYER LE LIEN'),
                  ),
                ),
                const SizedBox(height: 20),
                Center(
                  child: GestureDetector(
                    onTap: () => context.go('/reset-password'),
                    child: Text(
                      'J’ai déjà un code de réinitialisation',
                      style: AppTypography.label(size: 12, color: AppColors.primary),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.network(
                    'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800',
                    height: 150,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      height: 150,
                      color: AppColors.tertiary,
                      child: const Icon(
                        Icons.desktop_mac_outlined,
                        color: AppColors.grayMedium,
                        size: 42,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 38),
                Center(
                  child: GestureDetector(
                    onTap: () => context.go('/login'),
                    child: RichText(
                      text: TextSpan(
                        style: AppTypography.body(
                          size: 11,
                          color: AppColors.grayMedium,
                        ),
                        children: [
                          const TextSpan(text: 'Se souvenir du compte ?  '),
                          TextSpan(
                            text: 'Retour à la connexion',
                            style: AppTypography.label(
                              size: 11,
                              color: AppColors.primary,
                            ),
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
