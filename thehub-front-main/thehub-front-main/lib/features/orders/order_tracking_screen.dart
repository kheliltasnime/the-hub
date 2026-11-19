import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../../core/theme/app_theme.dart';
import '../../core/api/api_client.dart';
import '../../core/storage/token_storage.dart';
import '../auth/auth_provider.dart';
import 'models/order_models.dart';
import 'orders_provider.dart';

const _statutOrder = ['RECUE', 'EN_PREPARATION', 'PRETE', 'RECUPEREE'];
const _statutLabels = {
  'RECUE': 'Commande reçue',
  'EN_PREPARATION': 'En cours de préparation',
  'PRETE': 'Prête pour le retrait',
  'RECUPEREE': 'Commande récupérée',
  'ANNULEE': 'Commande annulée',
};

class OrderTrackingScreen extends ConsumerStatefulWidget {
  final String orderId;
  final CheckoutResult? initialResult;

  const OrderTrackingScreen(
      {super.key, required this.orderId, this.initialResult});

  @override
  ConsumerState<OrderTrackingScreen> createState() =>
      _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends ConsumerState<OrderTrackingScreen> {
  io.Socket? _socket;
  Timer? _pollTimer;
  String? _statut;
  bool _liveConnected = false;
  bool _cancelling = false;

  @override
  void initState() {
    super.initState();
    _statut = widget.initialResult?.statut;
    _pollOnce();
    // Refresh REST de secours toutes les 4 secondes
    _pollTimer = Timer.periodic(const Duration(seconds: 4), (_) => _pollOnce());
    _connectSocket();
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _socket?.off('orderStatusUpdated');
    _socket?.off('order:status_updated');
    _socket?.off('order:${widget.orderId}');
    _socket?.off('order:ready');
    _socket?.off('order:cancelled');
    _socket?.disconnect();
    _socket?.dispose();
    super.dispose();
  }

  Future<void> _pollOnce() async {
    try {
      final status =
          await ref.read(ordersRepositoryProvider).fetchStatus(widget.orderId);
      if (mounted && status.statut != _statut) {
        setState(() => _statut = status.statut);
      }
    } catch (_) {}
  }

  Future<void> _connectSocket() async {
    try {
      final token = await TokenStorage.instance.accessToken;
      if (token == null) return;

      // URL principale du backend sans /v1
      final socketBase = ApiClient.baseUrl.replaceFirst(RegExp(r'/v1/?$'), '');

      _socket = io.io(
        socketBase,
        io.OptionBuilder()
            .setTransports(['websocket', 'polling'])
            .setAuth({'token': token})
            .enableAutoConnect()
            .build(),
      );

      _socket!.onConnect((_) {
        if (mounted) setState(() => _liveConnected = true);

        // Rejoindre la room spécifique de la commande
        _socket!.emit('joinOrderRoom', {'orderId': widget.orderId});
        _socket!.emit('subscribe', {'orderId': widget.orderId});
      });

      _socket!.onDisconnect((_) {
        if (mounted) setState(() => _liveConnected = false);
      });

      _socket!.onConnectError((_) {
        if (mounted) setState(() => _liveConnected = false);
      });

      // Écoute des événements WebSocket du Backend
      _socket!.on('orderStatusUpdated', (data) => _applyPayload(data));
      _socket!.on('order:status_updated', (data) => _applyPayload(data));
      _socket!.on('order:${widget.orderId}', (data) => _applyPayload(data));
      _socket!
          .on('order:ready', (data) => _applyPayload(data, fallback: 'PRETE'));
      _socket!.on('order:cancelled',
          (data) => _applyPayload(data, fallback: 'ANNULEE'));

      _socket!.connect();
    } catch (_) {}
  }

  void _applyPayload(dynamic data, {String? fallback}) {
    String? newStatut = fallback;

    if (data is Map) {
      final payloadOrderId = data['orderId'] ?? data['id'];
      // Vérifier si le message concerne la commande actuelle (ou sans ID spécifique)
      if (payloadOrderId == null || payloadOrderId == widget.orderId) {
        if (data['statut'] is String) {
          newStatut = data['statut'] as String;
        } else if (data['status'] is String) {
          newStatut = data['status'] as String;
        }
      }
    } else if (data is String) {
      newStatut = data;
    }

    if (newStatut != null && mounted) {
      setState(() => _statut = newStatut);
    }
  }

  @override
  Widget build(BuildContext context) {
    final statut = _statut ?? 'RECUE';
    final isCancelled = statut == 'ANNULEE';
    final stepIndex = _statutOrder.indexOf(statut);

    return Scaffold(
      backgroundColor: AppColors.secondary,
      body: SafeArea(
        child: Column(
          children: [
            _Header(),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  _LiveIndicator(connected: _liveConnected),
                  const SizedBox(height: 16),
                  if (isCancelled)
                    _CancelledBanner()
                  else
                    Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                          color: AppColors.neutral,
                          borderRadius: BorderRadius.circular(16)),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('STATUT ACTUEL',
                              style: AppTypography.label(
                                  size: 11, color: Colors.white70)),
                          const SizedBox(height: 6),
                          AnimatedSwitcher(
                            duration: const Duration(milliseconds: 300),
                            child: Text(
                              _statutLabels[statut] ?? statut,
                              key: ValueKey(statut),
                              style: AppTypography.headline(size: 22)
                                  .copyWith(color: AppColors.primary),
                            ),
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 24),
                  if (!isCancelled)
                    _StatusTimeline(
                        currentIndex: stepIndex >= 0 ? stepIndex : 0),
                  const SizedBox(height: 24),
                  if (widget.initialResult != null)
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                          color: AppColors.tertiary,
                          borderRadius: BorderRadius.circular(16)),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Total payé',
                              style: AppTypography.label(size: 12)),
                          Text(
                            '${widget.initialResult!.total.toStringAsFixed(2)} DT',
                            style: AppTypography.body(size: 15).copyWith(
                                fontWeight: FontWeight.w700,
                                color: AppColors.primary),
                          ),
                        ],
                      ),
                    ),
                  if (_statut == 'RECUE') ...[
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: _cancelling ? null : _cancelOrder,
                        icon: _cancelling
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child:
                                    CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.cancel_outlined),
                        label: Text(_cancelling
                            ? 'Annulation en cours...'
                            : 'Annuler la commande'),
                      ),
                    ),
                  ],
                  const SizedBox(height: 20),
                  if (!isCancelled)
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () => _showQrSheet(context),
                        child: const Text('Afficher le QR Code de retrait'),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _cancelOrder() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Annuler la commande ?'),
        content: const Text(
          'La commande sera annulée et son montant sera remboursé sur votre Wallet.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Garder la commande'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Confirmer l’annulation'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _cancelling = true);
    try {
      await ref.read(ordersRepositoryProvider).cancelOrder(widget.orderId);
      if (mounted) {
        setState(() => _statut = 'ANNULEE');
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Commande annulée et remboursée.')),
        );
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _cancelling = false);
    }
  }

  void _showQrSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.neutral,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(24),
        child: FutureBuilder<OrderQr>(
          future: ref.read(ordersRepositoryProvider).fetchQr(widget.orderId),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const SizedBox(
                  height: 160,
                  child: Center(
                      child:
                          CircularProgressIndicator(color: AppColors.primary)));
            }
            if (snapshot.hasError ||
                snapshot.data == null ||
                snapshot.data!.qrToken.isEmpty) {
              return SizedBox(
                height: 100,
                child: Center(
                    child: Text('QR indisponible pour le moment.',
                        style: AppTypography.body(color: Colors.white70))),
              );
            }
            return Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                    padding: const EdgeInsets.all(12),
                    color: Colors.white,
                    child: _QrPlaceholder(data: snapshot.data!.qrToken)),
                const SizedBox(height: 12),
                Text('Présentez ce code au comptoir',
                    style: AppTypography.body(color: Colors.white)),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _QrPlaceholder extends StatelessWidget {
  final String data;
  const _QrPlaceholder({required this.data});

  @override
  Widget build(BuildContext context) {
    return SizedBox(height: 160, width: 160, child: _buildQr(data));
  }

  Widget _buildQr(String data) {
    return _QrImage(data: data);
  }
}

