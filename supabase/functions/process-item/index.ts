import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { item_id } = await req.json();
    if (!item_id) return new Response(JSON.stringify({ error: 'item_id required' }), { status: 400, headers: corsHeaders });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');

    // Fetch the item
    const { data: item, error: fetchErr } = await supabase
      .from('items')
      .select('*')
      .eq('id', item_id)
      .single();

    if (fetchErr || !item) {
      return new Response(JSON.stringify({ error: 'Item not found' }), { status: 404, headers: corsHeaders });
    }

    let extractedContent = '';
    let title = item.title;

    // Step 1: If it's a link/github, use Firecrawl
    if ((item.type === 'link' || item.type === 'github') && item.source_url && FIRECRAWL_API_KEY) {
      try {
        console.log('Scraping URL:', item.source_url);

        const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: item.source_url,
            formats: ['markdown'],
            onlyMainContent: true,
          }),
        });

        const scrapeData = await scrapeResponse.json();
        if (scrapeResponse.ok && scrapeData.success) {
          extractedContent = scrapeData.data?.markdown || scrapeData.markdown || '';
          const scrapedTitle = scrapeData.data?.metadata?.title || scrapeData.metadata?.title;
          if (scrapedTitle) title = scrapedTitle;
        }
      } catch (e) {
        console.error('Firecrawl error:', e);
      }
    }

    // For GitHub repos, try to get the tree structure
    if (item.type === 'github' && item.source_url) {
      try {
        const parts = item.source_url.replace('https://github.com/', '').split('/');
        if (parts.length >= 2) {
          const owner = parts[0];
          const repo = parts[1];

          // Fetch repo tree via GitHub API
          const treeResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`, {
            headers: { 'Accept': 'application/vnd.github.v3+json' },
          });

          if (treeResp.ok) {
            const treeData = await treeResp.json();
            const tree = treeData.tree
              ?.filter((t: any) => t.type === 'blob')
              ?.slice(0, 100)
              ?.map((t: any) => t.path)
              ?.join('\n');

            if (tree) {
              extractedContent = `## Project Tree\n\`\`\`\n${tree}\n\`\`\`\n\n${extractedContent}`;
            }
          }

          title = `${owner}/${repo}`;
        }
      } catch (e) {
        console.error('GitHub tree error:', e);
      }
    }

    // Step 2: Use AI to classify, summarize, and extract keywords
    let summary = '';
    let keywords: string[] = [];
    let suggestedGroup = '';
    let suggestedTags: string[] = [];

    if (LOVABLE_API_KEY) {
      try {
        const contentForAI = extractedContent
          ? extractedContent.slice(0, 4000)
          : (item.raw_content || '').slice(0, 2000);

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-3-flash-preview',
            messages: [
              {
                role: 'system',
                content: `You are a content classifier. Given content, return JSON with:
- "summary": 1-2 sentence summary
- "keywords": array of 5-10 relevant keywords for search
- "suggested_group": one suggested category name (e.g. "Dev Tools", "Articles", "Research", "Work", "Design", "AI/ML", "Tutorials")
- "suggested_tags": array of 3-5 relevant tags
- "title": a clean, descriptive title if the current one is a URL

Return ONLY valid JSON, no markdown.`
              },
              {
                role: 'user',
                content: `Type: ${item.type}\nTitle: ${title}\nURL: ${item.source_url || 'N/A'}\nContent:\n${contentForAI}`
              }
            ],
            tools: [{
              type: 'function',
              function: {
                name: 'classify_content',
                description: 'Classify and summarize the content',
                parameters: {
                  type: 'object',
                  properties: {
                    summary: { type: 'string' },
                    keywords: { type: 'array', items: { type: 'string' } },
                    suggested_group: { type: 'string' },
                    suggested_tags: { type: 'array', items: { type: 'string' } },
                    title: { type: 'string' },
                  },
                  required: ['summary', 'keywords', 'suggested_group', 'suggested_tags'],
                },
              },
            }],
            tool_choice: { type: 'function', function: { name: 'classify_content' } },
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            const parsed = JSON.parse(toolCall.function.arguments);
            summary = parsed.summary || '';
            keywords = parsed.keywords || [];
            suggestedGroup = parsed.suggested_group || '';
            suggestedTags = parsed.suggested_tags || [];
            if (parsed.title && (item.source_url === title || title.startsWith('http'))) {
              title = parsed.title;
            }
          }
        } else {
          console.error('AI error:', aiResponse.status, await aiResponse.text());
        }
      } catch (e) {
        console.error('AI processing error:', e);
      }
    }

    // Step 3: Update the item
    await supabase
      .from('items')
      .update({
        title,
        summary,
        extracted_content: extractedContent.slice(0, 50000),
        keywords,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item_id);

    // Step 4: Create/assign group
    if (suggestedGroup) {
      const { data: existingGroup } = await supabase
        .from('groups')
        .select('id')
        .eq('name', suggestedGroup)
        .maybeSingle();

      let groupId = existingGroup?.id;
      if (!groupId) {
        const colors = ['hsl(175,80%,50%)', 'hsl(210,80%,55%)', 'hsl(38,92%,55%)', 'hsl(145,65%,45%)', 'hsl(280,70%,55%)'];
        const { data: newGroup } = await supabase
          .from('groups')
          .insert({ name: suggestedGroup, color: colors[Math.floor(Math.random() * colors.length)] })
          .select('id')
          .single();
        groupId = newGroup?.id;
      }

      if (groupId) {
        await supabase.from('item_groups').upsert({ item_id, group_id: groupId }, { onConflict: 'item_id,group_id' });
      }
    }

    // Step 5: Create/assign tags
    for (const tagName of suggestedTags) {
      const { data: existingTag } = await supabase
        .from('tags')
        .select('id')
        .eq('name', tagName.toLowerCase())
        .maybeSingle();

      let tagId = existingTag?.id;
      if (!tagId) {
        const { data: newTag } = await supabase
          .from('tags')
          .insert({ name: tagName.toLowerCase() })
          .select('id')
          .single();
        tagId = newTag?.id;
      }

      if (tagId) {
        await supabase.from('item_tags').upsert({ item_id, tag_id: tagId }, { onConflict: 'item_id,tag_id' });
      }
    }

    return new Response(JSON.stringify({ ok: true, title, summary, keywords }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Process error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
