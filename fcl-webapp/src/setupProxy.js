// Only used in development by CRA dev server
// We avoid the broad "proxy" field in package.json because it can swallow
// webpack hot-update requests and cause ECONNREFUSED if no backend is running.
// Configure only the API routes you actually need.

const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  // Example: proxy your backend API running on port 5001
  // Adjust the path filter to match your real API routes.
  app.use(
    ['/api', '/api/**'],
    createProxyMiddleware({
      target: 'http://localhost:5001',
      changeOrigin: true,
      ws: true,
      logLevel: 'silent',
      onError(err, req, res) {
        // Handle both HTTP and WS cases safely
        try {
          const details = String((err && err.code) || err || 'unknown');
          if (res && typeof res.status === 'function' && typeof res.json === 'function') {
            return res.status(502).json({ error: 'Proxy to backend failed', details });
          }
          if (res && typeof res.writeHead === 'function' && typeof res.end === 'function') {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Proxy to backend failed', details }));
          }
        } catch (_) {
          // fall through to console
        }
        console.error('[proxy] Error proxying to backend:', err && err.code ? err.code : err);
      },
    })
  );
};
