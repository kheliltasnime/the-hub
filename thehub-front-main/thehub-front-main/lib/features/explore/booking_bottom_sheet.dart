import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../home/home_provider.dart' show todayReservationsProvider;
import '../wallet/wallet_provider.dart';
import 'models/explore_models.dart';
import 'models/reservation_models.dart';
import 'reservation_provider.dart';

class BookingBottomSheet extends ConsumerStatefulWidget {
  final CoworkingSpace space;

  const BookingBottomSheet({super.key, required this.space});

  @override
  ConsumerState<BookingBottomSheet> createState() => _BookingBottomSheetState();
}

class _BookingBottomSheetState extends ConsumerState<BookingBottomSheet> {
  DateTime _selectedDate = DateTime.now().add(const Duration(hours: 2));
  String? _selectedStartTime;
  String? _selectedEndTime;
  DurationOption? _selectedDurationOption;
  SpaceActivity? _selectedActivity;
  bool _isLoading = false;
  String? _errorMessage;

  bool get _isDayPriced => widget.space.pricingUnit == 'day';

  String get _dateKey {
    final d = _selectedDate;
    return '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
  }

  double _calculatePrice(AvailabilityResponse? availability) {
    final rate = widget.space.pricePerUnit;
    if (widget.space.pricingUnit == 'activity') {
      final activity = _selectedActivity;
      if (activity == null) return 0;
      if (activity.unit == 'hour' &&
          _selectedStartTime != null &&
          _selectedEndTime != null) {
        final start = _selectedStartTime!.split(':');
        final end = _selectedEndTime!.split(':');
        final hours = (int.parse(end[0]) * 60 +
                int.parse(end[1]) -
                int.parse(start[0]) * 60 -
                int.parse(start[1])) /
            60.0;
        return activity.price * hours;
      }
      return activity.price;
    }
    if (_isDayPriced) {
      final option = _selectedDurationOption;
      if (option == null) return rate;
      if (option.durationType == DurationType.half_day) return rate / 2;
      return rate;
    }
    if (_selectedStartTime == null || _selectedEndTime == null) return rate * 2;
    final start = _selectedStartTime!.split(':');
    final end = _selectedEndTime!.split(':');
    final hours = (int.parse(end[0]) * 60 +
            int.parse(end[1]) -
            (int.parse(start[0]) * 60 + int.parse(start[1]))) /
        60.0;
    return rate * hours;
  }

