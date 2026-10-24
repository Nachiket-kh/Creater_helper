import { app } from './index.js';

export default async function handler(req, res) {
  try {
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers || {})) {
      if (value != null) headers.set(key, Array.isArray(value) ? value.join(', ') : String(value));
    }

    const method = req.method || 'GET';
    const init = { method, headers };
    if (method !== 'GET' && method !== 'HEAD' && req.body != null) {
      const contentType = String(req.headers?.['content-type'] || '').toLowerCase();
      if (contentType.includes('application/x-www-form-urlencoded') && typeof req.body === 'object') {
        const form = new URLSearchParams();
        for (const [key, value] of Object.entries(req.body)) {
          for (const item of Array.isArray(value) ? value : [value]) {
            if (item != null) form.append(key, String(item));
          }
        }
        init.body = form.toString();
      } else {
        init.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      }
    }

    const url = new URL(req.url || '/', `https://${req.headers?.host || 'localhost'}`);
    // Vercel's file-based API function mapping does not reliably send nested
    // paths to one catch-all function in a Vite project. vercel.json rewrites
    // /api/:path* to /api/handler?__vercel_path=:path*, preserving the route
    // here so Hono receives the original URL and callback query parameters.
    const routePath = url.searchParams.get('__vercel_path');
    if (routePath !== null) {
      url.searchParams.delete('__vercel_path');
      const target = new URL(`/api/${routePath.replace(/^\/+/, '')}`, url.origin);
      url.searchParams.forEach((value, key) => target.searchParams.append(key, value));
      const response = await app.fetch(new Request(target, init));
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.statusCode = response.status;
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    const response = await app.fetch(new Request(url, init));
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.statusCode = response.status;
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: error?.message || 'Internal server error' }));
  }
}
