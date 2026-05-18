import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const KEY_FILE_PATTERNS = [
  /^readme\.md$/i,
  /^package\.json$/i,
  /^pyproject\.toml$/i,
  /^requirements\.txt$/i,
  /^cargo\.toml$/i,
  /^go\.mod$/i,
  /^index\.(ts|js|tsx|jsx|py|rs|go)$/i,
  /^main\.(ts|js|py|rs|go)$/i,
  /^src\/(index|main|app|cli)\.(ts|js|tsx|jsx|py|rs|go)$/i,
  /^examples?\/[^/]+\.(md|ts|js|py|rs|go|tsx|jsx)$/i,
  /^docs?\/[^/]+\.md$/i,
  /^cookbook\/[^/]+\.(md|ts|js|py)$/i,
];

async function fetchGithubKeyFiles(owner: string, repo: string): Promise<string> {
  try {
    const treeResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`, {
      headers: { 'Accept': 'application/vnd.github.v3+json' },
    });
    if (!treeResp.ok) return '';
    const treeData = await treeResp.json();
    const blobs: any[] = (treeData.tree || []).filter((t: any) => t.type === 'blob');

    const picked = blobs.filter((b) => KEY_FILE_PATTERNS.some((re) => re.test(b.path))).slice(0, 10);

    const parts: string[] = [];
    for (const f of picked) {
      try {
        const raw = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${f.path}`);
        if (!raw.ok) continue;
        const text = (await raw.text()).slice(0, 8000);
        parts.push(`\n--- FILE: ${f.path} ---\n${text}`);
      } catch (_) { /* skip */ }
    }
    return parts.join('\n');
  } catch {
    return '';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { item_id } = await req.json();
    if (!item_id) {
      return new Response(JSON.stringify({ error: 'item_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');

    const { data: item, error } = await supabase.from('items').select('*').eq('id', item_id).single();
    if (error || !item) {
      return new Response(JSON.stringify({ error: 'Item not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let sourceContent = item.extracted_content || item.raw_content || '';
    let extraContext = '';

    // For GitHub repos, fetch a few strategic key files
    if (item.type === 'github' && item.source_url) {
      const parts = item.source_url.replace(/^https?:\/\/github\.com\//, '').split('/');
      if (parts.length >= 2) {
        extraContext = await fetchGithubKeyFiles(parts[0], parts[1]);
      }
    }

    // For links without extracted content, do a fresh Firecrawl scrape
    if (!sourceContent && item.source_url && FIRECRAWL_API_KEY) {
      try {
        const r = await fetch('https://api.firecrawl.dev/v2/scrape', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: item.source_url, formats: ['markdown'], onlyMainContent: true }),
        });
        const d = await r.json();
        if (r.ok) sourceContent = d?.data?.markdown || d?.markdown || '';
      } catch (e) {
        console.error('Firecrawl scrape error:', e);
      }
    }

    const combined = `${sourceContent}\n\n${extraContext}`.slice(0, 25000);

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const systemPrompt = `You are a "skill distiller". You take a source (article, docs page, or GitHub repo) and produce a single portable SKILL.md document in the Anthropic / Lovable skills format.

OUTPUT FORMAT — return ONLY the raw markdown, nothing else. Structure:

---
name: <kebab-case-skill-name>
description: <one sentence: what this skill teaches an AI to do, when to use it>
source: <original url>
---

# <Human Skill Title>

## Overview
<2-4 sentences: what this is, the core mental model, why it exists>

## When to use
- <concrete trigger 1>
- <concrete trigger 2>
- <concrete trigger 3>

## Prerequisites
<install commands, API keys, runtime requirements — bash blocks where useful>

## Core workflow
<numbered steps that walk through the task end-to-end>

## Code patterns
<minimal copy-pasteable code blocks demonstrating the key idioms. Prefer the smallest correct example. Include language fences.>

## Gotchas
- <non-obvious pitfall>
- <version/compat note>
- <common mistake>

## Reference
- <key API surface, link to deeper docs, file paths in repo>

RULES:
- Be concrete and dense. No fluff, no marketing language.
- Tell the truth — if the source is shallow, say so in Overview rather than inventing.
- For repos: surface what the project ACTUALLY does based on the file tree and code, not just the README pitch.
- Total length: 200-600 lines. Self-contained — a reader should be able to do the task from this file alone.`;

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `TYPE: ${item.type}\nTITLE: ${item.title}\nSOURCE URL: ${item.source_url || 'N/A'}\n\nSOURCE MATERIAL:\n${combined}` },
        ],
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error('AI error:', aiResp.status, t);
      return new Response(JSON.stringify({ error: `AI request failed: ${aiResp.status}` }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiData = await aiResp.json();
    let skillMd = aiData?.choices?.[0]?.message?.content || '';
    // Strip code fences if the model wrapped the whole thing
    skillMd = skillMd.replace(/^```(?:markdown|md)?\n/, '').replace(/\n```\s*$/, '').trim();

    await supabase.from('items').update({ skill_md: skillMd, updated_at: new Date().toISOString() }).eq('id', item_id);

    return new Response(JSON.stringify({ ok: true, skill_md: skillMd }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('extract-skill error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
