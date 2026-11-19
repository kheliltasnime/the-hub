import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Stockage sécurisé des tokens JWT.
///
/// Important (rapport v7 §2.1) : /auth/refresh renvoie UNIQUEMENT un nouvel
/// accessToken — le refreshToken initial reste valide 7 jours et n'est
/// jamais remplacé par cet appel. On ne l'écrase donc que depuis login()
/// ou register()+login(), jamais depuis le refresh.
class TokenStorage {
  TokenStorage._();
  static final TokenStorage instance = TokenStorage._();

  final FlutterSecureStorage _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  static const _accessTokenKey = 'access_token';
  static const _refreshTokenKey = 'refresh_token';

  Future<void> saveSession({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _storage.write(key: _accessTokenKey, value: accessToken);
    await _storage.write(key: _refreshTokenKey, value: refreshToken);
  }

  /// Mise à jour de l'access token seul, après un refresh réussi.
  Future<void> updateAccessToken(String accessToken) async {
    await _storage.write(key: _accessTokenKey, value: accessToken);
  }

  Future<String?> get accessToken => _storage.read(key: _accessTokenKey);
  Future<String?> get refreshToken => _storage.read(key: _refreshTokenKey);

  Future<void> writeValue(String key, String value) =>
      _storage.write(key: key, value: value);

  Future<String?> readValue(String key) => _storage.read(key: key);

  Future<void> clear() async {
    await _storage.delete(key: _accessTokenKey);
    await _storage.delete(key: _refreshTokenKey);
  }

  Future<bool> get hasSession async => (await accessToken) != null;
}
