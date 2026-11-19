import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/app_bottom_nav.dart';
import '../../core/widgets/app_page_header.dart';
import '../auth/auth_provider.dart';
import 'models/wallet_models.dart';
import 'wallet_modals.dart';
import 'wallet_provider.dart';

class WalletScreen extends ConsumerWidget {
  const WalletScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;

    return Scaffold(
      backgroundColor: const Color(0xFFF7F5F0),
      bottomNavigationBar: const AppBottomNav(currentIndex: 4),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async => ref.refresh(walletDetailsProvider),
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            children: [
              const AppPageHeader(title: 'The Hub Wallet'),
              _MemberCard(
                fullName: user?.fullName ?? 'Membre',
                initials: _getInitials(user?.fullName ?? ''),
              ),
              const SizedBox(height: 24),
              _QuickActionGrid(),
              const SizedBox(height: 28),
              _TransactionsHeader(
                onSeeAll: () => Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => const _TransactionHistoryScreen(),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              _RecentTransactionsList(),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  String _getInitials(String name) {
    final parts =
        name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return 'HUB';
    if (parts.length == 1) {
      return parts.first
          .substring(0, parts.first.length.clamp(0, 2))
          .toUpperCase();
    }
    return (parts.first[0] + parts.last[0]).toUpperCase();
  }
}

class _MemberCard extends ConsumerWidget {
  final String fullName;
  final String initials;

  const _MemberCard({required this.fullName, required this.initials});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final walletAsync = ref.watch(walletDetailsProvider);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF231F20), Color(0xFF141213)],
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.15),
            blurRadius: 12,
            offset: const Offset(0, 6),
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'THE HUB MEMBER',
                style: AppTypography.label(size: 10)
                    .copyWith(color: Colors.white54),
              ),
              walletAsync.maybeWhen(
                data: (data) => Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.star_border,
                          color: Color(0xFFC5A059), size: 14),
                      const SizedBox(width: 4),
                      Text(
                        '${data.loyaltyPoints} pts',
                        style: AppTypography.label(size: 11)
                            .copyWith(color: const Color(0xFFC5A059)),
                      ),
                    ],
                  ),
                ),
                orElse: () => const SizedBox.shrink(),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            '$initials · $fullName',
            style: AppTypography.body(size: 16)
                .copyWith(color: Colors.white, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 24),
          Text('Solde disponible',
              style: AppTypography.label(size: 11)
                  .copyWith(color: Colors.white60)),
          const SizedBox(height: 4),
          walletAsync.when(
            data: (data) => Text(
              '${data.balance.toStringAsFixed(3)} TND',
              style: AppTypography.headline(size: 30)
                  .copyWith(color: const Color(0xFFC5A059)),
            ),
            loading: () => const SizedBox(
              height: 36,
              width: 36,
              child: CircularProgressIndicator(
                  strokeWidth: 2, color: Color(0xFFC5A059)),
            ),
            error: (_, __) => Text('--.--- TND',
                style: AppTypography.headline(size: 28)
                    .copyWith(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}

class _QuickActionGrid extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      childAspectRatio: 1.4,
      children: [
        _ActionButton(
          icon: Icons.add,
          label: 'Recharger',
          onTap: () => showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            backgroundColor: Colors.transparent,
            builder: (_) => const RechargeBottomSheet(),
          ),
        ),
        _ActionButton(
          icon: Icons.north_east,
          label: 'Envoyer',
          onTap: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text(
                    'L’envoi Wallet sera disponible lorsque le service de transfert sera activé.'),
              ),
            );
          },
        ),
        _ActionButton(
          icon: Icons.qr_code_scanner,
          label: 'Payer par QR',
          onTap: () => showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            backgroundColor: Colors.transparent,
            builder: (_) => const QrCodeBottomSheet(),
          ),
        ),
        _ActionButton(
          icon: Icons.format_list_bulleted,
          label: 'Historique',
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => const _TransactionHistoryScreen(),
            ),
          ),
        ),
      ],
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _ActionButton(
      {required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: const BoxDecoration(
                  color: Color(0xFFF7F2E7), shape: BoxShape.circle),
              child: Icon(icon, color: AppColors.neutral, size: 22),
            ),
            const SizedBox(height: 8),
            Text(label,
                style: AppTypography.body(size: 13)
                    .copyWith(fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}

class _TransactionsHeader extends StatelessWidget {
  final VoidCallback onSeeAll;

  const _TransactionsHeader({required this.onSeeAll});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text('Dernières transactions', style: AppTypography.headline(size: 16)),
        TextButton(
          onPressed: onSeeAll,
          child: const Text('Voir tout'),
        ),
      ],
    );
  }
}

