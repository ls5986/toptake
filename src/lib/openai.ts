// Utility to call OpenAI API for prompt improvement
export async function fixPromptWithAI(promptText: string): Promise<string> {
  const apiKey = import.meta.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OpenAI API key');

  const systemPrompt =
    'You are an expert at writing engaging, concise, and creative daily prompts for a social app. Improve or rewrite the following prompt to maximize engagement, clarity, and fun. Return only the improved prompt.';

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: promptText }
      ],
      max_tokens: 80,
      temperature: 0.8,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error('OpenAI API error: ' + err);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || promptText;
} 