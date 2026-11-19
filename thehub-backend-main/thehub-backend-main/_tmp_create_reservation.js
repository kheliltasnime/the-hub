const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Last JWT_SECRET in .env wins with dotenv
const secret =
  'f4dec145dcc4a2fdc738ee4e7f61c67b691e2f0e4c5c3773b4bd07f4929b61f1eef49b09e7d30cd9fb652fcc6ad8fbb02c7c8d64b64495e8a5706c0b00e50672';

const userId = '7e97d058-34c1-4725-8491-4f65c65f7ac4';
const token = jwt.sign({ sub: userId, email: 'kheliltasnime@gmail.com' }, secret, {
  expiresIn: '1h',
});

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const date = tomorrow.toISOString().slice(0, 10);

const body = {
  spaceId: 'b1111111-1111-4111-8111-111111111111',
  date,
  startTime: '10:00',
  endTime: '12:00',
  paymentMode: 'wallet',
};

async function main() {
  console.log('POST body', body);
  const res = await fetch('http://127.0.0.1:3000/v1/coworking/reservations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log('status', res.status);
  console.log(text);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
