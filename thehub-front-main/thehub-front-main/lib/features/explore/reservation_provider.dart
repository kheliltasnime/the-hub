import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'models/reservation_models.dart';
import 'reservations_repository.dart';

final reservationsRepositoryProvider = Provider<ReservationsRepository>((ref) {
  return ReservationsRepository();
});

class ReservationNotifier
    extends StateNotifier<AsyncValue<ReservationResponse?>> {
  final ReservationsRepository _repository;

  ReservationNotifier(this._repository) : super(const AsyncValue.data(null));

  Future<ReservationResponse> createReservation(
      CreateReservationRequest request) async {
    state = const AsyncValue.loading();
    try {
      final result = await _repository.createReservation(request);
      state = AsyncValue.data(result);
      return result;
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
      rethrow;
    }
  }

  void reset() {
    state = const AsyncValue.data(null);
  }
}

final reservationProvider = StateNotifierProvider<ReservationNotifier,
    AsyncValue<ReservationResponse?>>((ref) {
  final repository = ref.watch(reservationsRepositoryProvider);
  return ReservationNotifier(repository);
});

final availabilityProvider = FutureProvider.autoDispose
    .family<AvailabilityResponse, ({String spaceId, String date})>(
        (ref, params) async {
  final repository = ref.watch(reservationsRepositoryProvider);
  return repository.getAvailability(params.spaceId, params.date);
});

final spaceActivitiesProvider = FutureProvider.autoDispose
    .family<List<SpaceActivity>, String>((ref, spaceId) {
  return ref.watch(reservationsRepositoryProvider).getActivities(spaceId);
});
