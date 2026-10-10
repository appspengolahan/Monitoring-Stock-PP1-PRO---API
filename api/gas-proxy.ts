// api/gas-proxy.ts (Vercel Serverless Function)
export default async function handler(req: any, res: any) {
  const targetUrl = req.query?.url as string;
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing target url parameter' });
  }

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) StockPP1/2.0'
      }
    });

    const contentType = upstream.headers.get('content-type') || 'text/plain; charset=utf-8';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');

    const body = await upstream.text();
    return res.status(upstream.status).send(body);
  } catch (err: any) {
    return res.status(502).json({ error: err.message || 'Proxy upstream error' });
  }
}