class _TransactionHistoryScreen extends ConsumerWidget {
  const _TransactionHistoryScreen();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final walletAsync = ref.watch(walletDetailsProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF7F5F0),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text('Historique des transactions',
            style: AppTypography.headline(size: 18)),
      ),
      body: walletAsync.when(
        loading: () => const Center(
            child: CircularProgressIndicator(color: AppColors.primary)),
        error: (error, _) => Center(
          child: Text('Impossible de charger l’historique : $error',
              textAlign: TextAlign.center,
              style: AppTypography.body(color: AppColors.error)),
        ),
        data: (data) {
          if (data.recentTransactions.isEmpty) {
            return Center(
              child: Text('Aucune transaction.',
                  style: AppTypography.body(color: AppColors.grayMedium)),
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.refresh(walletDetailsProvider.future),
            child: ListView.builder(
              padding: const EdgeInsets.all(20),
              itemCount: data.recentTransactions.length,
              itemBuilder: (context, index) => _TransactionTile(
                transaction: data.recentTransactions[index],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _RecentTransactionsList extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final walletAsync = ref.watch(walletDetailsProvider);

    return walletAsync.when(
      data: (data) {
        if (data.recentTransactions.isEmpty) {
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 20),
            child: Center(
              child: Text('Aucune transaction récente.',
                  style: AppTypography.body(color: AppColors.grayMedium)),
            ),
          );
        }
        return Column(
          children: data.recentTransactions
              .take(3)
              .map((tx) => _TransactionTile(transaction: tx))
              .toList(),
        );
      },
      loading: () => const Center(
          child: Padding(
              padding: EdgeInsets.all(20),
              child: CircularProgressIndicator(color: AppColors.primary))),
      error: (err, _) => Text('Erreur : $err',
          style: AppTypography.label().copyWith(color: AppColors.error)),
    );
  }
}

class _TransactionTile extends StatelessWidget {
  final WalletTransaction transaction;

  const _TransactionTile({required this.transaction});

  @override
  Widget build(BuildContext context) {
    final tx = transaction;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
          color: Colors.white, borderRadius: BorderRadius.circular(16)),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: tx.isCredit
                ? Colors.green.withValues(alpha: 0.1)
                : const Color(0xFFF5F5F5),
            child: Icon(
              tx.isCredit
                  ? Icons.add_circle_outline
                  : Icons.shopping_bag_outlined,
              color: tx.isCredit ? Colors.green : AppColors.neutral,
              size: 20,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(tx.title,
                    style: AppTypography.body(size: 14)
                        .copyWith(fontWeight: FontWeight.w600)),
                Text(tx.subtitle,
                    style: AppTypography.label(
                        size: 11, color: AppColors.grayMedium)),
              ],
            ),
          ),
          Text(
            '${tx.isCredit ? '+' : '-'} ${tx.amount.toStringAsFixed(3)} TND',
            style: AppTypography.body(size: 14).copyWith(
              fontWeight: FontWeight.w700,
              color: tx.isCredit ? Colors.green : AppColors.neutral,
            ),
          ),
        ],
      ),
    );
  }
}
