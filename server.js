const http = require('http');
const net = require('net');
const url = require('url');

const PORT = process.env.PORT || 8080;
const PROXY_USER = 'proxyuser';
const PROXY_PASS = 'yourpassword123';

function checkAuth(req) {
  const authHeader = req.headers['proxy-authorization'];
  if (!authHeader) return false;
  const encoded = authHeader.split(' ')[1];
  const decoded = Buffer.from(encoded, 'base64').toString();
  return decoded === `${PROXY_USER}:${PROXY_PASS}`;
}

const server = http.createServer((req, res) => {
  if (!checkAuth(req)) {
    res.writeHead(407, { 'Proxy-Authenticate': 'Basic realm="Proxy"' });
    return res.end('Proxy Authentication Required');
  }
  const { hostname, port } = url.parse(req.url);
  const proxy = http.request({ hostname, port, path: req.url, method: req.method, headers: req.headers }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  req.pipe(proxy);
});

server.on('connect', (req, clientSocket, head) => {
  if (!checkAuth(req)) {
    clientSocket.write('HTTP/1.1 407 Proxy Authentication Required\r\nProxy-Authenticate: Basic realm="Proxy"\r\n\r\n');
    return clientSocket.destroy();
  }
  const { hostname, port } = url.parse(`https://${req.url}`);
  const serverSocket = net.connect(port || 443, hostname, () => {
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });
  serverSocket.on('error', () => clientSocket.destroy());
});

server.listen(PORT, () => console.log(`HTTP Proxy running on port ${PORT}`));