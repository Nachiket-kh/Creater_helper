export function isAIConfigured() {
  const ollamaUrl = process.env.OLLAMA_CHAT_URL;
  const ollamaIsLocal = ollamaUrl && /localhost|127\.0\.0\.1/i.test(ollamaUrl);
  return Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || (ollamaUrl && !(process.env.VERCEL && ollamaIsLocal)));
}

export async function askJSON(prompt, options = {}) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
  const apiKey = process.env.OPENAI_API_KEY;
  const ollamaUrl = process.env.OLLAMA_CHAT_URL;
  const ollamaApiKey = process.env.OLLAMA_API_KEY;
  if (process.env.VERCEL && !geminiApiKey && !apiKey && ollamaUrl && /localhost|127\.0\.0\.1/i.test(ollamaUrl)) {
    throw new Error("A local Ollama server cannot be reached from Vercel.");
  }
  if (!geminiApiKey && !apiKey && !ollamaUrl) throw new Error("No AI provider is configured");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(options.timeoutMs) > 0 ? Math.min(Number(options.timeoutMs), 60_000) : 10_000);
  try {
    const usingGemini = Boolean(geminiApiKey);
    const usingOpenAI = !usingGemini && Boolean(apiKey);
    const response = await fetch(usingGemini
      ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
      : usingOpenAI ? "https://api.openai.com/v1/chat/completions" : ollamaUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(usingGemini ? { Authorization: `Bearer ${geminiApiKey}` } : {}),
        ...(usingOpenAI && apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        ...(!usingGemini && !usingOpenAI && ollamaApiKey ? { Authorization: `Bearer ${ollamaApiKey}` } : {}),
      },
      body: JSON.stringify(usingGemini
        ? { model: geminiModel, temperature: 0, messages: [{ role: "user", content: prompt }] }
        : usingOpenAI
          ? { model: "gpt-4o-mini", temperature: 0, messages: [{ role: "user", content: prompt }] }
          : {
            model: process.env.OLLAMA_MODEL || "qwen3.5:4b",
            stream: false,
            format: "json",
            think: false,
            options: { num_predict: Number(options.maxTokens) > 0 ? Math.min(Number(options.maxTokens), 1024) : 1024 },
            messages: [{ role: "user", content: prompt }],
          }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`AI request failed (${response.status})`);
    const payload = await response.json();
    const content = usingGemini || usingOpenAI ? payload.choices?.[0]?.message?.content : payload.message?.content;
    if (typeof content !== "string") throw new Error("AI provider returned no message content");
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start < 0 || end < start) {
      const error = new Error("AI provider did not return JSON");
      error.code = "INVALID_JSON";
      throw error;
    }
    try {
      return JSON.parse(content.slice(start, end + 1));
    } catch {
      const error = new Error("AI provider returned invalid JSON");
      error.code = "INVALID_JSON";
      throw error;
    }
  } finally {
    clearTimeout(timeout);
  }
}
