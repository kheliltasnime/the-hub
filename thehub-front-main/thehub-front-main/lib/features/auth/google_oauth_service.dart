// lib/features/auth/services/google_oauth_service.dart
import 'package:google_sign_in/google_sign_in.dart';

class GoogleOAuthService {
  static final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: ['email', 'profile'],
    // ✅ AJOUTER LE serverClientId (le même que le backend)
    // ✅ AJOUTE CE CI - LE MÊME QUE LE BACKEND
    serverClientId:
        '1076761396533-jb0ud9dvq9m7o18ohjt9qv86gi0pjgj4.apps.googleusercontent.com',
  );

  /// Récupère l'ID token Google pour le flow mobile
  /// Retourne null si l'utilisateur annule ou si une erreur survient
  Future<String?> signInWithGoogle() async {
    try {
      print('🟢 Début de la connexion Google...');

      final GoogleSignInAccount? account = await _googleSignIn.signIn();
      if (account == null) {
        print('🟡 Utilisateur a annulé la connexion');
        return null;
      }

      print('🟢 Compte sélectionné: ${account.email}');

      final GoogleSignInAuthentication auth = await account.authentication;

      print('🟢 ID Token: ${auth.idToken?.substring(0, 30)}...');
      print('🟢 Access Token: ${auth.accessToken?.substring(0, 30)}...');

      if (auth.idToken == null) {
        print('🔴 ERREUR: idToken est null !');
        return null;
      }

      return auth.idToken;
    } catch (e) {
      print('🔴 Erreur Google Sign-In: $e');
      return null;
    }
  }

  /// Déconnexion de Google (optionnel)
  Future<void> signOut() async {
    await _googleSignIn.signOut();
  }
}
