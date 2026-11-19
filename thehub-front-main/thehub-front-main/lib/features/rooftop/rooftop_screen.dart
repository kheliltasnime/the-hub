import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/app_bottom_nav.dart';
import '../../core/widgets/app_page_header.dart';
import '../explore/models/reservation_models.dart';
import '../explore/reservation_provider.dart';
import '../home/home_provider.dart';
import '../wallet/wallet_provider.dart';

class RooftopScreen extends StatelessWidget {
  const RooftopScreen({super.key});

  void _openBookingSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _RooftopBookingSheet(),
    );
  }

  void _showInviteMessage(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Invitation envoyée à un ami !'),
        backgroundColor: AppColors.success,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.secondary,
      bottomNavigationBar: const AppBottomNav(currentIndex: 0),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const AppPageHeader(title: 'Sky Lounge'),
              const SizedBox(height: 6),
              Text(
                'Sky Lounge',
                style: AppTypography.headline(size: 36),
              ),
              const SizedBox(height: 4),
              Text(
                'Détente, musique & vue panoramique',
                style:
                    AppTypography.body(size: 13, color: AppColors.grayMedium),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    decoration: const BoxDecoration(
                      color: AppColors.success,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Ouvert ce soir • 16h - 23h',
                    style: AppTypography.body(
                        size: 12, color: AppColors.grayMedium),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: Image.network(
                  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
                  height: 220,
                  width: double.infinity,
                  fit: BoxFit.cover,
                ),
              ),
              const SizedBox(height: 18),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: AppColors.tertiary,
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'EVENEMENT CE SOIR',
                      style: AppTypography.label(
                          size: 11, color: AppColors.primary),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Sunset Jazz & Mocktails',
                      style: AppTypography.headline(size: 24),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Ce soir • 18:30 - 21:00',
                      style: AppTypography.body(
                          size: 13, color: AppColors.grayMedium),
                    ),
                    const SizedBox(height: 14),
                    const Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _Chip(label: 'Live Jazz'),
                        _Chip(label: 'Networking'),
                        _Chip(label: 'Mocktails'),
                      ],
                    ),
                    const SizedBox(height: 18),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () => _openBookingSheet(context),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: Text(
                          'RÉSERVER MA PLACE →',
                          style: AppTypography.button,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 26),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Menu & Snacking Lounge',
                    style: AppTypography.headline(size: 20),
                  ),
                  TextButton(
                    onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                          content: Text('La sélection du menu est ouverte.')),
                    ),
                    child: Text(
                      'Tout voir',
                      style: AppTypography.label(
                          size: 12, color: AppColors.primary),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              const Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  _CategoryChip(label: 'Mocktails', selected: true),
                  _CategoryChip(label: 'Tapas'),
                  _CategoryChip(label: 'Planchas'),
                ],
              ),
              const SizedBox(height: 16),
              const Row(
                children: [
                  Expanded(
                    child: _MenuCard(
                      title: 'Ghazela Sunset Mocktail',
                      price: '12.000 DT',
                      imageUrl:
                          'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=900&q=80',
                    ),
                  ),
                  SizedBox(width: 12),
                  Expanded(
                    child: _MenuCard(
                      title: 'Planche Ta',
                      price: '28.000 DT',
                      imageUrl:
                          'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=900&q=80',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Container(
                width: double.infinity,
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: const Color(0xFFE8D8AD),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.local_offer_outlined,
                        color: AppColors.neutral),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Inviter un ami ce soir',
                        style: AppTypography.body(
                            size: 13, color: AppColors.neutral),
                      ),
                    ),
                    TextButton(
                      onPressed: () => _showInviteMessage(context),
                      style: TextButton.styleFrom(
                        backgroundColor: Colors.white.withOpacity(0.8),
                        foregroundColor: AppColors.neutral,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(18),
                        ),
                      ),
                      child: const Text('Inviter'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => _openBookingSheet(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: Text(
                    'RÉSERVER UNE TABLE →',
                    style: AppTypography.button,
                  ),
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}

class _RooftopBookingSheet extends ConsumerStatefulWidget {
  const _RooftopBookingSheet();

  @override
  ConsumerState<_RooftopBookingSheet> createState() =>
      _RooftopBookingSheetState();
}

class _RooftopBookingSheetState extends ConsumerState<_RooftopBookingSheet> {
  DateTime _selectedDate = DateTime.now().add(const Duration(days: 1));
  int _guests = 2;
  String _time = '20:30';
  double? _bookingPrice;
  double? _unitPrice;
  String? _priceUnit;
  bool _loadingPrice = true;
  bool _submitting = false;
  String? _priceError;

  @override
  void initState() {
    super.initState();
    _loadBookingPrice();
  }

  String _formatDate(DateTime date) =>
      '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

  String _addMinutesToTime(String start, int minutes) {
    final parts = start.split(':');
    final dt = DateTime(
      DateTime.now().year,
      DateTime.now().month,
      DateTime.now().day,
      int.parse(parts[0]),
      int.parse(parts[1]),
    ).add(Duration(minutes: minutes));

    return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }

  Future<Map<String, dynamic>> _resolveRooftopBookingTarget() async {
    final response = await ApiClient.instance.dio.get('/coworking/spaces');
    final raw = response.data is Map && response.data['data'] != null
        ? response.data['data']
        : response.data;

    final spaces = raw is List ? raw : const [];
    final rooftop = (spaces).cast<Map<String, dynamic>>().firstWhere(
      (entry) {
        final type = (entry['type'] ?? '').toString();
        final name = (entry['name'] ?? '').toString();
        return type == 'rooftop' ||
            name.toLowerCase().contains('rooftop') ||
            name.toLowerCase().contains('sky lounge');
      },
      orElse: () => <String, dynamic>{},
    );

    if (rooftop.isEmpty) {
      throw ApiException(
        code: 'ROOFTOP_SPACE_NOT_FOUND',
        message: 'L’espace Rooftop est introuvable dans le catalogue.',
        statusCode: 404,
      );
    }

    final spaceId = rooftop['id']?.toString();
    if (spaceId == null || spaceId.isEmpty) {
      throw ApiException(
        code: 'ROOFTOP_SPACE_ID_MISSING',
        message: 'L’identifiant de l’espace Rooftop est absent.',
        statusCode: 400,
      );
    }

    final pricingUnit = (rooftop['pricingUnit'] ?? 'hour').toString();
    String? activityId;

    if (pricingUnit == 'activity') {
      final activitiesResponse = await ApiClient.instance.dio
          .get('/coworking/spaces/$spaceId/activities');
      final activitiesRaw = activitiesResponse.data is Map &&
              activitiesResponse.data['data'] != null
          ? activitiesResponse.data['data']
          : activitiesResponse.data;
      final activities = activitiesRaw is List ? activitiesRaw : const [];
      if (activities.isEmpty) {
        throw ApiException(
          code: 'ROOFTOP_ACTIVITY_MISSING',
          message:
              'Aucune activité Rooftop n’est disponible pour cette réservation.',
          statusCode: 400,
        );
      }
      activityId = (activities.first as Map<String, dynamic>)['id']?.toString();
      final activity = activities.first as Map<String, dynamic>;
      final unitPrice = double.tryParse(activity['price']?.toString() ?? '');
      if (unitPrice == null) {
        throw ApiException(
          code: 'ROOFTOP_PRICE_MISSING',
          message: 'Le prix de l’activité Rooftop est indisponible.',
          statusCode: 500,
        );
      }
      return {
        'spaceId': spaceId,
        'pricingUnit': pricingUnit,
        'activityId': activityId,
        'unit': activity['unit']?.toString() ?? 'activity',
        'unitPrice': unitPrice,
      };
    }

    return {
      'spaceId': spaceId,
      'pricingUnit': pricingUnit,
      'activityId': activityId,
      'unit': 'hour',
      'unitPrice':
          double.tryParse(rooftop['pricePerUnit']?.toString() ?? '') ?? 0,
    };
  }

  Future<void> _loadBookingPrice() async {
    try {
      final target = await _resolveRooftopBookingTarget();
      final unit = target['unit'] as String;
      final unitPrice = target['unitPrice'] as double;
      final price = unit == 'activity' ? unitPrice * _guests : unitPrice * 2;
      if (mounted) {
        setState(() {
          _bookingPrice = price;
          _unitPrice = unitPrice;
          _priceUnit = unit;
          _loadingPrice = false;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _loadingPrice = false;
          _priceError = error is ApiException
              ? error.message
              : 'Impossible de charger le prix de la réservation.';
        });
      }
    }
  }

  Future<void> _confirmBooking() async {
    if (_submitting) return;
    setState(() => _submitting = true);
    try {
      final target = await _resolveRooftopBookingTarget();
      final spaceId = target['spaceId'] as String;
      final pricingUnit = target['pricingUnit'] as String;
      final activityId = target['activityId'] as String?;
      final startTime = _time;
      final endTime = _addMinutesToTime(_time, 120);
      final request = CreateReservationRequest(
        spaceId: spaceId,
        date: _formatDate(_selectedDate),
        startTime: startTime,
        endTime: endTime,
        guestCount: _guests,
        activityId: activityId,
        paymentMode: PaymentMode.wallet,
      );

      final reservation = await ref
          .read(reservationProvider.notifier)
          .createReservation(request);

      ref.invalidate(todayReservationsProvider);
      ref.invalidate(walletDetailsProvider);
      ref.invalidate(walletBalanceProvider);
      try {
        await ref.read(walletDetailsProvider.future);
      } catch (_) {
        // La réservation reste confirmée même si le rafraîchissement visuel échoue.
      }

      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            pricingUnit == 'activity'
                ? 'Réservation Rooftop confirmée pour ${_formatDate(_selectedDate)} · $_guests personnes · $startTime-$endTime'
                : 'Réservation Rooftop confirmée pour ${_formatDate(_selectedDate)} · $_guests personnes · $startTime-$endTime',
          ),
          backgroundColor: AppColors.success,
        ),
      );

      if (reservation.id.isNotEmpty) {
        // no-op: the real API response already confirms the reservation succeeded.
      }
    } catch (error) {
      if (!mounted) return;
      final message = error is ApiException
          ? error.message
          : 'La réservation Rooftop a échoué.';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: AppColors.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 18),
          Text('Réserver au Rooftop', style: AppTypography.headline(size: 22)),
          const SizedBox(height: 20),
          Text('Date',
              style:
                  AppTypography.label(size: 11, color: AppColors.grayMedium)),
          const SizedBox(height: 8),
          InkWell(
            onTap: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: _selectedDate,
                firstDate: DateTime.now(),
                lastDate: DateTime.now().add(const Duration(days: 30)),
              );
              if (picked != null) setState(() => _selectedDate = picked);
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              decoration: BoxDecoration(
                color: AppColors.secondary,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Icon(Icons.calendar_today_outlined,
                      color: AppColors.primary),
                  const SizedBox(width: 10),
                  Text(
                    '${_selectedDate.day}/${_selectedDate.month}/${_selectedDate.year}',
                    style: AppTypography.body(size: 14),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 18),
          Text('Nombre de personnes',
              style:
                  AppTypography.label(size: 11, color: AppColors.grayMedium)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [2, 4, 6, 8].map((value) {
              final selected = value == _guests;
              return ChoiceChip(
                label: Text('$value'),
                selected: selected,
                selectedColor: AppColors.primary,
                backgroundColor: AppColors.secondary,
                labelStyle: AppTypography.label(
                  size: 12,
                  color: selected ? Colors.white : AppColors.neutral,
                ),
                onSelected: (_) {
                  setState(() {
                    _guests = value;
                    if (_unitPrice != null && _priceUnit == 'activity') {
                      _bookingPrice = _unitPrice! * value;
                    }
                  });
                },
              );
            }).toList(),
          ),
          const SizedBox(height: 18),
          Text('Heure',
              style:
                  AppTypography.label(size: 11, color: AppColors.grayMedium)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: ['18:30', '20:00', '20:30', '21:30'].map((value) {
              final selected = value == _time;
              return ChoiceChip(
                label: Text(value),
                selected: selected,
                selectedColor: AppColors.primary,
                backgroundColor: AppColors.secondary,
                labelStyle: AppTypography.label(
                  size: 12,
                  color: selected ? Colors.white : AppColors.neutral,
                ),
                onSelected: (_) => setState(() => _time = value),
              );
            }).toList(),
          ),
          const SizedBox(height: 24),
          Consumer(
            builder: (context, ref, _) {
              final balance = ref.watch(walletBalanceProvider);
              return Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.tertiary,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.primary.withOpacity(0.3)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Paiement par Hub Wallet',
                      style:
                          AppTypography.body(size: 13, weight: FontWeight.w700),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Solde disponible : ${balance.toStringAsFixed(2)} DT',
                      style: AppTypography.label(
                          size: 12, color: AppColors.grayMedium),
                    ),
                    const SizedBox(height: 8),
                    if (_loadingPrice)
                      const LinearProgressIndicator(color: AppColors.primary)
                    else if (_priceError != null)
                      Text(_priceError!,
                          style: AppTypography.label(
                              size: 12, color: AppColors.error))
                    else
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Total à débiter',
                              style: AppTypography.label(size: 12)),
                          Text(
                            '${_bookingPrice!.toStringAsFixed(2)} DT',
                            style: AppTypography.body(
                                size: 16,
                                color: AppColors.primary,
                                weight: FontWeight.w700),
                          ),
                        ],
                      ),
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: 18),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _loadingPrice || _priceError != null || _submitting
                  ? null
                  : _confirmBooking,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: _loadingPrice || _submitting
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white),
                    )
                  : Text(
                      'Confirmer et payer (${_bookingPrice!.toStringAsFixed(2)} DT)',
                      style: AppTypography.button,
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  final String label;

  const _Chip({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.secondary,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: AppTypography.label(size: 10, color: AppColors.grayMedium),
      ),
    );
  }
}

class _CategoryChip extends StatelessWidget {
  final String label;
  final bool selected;

  const _CategoryChip({required this.label, this.selected = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: selected ? AppColors.primary : AppColors.tertiary,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: AppTypography.label(
          size: 11,
          color: selected ? Colors.white : AppColors.neutral,
        ),
      ),
    );
  }
}

class _MenuCard extends StatelessWidget {
  final String title;
  final String price;
  final String imageUrl;

  const _MenuCard({
    required this.title,
    required this.price,
    required this.imageUrl,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.tertiary,
        borderRadius: BorderRadius.circular(18),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Image.network(
            imageUrl,
            height: 150,
            width: double.infinity,
            fit: BoxFit.cover,
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: AppTypography.body(size: 13, weight: FontWeight.w600),
                ),
                const SizedBox(height: 6),
                Text(
                  price,
                  style: AppTypography.body(
                      size: 13,
                      color: AppColors.primary,
                      weight: FontWeight.w700),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