class _QrImage extends StatelessWidget {
  final String data;
  const _QrImage({required this.data});

  @override
  Widget build(BuildContext context) {
    return _qr(data);
  }
}

Widget _qr(String data) => _QrImplementation(data);

Widget _QrImplementation(String data) {
  throw UnimplementedError();
}

class _Header extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final name = user?.fullName ?? '';
    final parts = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((p) => p.isNotEmpty)
        .toList();
    final initials = parts.isEmpty
        ? '?'
        : parts.length == 1
            ? parts.first.substring(0, 1).toUpperCase()
            : '${parts.first[0]}${parts.last[0]}'.toUpperCase();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      child: Row(
        children: [
          IconButton(
            tooltip: 'Retour',
            icon: const Icon(Icons.arrow_back, color: AppColors.neutral),
            onPressed: () => context.pop(),
          ),
          Expanded(
            child: Text('Suivi de Commande',
                style: AppTypography.headline(size: 18)),
          ),
          IconButton(
            tooltip: 'Notifications',
            icon: const Icon(Icons.notifications_none,
                color: AppColors.neutral),
            onPressed: () {},
          ),
          GestureDetector(
            onTap: () => context.push('/profile'),
            child: CircleAvatar(
              radius: 18,
              backgroundColor: AppColors.primary,
              child: Text(initials,
                  style: AppTypography.label(
                      size: 11, color: Colors.white)),
            ),
          ),
        ],
      ),
    );
  }
}

