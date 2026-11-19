import 'package:dio/dio.dart';

import '../storage/token_storage.dart';

/// Erreur API normalisée — structure vue dans le rapport v7 :

/// { "error": { "code": "INVALID_CREDENTIALS", "message": "...", "statusCode": 401 } }

class ApiException implements Exception {
  final String code;

  final String message;

  final int statusCode;

  ApiException(
      {required this.code, required this.message, required this.statusCode});

  factory ApiException.fromDioError(DioException e) {
    final data = e.response?.data;

    if (data is Map && data['error'] is Map) {
      final err = data['error'] as Map;

      return ApiException(
        code: err['code']?.toString() ?? 'UNKNOWN_ERROR',
        message: err['message']?.toString() ?? 'Une erreur est survenue.',
        statusCode: err['statusCode'] is int
            ? err['statusCode']
            : e.response?.statusCode ?? 0,
      );
    }

    return ApiException(
      code: 'NETWORK_ERROR',
      message: e.message ?? 'Erreur réseau — vérifiez votre connexion.',
      statusCode: e.response?.statusCode ?? 0,
    );
  }

  @override
  String toString() => '[$code] $message';
}

/// Client HTTP central. Base URL à pointer sur ton backend local pendant

/// le dev (ex: http://10.0.2.2:3000/v1 pour l'émulateur Android, ou

/// http://localhost:3000/v1 en debug web/desktop) puis sur la prod ensuite.

/// À terme : passer par --dart-define plutôt qu'une valeur en dur.

class ApiClient {
  ApiClient._internal() {
    _dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 20),
        receiveTimeout: const Duration(seconds: 20),
        contentType: 'application/json',
      ),
    );

    _dio.interceptors.add(_authInterceptor());
  }

  static final ApiClient instance = ApiClient._internal();

  // TODO: remplacer par l'URL de ton backend local pendant le dev.

  static const String baseUrl = 'http://192.168.0.10:3000/v1';

  late final Dio _dio;

  Dio get dio => _dio;

  Future<String?>? _refreshing;

  InterceptorsWrapper _authInterceptor() {
    return InterceptorsWrapper(
      onRequest: (options, handler) async {
        // Les routes /auth/register, /auth/login, /auth/refresh sont publiques —

        // seule /auth/logout a besoin du access token (rapport v7 §2.1).

        final publicPaths = [
          '/auth/register',
          '/auth/login',
          '/auth/refresh',
          '/auth/pin-login'
        ];

        if (!publicPaths.contains(options.path)) {
          final token = await TokenStorage.instance.accessToken;

          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
        }

        handler.next(options);
      },
      onError: (DioException error, handler) async {
        final isUnauthorized = error.response?.statusCode == 401;

        final isRefreshCall = error.requestOptions.path == '/auth/refresh';

        if (isUnauthorized && !isRefreshCall) {
          try {
            final newAccessToken = await _refreshAccessToken();

            if (newAccessToken != null) {
              final retryRequest = error.requestOptions;

              retryRequest.headers['Authorization'] = 'Bearer $newAccessToken';

              final response = await _dio.fetch(retryRequest);

              return handler.resolve(response);
            }
          } catch (_) {
            // Refresh token expiré (7j) ou invalide -> session terminée.

            await TokenStorage.instance.clear();
          }
        }

        handler.next(error);
      },
    );
  }

  Future<String?> _refreshAccessToken() {
    _refreshing ??= _doRefresh().whenComplete(() => _refreshing = null);

    return _refreshing!;
  }

  /// POST /auth/refresh — Body { "refreshToken": "JWT" } (rapport v7 §2.1).

  /// Réponse : { "data": { "accessToken", "expiresIn" } } — PAS de nouveau

  /// refreshToken, contrairement à un pattern de rotation classique.

  Future<String?> _doRefresh() async {
    final refreshToken = await TokenStorage.instance.refreshToken;

    if (refreshToken == null) return null;

    final response = await Dio(BaseOptions(baseUrl: baseUrl)).post(
      '/auth/refresh',
      data: {'refreshToken': refreshToken},
    );

    final newAccess = response.data['data']['accessToken'] as String;

    await TokenStorage.instance.updateAccessToken(newAccess);

    return newAccess;
  }
}
