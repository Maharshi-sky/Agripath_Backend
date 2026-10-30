// Agripath_Backend-main/utils/ollamaService.js
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3:8b'; // ya 'qwen2.5:3b', 'mistral'

export async function queryOllama(prompt, options = {}) {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options.model || DEFAULT_MODEL,
        prompt: prompt,
        stream: false,
        format: options.format || 'json', // Strict JSON output
        options: {
          temperature: 0.2, // Consistent & deterministic
        }
      }),
      signal: AbortSignal.timeout(120000)
    });

    if (!response.ok) {
      throw new Error(`Ollama HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    return options.format === 'json' ? JSON.parse(data.response) : data.response;
  } catch (error) {
    console.warn('⚠️ Ollama service unavailable, using rule-based engine:', error.message);
    return null;
  }
}