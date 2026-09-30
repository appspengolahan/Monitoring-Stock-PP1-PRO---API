import express from 'express';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // JSON Body parser
  app.use(express.json());

  // Proxy API endpoint to bypass browser CORS and follow 302 redirect transparently
  app.get('/api/gas-proxy', async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl) {
        return res.status(400).json({ ok: false, error: 'Target URL is required' });
      }

      // Fetch with redirect: 'follow'
      const response = await fetch(targetUrl, {
        headers: {
          'Accept': 'application/json, text/plain, */*'
        },
        redirect: 'follow'
      });

      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const data = await response.json();
        return res.json(data);
      } else {
        const text = await response.text();
        try {
          const json = JSON.parse(text);
          return res.json(json);
        } catch {
          return res.send(text);
        }
      }
    } catch (err: any) {
      console.error('GAS Proxy Error:', err.message);
      return res.status(500).json({
        ok: false,
        error: `Proxy failed: ${err.message}`
      });
    }
  });

  // Attach Vite middleware in development mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });

  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
