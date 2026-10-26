const { getDefaultConfig } = require('expo/metro-config');
const https = require('https');
const http = require('http');

const config = getDefaultConfig(__dirname);

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      if (req.url && (req.url === '/api' || req.url.startsWith('/api/'))) {
        // Resolve backend target host from env or default to live Render backend
        const rawUrl =
          process.env.EXPO_PUBLIC_API_URL ||
          process.env.API_URL ||
          'https://inventory-app-backend-5iet.onrender.com';
        let targetHost = 'inventory-app-backend-5iet.onrender.com';
        let isHttps = true;
        let port = 443;
        try {
          const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
          targetHost = parsed.hostname;
          isHttps = parsed.protocol === 'https:';
          port = parsed.port ? Number(parsed.port) : (isHttps ? 443 : 80);
        } catch (_) {}

        const headers = { ...req.headers, host: targetHost };
        delete headers.origin;
        delete headers.referer;

        const client = isHttps ? https : http;
        const proxyReq = client.request(
          {
            hostname: targetHost,
            port,
            path: req.url,
            method: req.method,
            headers,
          },
          (proxyRes) => {
            res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
            proxyRes.pipe(res, { end: true });
          },
        );

        proxyReq.on('error', () => {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Backend server is unreachable' }));
        });

        req.pipe(proxyReq, { end: true });
        return;
      }
      return middleware(req, res, next);
    };
  },
};

module.exports = config;
