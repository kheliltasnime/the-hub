import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../auth/auth_provider.dart';
import '../wallet/wallet_provider.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  String _initials(String name) {
    final parts = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
  }

  void _showPersonalInfoDialog(
    BuildContext context,
    String name,
    String email,
    String profileLabel,
  ) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 42,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Text('Informations personnelles',
                  style: AppTypography.headline(size: 20)),
              const SizedBox(height: 18),
              _InfoRow(label: 'Nom', value: name),
              const SizedBox(height: 12),
              _InfoRow(label: 'Email', value: email),
              const SizedBox(height: 12),
              _InfoRow(label: 'Profil', value: profileLabel),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  void _showPaymentMethodsSheet(BuildContext context, double balance) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 42,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Text(
                'Moyens de paiement',
                style: AppTypography.headline(size: 20),
              ),
              const SizedBox(height: 18),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFF5E7C7),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.account_balance_wallet,
                          color: Colors.white, size: 21),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Hub Wallet',
                            style: AppTypography.body(size: 14)
                                .copyWith(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${balance.toStringAsFixed(2)} DT disponible',
                            style: AppTypography.label(
                                size: 11, color: AppColors.grayMedium),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 5),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        'Actif',
                        style: AppTypography.label(
                            size: 10, color: AppColors.primary),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showSecuritySheet(BuildContext context, WidgetRef ref) {
    final currentController = TextEditingController();
    final newController = TextEditingController();
    final confirmController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) {
        bool showCurrentPassword = false;
        bool showNewPassword = false;
        bool showConfirmPassword = false;

        return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          child: StatefulBuilder(
            builder: (_, setState) {
              final shortNewPassword = newController.text.isNotEmpty &&
                  newController.text.length < 8;
              final mismatch = newController.text.isNotEmpty &&
                  confirmController.text.isNotEmpty &&
                  newController.text != confirmController.text;
              final isValid = currentController.text.isNotEmpty &&
                  newController.text.isNotEmpty &&
                  confirmController.text.isNotEmpty &&
                  newController.text.length >= 8 &&
                  newController.text == confirmController.text;

              return Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 42,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),
                  Text('Sécurité & mots de passe',
                      style: AppTypography.headline(size: 20)),
                  const SizedBox(height: 18),
                  TextField(
                    controller: currentController,
                    obscureText: !showCurrentPassword,
                    decoration: InputDecoration(
                      labelText: 'Mot de passe actuel',
                      border: const OutlineInputBorder(),
                      suffixIcon: IconButton(
                        icon: Icon(
                          showCurrentPassword
                              ? Icons.visibility_off_outlined
                              : Icons.visibility_outlined,
                          color: AppColors.grayMedium,
                        ),
                        onPressed: () => setState(
                            () => showCurrentPassword = !showCurrentPassword),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: newController,
                    obscureText: !showNewPassword,
                    onChanged: (_) => setState(() {}),
                    decoration: InputDecoration(
                      labelText: 'Nouveau mot de passe',
                      border: const OutlineInputBorder(),
                      suffixIcon: IconButton(
                        icon: Icon(
                          showNewPassword
                              ? Icons.visibility_off_outlined
                              : Icons.visibility_outlined,
                          color: AppColors.grayMedium,
                        ),
                        onPressed: () =>
                            setState(() => showNewPassword = !showNewPassword),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: confirmController,
                    obscureText: !showConfirmPassword,
                    onChanged: (_) => setState(() {}),
                    decoration: InputDecoration(
                      labelText: 'Confirmer le nouveau mot de passe',
                      border: const OutlineInputBorder(),
                      suffixIcon: IconButton(
                        icon: Icon(
                          showConfirmPassword
                              ? Icons.visibility_off_outlined
                              : Icons.visibility_outlined,
                          color: AppColors.grayMedium,
                        ),
                        onPressed: () => setState(
                            () => showConfirmPassword = !showConfirmPassword),
                      ),
                    ),
                  ),
                  if (shortNewPassword || mismatch) ...[
                    const SizedBox(height: 8),
                    Text(
                      shortNewPassword
                          ? 'Le mot de passe doit contenir au moins 8 caractères.'
                          : 'Les mots de passe sont différents.',
                      style: AppTypography.label(
                          size: 11, color: Colors.red.shade700),
                    ),
                  ],
                  const SizedBox(height: 18),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: isValid
                          ? () async {
                              final current = currentController.text.trim();
                              final next = newController.text.trim();
                              final confirm = confirmController.text.trim();

                              if (current.isEmpty ||
                                  next.isEmpty ||
                                  confirm.isEmpty) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                      content: Text(
                                          'Veuillez remplir tous les champs.')),
                                );
                                return;
                              }

                              if (next.length < 8) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                      content: Text(
                                          'Le mot de passe doit contenir au moins 8 caractères.')),
                                );
                                return;
                              }

                              if (next != confirm) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                      content: Text(
                                          'Les mots de passe sont différents.')),
                                );
                                return;
                              }

                              try {
                                await ref
                                    .read(authRepositoryProvider)
                                    .changePassword(
                                      currentPassword: current,
                                      newPassword: next,
                                    );
                                if (!context.mounted) return;
                                Navigator.pop(context);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                      content: Text(
                                          'C’est bon, votre mot de passe a été changé et validé.')),
                                );
                              } on ApiException catch (e) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text(e.message)),
                                );
                              } catch (_) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                      content: Text(
                                          'Impossible de modifier le mot de passe.')),
                                );
                              }
                            }
                          : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text('Enregistrer'),
                    ),
                  ),
                ],
              );
            },
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final name = user?.fullName ?? 'Membre The Hub';
    final email = user?.email ?? '';
    final wallet = ref.watch(walletDetailsProvider).maybeWhen(
          data: (wallet) => wallet,
          orElse: () => null,
        );
    final loyaltyPoints = wallet?.loyaltyPoints ?? 0;
    final balance = wallet?.balance ?? 0.0;
    final profileLabel =
        user?.profileType == 'professionnel' ? 'PROFESSIONNEL' : 'ÉTUDIANT';

    return Scaffold(
      backgroundColor: const Color(0xFFF7F2EA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.neutral),
          onPressed: () => context.pop(),
        ),
        title: Text('Mon profil & paramètres',
            style: AppTypography.headline(size: 18)),
        actions: [
          IconButton(
            tooltip: 'Notifications',
            icon: const Icon(Icons.notifications_none,
                color: AppColors.neutral, size: 21),
            onPressed: () {},
          ),
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: GestureDetector(
              onTap: () {},
              child: CircleAvatar(
                radius: 16,
                backgroundColor: AppColors.primary,
                child: Text(_initials(name),
                    style: AppTypography.label(
                        size: 11, color: Colors.white)),
              ),
            ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 24, 20, 28),
        children: [
          CircleAvatar(
            radius: 45,
            backgroundColor: Colors.white,
            child: CircleAvatar(
              radius: 41,
              backgroundColor: AppColors.primary,
              child: Text(_initials(name),
                  style: AppTypography.headline(size: 28)
                      .copyWith(color: Colors.white)),
            ),
          ),
          const SizedBox(height: 10),
          Center(child: _MemberBadge(label: profileLabel)),
          const SizedBox(height: 18),
          Center(child: Text(name, style: AppTypography.headline(size: 22))),
          const SizedBox(height: 4),
          Center(
              child: Text(email,
                  style: AppTypography.label(
                      size: 12, color: AppColors.grayMedium))),
          const SizedBox(height: 22),
          Container(
            padding: const EdgeInsets.fromLTRB(16, 15, 16, 14),
            decoration: BoxDecoration(
              color: AppColors.primary,
              borderRadius: BorderRadius.circular(18),
              boxShadow: [
                BoxShadow(
                    color: AppColors.primary.withOpacity(0.22),
                    blurRadius: 12,
                    offset: const Offset(0, 6))
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('NIVEAU ACTUEL',
                    style:
                        AppTypography.label(size: 10, color: Colors.white70)),
                const SizedBox(height: 4),
                Text('Points de fidélité Hub',
                    style: AppTypography.headline(size: 16)
                        .copyWith(color: Colors.white)),
                const SizedBox(height: 16),
                Row(children: [
                  Text('$loyaltyPoints',
                      style: AppTypography.headline(size: 24)
                          .copyWith(color: Colors.white)),
                  const SizedBox(width: 8),
                  Text('PTS',
                      style:
                          AppTypography.label(size: 10, color: Colors.white)),
                ]),
                const SizedBox(height: 10),
                Divider(color: Colors.white.withOpacity(0.25), height: 1),
                const SizedBox(height: 10),
                Row(children: [
                  const _PlanChip(label: 'Aucun abonnement actif'),
                  const SizedBox(width: 8),
                  _PlanChip(label: 'Points fidélité : $loyaltyPoints'),
                ]),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Text('PARAMÈTRES DU COMPTE',
              style:
                  AppTypography.label(size: 11, color: AppColors.grayMedium)),
          const SizedBox(height: 10),
          Container(
            decoration: BoxDecoration(
                color: Colors.white, borderRadius: BorderRadius.circular(14)),
            clipBehavior: Clip.antiAlias,
            child: Column(children: [
              _SettingsTile(
                icon: Icons.card_membership_outlined,
                title: 'Abonnement & avantages',
                onTap: () {},
              ),
              _SettingsTile(
                icon: Icons.storefront_outlined,
                title: 'Boutique de fidélité',
                onTap: () {},
              ),
              _SettingsTile(
                icon: Icons.person_outline,
                title: 'Informations personnelles',
                onTap: () =>
                    _showPersonalInfoDialog(context, name, email, profileLabel),
              ),
              _SettingsTile(
                icon: Icons.credit_card_outlined,
                title: 'Moyens de paiement',
                onTap: () => _showPaymentMethodsSheet(context, balance),
              ),
              _SettingsTile(
                icon: Icons.lock_outline,
                title: 'Sécurité & mots de passe',
                onTap: () => _showSecuritySheet(context, ref),
              ),
              _SettingsTile(
                icon: Icons.help_outline,
                title: 'Aide & support',
                onTap: () {},
              ),
            ]),
          ),
          const SizedBox(height: 22),
          Center(
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Colors.redAccent.withOpacity(0.95),
                    const Color(0xFFD7263D),
                  ],
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.redAccent.withOpacity(0.30),
                    blurRadius: 14,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Material(
                color: Colors.transparent,
                borderRadius: BorderRadius.circular(14),
                child: InkWell(
                  borderRadius: BorderRadius.circular(14),
                  onTap: () async {
                    await ref.read(authProvider.notifier).logout();
                    if (context.mounted) context.go('/login');
                  },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 24, vertical: 14),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.18),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.logout_rounded,
                                  color: Colors.white, size: 18),
                            ),
                        const SizedBox(width: 12),
                        Text(
                          'Se déconnecter',
                          style: AppTypography.body(size: 14, color: Colors.white)
                              .copyWith(fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MemberBadge extends StatelessWidget {
  final String label;

  const _MemberBadge({required this.label});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        decoration: BoxDecoration(
            color: AppColors.primary, borderRadius: BorderRadius.circular(20)),
        child: Text(label,
            style: AppTypography.label(size: 9, color: Colors.white)),
      );
}

class _PlanChip extends StatelessWidget {
  final String label;
  const _PlanChip({required this.label});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.18),
            borderRadius: BorderRadius.circular(12)),
        child: Text(label,
            style: AppTypography.label(size: 9, color: Colors.white)),
      );
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final VoidCallback onTap;

  const _SettingsTile({
    required this.icon,
    required this.title,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(children: [
            Container(
              width: 28,
              height: 28,
              decoration: const BoxDecoration(
                  color: Color(0xFFFFEBD2), shape: BoxShape.circle),
              child: Icon(icon, size: 16, color: AppColors.primary),
            ),
            const SizedBox(width: 12),
            Expanded(child: Text(title, style: AppTypography.body(size: 12))),
            const Icon(Icons.chevron_right,
                size: 18, color: AppColors.grayMedium),
          ]),
        ),
      );
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: AppTypography.label(size: 10, color: AppColors.grayMedium)),
        const SizedBox(height: 4),
        Text(value, style: AppTypography.body(size: 13)),
      ],
    );
  }
}
