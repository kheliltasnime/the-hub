import 'package:dio/dio.dart';
import '../../core/api/api_client.dart';
import '../home/models/home_models.dart';

/// GET /coworking/reservations/me — domaine d'Asma BERKAYA, endpoint mappé
/// côté backend mais le contrat exact (champs de réponse) n'a pas été
/// documenté dans ce que j'ai vu jusqu'ici. TodayReservation.fromJson()
/// fait une hypothèse raisonnable sur la forme — à confirmer avec Asma et
/// ajuster si les vrais noms de champs diffèrent.
class ReservationsRepository {
  final Dio _dio = ApiClient.instance.dio;

  Future<List<TodayReservation>> fetchMyReservations() async {
    try {
      final response = await _dio.get('/coworking/reservations/me');
      final raw = response.data is Map && response.data['data'] != null
          ? response.data['data']
          : response.data;

      final list = raw is List ? raw : const <dynamic>[];
      return list
          .map((e) => TodayReservation.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<TodayReservation>> fetchTodayReservations() async {
    final all = await fetchMyReservations();
    final now = DateTime.now();

    return all
        .where((r) =>
            r.startTime.isAfter(now) ||
            (r.startTime.year == now.year &&
                r.startTime.month == now.month &&
                r.startTime.day == now.day))
        .toList();
  }
}
