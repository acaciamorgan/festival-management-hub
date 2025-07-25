const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>BASIC SERVER WORKS</h1><p>If you see this, the problem is with Next.js</p>');
});

server.listen(3000, () => {
  console.log('Basic server running on http://localhost:3000');
});