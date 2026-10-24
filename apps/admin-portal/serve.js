// Minimal static file server for this directory — no dependency beyond Node itself.
// admin.html must be served over http(s), not opened via file://: the admin session
// now lives in a cookie (see auth.middleware.js), and browsers won't set or send
// cookies for the file:// scheme at all.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const ROOT = __dirname;

const CONTENT_TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

const server = http.createServer((req, res) => {
  const urlPath = req.url === '/' ? '/admin.html' : req.url.split('?')[0];
  const filePath = path.join(ROOT, path.normalize(urlPath).replace(/^(\.\.[/\\])+/, ''));
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': CONTENT_TYPES[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => console.log(`admin-portal serving on http://localhost:${PORT}`));
