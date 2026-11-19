import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/storage/token_storage.dart';
import 'auth_repository.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthState {
  final AuthStatus status;
  final AuthUser? user;
  final String? errorMessage;
  final bool isLoading;

  const AuthState({
    this.status = AuthStatus.unknown,
    this.user,
    this.errorMessage,
    this.isLoading = false,
  });

  AuthState copyWith({
    AuthStatus? status,
    AuthUser? user,
    String? errorMessage,
    bool? isLoading,
    bool clearError = false,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      isLoading: isLoading ?? this.isLoading,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(this._repository) : super(const AuthState());

  final AuthRepository _repository;

  /// Appelé par le Splash : un accessToken en storage indique une session
  /// probable, mais on confirme en récupérant le profil via /users/me —
  /// si le token est en fait périmé, l'intercepteur de ApiClient tentera
  /// le refresh automatiquement, et si ça échoue aussi, on retombe ici
  /// en unauthenticated.
  Future<void> checkExistingSession() async {
    final hasSession = await TokenStorage.instance.hasSession;
    if (!hasSession) {
      state = state.copyWith(status: AuthStatus.unauthenticated);
      return;
    }
    try {
      final user = await _repository.fetchMe();
      state = state.copyWith(status: AuthStatus.authenticated, user: user);
    } catch (_) {
      await TokenStorage.instance.clear();
      state = state.copyWith(status: AuthStatus.unauthenticated);
    }
  }

  Future<bool> login({required String email, required String password}) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      // L'objet "user" renvoyé par /auth/login n'est pas garanti complet
      // par le contrat (juste noté "{...}" dans le rapport v7) -> on
      // enrichit systématiquement via /users/me, seule source fiable pour
      // fullName/profileType/role.
      await _repository.login(email: email, password: password);
      final user = await _repository.fetchMe();
      state = state.copyWith(status: AuthStatus.authenticated, user: user, isLoading: false);
      return true;
    } on ApiException catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.message);
      return false;
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Connexion impossible — vérifiez votre réseau.',
      );
      return false;
    }
  }

  /// Register ne connecte PAS automatiquement (le backend ne renvoie pas
  /// de tokens sur cet endpoint) — on remonte juste succès/échec, l'écran
  /// Register redirige ensuite vers Login avec l'email pré-rempli.
  Future<bool> register({
    required String email,
    required String password,
    required String fullName,
    required ProfileType profileType,
  }) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      await _repository.register(
        email: email,
        password: password,
        fullName: fullName,
        profileType: profileType,
      );
      state = state.copyWith(isLoading: false);
      return true;
    } on ApiException catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.message);
      return false;
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Inscription impossible — vérifiez votre réseau.',
      );
      return false;
    }
  }

  Future<void> logout() async {
    await _repository.logout();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) => AuthRepository());

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.read(authRepositoryProvider));
});