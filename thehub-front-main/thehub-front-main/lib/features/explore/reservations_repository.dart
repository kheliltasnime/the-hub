import 'package:dio/dio.dart';
import '../../core/api/api_client.dart';
import 'models/explore_models.dart';
import 'models/reservation_models.dart';

class ReservationsRepository {
  final Dio _dio = ApiClient.instance.dio;

  Map<String, dynamic> _unwrapMap(dynamic data) {
    if (data is Map<String, dynamic> && data['data'] is Map) {
      return data['data'] as Map<String, dynamic>;
    }
    if (data is Map<String, dynamic>) return data;
    throw ApiException(
      code: 'INVALID_RESPONSE',
      message: 'Réponse API invalide',
      statusCode: 500,
    );
  }

  List<dynamic> _unwrapList(dynamic data) {
    if (data is Map && data['data'] is List) return data['data'] as List;
    if (data is List) return data;
    throw ApiException(
      code: 'INVALID_RESPONSE',
      message: 'Réponse API invalide',
      statusCode: 500,
    );
  }

  /// GET /coworking/spaces
  Future<List<CoworkingSpace>> getSpaces({String? enseigneId}) async {
    try {
      final response = await _dio.get(
        '/coworking/spaces',
        queryParameters: {
          if (enseigneId != null) 'enseigneId': enseigneId,
        },
      );
      return _unwrapList(response.data)
          .map((e) => CoworkingSpace.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// POST /coworking/reservations
  Future<ReservationResponse> createReservation(
      CreateReservationRequest request) async {
    try {
      final response = await _dio.post(
        '/coworking/reservations',
        data: request.toJson(),
      );
      return ReservationResponse.fromJson(_unwrapMap(response.data));
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// GET /coworking/spaces/:id/availability
  Future<AvailabilityResponse> getAvailability(
      String spaceId, String date) async {
    try {
      final response = await _dio.get(
        '/coworking/spaces/$spaceId/availability',
        queryParameters: {'date': date},
      );
      return AvailabilityResponse.fromJson(_unwrapMap(response.data));
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// GET /coworking/spaces/:id/activities
  Future<List<SpaceActivity>> getActivities(String spaceId) async {
    try {
      final response = await _dio.get('/coworking/spaces/$spaceId/activities');
      return _unwrapList(response.data)
          .map((e) => SpaceActivity.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// GET /coworking/reservations/me
  Future<List<ReservationResponse>> getMyReservations() async {
    try {
      final response = await _dio.get('/coworking/reservations/me');
      return _unwrapList(response.data)
          .map((e) => ReservationResponse.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
