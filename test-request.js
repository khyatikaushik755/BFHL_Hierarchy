const http = require('http');
const payload = JSON.stringify({ data: [
  'A->B','A->C','B->D','C->E','E->F','X->Y','Y->Z','Z->X','P->Q','Q->R','G->H','G->H','G->I','hello','1->2','A->'
]});

const req = http.request({
  hostname: '127.0.0.1',
  port: 3000,
  path: '/bfhl',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  },
}, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      console.log(JSON.stringify(JSON.parse(data), null, 2));
    } catch (err) {
      console.error('Invalid JSON response:', data);
    }
  });
});

req.on('error', (err) => console.error('Request error:', err.message));
req.write(payload);
req.end();
