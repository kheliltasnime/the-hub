import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'models/wallet_models.dart';

class PayQrBottomSheet extends StatelessWidget {
  final QrPayData qrData;
  final String userName;
  final double balance;

  const PayQrBottomSheet({
    super.key,
    required this.qrData,
    required this.userName,
    required this.balance,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2)),
          ),
          const SizedBox(height: 20),
          const Text(
            "Paiement par QR Code",
            style: TextStyle(fontFamily: 'Serif', fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          Text("Scannez pour régler instantanément", style: TextStyle(color: Colors.grey[600], fontSize: 13)),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFFFFFBF2),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: const Color(0xFFF3E5C8)),
            ),
            child: QrImageView(
              data: qrData.qrToken,
              version: QrVersions.auto,
              size: 180.0,
            ),
          ),
          const SizedBox(height: 16),
          Text(userName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 4),
          Text(
            "Solde: ${balance.toStringAsFixed(3)} TND",
            style: const TextStyle(fontFamily: 'Serif', color: Color(0xFF9E7B1C), fontWeight: FontWeight.bold, fontSize: 18),
          ),
          const SizedBox(height: 24),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("FERMER", style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}