  Future<void> _handleBooking(AvailabilityResponse availability) async {
    setState(() => _errorMessage = null);
    if (widget.space.pricingUnit == 'activity' && _selectedActivity == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez choisir une activité')),
      );
      return;
    }
    if (_isDayPriced) {
      if (_selectedDurationOption == null ||
          !_selectedDurationOption!.available) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Veuillez choisir une durée disponible')),
        );
        return;
      }
      if (_selectedStartTime == null || _selectedEndTime == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Veuillez choisir une heure de début et de fin')),
        );
        return;
      }
    } else if (_selectedStartTime == null || _selectedEndTime == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez choisir un créneau disponible')),
      );
      return;
    } else if (!_isSelectedSlotAvailable(availability)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Ce créneau est déjà réservé ou indisponible')),
      );
      return;
    }

    setState(() => _isLoading = true);
    try {
      final request = CreateReservationRequest(
        spaceId: widget.space.id,
        date: _dateKey,
        startTime: _selectedStartTime,
        endTime: _selectedEndTime,
        activityId: _selectedActivity?.id,
        durationType:
            _isDayPriced ? _selectedDurationOption!.durationType : null,
        halfDayPeriod:
            _isDayPriced ? _selectedDurationOption!.halfDayPeriod : null,
        paymentMode: PaymentMode.wallet,
      );

      // ignore: avoid_print
      print('🟢 Reservation POST ${request.toJson()}');

      final reservation = await ref
          .read(reservationProvider.notifier)
          .createReservation(request);

      // ignore: avoid_print
      print(
          '🟢 Reservation OK id=${reservation.id} amount=${reservation.totalPrice}');

      ref.invalidate(walletDetailsProvider);
      ref.invalidate(todayReservationsProvider);
      ref.invalidate(availabilityProvider((
        spaceId: widget.space.id,
        date: _dateKey,
      )));

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Réservation confirmée · ${reservation.totalPrice.toStringAsFixed(2)} DT débités',
            ),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      // ignore: avoid_print
      print('❌ Reservation FAIL: $e');
      if (mounted) {
        final message = e is ApiException ? e.message : e.toString();
        setState(() => _errorMessage = message);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(message),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final availabilityAsync = ref.watch(availabilityProvider((
      spaceId: widget.space.id,
      date: _dateKey,
    )));

    return Container(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: SingleChildScrollView(
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
            const SizedBox(height: 16),
            Text('Réserver ${widget.space.name}',
                style: AppTypography.headline(size: 18)),
            const SizedBox(height: 4),
            Text(
              widget.space.location,
              style: AppTypography.body(size: 13)
                  .copyWith(color: AppColors.grayMedium),
            ),
            const SizedBox(height: 20),
            _buildDateSelector(),
            const SizedBox(height: 20),
            availabilityAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (err, _) => Text(
                err is ApiException ? err.message : 'Erreur disponibilité',
                style: AppTypography.body(size: 13)
                    .copyWith(color: AppColors.error),
              ),
              data: (availability) {
                if (availability.blocked) {
                  return Text(
                    'Espace indisponible à cette date',
                    style: AppTypography.body(size: 13)
                        .copyWith(color: AppColors.error),
                  );
                }
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (_errorMessage != null) ...[
                      _BookingError(message: _errorMessage!),
                      const SizedBox(height: 16),
                    ],
                    if (widget.space.pricingUnit == 'activity') ...[
                      _buildActivitySelector(),
                      const SizedBox(height: 20),
                    ],
                    if (_isDayPriced) ...[
                      _buildDurationOptions(availability),
                      if (_selectedDurationOption != null) ...[
                        const SizedBox(height: 20),
                        _buildDayTimeSelector(),
                      ],
                    ] else
                      _buildSlotSelector(availability),
                    const SizedBox(height: 20),
                    _buildPriceSummary(availability),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16)),
                        ),
                        onPressed: _isLoading
                            ? null
                            : () => _handleBooking(availability),
                        child: _isLoading
                            ? const CircularProgressIndicator(
                                color: Colors.white)
                            : Text(
                                'Confirmer · wallet',
                                style: AppTypography.label(
                                    size: 14, color: Colors.white),
                              ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActivitySelector() {
    final activitiesAsync = ref.watch(spaceActivitiesProvider(widget.space.id));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('ACTIVITÉ', style: AppTypography.label(size: 11)),
        const SizedBox(height: 8),
        activitiesAsync.when(
          loading: () => const CircularProgressIndicator(),
          error: (_, __) => Text('Impossible de charger les activités',
              style: AppTypography.body(size: 12, color: AppColors.error)),
          data: (activities) {
            if (_selectedActivity == null && activities.length == 1) {
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (mounted) {
                  setState(() => _selectedActivity = activities.first);
                }
              });
            }
            return Wrap(
              spacing: 8,
              runSpacing: 8,
              children: activities.map((activity) {
                final selected = _selectedActivity?.id == activity.id;
                return ChoiceChip(
                  label: Text(
                      '${activity.label} · ${activity.price.toStringAsFixed(2)} DT'),
                  selected: selected,
                  selectedColor: AppColors.primary,
                  labelStyle: AppTypography.label(
                      size: 11,
                      color: selected ? Colors.white : AppColors.neutral),
                  onSelected: (_) =>
                      setState(() => _selectedActivity = activity),
                );
              }).toList(),
            );
          },
        ),
      ],
    );
  }

  Widget _buildDateSelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('DATE', style: AppTypography.label(size: 11)),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: const Color(0xFFFAF7F2),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              const Icon(Icons.calendar_today, color: AppColors.primary),
              const SizedBox(width: 12),
              Text(
                '${_selectedDate.day}/${_selectedDate.month}/${_selectedDate.year}',
                style: AppTypography.body(size: 14),
              ),
              const Spacer(),
              GestureDetector(
                onTap: () async {
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: _selectedDate,
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 30)),
                  );
                  if (picked != null) {
                    setState(() {
                      _selectedDate = picked;
                      _selectedStartTime = null;
                      _selectedEndTime = null;
                      _selectedDurationOption = null;
                      _errorMessage = null;
                    });
                  }
                },
                child: const Icon(Icons.arrow_forward_ios, size: 16),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSlotSelector(AvailabilityResponse availability) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('HORAIRE DE RÉSERVATION (2h)',
            style: AppTypography.label(size: 11)),
        const SizedBox(height: 8),
        Text(
          'Choisissez une heure entre ${widget.space.openingHour} et ${widget.space.closingHour}.',
          style: AppTypography.body(size: 12)
              .copyWith(color: AppColors.grayMedium),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _TimePickerField(
                label: 'Début',
                value: _selectedStartTime,
                onTap: () => _pickTime(isStart: true),
              ),
            ),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 10),
              child: Text('à'),
            ),
            Expanded(
              child: _TimePickerField(
                label: 'Fin',
                value: _selectedEndTime,
                onTap: () => _pickTime(isStart: false),
              ),
            ),
          ],
        ),
        if (_selectedStartTime != null && _selectedEndTime != null) ...[
          const SizedBox(height: 8),
          Text(
            _isSelectedSlotAvailable(availability)
                ? 'Ce créneau est disponible.'
                : 'Ce créneau est déjà réservé ou indisponible.',
            style: AppTypography.body(
              size: 12,
              color: _isSelectedSlotAvailable(availability)
                  ? AppColors.success
                  : AppColors.error,
            ),
          ),
        ],
      ],
    );
  }

  bool _isSelectedSlotAvailable(AvailabilityResponse availability) {
    if (_selectedStartTime == null || _selectedEndTime == null) return false;

    final start = _toMinutes(_selectedStartTime!);
    final end = _toMinutes(_selectedEndTime!);
    if (start >= end) return false;

    final slotsInRange = availability.slots.where((slot) {
      return _toMinutes(slot.startTime) >= start &&
          _toMinutes(slot.endTime) <= end;
    }).toList();

    final coveredMinutes = slotsInRange.fold<int>(
        0,
        (total, slot) =>
            total + _toMinutes(slot.endTime) - _toMinutes(slot.startTime));
    return coveredMinutes == end - start &&
        slotsInRange.isNotEmpty &&
        slotsInRange.every((slot) => slot.available);
  }

  int _toMinutes(String value) {
    final parts = value.split(':');
    return int.parse(parts[0]) * 60 + int.parse(parts[1]);
  }

  Widget _buildDayTimeSelector() {
    final option = _selectedDurationOption!;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('HORAIRE CHOISI', style: AppTypography.label(size: 11)),
        const SizedBox(height: 8),
        Text(
          'Choisissez une heure entre ${option.boundStart} et ${option.boundEnd}.',
          style: AppTypography.body(size: 12)
              .copyWith(color: AppColors.grayMedium),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _TimePickerField(
                label: 'Début',
                value: _selectedStartTime,
                onTap: () => _pickTime(isStart: true),
              ),
            ),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 10),
              child: Text('à'),
            ),
            Expanded(
              child: _TimePickerField(
                label: 'Fin',
                value: _selectedEndTime,
                onTap: () => _pickTime(isStart: false),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Future<void> _pickTime({required bool isStart}) async {
    final opening = _parseTime(
        _selectedDurationOption?.boundStart ?? widget.space.openingHour);
    final closing = _parseTime(
        _selectedDurationOption?.boundEnd ?? widget.space.closingHour);
    final current = isStart ? _selectedStartTime : _selectedEndTime;
    final initial = current == null
        ? (isStart
            ? opening
            : TimeOfDay(hour: opening.hour + 2, minute: opening.minute))
        : _parseTime(current);
    final picked = await showTimePicker(context: context, initialTime: initial);
    if (picked == null) return;

    final minutes = picked.hour * 60 + picked.minute;
    final openMinutes = opening.hour * 60 + opening.minute;
    final closeMinutes = closing.hour * 60 + closing.minute;
    if (picked.minute != 0 && picked.minute != 30 ||
        minutes < openMinutes ||
        minutes > closeMinutes) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
                'Choisissez une heure entre ${widget.space.openingHour} et ${widget.space.closingHour}, sur 00 ou 30 minutes.'),
          ),
        );
      }
      return;
    }

    final value = _formatTime(picked);
    setState(() {
      if (isStart) {
        _selectedStartTime = value;
      } else {
        _selectedEndTime = value;
      }
      _errorMessage = null;
    });
  }

  TimeOfDay _parseTime(String value) {
    final parts = value.split(':');
    return TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));
  }

  String _formatTime(TimeOfDay value) =>
      '${value.hour.toString().padLeft(2, '0')}:${value.minute.toString().padLeft(2, '0')}';

  Widget _buildDurationOptions(AvailabilityResponse availability) {
    final options = availability.durationOptions;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('DURÉE', style: AppTypography.label(size: 11)),
        const SizedBox(height: 8),
        if (options.isEmpty)
          Text(
            'Aucune option disponible',
            style: AppTypography.body(size: 13)
                .copyWith(color: AppColors.grayMedium),
          )
        else
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: options.map((option) {
              final selected = _selectedDurationOption?.durationType ==
                      option.durationType &&
                  _selectedDurationOption?.halfDayPeriod ==
                      option.halfDayPeriod;
              return ChoiceChip(
                label: Text(option.label),
                selected: selected,
                selectedColor: AppColors.primary,
                backgroundColor: option.available
                    ? const Color(0xFFFAF7F2)
                    : Colors.grey.shade200,
                labelStyle: AppTypography.label(
                  size: 12,
                  color: selected
                      ? Colors.white
                      : (option.available
                          ? AppColors.neutral
                          : AppColors.grayMedium),
                ),
                onSelected: option.available
                    ? (_) => setState(() {
                          _selectedDurationOption = option;
                          _selectedStartTime = null;
                          _selectedEndTime = null;
                        })
                    : null,
              );
            }).toList(),
          ),
      ],
    );
  }

  Widget _buildPriceSummary(AvailabilityResponse availability) {
    final price = _calculatePrice(availability);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.primary.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text('Total (débit wallet)', style: AppTypography.label(size: 12)),
          Text(
            '${price.toStringAsFixed(2)} DT',
            style: AppTypography.headline(size: 20)
                .copyWith(color: AppColors.primary),
          ),
        ],
      ),
    );
  }
}

class _TimePickerField extends StatelessWidget {
  final String label;
  final String? value;
  final VoidCallback onTap;

  const _TimePickerField({
    required this.label,
    required this.value,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 13),
        decoration: BoxDecoration(
          color: const Color(0xFFFAF7F2),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.neutral.withOpacity(0.12)),
        ),
        child: Row(
          children: [
            const Icon(Icons.schedule, size: 18, color: AppColors.primary),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                value ?? label,
                style: AppTypography.body(
                  size: 14,
                  color:
                      value == null ? AppColors.grayMedium : AppColors.neutral,
                ),
              ),
            ),
            const Icon(Icons.keyboard_arrow_down,
                size: 18, color: AppColors.grayMedium),
          ],
        ),
      ),
    );
  }
}

class _BookingError extends StatelessWidget {
  final String message;

  const _BookingError({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.error.withOpacity(0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.error.withOpacity(0.25)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.info_outline, color: AppColors.error, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: AppTypography.body(size: 13, color: AppColors.error),
            ),
          ),
        ],
      ),
    );
  }
}

