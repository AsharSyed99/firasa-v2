import { getEnv } from '../config/env.js';

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | GroqContentPart[];
}

interface GroqContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

interface GroqResponse {
  choices: { message: { content: string } }[];
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

/**
 * Call Groq LLM for text completion.
 */
export async function chatCompletion(
  messages: GroqMessage[],
  model = 'llama-3.3-70b-versatile',
  temperature = 0.1
): Promise<{ content: string; tokens: number }> {
  const env = getEnv();

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as GroqResponse;
  return {
    content: data.choices[0].message.content,
    tokens: data.usage.total_tokens,
  };
}

/**
 * Analyze an image using Groq Vision.
 */
export async function analyzeImage(
  imageUrl: string,
  prompt: string
): Promise<{ content: string; tokens: number }> {
  return chatCompletion(
    [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
    'llama-3.2-90b-vision-preview',
    0.1
  );
}
