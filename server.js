const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

app.use('/', createProxyMiddleware({
  router: (req) => {
    return req.headers['x-target'] || 'https://google.com';
  },
  changeOrigin: true,
  on: {
    error: (err, req, res) => {
      res.status(500).send('Proxy error');
    }
  }
}));

app.listen(process.env.PORT || 3000, () => {
  console.log('Proxy running');
});