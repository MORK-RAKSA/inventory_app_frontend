const { getDefaultConfig } = require('expo/metro-config');
const https = require('https');
const http = require('http');

const config = getDefaultConfig(__dirname);

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      if (req.url && (req.url === '/api' || req.url.startsWith('/api/'))) {
        const headers = { ...req.headers, host: 'inventoryappbackend.vercel.app' };
        delete headers.origin;
        delete headers.referer;

        const proxyReq = https.request(
          {
            hostname: 'inventoryappbackend.vercel.app',
            port: 443,
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
