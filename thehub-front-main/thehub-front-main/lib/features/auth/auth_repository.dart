import 'package:dio/dio.dart';
import '../../core/api/api_client.dart';
import '../../core/storage/token_storage.dart';

enum ProfileType { etudiant, professionnel }

extension ProfileTypeApi on ProfileType {
  String get apiValue =>
      this == ProfileType.etudiant ? 'etudiant' : 'professionnel';
}

class AuthUser {
  final String userId;
  final String email;
  final String fullName;
  final String profileType;

  AuthUser({
    required this.userId,
    required this.email,
    required this.fullName,
    required this.profileType,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
        userId: json['userId'] as String,
        email: json['email'] as String,
        fullName: json['fullName'] as String? ?? '',
        profileType: json['profileType'] as String? ?? '',
      );
}

/// Couche d'accès aux endpoints d'authentification — rapport v7 §2.1.
///
/// Chaque méthode entoure son appel Dio d'un try/catch on DioException qui
/// relance une ApiException proprement construite (voir ApiException.fromDioError
/// dans api_client.dart). Sans ça, l'intercepteur de ApiClient ne fait que
/// propager le DioException brut, donc AuthNotifier ne peut jamais matcher
/// son "on ApiException catch" et retombe systématiquement sur le message
/// générique "vérifiez votre réseau", même quand l'erreur vient du backend
/// (401, 409, etc.) et n'a rien à voir avec le réseau.
class AuthRepository {
  final Dio _dio = ApiClient.instance.dio;

  /// POST /auth/forgot-password
  Future<void> forgotPassword({required String email}) async {
    try {
      await _dio.post('/auth/forgot-password', data: {'email': email});
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> verifyResetCode({required String email, required String code}) async {
    try {
      await _dio.post('/auth/verify-reset-code', data: {
        'email': email,
        'code': code,
      });
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> resetPassword({
    required String email,
    required String code,
    required String newPassword,
  }) async {
    try {
      await _dio.post('/auth/reset-password', data: {
        'email': email,
        'code': code,
        'newPassword': newPassword,
      });
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// POST /auth/register
  /// Ne renvoie PAS de tokens — juste la confirmation du compte créé.
  /// Il faut appeler login() séparément ensuite (contrairement à un flow
  /// register -> auto-login classique).
  Future<AuthUser> register({
    required String email,
    required String password,
    required String fullName,
    required ProfileType profileType,
  }) async {
    try {
      final response = await _dio.post('/auth/register', data: {
        'email': email,
        'password': password,
        'fullName': fullName,
        'profileType': profileType.apiValue,
      });
      return AuthUser.fromJson(response.data['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// POST /auth/login
  /// Réponse : { data: { accessToken, refreshToken, expiresIn: 900, user: {...} } }
  Future<AuthUser> login(
      {required String email, required String password}) async {
    try {
      final response = await _dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });
      final data = response.data['data'] as Map<String, dynamic>;

      await TokenStorage.instance.saveSession(
        accessToken: data['accessToken'] as String,
        refreshToken: data['refreshToken'] as String,
      );
      return AuthUser.fromJson(data['user'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// GET /users/me — utile pour réhydrater le profil au démarrage
  /// (le Splash sait qu'une session existe via TokenStorage, mais pas
  /// encore qui est l'utilisateur).
  Future<AuthUser> fetchMe() async {
    try {
      final response = await _dio.get('/users/me');
      return AuthUser.fromJson(response.data['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// POST /auth/logout — JWT requis, pas de body.
  Future<void> logout() async {
    try {
      await _dio.post('/auth/logout');
    } on DioException {
      // On efface quand même la session locale même si l'appel réseau échoue.
    } finally {
      await TokenStorage.instance.clear();
    }
  }

  /// POST /auth/oauth/google - Flow mobile natif
  /// Utilise l'ID token du SDK google_sign_in
  Future<AuthUser> loginWithGoogleIdToken(String idToken) async {
    try {
      final response = await _dio.post('/auth/oauth/google', data: {
        'idToken': idToken,
      });
      final data = response.data['data'] as Map<String, dynamic>;

      await TokenStorage.instance.saveSession(
        accessToken: data['accessToken'] as String,
        refreshToken: data['refreshToken'] as String,
      );
      return AuthUser.fromJson(data['user'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      await _dio.post('/auth/change-password', data: {
        'currentPassword': currentPassword,
        'newPassword': newPassword,
      });
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