class _LiveIndicator extends StatelessWidget {
  final bool connected;
  const _LiveIndicator({required this.connected});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
              color: connected ? AppColors.success : AppColors.grayMedium,
              shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        Text(
          connected ? 'Connecté en direct' : 'Actualisation automatique active',
          style: AppTypography.label(size: 11, color: AppColors.grayMedium),
        ),
      ],
    );
  }
}

class _CancelledBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
          color: AppColors.error.withOpacity(0.08),
          borderRadius: BorderRadius.circular(16)),
      child: Row(
        children: [
          const Icon(Icons.cancel_outlined, color: AppColors.error),
          const SizedBox(width: 12),
          Expanded(
              child: Text('Cette commande a été annulée.',
                  style: AppTypography.body(size: 14, color: AppColors.error))),
        ],
      ),
    );
  }
}

class _StatusTimeline extends StatelessWidget {
  final int currentIndex;
  const _StatusTimeline({required this.currentIndex});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(_statutOrder.length, (i) {
        final done = i <= currentIndex;
        final isLast = i == _statutOrder.length - 1;
        return IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Column(
                children: [
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      color: done ? AppColors.primary : AppColors.tertiary,
                      shape: BoxShape.circle,
                      border: Border.all(
                          color: done
                              ? AppColors.primary
                              : AppColors.grayMedium.withOpacity(0.3)),
                    ),
                    child: done
                        ? const Icon(Icons.check, size: 14, color: Colors.white)
                        : null,
                  ),
                  if (!isLast)
                    Expanded(
                        child: Container(
                            width: 2,
                            color: done
                                ? AppColors.primary
                                : AppColors.grayMedium.withOpacity(0.2))),
                ],
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 24),
                  child: Text(
                    _statutLabels[_statutOrder[i]] ?? _statutOrder[i],
                    style: AppTypography.body(
                            size: 14,
                            color:
                                done ? AppColors.neutral : AppColors.grayMedium)
                        .copyWith(
                            fontWeight:
                                done ? FontWeight.w700 : FontWeight.w400),
                  ),
                ),
              ),
            ],
          ),
        );
      }),
    );
  }
}
