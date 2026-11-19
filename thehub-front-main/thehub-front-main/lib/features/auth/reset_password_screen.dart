import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import 'auth_provider.dart';

class ResetPasswordScreen extends ConsumerStatefulWidget {
  const ResetPasswordScreen({super.key, required this.email});

  final String? email;

  @override
  ConsumerState<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends ConsumerState<ResetPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _codeController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirm = true;
  bool _isLoading = false;

  @override
  void dispose() {
    _codeController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (widget.email == null || widget.email!.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Email introuvable pour cette réinitialisation.')),
      );
      return;
    }

    setState(() => _isLoading = true);
    try {
      await ref.read(authRepositoryProvider).verifyResetCode(
        email: widget.email!,
        code: _codeController.text.trim(),
      );
      await ref.read(authRepositoryProvider).resetPassword(
        email: widget.email!,
        code: _codeController.text.trim(),
        newPassword: _passwordController.text,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Votre mot de passe a été réinitialisé.')),
      );
      context.go('/login');
    } on ApiException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.message)),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Impossible de réinitialiser le mot de passe.')),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final canSubmit =
        widget.email != null &&
        widget.email!.trim().isNotEmpty &&
        _codeController.text.trim().length == 6 &&
        _passwordController.text.length >= 8 &&
        _confirmController.text == _passwordController.text &&
        !_isLoading;

    return Scaffold(
      backgroundColor: AppColors.secondary,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Form(
            key: _formKey,
            autovalidateMode: AutovalidateMode.onUserInteraction,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 8),
                IconButton(
                  icon: const Icon(Icons.arrow_back, color: AppColors.neutral),
                  onPressed: () => context.canPop() ? context.pop() : context.go('/login'),
                ),
                const SizedBox(height: 16),
                Text('Réinitialisation', style: AppTypography.headline(size: 30)),
                const SizedBox(height: 6),
                Text(
                  'Saisissez le code reçu par email puis définissez un nouveau mot de passe.',
                  style: AppTypography.body(color: AppColors.grayMedium),
                ),
                const SizedBox(height: 28),
                Text('Code de vérification', style: AppTypography.label()),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _codeController,
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  onChanged: (_) => setState(() {}),
                  decoration: const InputDecoration(
                    hintText: '123456',
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) return 'Veuillez saisir le code reçu.';
                    if (value.trim().length != 6) return 'Le code doit contenir 6 chiffres.';
                    return null;
                  },
                ),
                const SizedBox(height: 18),
                Text('Nouveau mot de passe', style: AppTypography.label()),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                    hintText: '8 caractères minimum',
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                        color: AppColors.grayMedium,
                      ),
                      onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                    ),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) return 'Veuillez renseigner un mot de passe.';
                    if (value.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.';
                    return null;
                  },
                ),
                const SizedBox(height: 18),
                Text('Confirmer le mot de passe', style: AppTypography.label()),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _confirmController,
                  obscureText: _obscureConfirm,
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                    hintText: 'Confirmez votre mot de passe',
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscureConfirm ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                        color: AppColors.grayMedium,
                      ),
                      onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
                    ),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) return 'Veuillez confirmer votre mot de passe.';
                    if (value != _passwordController.text) return 'Les mots de passe sont différents.';
                    return null;
                  },
                ),
                const SizedBox(height: 28),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: canSubmit ? _submit : null,
                    child: _isLoading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text('VALIDER'),
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
