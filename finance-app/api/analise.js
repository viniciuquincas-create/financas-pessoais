// api/analise.js — adicionar na pasta /api do projeto
// Endpoint: https://vinifinancas.vercel.app/api/analise

const SUPABASE_URL = "https://jrzcbthmmkaaeyuakhsb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyemNidGhtbWthYWV5dWFraHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMTM3NDEsImV4cCI6MjA5MjY4OTc0MX0.YXSdk38JHCRB7A6xxokUWlJW4Rv7yuXTlcFnP2esIxM";

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const fmtBRL = v => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v||0);
const mesLabel = k => { const[y,m]=k.split("-"); return `${MESES[+m-1]}/${String(y).slice(-2)}`; };

function normalizeData(raw) {
  const result = {};
  for (const [k, v] of Object.entries(raw)) {
    let val = typeof v === "string" ? (() => { try { return JSON.parse(v); } catch { return v; } })() : v;
    const clean = k.startsWith("month:") ? k.replace("month:", "") : k;
    if (/^\d{4}-\d{2}$/.test(clean) && typeof val === "object" && val !== null) {
      result[clean] = val;
    }
  }
  return result;
}

function calcMonth(md) {
  if (!md) return { rec:0, desp:0, saldo:0, fixas:0, cartoes:0, variaveis:0, investido:0, plantaoT:0 };
  const plantaoT = (md.plantoes||[]).filter(p=>p.ativo!==false).reduce((s,p)=>s+(p.horas*p.valorH),0);
  const rec = plantaoT + Number(md.bolsa||0) + Number(md.auxilio||0) + (md.receitasExtra||[]).reduce((s,r)=>s+Number(r.valor||0),0);
  const fixas = (md.fixas||[]).reduce((s,f)=>s+Number(f.valor||0),0);
  const cartoes = Object.values(md.cartoes||{}).flat().reduce((s,t)=>s+Number(t.valor||0),0);
  const variaveis = (md.variaveis||[]).reduce((s,p)=>s+Number(p.valor||0),0);
  const investido = (md.investimentos||[]).reduce((s,i)=>s+Number(i.aplicado||0),0);
  const desp = fixas + cartoes + variaveis;
  return { rec, desp, saldo: rec-desp-investido, fixas, cartoes, variaveis, investido, plantaoT };
}

function buildPrompt(data, meses) {
  const curKey = meses[meses.length - 1];
  const cur = data[curKey];
  if (!cur) return null;
  const nums = calcMonth(cur);

  const catMap = {};
  [...Object.values(cur?.cartoes||{}).flat(), ...(cur?.variaveis||[])].forEach(t => {
    catMap[t.cat] = (catMap[t.cat]||0) + Number(t.valor||0);
  });
  const topCats = Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const history = meses.slice(-6).map(k => {
    const n = calcMonth(data[k]);
    return `${mesLabel(k)}: receita=${fmtBRL(n.rec)} despesas=${fmtBRL(n.desp)} saldo=${fmtBRL(n.saldo)}`;
  }).join("\n");
  const plantoes = (cur?.plantoes||[]).filter(p=>p.ativo!==false&&p.horas>0)
    .map(p=>`${p.local}: ${p.n} plantões, ${p.horas}h × ${fmtBRL(p.valorH)} = ${fmtBRL(p.horas*p.valorH)}`).join("\n") || "Nenhum registrado";
  const fixas = (cur?.fixas||[]).filter(f=>Number(f.valor)>0)
    .map(f=>`${f.nome}: ${fmtBRL(f.valor)} [${f.status}]`).join("\n") || "Nenhuma registrada";

  return `Você é consultor financeiro de Vinicius: médico R1 medicina intensiva UNIFESP, São Paulo. Foco em carreira assistencial + gestão hospitalar + patrimônio. Direto, específico, use valores reais.

MÊS ATUAL: ${mesLabel(curKey)}
Receita: ${fmtBRL(nums.rec)} | Plantões: ${fmtBRL(nums.plantaoT)} | Bolsa+Aux: ${fmtBRL(Number(cur?.bolsa||0)+Number(cur?.auxilio||0))}
Despesas: ${fmtBRL(nums.desp)} | Fixas: ${fmtBRL(nums.fixas)} | Cartões: ${fmtBRL(nums.cartoes)} | Variáveis: ${fmtBRL(nums.variaveis)}
Investido: ${fmtBRL(nums.investido)} | Saldo livre: ${fmtBRL(nums.saldo)}
Comprometimento: ${nums.rec>0?((nums.desp/nums.rec)*100).toFixed(0):0}% da receita

PLANTÕES: ${plantoes}
TOP CATEGORIAS: ${topCats.map(([c,v])=>`${c}: ${fmtBRL(v)}`).join(" | ")||"Sem dados"}
FIXAS: ${fixas}
HISTÓRICO: ${history||"Primeiro mês"}

Retorne SOMENTE JSON válido (sem markdown):
{"score":<0-100>,"scoreLabel":"Crítico|Preocupante|Regular|Bom|Excelente","tendencia":"melhorando|estável|piorando","resumo":"2-3 frases diretas com valores reais","alertas":["até 4 alertas com valores"],"positivos":["até 3 pontos"],"acoes":["3-5 ações com valores e prazos"],"comentario_plantoes":"análise objetiva","comentario_fixas":"análise no contexto de R1","meses_keys":${JSON.stringify(meses)},"cur_key":"${curKey}"}`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // 1. Busca dados do Supabase
    const sbRes = await fetch(
      `${SUPABASE_URL}/rest/v1/financas?id=eq.vinicius&select=dados`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const rows = await sbRes.json();
    if (!rows?.length || !rows[0]?.dados) {
      return res.status(404).json({ error: "Sem dados no Supabase" });
    }

    // 2. Normaliza dados
    const normalized = normalizeData(rows[0].dados);
    const meses = Object.keys(normalized).sort();
    if (!meses.length) return res.status(404).json({ error: "Nenhum mês encontrado" });

    // 3. Chama Claude
    const prompt = buildPrompt(normalized, meses);
    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,  // era 1000
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const aiData = await aiRes.json();
    const txt = aiData.content?.map(b => b.text||"").join("") || "";
    const analysis = JSON.parse(txt.replace(/```json|```/g,"").trim());

    // 4. Retorna análise + dados brutos do mês atual
    const curKey = meses[meses.length - 1];
    res.status(200).json({
      analysis,
      nums: calcMonth(normalized[curKey]),
      meses,
      curKey,
      saldos: meses.map(k => ({ k, saldo: calcMonth(normalized[k]).saldo })),
    });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
