const chatUrl = process.env.OLLAMA_CHAT_URL || 'http://localhost:11434/api/chat';
const model = process.env.OLLAMA_MODEL || 'qwen3.5:4b';
const timeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS) > 0 ? Number(process.env.OLLAMA_TIMEOUT_MS) : 60000;

export async function askJSON(prompt) {
  if (process.env.VERCEL && !process.env.OLLAMA_CHAT_URL) throw new Error('Ollama is only available in the local demo.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(chatUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        think: false,
        format: 'json',
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!response.ok) throw new Error(`Local model request failed (${response.status})`);
    const payload = await response.json();
    const content = payload.message?.content;
    if (typeof content !== 'string') throw new Error('Local model returned no message');
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start < 0 || end < start) throw new Error('Local model returned invalid JSON');
    return JSON.parse(content.slice(start, end + 1));
  } finally {
    clearTimeout(timer);
  }
}
