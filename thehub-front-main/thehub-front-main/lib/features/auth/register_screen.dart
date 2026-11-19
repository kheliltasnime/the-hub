import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';
import 'auth_provider.dart';
import 'auth_repository.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _fullNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  ProfileType _profileType = ProfileType.etudiant;
  bool _obscurePassword = true;

  @override
  void dispose() {
    _fullNameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final success = await ref.read(authProvider.notifier).register(
          email: _emailController.text.trim(),
          password: _passwordController.text,
          fullName: _fullNameController.text.trim(),
          profileType: _profileType,
        );

    if (!mounted) return;
    if (success) {
      // register() ne connecte pas automatiquement (le backend ne renvoie
      // pas de tokens sur cet endpoint) -> on retourne à Login avec un
      // message de succès et l'email pré-rempli.
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Compte créé ! Connecte-toi pour continuer.')),
      );
      context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final fullName = _fullNameController.text.trim();
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    final emailRegex = RegExp(
      r'^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$',
    );
    final canSubmit = fullName.isNotEmpty &&
        fullName.length >= 2 &&
        email.isNotEmpty &&
        emailRegex.hasMatch(email) &&
        password.length >= 8 &&
        !authState.isLoading;

    ref.listen(authProvider, (previous, next) {
      if (next.errorMessage != null && next.errorMessage != previous?.errorMessage) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(next.errorMessage!), backgroundColor: AppColors.neutral),
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
            autovalidateMode: AutovalidateMode.onUserInteraction,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 8),
                IconButton(
                  icon: const Icon(Icons.arrow_back, color: AppColors.neutral),
                  onPressed: () => context.canPop() ? context.pop() : context.go('/splash'),
                ),
                const SizedBox(height: 16),
                Text('Créer un compte', style: AppTypography.headline(size: 30)),
                const SizedBox(height: 6),
                Text(
                  'Rejoins The Hub Ghazela en quelques secondes.',
                  style: AppTypography.body(color: AppColors.grayMedium),
                ),
                const SizedBox(height: 28),

                Text('Nom complet', style: AppTypography.label()),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _fullNameController,
                  onChanged: (_) => setState(() {}),
                  decoration: const InputDecoration(hintText: 'Prénom Nom'),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return 'Veuillez renseigner votre nom complet.';
                    if (v.trim().length < 2) return 'Le nom doit contenir au moins 2 caractères.';
                    return null;
                  },
                ),
                const SizedBox(height: 18),

                Text('Adresse Email', style: AppTypography.label()),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  onChanged: (_) => setState(() {}),
                  decoration: const InputDecoration(hintText: 'nom@exemple.com'),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) {
                      return 'Veuillez renseigner votre email.';
                    }
                    final email = v.trim();
                    final emailRegex = RegExp(
                      r'^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$',
                    );
                    if (!emailRegex.hasMatch(email)) {
                      return 'Adresse email invalide.';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 18),

                Text('Mot de passe', style: AppTypography.label()),
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
                  validator: (v) {
                    if (v == null || v.isEmpty) return 'Veuillez renseigner un mot de passe.';
                    if (v.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.';
                    return null;
                  },
                ),
                const SizedBox(height: 18),

                Text('Profil', style: AppTypography.label()),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: _ProfileTypeChip(
                        label: 'Étudiant',
                        selected: _profileType == ProfileType.etudiant,
                        onTap: () => setState(() => _profileType = ProfileType.etudiant),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _ProfileTypeChip(
                        label: 'Professionnel',
                        selected: _profileType == ProfileType.professionnel,
                        onTap: () => setState(() => _profileType = ProfileType.professionnel),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 28),

                ElevatedButton(
                  onPressed: canSubmit ? _submit : null,
                  child: authState.isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('CRÉER MON COMPTE'),
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

class _ProfileTypeChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _ProfileTypeChip({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? AppColors.primary : AppColors.tertiary,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? AppColors.primary : AppColors.neutral.withValues(alpha: 0.1),
          ),
        ),
        child: Text(
          label,
          style: AppTypography.body(
            size: 13,
            color: selected ? Colors.white : AppColors.neutral,
          ).copyWith(fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}
