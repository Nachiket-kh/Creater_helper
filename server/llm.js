export async function askJSON(prompt, options = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  const ollamaUrl = process.env.OLLAMA_CHAT_URL;
  if (process.env.VERCEL && !apiKey && ollamaUrl && /localhost|127\.0\.0\.1/i.test(ollamaUrl)) {
    throw new Error("A local Ollama server cannot be reached from Vercel.");
  }
  if (!apiKey && !ollamaUrl) throw new Error("No AI provider is configured");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(options.timeoutMs) > 0 ? Math.min(Number(options.timeoutMs), 60_000) : 10_000);
  try {
    const usingOpenAI = Boolean(apiKey);
    const response = await fetch(usingOpenAI ? "https://api.openai.com/v1/chat/completions" : ollamaUrl, {
      method: "POST",
      headers: { ...(usingOpenAI ? { Authorization: `Bearer ${apiKey}` } : {}), "Content-Type": "application/json" },
      body: JSON.stringify(usingOpenAI
        ? { model: "gpt-4o-mini", temperature: 0, messages: [{ role: "user", content: prompt }] }
        : { model: process.env.OLLAMA_MODEL || "qwen3.5:4b", stream: false, format: "json", messages: [{ role: "user", content: prompt }] }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`AI request failed (${response.status})`);
    const payload = await response.json();
    const content = usingOpenAI ? payload.choices?.[0]?.message?.content : payload.message?.content;
    if (typeof content !== "string") throw new Error("OpenAI returned no message content");
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start < 0 || end < start) {
      const error = new Error("OpenAI did not return JSON");
      error.code = "INVALID_JSON";
      throw error;
    }
    try {
      return JSON.parse(content.slice(start, end + 1));
    } catch {
      const error = new Error("OpenAI returned invalid JSON");
      error.code = "INVALID_JSON";
      throw error;
    }
  } finally {
    clearTimeout(timeout);
  }
}
