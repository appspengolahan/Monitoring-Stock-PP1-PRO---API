// api/gas-proxy.ts (Vercel Serverless Function)
const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbwpvTstV4SeELEB1QZgd2TR0sXIPFaJaO1owlVboHI0lnkacQPQ1_BwNrfpYMrUURVG/exec';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const targetUrl = (req.query?.url as string) || DEFAULT_GAS_URL;

  try {
    const isPost = req.method === 'POST';
    const fetchOptions: RequestInit = {
      method: isPost ? 'POST' : 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) StockPP1/2.0',
        ...(isPost ? { 'Content-Type': 'application/json' } : {})
      },
      redirect: 'follow'
    };

    if (isPost && req.body) {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const upstream = await fetch(targetUrl, fetchOptions);
    const contentType = upstream.headers.get('content-type') || 'application/json; charset=utf-8';
    res.setHeader('Content-Type', contentType);
    if (!isPost) {
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
    }

    const body = await upstream.text();
    return res.status(upstream.status).send(body);
  } catch (err: any) {
    return res.status(502).json({ error: err.message || 'Proxy upstream error' });
  }
}
