import app from '../server/index.js';

export default async function handler(req, res) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers || {})) {
    if (value != null) headers.set(key, Array.isArray(value) ? value.join(', ') : String(value));
  }

  const method = req.method || 'GET';
  const init = { method, headers };
  if (method !== 'GET' && method !== 'HEAD' && req.body != null) {
    init.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }

  const url = new URL(req.url || '/', `https://${req.headers?.host || 'localhost'}`);
  const response = await app.fetch(new Request(url, init));
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.statusCode = response.status;
  res.end(Buffer.from(await response.arrayBuffer()));
}
