const { io } = require('socket.io-client');

const token = process.argv[2];
const orderId = process.argv[3];

if (!token) {
  console.error('Usage: node test-tracking.js <ACCESS_TOKEN> [ORDER_ID]');
  process.exit(1);
}

const socket = io('http://localhost:3000/tracking', {
  auth: { token },
});

socket.on('connect', () => {
  console.log('Connecté :', socket.id);

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