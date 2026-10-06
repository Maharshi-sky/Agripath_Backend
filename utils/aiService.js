// Agripath_Backend-main Groq/utils/aiService.js
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const ACTIVE_MODELS = [
  'openai/gpt-oss-120b',
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-20b'
];

export async function queryAI(
  prompt,
  systemInstruction = 'You are an agricultural intelligence engine. Output STRICT JSON only.'
) {
  let lastError = null;

  for (const modelToUse of ACTIVE_MODELS) {
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `${systemInstruction}\nOutput valid JSON only. Never write commentary, explanations, or code fences.`,
          },
          { role: 'user', content: prompt },
        ],
        model: modelToUse,
        temperature: 0.1,
        max_tokens: 4096, // Ensures all zones are completely generated without truncation
        response_format: { type: 'json_object' },
      });

      let raw = chatCompletion.choices[0]?.message?.content || '{}';
      raw = raw.trim();

      if (raw.startsWith('```json')) {
        raw = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      } else if (raw.startsWith('```')) {
        raw = raw.replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      }

      return JSON.parse(raw);
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ [GROQ RETRY] Model '${modelToUse}' issue: ${error.message}. Trying next candidate...`);
    }
  }

  console.error('All active Groq models failed:', lastError);
  throw lastError;
}