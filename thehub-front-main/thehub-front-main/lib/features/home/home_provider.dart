import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../wallet/wallet_provider.dart';
import '../coworking/reservations_repository.dart';
import '../orders/orders_provider.dart';
import 'models/home_models.dart';

final reservationsRepositoryProvider =
    Provider((ref) => ReservationsRepository());

/// Provider synchronisé avec wallet_screen - utilise walletDetailsProvider
final walletBalanceProvider = Provider<double>((ref) {
  final walletAsync = ref.watch(walletDetailsProvider);
  return walletAsync.maybeWhen(
    data: (data) => data.balance,
    orElse: () => 0.0,
  );
});

/// Provider synchronisé pour les points de fidélité
final loyaltyPointsProvider = Provider<int>((ref) {
  final walletAsync = ref.watch(walletDetailsProvider);
  return walletAsync.maybeWhen(
    data: (data) => data.loyaltyPoints,
    orElse: () => 0,
  );
});

/// Réel — GET /coworking/reservations/me, toutes réservations pour regroupement
/// dans l'écran Home (jour / à venir / historique).
final allReservationsProvider = FutureProvider<List<TodayReservation>>((ref) {
  return ref.read(reservationsRepositoryProvider).fetchMyReservations();
});

/// Réel — GET /coworking/reservations/me, filtré sur aujourd'hui.
final todayReservationsProvider = FutureProvider<List<TodayReservation>>((ref) {
  return ref.read(reservationsRepositoryProvider).fetchTodayReservations();
});

/// Recommandations construites à partir des articles réellement disponibles.
/// Le backend ne propose pas encore de classement personnalisé, donc on
/// affiche les premiers articles disponibles des enseignes actives.
final recommendedItemsProvider =
    FutureProvider<List<RecommendedItem>>((ref) async {
  final repository = ref.read(ordersRepositoryProvider);
  final enseignes = await repository.fetchEnseignes();
  final menus = await Future.wait(
    enseignes.map((enseigne) async {
      try {
        return (enseigne, await repository.fetchMenu(enseigne.id));
      } catch (_) {
        return (enseigne, null);
      }
    }),
  );

  return menus
      .expand((entry) =>
          entry.$2?.categories.expand((group) => group.items
              .where((item) => item.disponible)
              .map((item) => RecommendedItem(
                    item: item,
                    enseigneName: entry.$1.nom,
                  ))) ??
          const <RecommendedItem>[])
      .take(5)
      .toList();
});

/// MOCK — pas de module "événements" identifié dans le CDC mobile à date.
final upcomingEventsProvider = Provider<List<UpcomingEvent>>((ref) {
  final now = DateTime.now();
  return [
    UpcomingEvent(
      id: '1',
      title: 'Workshop : IA & Créativité',
      date: DateTime(now.year, now.month, 26),
      time: '10:00',
      location: 'Hub Lab',
    ),
  ];
});
