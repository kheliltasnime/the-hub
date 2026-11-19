import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Palette — fiche design "The Hub Fiche" (source de vérité pour les couleurs,
/// prime sur le texte du CDC là où il y a un écart, ex: Neutral #2C2010 ici
/// vs #1A1A18 dans le CDC fonctionnel §17.1).
class AppColors {
  AppColors._();

  static const Color primary = Color(0xFFB8943F); // CTA, éléments actifs
  static const Color secondary = Color(0xFFF5F0E8); // Fond principal
  static const Color tertiary = Color(0xFFFFFFFF); // Cards, inputs
  static const Color neutral = Color(0xFF2C2010); // Texte foncé, bouton "Inverted"

  // Conservées du CDC fonctionnel pour les statuts (non couvertes par la fiche) :
  static const Color success = Color(0xFF3A7D5A);
  static const Color error = Color(0xFFC0392B);
  static const Color grayMedium = Color(0xFF8A8278);

  /// Dégradé sombre utilisé par la carte héro de Home (et disponible pour
  /// tout autre fond sombre) — basé sur neutral, cohérent avec la fiche.
  static const List<Color> splashGradient = [
    Color(0xFF1A1310),
    neutral,
  ];
}

/// Typographie — fiche design :
///   Headline -> EB Garamond
///   Body / Label -> Plus Jakarta Sans
class AppTypography {
  AppTypography._();

  static TextStyle headline({double size = 32, FontWeight weight = FontWeight.w500}) =>
      GoogleFonts.ebGaramond(fontSize: size, fontWeight: weight, color: AppColors.neutral);

  static TextStyle body({double size = 14, FontWeight weight = FontWeight.w400, Color? color}) =>
      GoogleFonts.plusJakartaSans(fontSize: size, fontWeight: weight, color: color ?? AppColors.neutral);

  static TextStyle label({double size = 12, Color? color}) => GoogleFonts.plusJakartaSans(
        fontSize: size,
        fontWeight: FontWeight.w500,
        color: color ?? AppColors.grayMedium,
      );

  static TextStyle button = GoogleFonts.plusJakartaSans(
    fontSize: 14,
    fontWeight: FontWeight.w700,
    letterSpacing: 0.5,
  );
}

class AppTheme {
  AppTheme._();

  static ThemeData light = ThemeData(
    useMaterial3: true,
    scaffoldBackgroundColor: AppColors.secondary,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      primary: AppColors.primary,
      secondary: AppColors.secondary,
      error: AppColors.error,
      surface: AppColors.tertiary,
    ),
    // Bouton "Primary" — fond or plein, texte blanc (cf. fiche design)
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
        textStyle: AppTypography.button,
      ),
    ),
    // Bouton "Outlined" — transparent, bordure fine
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.neutral,
        minimumSize: const Size.fromHeight(52),
        side: BorderSide(color: AppColors.neutral.withOpacity(0.15), width: 1.5),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
        textStyle: AppTypography.button,
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.tertiary,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: AppColors.neutral.withOpacity(0.1)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: AppColors.neutral.withOpacity(0.1)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
      ),
      labelStyle: AppTypography.label(),
    ),
  );
}