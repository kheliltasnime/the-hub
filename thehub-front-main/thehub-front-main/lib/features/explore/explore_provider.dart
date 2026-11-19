import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'models/explore_models.dart';
import 'reservation_provider.dart';

final coworkingSpacesProvider =
    FutureProvider.autoDispose<List<CoworkingSpace>>((ref) async {
  final repository = ref.watch(reservationsRepositoryProvider);
  return repository.getSpaces();
});
