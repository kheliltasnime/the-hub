import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/auth_provider.dart';
import '../theme/app_theme.dart';

class AppPageHeader extends ConsumerWidget {
  final String title;
  final VoidCallback? onBack;

  const AppPageHeader({super.key, required this.title, this.onBack});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final name = user?.fullName ?? '';
    final parts =
        name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    final initials = parts.isEmpty
        ? '?'
        : parts.length == 1
            ? parts.first.substring(0, 1).toUpperCase()
            : '${parts.first[0]}${parts.last[0]}'.toUpperCase();

    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 8, 12, 8),
      child: Row(
        children: [
          IconButton(
            tooltip: 'Retour',
            icon: const Icon(Icons.arrow_back, color: AppColors.neutral),
            onPressed: onBack ?? () => context.pop(),
          ),
          Expanded(
            child: Text(title, style: AppTypography.headline(size: 18)),
          ),
          IconButton(
            tooltip: 'Notifications',
            icon:
                const Icon(Icons.notifications_none, color: AppColors.neutral),
            onPressed: () {},
          ),
          GestureDetector(
            onTap: () => context.push('/profile'),
            child: CircleAvatar(
              radius: 18,
              backgroundColor: AppColors.primary,
              child: Text(initials,
                  style: AppTypography.label(size: 11, color: Colors.white)),
            ),
          ),
        ],
      ),
    );
  }
}
