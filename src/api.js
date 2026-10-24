const base = '/api';
async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, { ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
export const api = {
  creator: () => request('/creator'), saveCreator: (body) => request('/creator', { method: 'PUT', body: JSON.stringify(body) }),
  deals: () => request('/deals'), deal: (id) => request(`/deals/${id}`), updateDeal: (id, status) => request(`/deals/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  parse: (rawEmail) => request('/inbox/parse', { method: 'POST', body: JSON.stringify({ rawEmail }) }),
  reply: (id, intent) => request(`/deals/${id}/reply`, { method: 'POST', body: JSON.stringify({ intent }) }),
  content: () => request('/content'), today: () => request('/today'), samples: () => request('/samples'), voiceStatus: () => request('/voice/status')
};
export const money = (value) => value == null ? 'No fee' : `₹${Number(value).toLocaleString('en-IN')}`;
export const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ');
