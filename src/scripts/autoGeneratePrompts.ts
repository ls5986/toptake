import { supabase } from '@/lib/supabase';
import { Configuration, OpenAIApi } from 'openai';

const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY }));

async function updateEngagementAnalytics() {
  const { data: prompts } = await supabase
    .from('prompts')
    .select('id, prompt_text, prompt_date')
    .gte('prompt_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  for (const prompt of prompts || []) {
    const { count: takeCount } = await supabase
      .from('takes')
      .select('id', { count: 'exact', head: true })
      .eq('prompt_date', prompt.prompt_date);

    const { data: takes } = await supabase
      .from('takes')
      .select('id')
      .eq('prompt_date', prompt.prompt_date);

    // Calculate reactions from take_reactions table
    let totalReactions = 0;
    if (takes && takes.length > 0) {
      const takeIds = takes.map(t => t.id);
      const { data: reactions } = await supabase
        .from('take_reactions')
        .select('id')
        .in('take_id', takeIds);
      totalReactions = reactions?.length || 0;
    }

    await supabase
      .from('engagement_analytics')
      .upsert({
        prompt_date: prompt.prompt_date,
        prompt_id: prompt.id,
        prompt_text: prompt.prompt_text,
        take_count: takeCount || 0,
        total_reactions: totalReactions,
        last_updated: new Date().toISOString()
      }, { onConflict: 'prompt_date' });
  }
}

async function getTopPromptExamples(limit = 5) {
  const { data } = await supabase
    .from('engagement_analytics')
    .select('prompt_text, take_count, total_reactions')
    .order('take_count', { ascending: false })
    .limit(limit);

  return data?.map(p => p.prompt_text) || [];
}

async function generatePromptsWithAI(promptExamples: string[]) {
  const prompt = `
Based on these high-engagement prompts:
- ${promptExamples.join('\n- ')}
Suggest 3 new, creative prompts in a similar style. Only output the prompts, one per line.
  `;

  const response = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt,
    max_tokens: 150,
    n: 1,
    stop: null,
    temperature: 0.8,
  });

  return response.data.choices[0].text
    ?.split('\n')
    .map(s => s.replace(/^- /, '').trim())
    .filter(Boolean);
}

async function insertDraftPrompts(prompts: string[]) {
  const today = new Date();
  for (const promptText of prompts) {
    // Find the next available date
    let scheduleDate = new Date(today);
    let found = false;
    while (!found) {
      const dateStr = scheduleDate.toISOString().split('T')[0];
      const { data: existing } = await supabase
        .from('prompts')
        .select('id')
        .eq('prompt_date', dateStr)
        .single();
      if (!existing) {
        found = true;
        await supabase.from('prompts').insert({
          prompt_text: promptText,
          prompt_date: dateStr,
          is_active: false, // Draft for admin review
          created_at: new Date().toISOString()
        });
      } else {
        // If duplicate, skip to next day
        scheduleDate.setDate(scheduleDate.getDate() + 1);
      }
    }
  }
}

export async function autoGenerateAndInsertPrompts() {
  await updateEngagementAnalytics();
  const topPrompts = await getTopPromptExamples();
  if (!topPrompts.length) {
    console.log('No top prompts found for analytics.');
    return;
  }
  const newPrompts = await generatePromptsWithAI(topPrompts);
  if (!newPrompts?.length) {
    console.log('AI did not return any prompts.');
    return;
  }
  await insertDraftPrompts(newPrompts);
  console.log('Inserted new AI-generated prompts as drafts for admin review.');
}

// To run as a script:
if (require.main === module) {
  autoGenerateAndInsertPrompts().then(() => process.exit(0));
} 