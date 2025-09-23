import { Configuration, OpenAIApi } from 'openai';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

// Utility to call OpenAI API for prompt improvement
export async function fixPromptWithAI(promptText: string): Promise<string> {
  if (!apiKey) throw new Error('Missing OpenAI API key');

  const systemPrompt = [
    'You are TopTake\'s Prompt Director. Your job: punchy, bold, fun prompts that spark lots of replies.',
    '- Constraints: 6–14 words. No hashtags. No quotes around the whole thing.',
    '- Voice: direct, playful, slightly competitive. Use 1 crisp emoji at most (front).',
    '- Format: Return ONLY the improved prompt text (no preface).',
    '- Analytics prior: prompts that perform best include: confessionals, binary choices, spicy takes, ranking, unlikely opinions, small debates, “hot take” formats.',
    '- Avoid: multi-part questions, vague “how was your day”, niche topics, filler words.',
  ].join('\n');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Rewrite into a TopTake-ready banger: ${promptText}` }
      ],
      max_tokens: 32,
      temperature: 0.95,
      presence_penalty: 0.3,
      frequency_penalty: 0.1
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error('OpenAI API error: ' + err);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || promptText;
} 