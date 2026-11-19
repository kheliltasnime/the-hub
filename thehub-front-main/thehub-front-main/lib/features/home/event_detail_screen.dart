import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';
import '../auth/auth_provider.dart';
import 'models/home_models.dart';

class EventDetailScreen extends ConsumerWidget {
  final UpcomingEvent event;

  const EventDetailScreen({super.key, required this.event});

  static const _months = [
    'JAN',
    'FÉV',
    'MAR',
    'AVR',
    'MAI',
    'JUIN',
    'JUIL',
    'AOÛT',
    'SEP',
    'OCT',
    'NOV',
    'DÉC',
  ];

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

    return Scaffold(
      backgroundColor: const Color(0xFFF7F2EA),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              child: Row(
                children: [
                  IconButton(
                    tooltip: 'Retour',
                    icon: const Icon(Icons.arrow_back,
                        color: AppColors.neutral),
                    onPressed: () => context.pop(),
                  ),
                  const Spacer(),
                  IconButton(
                    tooltip: 'Notifications',
                    icon: const Icon(Icons.notifications_none,
                        color: AppColors.neutral),
                    onPressed: () {},
                  ),
                  GestureDetector(
                    onTap: () => context.push('/profile'),
                    child: CircleAvatar(
                      radius: 18,
                      backgroundColor: AppColors.primary,
                      child: Text(initials,
                          style: AppTypography.label(
                              size: 11, color: Colors.white)),
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: EdgeInsets.zero,
                children: [
                  ClipRRect(
                    child: Image.network(
                      event.imageUrl,
                      height: 260,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        height: 260,
                        color: AppColors.neutral,
                        child: const Icon(Icons.event,
                            color: Colors.white, size: 56),
                      ),
                    ),
                  ),
                  Transform.translate(
                    offset: const Offset(0, -24),
                    child: Container(
                      margin: const EdgeInsets.symmetric(horizontal: 20),
                      padding: const EdgeInsets.fromLTRB(24, 28, 24, 28),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(22),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              _InfoPill(
                                icon: Icons.calendar_today_outlined,
                                text:
                                    '${_months[event.date.month - 1]} ${event.date.day} · ${event.time}',
                              ),
                              _InfoPill(
                                icon: Icons.location_on_outlined,
                                text: event.location,
                              ),
                            ],
                          ),
                          const SizedBox(height: 22),
                          Text(event.title,
                              style: AppTypography.headline(size: 28)),
                          const SizedBox(height: 20),
                          Row(
                            children: [
                              const CircleAvatar(
                                radius: 25,
                                backgroundColor: AppColors.secondary,
                                child: Icon(Icons.person_outline,
                                    color: AppColors.primary),
                              ),
                              const SizedBox(width: 12),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(event.hostName,
                                      style: AppTypography.body(size: 15)
                                          .copyWith(
                                              fontWeight: FontWeight.w700)),
                                  Text(event.hostRole,
                                      style: AppTypography.label(
                                          size: 12,
                                          color: AppColors.grayMedium)),
                                ],
                              ),
                            ],
                          ),
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 22),
                            child: Divider(),
                          ),
                          Text(event.description,
                              style: AppTypography.body(size: 16)
                                  .copyWith(height: 1.55)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 18),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Tarif',
                            style: AppTypography.label(
                                size: 12, color: AppColors.grayMedium)),
                        const SizedBox(height: 3),
                        Text(event.priceLabel,
                            style: AppTypography.body(size: 15)
                                .copyWith(fontWeight: FontWeight.w700)),
                      ],
                    ),
                  ),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _register(context),
                      icon: const Icon(Icons.arrow_forward),
                      label: const Text("S'inscrire"),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _register(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
          content: Text('Inscription à cet événement bientôt disponible.')),
    );
  }
}

class _InfoPill extends StatelessWidget {
  final IconData icon;
  final String text;

  const _InfoPill({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      decoration: BoxDecoration(
        color: const Color(0xFFFAF7F0),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: AppColors.primary),
          const SizedBox(width: 6),
          Text(text, style: AppTypography.label(size: 11)),
        ],
      ),
    );
  }
}
