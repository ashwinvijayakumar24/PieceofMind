import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";

interface Request {
  method: string;
  json(): Promise<any>;
}

const SUPABASE_URL = Deno.env.get('PROJECT_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const OPENFDA_API_KEY = Deno.env.get('OPENFDA_API_KEY') || '';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function canon(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}

function chunkText(text: string, chunkSize = 1000, overlap = 200) {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    out.push(text.slice(i, i + chunkSize).trim());
    i += chunkSize - overlap;
  }
  return out;
}

async function createEmbedding(text: string) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text
    })
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`embedding failed: ${res.status} ${txt}`);
  }
  const j = await res.json();
  return j.data[0].embedding as number[];
}

async function fetchOpenFdaLabels(drugName: string, limit = 5) {
  const q = `openfda.generic_name:"${drugName}"+OR+openfda.brand_name:"${drugName}"+OR+openfda.substance_name:"${drugName}"`;
  const url = `https://api.fda.gov/drug/label.json?search=${encodeURIComponent(q)}&limit=${limit}`;
  const headers: Record<string,string> = { 'User-Agent': 'ddi-hack/1.0' };
  if (OPENFDA_API_KEY) headers['api_key'] = OPENFDA_API_KEY;
  const r = await fetch(url, { headers });
  if (!r.ok) return null;
  const j = await r.json();
  return j.results || null;
}

serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });
  const body = await req.json().catch(() => ({}));
  const drug = (body.drug || '').trim();
  if (!drug) return new Response(JSON.stringify({ error: 'drug required' }), { status: 400 });

  const drugKey = canon(drug);

  // Check if already ingested
  const { data: existing } = await sb.from('drug_docs').select('id').eq('drug_key', drugKey).limit(1);
  if (existing && existing.length > 0) {
    return new Response(JSON.stringify({ status: 'exists' }), { headers: {'content-type':'application/json'}});
  }

  const labels = await fetchOpenFdaLabels(drug);
  if (!labels || labels.length === 0) {
    return new Response(JSON.stringify({ status: 'no-labels-found' }), { headers: {'content-type':'application/json'}});
  }

  const sections = ['drug_interactions','warnings','precautions','contraindications','adverse_reactions','clinical_pharmacology','description','indications_and_usage'];
  const rows: any[] = [];
  for (const lab of labels) {
    const labelId = lab.setid || lab.spl_id || null;
    const sourceUrl = lab.setid ? `https://api.fda.gov/drug/label.json?set_id=${labelId}` : null;
    for (const sec of sections) {
      const raw = lab[sec];
      if (!raw) continue;
      const text = Array.isArray(raw) ? raw.join('\n\n') : String(raw);
      const chunks = chunkText(text, 1000, 200);
      for (const chunk of chunks) {
        rows.push({
          drug_key: drugKey,
          label_id: labelId,
          section: sec,
          content: chunk,
          content_len: chunk.length,
          embedding: null,
          source_url: sourceUrl
        });
      }
    }
  }

  // create embeddings in small batches and insert
  const batch = 6;
  for (let i = 0; i < rows.length; i += batch) {
    const slice = rows.slice(i, i + batch);
    const embeddings = await Promise.all(slice.map(r => createEmbedding(r.content)));
    const toInsert = slice.map((r, idx) => ({ ...r, embedding: embeddings[idx] }));
    const { error } = await sb.from('drug_docs').insert(toInsert);
    if (error) {
      console.error('insert error', error);
      return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
    }
  }

  return new Response(JSON.stringify({ status: 'ingested', chunks: rows.length }), { headers: {'content-type':'application/json'}});
});