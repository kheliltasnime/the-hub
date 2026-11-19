const { io } = require('socket.io-client');

const token = process.argv[2];
const orderId = process.argv[3];

if (!token) {
  console.error('Usage: node test-tracking-queryparam.js <ACCESS_TOKEN> [ORDER_ID]');
  process.exit(1);
}

// Connexion via ?token= dans l'URL uniquement — PAS de auth.token —
// pour valider isolément le CDC §6.4 : ws://.../tracking?token=<access_token>
const socket = io(`http://localhost:3000/tracking?token=${token}`);

socket.on('connect', () => {
  console.log('Connecté via query param :', socket.id);

  if (orderId) {
    console.log('Abonnement à la commande :', orderId);
    socket.emit('subscribe', { orderId });
  } else {
    console.log('Aucun orderId fourni — connecté mais pas abonné à une commande précise.');
  }
});

socket.on('subscribed', (data) => {
  console.log('Abonné avec succès :', data);
});

socket.on('order:status_updated', (data) => {
  console.log('>>> MAJ STATUT REÇUE :', data);
});

socket.on('error', (err) => {
  console.error('Erreur applicative :', err);
});

socket.on('connect_error', (err) => {
  console.error('Erreur de connexion :', err.message);
});

socket.on('disconnect', (reason) => {
  console.log('Déconnecté :', reason);
});

socket.on('order:ready', (data) => {
  console.log('🔔 COMMANDE PRÊTE :', data);
});

socket.on('order:cancelled', (data) => {
  console.log('❌ COMMANDE ANNULÉE :', data);
});