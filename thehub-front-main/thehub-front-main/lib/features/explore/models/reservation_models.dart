enum PaymentMode { wallet, subscription }

/// Aligné sur Prisma DurationType (pas de "hour" côté API).
enum DurationType { half_day, full_day, multi_day }

enum HalfDayPeriod { morning, afternoon }

class SpaceActivity {
  final String id;
  final String name;
  final double price;
  final String unit;

  SpaceActivity({
    required this.id,
    required this.name,
    required this.price,
    required this.unit,
  });

  factory SpaceActivity.fromJson(Map<String, dynamic> json) {
    final rawPrice = json['price'];
    return SpaceActivity(
      id: json['id'] as String,
      name: json['activity']?.toString() ?? 'Activité',
      price: rawPrice is num
          ? rawPrice.toDouble()
          : double.tryParse(rawPrice.toString()) ?? 0,
      unit: json['unit']?.toString() ?? 'activity',
    );
  }

  String get label => name.replaceAll('_', ' ');
}

String normalizeTimeString(dynamic value) {
  if (value == null) return '';

  var text = value.toString().trim();
  if (text.isEmpty) return '';

  text = text.replaceAll(' ', '').replaceAll('h', '').replaceAll('H', '');

  if (text.length >= 5 && text[2] == ':') {
    return text.substring(0, 5);
  }

  if (text.contains('.')) {
    final parts = text.split('.');
    if (parts.length == 2 && parts[0].isNotEmpty && parts[1].length >= 2) {
      final hours = parts[0].padLeft(2, '0');
      final minutes = parts[1].padLeft(2, '0');
      return '$hours:$minutes';
    }
  }

  if (text.length == 4 && RegExp(r'^\d{4}$').hasMatch(text)) {
    return '${text.substring(0, 2)}:${text.substring(2)}';
  }

  if (text.isNotEmpty && text.length > 5 && text.contains(':')) {
    return text.substring(0, 5);
  }

  return text;
}

class CreateReservationRequest {
  final String spaceId;
  final String date;
  final String? startTime;
  final String? endTime;
  final DurationType? durationType;
  final HalfDayPeriod? halfDayPeriod;
  final int? numberOfDays;
  final int? guestCount;
  final String? activityId;
  final PaymentMode paymentMode;
  final String? subscriptionId;

  CreateReservationRequest({
    required this.spaceId,
    required this.date,
    this.startTime,
    this.endTime,
    this.durationType,
    this.halfDayPeriod,
    this.numberOfDays,
    this.guestCount,
    this.activityId,
    required this.paymentMode,
    this.subscriptionId,
  });

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{
      'spaceId': spaceId,
      'date': date,
      'paymentMode': paymentMode.name,
    };

    if (startTime != null) json['startTime'] = startTime;
    if (endTime != null) json['endTime'] = endTime;
    if (durationType != null) json['durationType'] = durationType!.name;
    if (halfDayPeriod != null) json['halfDayPeriod'] = halfDayPeriod!.name;
    if (numberOfDays != null) json['numberOfDays'] = numberOfDays;
    if (guestCount != null) json['guestCount'] = guestCount;
    if (activityId != null) json['activityId'] = activityId;
    if (subscriptionId != null) json['subscriptionId'] = subscriptionId;

    return json;
  }
}

class ReservationResponse {
  final String id;
  final String spaceId;
  final String date;
  final String? startTime;
  final String? endTime;
  final String status;
  final double totalPrice;
  final DateTime createdAt;

  ReservationResponse({
    required this.id,
    required this.spaceId,
    required this.date,
    this.startTime,
    this.endTime,
    required this.status,
    required this.totalPrice,
    required this.createdAt,
  });

  factory ReservationResponse.fromJson(Map<String, dynamic> json) {
    final startDate =
        json['startDate']?.toString() ?? json['date']?.toString() ?? '';
    final amountRaw = json['amountPaid'] ?? json['totalPrice'] ?? 0;
    final amount = amountRaw is num
        ? amountRaw.toDouble()
        : double.tryParse(amountRaw.toString()) ?? 0.0;
    final createdAtRaw = json['createdAt']?.toString();

    return ReservationResponse(
      id: json['id'] as String,
      spaceId: json['spaceId'] as String,
      date: startDate.length >= 10 ? startDate.substring(0, 10) : startDate,
      startTime: normalizeTimeString(json['startTime']),
      endTime: normalizeTimeString(json['endTime']),
      status: json['status']?.toString() ?? 'confirmed',
      totalPrice: amount,
      createdAt:
          createdAtRaw != null ? DateTime.parse(createdAtRaw) : DateTime.now(),
    );
  }
}

class AvailabilitySlot {
  final String startTime;
  final String endTime;
  final bool available;

  AvailabilitySlot({
    required this.startTime,
    required this.endTime,
    required this.available,
  });

  factory AvailabilitySlot.fromJson(Map<String, dynamic> json) {
    return AvailabilitySlot(
      startTime: normalizeTimeString(json['startTime']),
      endTime: normalizeTimeString(json['endTime']),
      available: json['available'] as bool? ?? false,
    );
  }

  String get label => '$startTime – $endTime';
}

class DurationOption {
  final DurationType durationType;
  final HalfDayPeriod? halfDayPeriod;
  final bool available;
  final String? boundStart;
  final String? boundEnd;

  DurationOption({
    required this.durationType,
    this.halfDayPeriod,
    required this.available,
    this.boundStart,
    this.boundEnd,
  });

  factory DurationOption.fromJson(Map<String, dynamic> json) {
    final typeName = json['durationType']?.toString() ?? 'full_day';
    final periodName = json['halfDayPeriod']?.toString();
    return DurationOption(
      durationType: DurationType.values.firstWhere(
        (e) => e.name == typeName,
        orElse: () => DurationType.full_day,
      ),
      halfDayPeriod: periodName == null
          ? null
          : HalfDayPeriod.values.firstWhere(
              (e) => e.name == periodName,
              orElse: () => HalfDayPeriod.morning,
            ),
      available: json['available'] as bool? ?? false,
      boundStart: json['boundStart']?.toString(),
      boundEnd: json['boundEnd']?.toString(),
    );
  }

  String get label {
    switch (durationType) {
      case DurationType.half_day:
        return halfDayPeriod == HalfDayPeriod.afternoon
            ? 'Demi-journée (après-midi)'
            : 'Demi-journée (matin)';
      case DurationType.full_day:
        return 'Journée complète';
      case DurationType.multi_day:
        return 'Multi-jours';
    }
  }
}

class AvailabilityResponse {
  final String date;
  final List<AvailabilitySlot> slots;
  final List<DurationOption> durationOptions;
  final bool blocked;

  AvailabilityResponse({
    required this.date,
    this.slots = const [],
    this.durationOptions = const [],
    this.blocked = false,
  });

  factory AvailabilityResponse.fromJson(Map<String, dynamic> json) {
    final slotsJson = json['slots'] as List? ?? const [];
    final optionsJson = json['durationOptions'] as List? ?? const [];
    return AvailabilityResponse(
      date: json['date']?.toString() ?? '',
      slots: slotsJson
          .map((e) => AvailabilitySlot.fromJson(e as Map<String, dynamic>))
          .toList(),
      durationOptions: optionsJson
          .map((e) => DurationOption.fromJson(e as Map<String, dynamic>))
          .toList(),
      blocked: json['blocked'] as bool? ?? false,
    );
  }
}
