import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';
const MAX_RUNTIME_MS = 55_000;
const MIN_REMAINING_MS = 5_000;

serve(async (req) => {
  const startTime = Date.now();

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), { status: 500 });

  const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');
  if (!TELEGRAM_API_KEY) return new Response(JSON.stringify({ error: 'TELEGRAM_API_KEY not configured' }), { status: 500 });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let totalProcessed = 0;

  // Read initial offset
  const { data: state, error: stateErr } = await supabase
    .from('telegram_bot_state')
    .select('update_offset')
    .eq('id', 1)
    .single();

  if (stateErr) return new Response(JSON.stringify({ error: stateErr.message }), { status: 500 });

  let currentOffset = state.update_offset;

  while (true) {
    const elapsed = Date.now() - startTime;
    const remainingMs = MAX_RUNTIME_MS - elapsed;
    if (remainingMs < MIN_REMAINING_MS) break;

    const timeout = Math.min(50, Math.floor(remainingMs / 1000) - 5);
    if (timeout < 1) break;

    const response = await fetch(`${GATEWAY_URL}/getUpdates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': TELEGRAM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        offset: currentOffset,
        timeout,
        allowed_updates: ['message'],
      }),
    });

    const data = await response.json();
    if (!response.ok) return new Response(JSON.stringify({ error: data }), { status: 502 });

    const updates = data.result ?? [];
    if (updates.length === 0) continue;

    // Process each update
    for (const update of updates) {
      if (!update.message) continue;

      const msg = update.message;
      const text = msg.text || msg.caption || '';
      const chatId = msg.chat.id;

      // Determine type and extract info
      let type = 'text';
      let title = text.slice(0, 100) || 'Untitled';
      let sourceUrl: string | null = null;

      // Check for URLs in text
      const urlMatch = text.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        sourceUrl = urlMatch[0];
        if (sourceUrl.includes('github.com') && sourceUrl.split('/').length >= 5) {
          type = 'github';
          title = sourceUrl.split('/').slice(3, 5).join('/');
        } else {
          type = 'link';
          title = sourceUrl;
        }
      }

      // Check for documents/files
      if (msg.document) {
        type = 'file';
        title = msg.document.file_name || 'Untitled file';
      }

      // Insert item
      const { data: item, error: insertErr } = await supabase
        .from('items')
        .insert({
          type,
          title,
          raw_content: text,
          source_url: sourceUrl,
          telegram_message_id: msg.message_id,
          telegram_chat_id: chatId,
        })
        .select('id')
        .single();

      if (!insertErr && item) {
        // Trigger processing asynchronously
        try {
          await fetch(`${supabaseUrl}/functions/v1/process-item`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ item_id: item.id }),
          });
        } catch (e) {
          console.error('Failed to trigger processing:', e);
        }

        totalProcessed++;
      }
    }

    // Advance offset
    const newOffset = Math.max(...updates.map((u: any) => u.update_id)) + 1;
    await supabase
      .from('telegram_bot_state')
      .update({ update_offset: newOffset, updated_at: new Date().toISOString() })
      .eq('id', 1);

    currentOffset = newOffset;
  }

  return new Response(JSON.stringify({ ok: true, processed: totalProcessed }));
});
