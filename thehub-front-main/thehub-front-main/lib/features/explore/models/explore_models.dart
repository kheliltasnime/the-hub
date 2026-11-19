/// Modèle UI / API pour un espace coworking (GET /coworking/spaces).
class CoworkingSpace {
  final String id;
  final String name;
  final String location;
  final String floor;
  final String description;
  final String imageUrl;
  final List<String> features;
  final String pricing;
  final int capacity;
  final double size;
  final double pricePerUnit;
  final String pricingUnit; // hour | day | activity
  final String openingHour;
  final String closingHour;
  final String? status;

  /// Compat UI existante (cartes Explore).
  double get hourlyRate => pricePerUnit;
  double? get halfDayRate =>
      pricingUnit == 'day' ? pricePerUnit / 2 : null;

  CoworkingSpace({
    required this.id,
    required this.name,
    required this.location,
    required this.floor,
    required this.description,
    required this.imageUrl,
    required this.features,
    required this.pricing,
    required this.capacity,
    required this.size,
    required this.pricePerUnit,
    required this.pricingUnit,
    required this.openingHour,
    required this.closingHour,
    this.status,
  });

  static String _fallbackImage(String type) {
    switch (type) {
      case 'studio_photo':
        return 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400';
      case 'studio_podcast':
        return 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=400';
      case 'hot_desk':
        return 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400';
      default:
        return 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400';
    }
  }

  static String _pricingLabel(String unit, double price) {
    switch (unit) {
      case 'day':
        return '${price.toStringAsFixed(0)} DT / jour';
      case 'activity':
        return 'Tarif selon activité';
      default:
        return '${price.toStringAsFixed(0)} DT / heure';
    }
  }

  factory CoworkingSpace.fromJson(Map<String, dynamic> json) {
    final enseigne = json['enseigne'] as Map<String, dynamic>?;
    final type = json['type']?.toString() ?? '';
    final pricingUnit = json['pricingUnit']?.toString() ?? 'hour';
    final priceRaw = json['pricePerUnit'];
    final price = priceRaw == null
        ? 0.0
        : priceRaw is num
            ? priceRaw.toDouble()
            : double.tryParse(priceRaw.toString()) ?? 0.0;
    final equipements = (json['equipements'] as List?)
            ?.map((e) => e.toString())
            .toList() ??
        const <String>[];
    final capacityMax = json['capacityMax'] is int
        ? json['capacityMax'] as int
        : int.tryParse('${json['capacityMax']}') ?? 1;
    final description = (json['description'] as String?)?.trim();

    return CoworkingSpace(
      id: json['id'] as String,
      name: json['name'] as String,
      location: enseigne?['nom']?.toString() ?? 'Coworking',
      floor: type.replaceAll('_', ' ').toUpperCase(),
      description: (description != null && description.isNotEmpty)
          ? description
          : 'Capacité max: $capacityMax',
      imageUrl: json['imageUrl']?.toString() ?? _fallbackImage(type),
      features: equipements,
      pricing: _pricingLabel(pricingUnit, price),
      capacity: capacityMax,
      size: 0,
      pricePerUnit: price,
      pricingUnit: pricingUnit,
      openingHour: json['openingHour']?.toString() ?? '08:00',
      closingHour: json['closingHour']?.toString() ?? '22:00',
      status: json['status']?.toString(),
    );
  }
}
