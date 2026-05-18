// api/analise.js

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
  if (!md) return { rec:0,desp:0,saldo:0,fixas:0,cartoes:0,variaveis:0,investido:0,plantaoT:0 };
  const plantaoT = (md.plantoes||[]).filter(p=>p.ativo!==false).reduce((s,p)=>s+(p.horas*p.valorH),0);
  const rec = plantaoT+Number(md.bolsa||0)+Number(md.auxilio||0)+(md.receitasExtra||[]).reduce((s,r)=>s+Number(r.valor||0),0);
  const fixas = (md.fixas||[]).reduce((s,f)=>s+Number(f.valor||0),0);
  const cartoes = Object.values(md.cartoes||{}).flat().reduce((s,t)=>s+Number(t.valor||0),0);
  const variaveis = (md.variaveis||[]).reduce((s,p)=>s+Number(p.valor||0),0);
  const investido = (md.investimentos||[]).reduce((s,i)=>s+Number(i.aplicado||0),0);
  const desp = fixas+cartoes+variaveis;
  return {rec,desp,saldo:rec-desp-investido,fixas,cartoes,variaveis,investido,plantaoT};
}

// Pega o mês mais recente COM dados reais (rec > 0 ou desp > 0)
function findCurKey(normalized, meses) {
  for (let i = meses.length - 1; i >= 0; i--) {
    const n = calcMonth(normalized[meses[i]]);
    if (n.rec > 0 || n.desp > 0) return meses[i];
  }
  return meses[meses.length - 1];
}

