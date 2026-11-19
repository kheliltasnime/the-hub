/// Modèles pour l'écran Home.
library;

import '../../orders/models/order_models.dart';

class RecommendedItem {
  final MenuItem item;
  final String enseigneName;

  RecommendedItem({
    required this.item,
    required this.enseigneName,
  });
}

class UpcomingEvent {
  final String id;
  final String title;
  final DateTime date;
  final String time;
  final String location;
  final String imageUrl;
  final String description;
  final String priceLabel;
  final String hostName;
  final String hostRole;

  UpcomingEvent({
    required this.id,
    required this.title,
    required this.date,
    required this.time,
    required this.location,
    this.imageUrl =
        'https://images.unsplash.com/photo-1505373636811-2f2d5c7c1f9b?w=900',
    this.description =
        'Un moment pour apprendre, échanger et développer de nouvelles idées avec la communauté The Hub.',
    this.priceLabel = 'Gratuit pour les membres',
    this.hostName = 'The Hub Ghazela',
    this.hostRole = 'Communauté The Hub',
  });
}

/// Réservation du jour — shape alignée sur ce que GET /coworking/reservations/me
/// devrait raisonnablement renvoyer (à confirmer avec Asma, propriétaire du
/// domaine coworking : champs exacts non documentés dans le contrat vu jusqu'ici).
class TodayReservation {
  final String id;
  final String spaceName;
  final String zone;
  final DateTime startTime;
  final DateTime endTime;
  final String status; // ex: "a_venir" | "en_cours" | "terminee"

  TodayReservation({
    required this.id,
    required this.spaceName,
    required this.zone,
    required this.startTime,
    required this.endTime,
    required this.status,
  });

  factory TodayReservation.fromJson(Map<String, dynamic> json) {
    final startDateRaw = json['startDate']?.toString() ?? '';
    final endDateRaw = json['endDate']?.toString() ?? startDateRaw;
    final startClock = json['startTime']?.toString() ?? '00:00';
    final endClock = json['endTime']?.toString() ?? '00:00';

    String normalizeTime(String raw) {
      var text = raw.trim();
      if (text.isEmpty) return '00:00';
      text = text.replaceAll(' ', '').replaceAll('h', '').replaceAll('H', '');
      if (text.contains('.')) {
        final parts = text.split('.');
        if (parts.length == 2) {
          return '${parts[0].padLeft(2, '0')}:${parts[1].padLeft(2, '0')}';
        }
      }
      if (text.length >= 5 && text[2] == ':') return text.substring(0, 5);
      if (text.length == 4 && RegExp(r'^\d{4}$').hasMatch(text)) {
        return '${text.substring(0, 2)}:${text.substring(2)}';
      }
      return text;
    }

    DateTime combine(String dateIso, String hhmm) {
      final normalized = normalizeTime(hhmm);
      if (normalized.contains('T')) return DateTime.parse(normalized);
      final datePart =
          dateIso.length >= 10 ? dateIso.substring(0, 10) : dateIso;
      if (datePart.isEmpty) return DateTime.now();
      return DateTime.parse('${datePart}T$normalized:00');
    }

    return TodayReservation(
      id: json['id'] as String,
      spaceName: json['spaceName'] as String? ??
          json['space']?['name'] as String? ??
          '',
      zone: json['zone'] as String? ??
          json['space']?['enseigne']?['nom'] as String? ??
          '',
      startTime: combine(startDateRaw, startClock),
      endTime: combine(endDateRaw, endClock),
      status: json['status'] as String? ?? 'a_venir',
    );
  }
}
