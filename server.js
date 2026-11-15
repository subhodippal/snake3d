#!/usr/bin/env node
// ───────────────────────────────────────────────────────────
//  Tiny zero-dependency static server for local play.
//  Serves on localhost AND your local network (phones on the same Wi-Fi).
//
//  Usage:
//    node server.js            → port 8000
//    node server.js -p 8005    → port 8005   (also: --port 8005, --port=8005, PORT=8005)
// ───────────────────────────────────────────────────────────
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

function parsePort(argv) {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-p' || a === '--port') return argv[i + 1];
    if (a.startsWith('--port=')) return a.slice(7);
    if (a === '-h' || a === '--help') {
      console.log('Usage: node server.js [-p PORT]\n  -p, --port   port to listen on (default 8000)');
      process.exit(0);
    }
  }
  return process.env.PORT || 8000;
}

const port = Number(parsePort(process.argv.slice(2)));
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('❌ Invalid port. Example: node server.js -p 8005');
  process.exit(1);
}

const ROOT = __dirname;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

const server = http.createServer((req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
  catch (_) { res.writeHead(400); return res.end('Bad request'); }

  // Resolve inside ROOT only (no ../ escapes); block hidden files like .git
  const filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT) || urlPath.split('/').some(s => s.startsWith('.') && s.length > 1)) {
    res.writeHead(403); return res.end('Forbidden');
  }

  fs.stat(filePath, (err, st) => {
    let file = filePath;
    if (!err && st.isDirectory()) file = path.join(filePath, 'index.html');
    fs.readFile(file, (err2, data) => {
      if (err2) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('404 Not found');
      }
      res.writeHead(200, {
        'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      res.end(data);
    });
  });
  log(req);
});

function log(req) {
  const t = new Date().toLocaleTimeString();
  console.log(`\x1b[90m${t}\x1b[0m ${req.method} ${req.url}  \x1b[90m← ${req.socket.remoteAddress}\x1b[0m`);
}

function lanAddresses() {
  const out = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const a of list || []) {
      if (a.family === 'IPv4' && !a.internal) out.push({ name, address: a.address });
    }
  }
  return out;
}

server.on('error', err => {
  if (err.code === 'EADDRINUSE') console.error(`❌ Port ${port} is already in use. Try another one: node server.js -p ${port + 1}`);
  else if (err.code === 'EACCES') console.error(`❌ No permission to use port ${port}. Try a port above 1024.`);
  else console.error('❌ Server error:', err.message);
  process.exit(1);
});

// 0.0.0.0 → reachable from localhost and from other devices on the same network
server.listen(port, '0.0.0.0', () => {
  const g = s => `\x1b[32m${s}\x1b[0m`, c = s => `\x1b[36m${s}\x1b[0m`;
  console.log(`\n  🐍 ${g('Slither 3D')} is running!\n`);
  console.log(`  💻 This computer:   ${c(`http://localhost:${port}`)}`);
  const lan = lanAddresses();
  if (lan.length) {
    lan.forEach(({ name, address }, i) =>
      console.log(`  📱 ${i === 0 ? 'Phone (same Wi-Fi):' : '                   '} ${c(`http://${address}:${port}`)}  \x1b[90m(${name})\x1b[0m`));
    console.log(`\n  \x1b[90mPhone can't connect? Make sure it's on the same Wi-Fi and your firewall allows port ${port}.\x1b[0m`);
  } else {
    console.log('  📱 No network connection found – only localhost is available.');
  }
  console.log(`  \x1b[90mPress Ctrl+C to stop.\x1b[0m\n`);
});

process.on('SIGINT', () => { console.log('\n  👋 Server stopped.'); process.exit(0); });