function buildPrompt(data, meses, curKey) {
  const cur = data[curKey];
  if (!cur) return null;
  const nums = calcMonth(cur);

  // Categorias completas
  const catMap = {};
  [...Object.values(cur?.cartoes||{}).flat(),...(cur?.variaveis||[])].forEach(t=>{
    catMap[t.cat]=(catMap[t.cat]||0)+Number(t.valor||0);
  });
  const topCats = Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,10);

  // Histórico só com meses com dados
  const mesesComDados = meses.filter(k=>{ const n=calcMonth(data[k]); return n.rec>0||n.desp>0; });
  const history = mesesComDados.slice(-6).map(k=>{
    const n=calcMonth(data[k]);
    return `${mesLabel(k)}: receita=${fmtBRL(n.rec)} despesas=${fmtBRL(n.desp)} saldo=${fmtBRL(n.saldo)}`;
  }).join("\n");

  // Plantões
  const plantoes = (cur?.plantoes||[]).filter(p=>p.ativo!==false&&p.horas>0)
    .map(p=>`${p.local}: ${p.n} plantões, ${p.horas}h × ${fmtBRL(p.valorH)}/h = ${fmtBRL(p.horas*p.valorH)}`).join("\n")||"Nenhum";

  // Fixas detalhadas
  const fixasDetalhadas = (cur?.fixas||[]).filter(f=>Number(f.valor)>0)
    .sort((a,b)=>Number(b.valor)-Number(a.valor))
    .map(f=>`${f.nome} (${f.cat}): ${fmtBRL(f.valor)} [${f.status}]`).join("\n")||"Nenhuma registrada";

  // Cartões detalhados
  const cartoesDetalhados = Object.entries(cur?.cartoes||{}).map(([card, items])=>{
    if(!items.length) return null;
    const total = items.reduce((s,t)=>s+Number(t.valor||0),0);
    return `${card}: ${fmtBRL(total)} (${items.length} lançamentos)`;
  }).filter(Boolean).join("\n")||"Nenhum";

  // Variáveis detalhadas
  const variaveisDetalhadas = (cur?.variaveis||[]).length > 0
    ? (cur.variaveis).sort((a,b)=>Number(b.valor)-Number(a.valor)).slice(0,8)
        .map(p=>`${p.desc} (${p.cat}): ${fmtBRL(p.valor)}`).join("\n")
    : "Nenhuma registrada";

  // Média histórica
  const mediaRec = mesesComDados.length > 0
    ? mesesComDados.reduce((s,k)=>s+calcMonth(data[k]).rec,0)/mesesComDados.length : 0;
  const mediaDesp = mesesComDados.length > 0
    ? mesesComDados.reduce((s,k)=>s+calcMonth(data[k]).desp,0)/mesesComDados.length : 0;

  return `Você é consultor financeiro pessoal de Vinicius: médico R1 medicina intensiva UNIFESP São Paulo. Foco em carreira assistencial + gestão hospitalar + construção de patrimônio. Seja direto, específico, use valores reais. Janeiro/2026 iniciou residência.

=== MÊS ATUAL: ${mesLabel(curKey)} ===
Receita: ${fmtBRL(nums.rec)} | Plantões: ${fmtBRL(nums.plantaoT)} | Bolsa+Aux: ${fmtBRL(Number(cur?.bolsa||0)+Number(cur?.auxilio||0))}
Despesas: ${fmtBRL(nums.desp)} | Fixas: ${fmtBRL(nums.fixas)} | Cartões: ${fmtBRL(nums.cartoes)} | Variáveis/Pix: ${fmtBRL(nums.variaveis)}
Investido: ${fmtBRL(nums.investido)} | Saldo livre: ${fmtBRL(nums.saldo)}
Comprometimento: ${nums.rec>0?((nums.desp/nums.rec)*100).toFixed(1):0}% da receita

PLANTÕES: ${plantoes}

DESPESAS FIXAS (detalhado): ${fixasDetalhadas}

CARTÕES: ${cartoesDetalhados}

VARIÁVEIS/PIX: ${variaveisDetalhadas}

TOP CATEGORIAS: ${topCats.map(([c,v])=>`${c}: ${fmtBRL(v)}`).join(" | ")||"Sem dados"}

=== HISTÓRICO (${mesesComDados.length} meses com dados) ===
${history}
Média receita: ${fmtBRL(mediaRec)} | Média despesas: ${fmtBRL(mediaDesp)} | Média saldo: ${fmtBRL(mediaRec-mediaDesp)}

Faça análise completa e retorne SOMENTE JSON válido sem markdown:
{
  "score": <0-100>,
  "scoreLabel": "Crítico|Preocupante|Regular|Bom|Excelente",
  "tendencia": "melhorando|estável|piorando",
  "resumo": "2-3 frases diretas com valores reais",
  "alertas": ["até 4 alertas concretos com valores"],
  "positivos": ["até 3 pontos positivos concretos"],
  "acoes": ["3-5 ações prioritárias com valores e prazos"],
  "comentario_plantoes": "análise objetiva dos plantões e otimização de receita",
  "comentario_fixas": "análise detalhada de cada despesa fixa — o que está alto, o que cortar, o que é razoável para R1 SP",
  "estrategia_despesas": "estratégia concreta de redução de despesas com valores e prioridades",
  "projecao_6m": "projeção financeira 6 meses com cenário conservador e otimista em valores reais",
  "meta_patrimonio": "quanto pode acumular em 2 anos de residência restantes com a renda atual"
}`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // 1. Supabase
    const sbRes = await fetch(
      `${SUPABASE_URL}/rest/v1/financas?id=eq.vinicius&select=dados`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const rows = await sbRes.json();
    if (!rows?.length || !rows[0]?.dados) return res.status(404).json({ error: "Sem dados no Supabase" });

    // 2. Normaliza
    const normalized = normalizeData(rows[0].dados);
    const meses = Object.keys(normalized).sort();
    if (!meses.length) return res.status(404).json({ error: "Nenhum mês encontrado" });

    // 3. Mês correto — último com dados reais
    const curKey = findCurKey(normalized, meses);
    const mesesComDados = meses.filter(k=>{ const n=calcMonth(normalized[k]); return n.rec>0||n.desp>0; });

    // 4. Claude
    const prompt = buildPrompt(normalized, meses, curKey);
    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const aiData = await aiRes.json();
    const txt = aiData.content?.map(b=>b.text||"").join("")||"";
    const analysis = JSON.parse(txt.replace(/```json|```/g,"").trim());

    const nums = calcMonth(normalized[curKey]);
    const cur = normalized[curKey];

    // Retorna dados enriquecidos
    res.status(200).json({
      analysis,
      nums,
      meses: mesesComDados,
      curKey,
      saldos: mesesComDados.map(k=>({ k, saldo: calcMonth(normalized[k]).saldo })),
      fixasDetalhadas: (cur?.fixas||[]).filter(f=>Number(f.valor)>0)
        .sort((a,b)=>Number(b.valor)-Number(a.valor))
        .map(f=>({ nome:f.nome, cat:f.cat, valor:Number(f.valor), status:f.status })),
      catMap: (() => {
        const m={};
        [...Object.values(cur?.cartoes||{}).flat(),...(cur?.variaveis||[])].forEach(t=>{m[t.cat]=(m[t.cat]||0)+Number(t.valor||0);});
        return Object.entries(m).sort((a,b)=>b[1]-a[1]);
      })(),
    });

  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
