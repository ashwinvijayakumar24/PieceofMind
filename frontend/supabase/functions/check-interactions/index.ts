// check-interactions/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const INGEST_FUNCTION_URL = Deno.env.get('INGEST_FUNCTION_URL')!; // set after ingest deploy

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function canon(s: string){ return s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' '); }

async function createEmbedding(text: string) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text })
  });
  if (!res.ok) throw new Error(await res.text());
  const j = await res.json();
  return j.data[0].embedding as number[];
}

// call ingest function to populate docs for a drug (idempotent)
async function ensureDrugIngested(drugName: string) {
  const dkey = canon(drugName);
  const { data } = await sb.from('drug_docs').select('id').eq('drug_key', dkey).limit(1);
  if (data && data.length > 0) return true;
  if (!INGEST_FUNCTION_URL) return false;
  const resp = await fetch(INGEST_FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ drug: drugName })
  });
  if (!resp.ok) {
    console.warn('ingest failed', await resp.text());
    return false;
  }
  const j = await resp.json();
  return j.status === 'ingested' || j.status === 'exists';
}

async function retrieveEvidenceForPair(queryEmbedding: number[], topK = 6) {
  // Call Supabase RPC
  const { data, error } = await sb.rpc('search_drug_docs', { query_embedding: queryEmbedding, top_k: topK });
  if (error) {
    console.warn('rpc error', error);
    return [];
  }
  return data || [];
}

serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });
  const body = await req.json().catch(() => ({}));
  const drugs: string[] = (body.drugs || []).slice(0, 12);
  if (!drugs || drugs.length < 2) return new Response(JSON.stringify({ interactions: [] }), { headers: { 'content-type': 'application/json' }});

  // Ensure ingestion for each drug (blocking — ok for an MVP)
  for (const d of drugs) {
    try { await ensureDrugIngested(d); } catch (e) { console.warn('ensure error', e); }
  }

  // build pairs
  const pairs: [string,string][] = [];
  for (let i=0;i<drugs.length;i++){
    for (let j=i+1;j<drugs.length;j++){
      pairs.push([drugs[i], drugs[j]]);
    }
  }

  const results: any[] = [];

  for (const [a,b] of pairs) {
    const queryText = `Drug interaction: ${a} WITH ${b}. Search for label warnings, interactions, contraindications, adverse reactions.`;
    let pairEmbedding: number[];
    try { pairEmbedding = await createEmbedding(queryText); } catch (err) { console.error('embedding error', err); continue; }

    const evidenceRows = await retrieveEvidenceForPair(pairEmbedding, 6);
    const snippets = (evidenceRows || []).map((r:any) => ({ section: r.section, content: (r.content||'').slice(0,600), source_url: r.source_url }));

    // Chat prompt: strict JSON output
    const system = `You are an evidence-based clinical assistant. Use ONLY the provided evidence snippets (excerpts from FDA drug labels). Reply ONLY with valid JSON in this exact shape:
{
 "interaction": "yes"|"no"|"unknown",
 "severity": "high"|"medium"|"low"|"unknown",
 "explanation": "<1-2 sentence clinician-friendly summary>",
 "evidence": [{"section":"...","excerpt":"...","source_url":"..."}],
 "confidence": 0.0
}
If evidence is unclear, return "unknown" and low confidence.`;

    let userContent = `Question: Is there a drug-drug interaction between "${a}" and "${b}"?
Evidence snippets:\n\n`;
    for (let i=0;i<snippets.length;i++){
      userContent += `SNIPPET ${i+1} [${snippets[i].section}]\n${snippets[i].content}\nSource: ${snippets[i].source_url || 'openFDA label'}\n\n`;
    }
    userContent += `\nAnswer in JSON only.`;

    // call OpenAI Chat
    let modelResp = '';
    try {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: userContent }
          ],
          temperature: 0.0,
          max_tokens: 400
        })
      });
      if (resp.ok) {
        const j = await resp.json();
        modelResp = j.choices?.[0]?.message?.content || '';
      } else {
        console.error('chat error', await resp.text());
      }
    } catch (err) {
      console.error('openai chat failed', err);
    }

    // parse JSON inside modelResp
    let parsed = null;
    if (modelResp) {
      try {
        const start = modelResp.indexOf('{');
        const end = modelResp.lastIndexOf('}');
        const jsonText = (start >= 0 && end > start) ? modelResp.slice(start, end+1) : modelResp;
        parsed = JSON.parse(jsonText);
      } catch (e) {
        console.warn('parse failed', e);
        parsed = { interaction: 'unknown', severity: 'unknown', explanation: 'model parse failed', evidence: snippets.slice(0,2), confidence: 0.0 };
      }
    } else {
      parsed = { interaction: 'unknown', severity: 'unknown', explanation: 'no model response', evidence: snippets.slice(0,2), confidence: 0.0 };
    }

    results.push({ drugs: [a,b], ...parsed, raw_model: modelResp, evidence_count: snippets.length });
  }

  // sort: yes > unknown > no
  results.sort((r1:any,r2:any) => {
    const rank = (r:any) => r.interaction === 'yes' ? 3 : r.interaction === 'unknown' ? 2 : 1;
    return rank(r2) - rank(r1);
  });

  return new Response(JSON.stringify({ interactions: results }), { headers: {'content-type':'application/json'} });
});
