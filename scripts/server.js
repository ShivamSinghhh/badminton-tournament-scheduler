#!/usr/bin/env node
// Zero-dependency local dev server for the Badminton Tournament Scheduler.
// Serves the project folder, opens the browser, and reloads the page when a file changes.
// Usage: npm run dev            (default port 3000)
//        PORT=8080 npm run dev  (custom port)

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const START_PORT = Number(process.env.PORT) || 3000;
const OPEN_BROWSER = !process.argv.includes('--no-open');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.md': 'text/plain; charset=utf-8',
};

// Live reload: the browser keeps an open connection to /__reload and refreshes when told to.
const clients = new Set();
const RELOAD_SNIPPET = `
<script>
  (function(){
    var es = new EventSource('/__reload');
    es.onmessage = function(){ location.reload(); };
  })();
</script>`;

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);

  if (urlPath === '/__reload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write(': connected\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  let filePath = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
  // Never serve anything outside the project folder.
  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) return send(res, 403, 'Forbidden');
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html');

  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, 'Not found: ' + urlPath);
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    if (ext === '.html') {
      const html = data.toString('utf8').replace('</body>', RELOAD_SNIPPET + '\n</body>');
      return send(res, 200, html, type);
    }
    send(res, 200, data, type);
  });
});

// Reload the browser when a project file changes (debounced so one save = one reload).
let reloadTimer = null;
fs.watch(ROOT, (event, filename) => {
  if (!filename || filename.startsWith('.') || filename === 'node_modules') return;
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    console.log(`  ↻ ${filename} changed — reloading browser`);
    for (const client of clients) client.write('data: reload\n\n');
  }, 100);
});

function openBrowser(url) {
  const cmd =
    process.platform === 'darwin' ? `open "${url}"` :
    process.platform === 'win32' ? `start "" "${url}"` :
    `xdg-open "${url}"`;
  exec(cmd, () => { /* if it fails, the URL is printed in the terminal anyway */ });
}

function listen(port, attemptsLeft) {
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE' && attemptsLeft > 0) return listen(port + 1, attemptsLeft - 1);
    console.error(err.message);
    process.exit(1);
  });
  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(`\n  Badminton Tournament Scheduler running at ${url}`);
    console.log('  Edits to any file reload the browser automatically. Press Ctrl+C to stop.\n');
    if (OPEN_BROWSER) openBrowser(url);
  });
}

listen(START_PORT, 10);
