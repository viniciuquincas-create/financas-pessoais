import { useState, useEffect, useRef } from "react";


// ── Supabase Sync ─────────────────────────────────────────────
const SUPABASE_URL = "https://jrzcbthmmkaaeyuakhsb.supabase.co";
const SUPABASE_KEY = "sb_publishable_oMtzB2JdusLes2hzdJr1UA_EXdSsi8c";

async function supabaseLoad() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/financas?id=eq.vinicius&select=dados`, {
    headers: {
      "apikey": SUPABASE_KEY,
    }
  });
  const data = await res.json();
  if(!data?.length || !data[0]?.dados) return null;
  const raw = data[0].dados;
  // Normalize string values
  const normalized = {};
  for(const [k,v] of Object.entries(raw)) {
    try { normalized[k] = typeof v==="string" ? JSON.parse(v) : v; }
    catch { normalized[k] = v; }
  }
  return normalized;
}

async function supabaseSave(dados) {
  await fetch(`${SUPABASE_URL}/rest/v1/financas?id=eq.vinicius`, {
    method: "PATCH",
    headers: {
      "apikey": SUPABASE_KEY,
      "Content-Type": "application/json",
      "Prefer": "return=minimal",
    },
    body: JSON.stringify({ dados, atualizado_em: new Date().toISOString() })
  });
}

const CATS_DEFAULT = ["Mercado","Comer fora","Delivery","Carro","Uber","Farmácia","Empresa","Casa","Apps","Lazer","Compras","Pet","Família/Presentes","Impostos","Educação","Viagem","Saúde","Outro"];
// CATS will be loaded dynamically; this is the fallback
let CATS = [...CATS_DEFAULT];

const CARDS = [
  { id:"inter", label:"Inter",             color:"#E05A00", bg:"#FFF0E6", emoji:"🟠" },
  { id:"itau",  label:"Itaú Personnalité", color:"#0D2B6E", bg:"#E8EDF7", emoji:"🔵" },
  { id:"will",  label:"Will",              color:"#B8860B", bg:"#FFFBE6", emoji:"🟡", ate:"2026-04" },
  { id:"xp",    label:"XP",               color:"#1A1A1A", bg:"#F0F0F0", emoji:"⚫", desde:"2026-05" },
];

const getCards = (mesKey) => CARDS.filter(c => {
  if(c.ate && mesKey > c.ate) return false;
  if(c.desde && mesKey < c.desde) return false;
  return true;
});

const FIXAS_BASE = [
  { nome:"Aluguel",         venc:"Dia 05", cat:"Casa",      duracao:"sempre" },
  { nome:"Condomínio",      venc:"Dia 05", cat:"Casa",      duracao:"sempre" },
  { nome:"Internet",        venc:"Dia 05", cat:"Casa",      duracao:"sempre" },
  { nome:"Energia",         venc:"Dia 05", cat:"Casa",      duracao:"sempre" },
  { nome:"Vaga de Garagem", venc:"Dia 05", cat:"Casa",      duracao:"sempre" },
  { nome:"Personal",        venc:"Dia 01", cat:"Saúde",     duracao:"sempre" },
  { nome:"Nana (Faxina)",   venc:"Dia 10", cat:"Casa",      duracao:"sempre" },
  { nome:"Ana (Chef)",      venc:"Dia 10", cat:"Casa",      duracao:"sempre" },
  { nome:"Unimed",          venc:"Dia 10", cat:"Saúde",     duracao:"sempre" },
  { nome:"Vivo",            venc:"Dia 20", cat:"Apps",      duracao:"sempre" },
  { nome:"Consórcio",       venc:"Dia 05", cat:"Impostos",  duracao:"sempre" },
  { nome:"FIES",            venc:"Dia 10", cat:"Educação",  duracao:"sempre" },
];
const FIXAS_DEFAULT_CONFIG = FIXAS_BASE.map((f,i)=>({...f,id:i+1,valor:0,ativo:true}));
let FIXAS_CONFIG = FIXAS_DEFAULT_CONFIG.map(f=>({...f}));
const RECEITAS_FIXAS_DEFAULT_CONFIG = [
  {id:"bolsa",nome:"Bolsa residência",icone:"🎓",valor:3640,dia:5,ativo:true},
  {id:"auxilio",nome:"Auxílio moradia",icone:"🏠",valor:410,dia:5,ativo:true},
];
let RECEITAS_FIXAS_CONFIG = RECEITAS_FIXAS_DEFAULT_CONFIG.map(r=>({...r}));
const makeLocalConfig = (nome, extra={}) => ({
  id:extra.id||`${Date.now()}-${Math.random().toString(36).slice(2)}`,
  nome, busca:extra.busca||nome, valorH:Number(extra.valorH)||0,
  diaReceb:Number(extra.diaReceb)||0, inicioDia:Number(extra.inicioDia)||1,
  inicioMes:Number.isFinite(Number(extra.inicioMes))?Number(extra.inicioMes):0,
  fimDia:Number(extra.fimDia)||31,
  fimMes:Number.isFinite(Number(extra.fimMes))?Number(extra.fimMes):0,
  ativo:extra.ativo!==false,
});
const LOCAIS_DEFAULT_CONFIG = [
  makeLocalConfig("Leonor",{id:"leonor",diaReceb:15,inicioMes:-2,fimMes:-2}),
  makeLocalConfig("CDT",{id:"cdt"}),
  makeLocalConfig("SEPACO",{id:"sepaco"}),
];
let LOCAIS_CONFIG=LOCAIS_DEFAULT_CONFIG.map(l=>({...l}));
const AGENDA_URL = "https://script.google.com/macros/s/AKfycbxDfXcA9Fs8KUM8yEU0cVkZXdlIQFfs0n0Q9J5NMtCtTf0u_z5mcp-nIyMM_9aSYe1txA/exec";
const MESES  = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const fmtBRL = v => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v||0);
const today  = () => new Date().toISOString().split("T")[0];
const curMes = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };
const mesLabel = k => { const[y,m]=k.split("-"); return `${MESES[+m-1].toUpperCase()} / ${y}`; };
const prevMesKey = k => { const[y,m]=k.split("-").map(Number); const d=new Date(y,m-2,1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };
const addMonthsKey = (k,delta) => { const[y,m]=k.split("-").map(Number); const d=new Date(y,m-1+delta,1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };
const parseParcela = parcela => {
  const m=String(parcela||"").trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if(!m) return null;
  const atual=Number(m[1]), total=Number(m[2]);
  return atual>=1&&total>=atual?{atual,total}:null;
};
const descKey = desc => String(desc||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
const sameCardEntry = (a,b) => descKey(a.desc)===descKey(b.desc)
  && Math.abs(Number(a.valor||0)-Number(b.valor||0))<0.01
  && String(a.parcela||"").replace(/\s/g,"")===String(b.parcela||"").replace(/\s/g,"");

const load = async (key,fb=null) => { try{ const r=await window.storage.get(key); return r?JSON.parse(r.value):fb; }catch{ return fb; }};
const save = async (key,val)     => { try{ await window.storage.set(key,JSON.stringify(val)); }catch{} };

const seedMonth = key => ({
  key,
  plantoes: LOCAIS_CONFIG.filter(l=>l.ativo!==false).map(l=>({
    local:l.nome, n:0, horas:0, valorH:l.valorH, fromAgenda:false, ativo:true,
    diaReceb:l.diaReceb,
    statusReceb:"aguardando",
  })),
  bolsa: 0,
  bolsaDia: 5,
  bolsaStatus: "aguardando",
  auxilio: 0,
  auxilioDia: 5,
  auxilioStatus: "aguardando",
  receitasExtra: [],
  receitasFixas: RECEITAS_FIXAS_CONFIG.filter(r=>r.ativo!==false).map(r=>({...r,status:"aguardando",templateId:r.id})),
  fixas: FIXAS_CONFIG.filter(f=>f.ativo!==false).map(f=>({...f,templateId:f.id,status:"pendente",forma:"",banco:"",dataPgto:"",valor:Number(f.valor)||0,extra:false,duracao:f.duracao||"sempre",mesesRestantes:null})),
  cartoes: {inter:[],itau:[],will:[],xp:[]},
  variaveis: [],
  investimentos: [],
  investimentosFotoConfirmada: false,
});

const getReceitasFixas = d => Array.isArray(d?.receitasFixas)
  ? d.receitasFixas
  : [
      {id:"bolsa",templateId:"bolsa",nome:"Bolsa residência",icone:"🎓",valor:Number(d?.bolsa)||0,dia:Number(d?.bolsaDia)||5,status:d?.bolsaStatus||"aguardando",ativo:true},
      {id:"auxilio",templateId:"auxilio",nome:"Auxílio moradia",icone:"🏠",valor:Number(d?.auxilio)||0,dia:Number(d?.auxilioDia)||5,status:d?.auxilioStatus||"aguardando",ativo:true},
    ];
const totalReceitasFixas = d => getReceitasFixas(d).filter(r=>r.ativo!==false).reduce((s,r)=>s+Number(r.valor||0),0);

const normalizeInvestimentos = arr => (arr||[])
  .filter(i=>i&&i.produto)
  .map(i=>({
    ...i,
    atual:Number(i.atual)||0,
    aporte:Number(i.aporte)||0,
    resgate:Number(i.resgate)||0,
  }));

const hasFotoInvestimentos = d => d?.investimentosFotoConfirmada===true
  || (d?.investimentos||[]).some(i=>Number(i.atual)>0);

const mergePlantoesConfig = plantoes => {
  const base=(plantoes||[]).map(p=>{
    const cfg=LOCAIS_CONFIG.find(l=>l.nome===p.local);
    return {ativo:true,diaReceb:cfg?.diaReceb||0,statusReceb:"aguardando",valorH:cfg?.valorH||0,...p};
  });
  const existentes=new Set(base.map(p=>p.local));
  const faltantes=LOCAIS_CONFIG.filter(l=>l.ativo!==false&&!existentes.has(l.nome)).map(l=>({local:l.nome,n:0,horas:0,valorH:l.valorH,fromAgenda:false,ativo:true,diaReceb:l.diaReceb,statusReceb:"aguardando"}));
  return [...base,...faltantes];
};

const agendaRequestConfig = locaisConfig => locaisConfig
  .filter(l=>l.ativo!==false)
  .map(({nome,busca,inicioDia,inicioMes,fimDia,fimMes})=>({nome,busca,inicioDia,inicioMes,fimDia,fimMes}));

const syncAgendaMonth = async (monthData, monthKey, locaisConfig) => {
  const config=agendaRequestConfig(locaisConfig);
  if(!config.length) return {month:monthData,data:{plantoes:{},periodos:{}}};
  const res=await fetch(`/api/agenda?mes=${monthKey}&config=${encodeURIComponent(JSON.stringify(config))}`);
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  const data=await res.json();
  if(data.error) throw new Error(data.error);
  const plantoesApi=data.plantoes||{};
  if(!Object.keys(plantoesApi).length) throw new Error("Nenhum plantão encontrado");
  const atuais=mergePlantoesConfig(monthData.plantoes||[]);
  const updated=atuais.map(p=>{
    const d=plantoesApi[p.local];
    if(!d||p.bloqueadoSync) return p;
    const cfg=locaisConfig.find(l=>l.nome===p.local);
    return {...p,n:Number(d.n)||0,horas:Number(d.horas)||0,valorH:Number(p.valorH||cfg?.valorH)||0,diaReceb:Number(p.diaReceb||cfg?.diaReceb)||0,fromAgenda:true,editadoManualmente:false};
  });
  return {
    data,
    month:{...monthData,plantoes:updated,agendaSincronizacao:{em:new Date().toISOString(),config:JSON.stringify(config)}},
  };
};

const G = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
  :root{color-scheme:light;--bg:#eef3f8;--surface:#fff;--surface-soft:#f7f9fc;--text:#172033;--muted:#6b778c;--line:#dfe6ef;--brand:#5b58d6;--brand-soft:#eeedff;}
  body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;}
  .mono{font-family:'IBM Plex Mono',monospace;}
  input,select,button{font-family:'DM Sans',sans-serif;}
  button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid rgba(91,88,214,.2)!important;outline-offset:2px;}
  ::-webkit-scrollbar{width:8px;height:8px;} ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:8px;}
  .app-shell{width:100%;max-width:1180px;margin:0 auto;min-height:100vh;background:transparent;display:flex;flex-direction:column;}
  .app-main{flex:1;padding:18px 24px 48px;}
  .view-stack{display:flex;flex-direction:column;gap:14px;}
  .mobile-nav{display:none!important;}
  .dashboard-grid{display:grid!important;grid-template-columns:repeat(12,minmax(0,1fr));gap:14px!important;}
  .dashboard-grid>*{grid-column:span 6;}
  .dashboard-grid>*:first-child{grid-column:span 8;grid-row:span 2;}
  .dashboard-grid>*:nth-child(2){grid-column:span 4;}
  .dashboard-grid>*:last-child{grid-column:1/-1;}
  @media(max-width:760px){
    .app-main{padding:10px 14px 92px;}
    .dashboard-grid{display:flex!important;}
    .mobile-nav{display:flex!important;}
    .desktop-tabs{padding-bottom:6px!important;}
  }
`;

const Card = ({children,style={},...props}) => (
  <div {...props} style={{background:"#fff",border:"1px solid #dfe6ef",boxShadow:"0 8px 26px rgba(43,55,80,.06)",borderRadius:18,padding:18,...style}}>
    {children}
  </div>
);
const Inp = ({label,type="text",value,onChange,placeholder,style={}}) => (
  <div style={{display:"flex",flexDirection:"column",gap:4,...style}}>
    {label&&<label style={{fontSize:10,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:.8}}>{label}</label>}
    <input type={type} value={value??""} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{background:"#f8fafc",border:"1px solid #dbe3ed",borderRadius:10,padding:"10px 12px",color:"#172033",fontSize:14,outline:"none",width:"100%"}}/>
  </div>
);
const Sel = ({label,value,onChange,options,style={}}) => (
  <div style={{display:"flex",flexDirection:"column",gap:4,...style}}>
    {label&&<label style={{fontSize:10,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:.8}}>{label}</label>}
    <select value={value??""} onChange={e=>onChange(e.target.value)}
      style={{background:"#f8fafc",border:"1px solid #dbe3ed",borderRadius:10,padding:"10px 12px",color:"#172033",fontSize:14,outline:"none",width:"100%"}}>
      {options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
    </select>
  </div>
);
const Btn = ({children,onClick,color="#5b58d6",outline,style={}}) => (
  <button onClick={onClick} style={{padding:"11px 16px",borderRadius:11,border:outline?`1px solid ${color}55`:"none",
    background:outline?"transparent":color,color:outline?color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",width:"100%",...style}}>
    {children}
  </button>
);

function MonthNav({mesKey,setMesKey}) {
  const [y,m]=mesKey.split("-").map(Number);
  const go=d=>{ const dt=new Date(y,m-1+d); setMesKey(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`); };
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#fff",borderRadius:12,padding:"8px 14px",border:"1px solid #dfe6ef",boxShadow:"0 4px 16px rgba(43,55,80,.05)"}}>
      <button onClick={()=>go(-1)} style={{background:"none",border:"none",color:"#64748b",fontSize:22,cursor:"pointer",lineHeight:1}}>‹</button>
      <span style={{fontSize:14,fontWeight:700,letterSpacing:.5}}>{mesLabel(mesKey)}</span>
      <button onClick={()=>go(+1)} style={{background:"none",border:"none",color:"#64748b",fontSize:22,cursor:"pointer",lineHeight:1}}>›</button>
    </div>
  );
}

function Dashboard({month,setView}) {
  const plantaoT=month.plantoes.filter(p=>p.ativo!==false).reduce((s,p)=>s+(p.horas*p.valorH),0);
  const recT=plantaoT+totalReceitasFixas(month)+(month.receitasExtra||[]).reduce((s,r)=>s+Number(r.valor||0),0);
  const fixT=month.fixas.reduce((s,f)=>s+Number(f.valor||0),0);
  const carT=Object.values(month.cartoes).flat().reduce((s,t)=>s+Number(t.valor||0),0);
  const pixT=(month.variaveis||[]).reduce((s,p)=>s+Number(p.valor||0),0);
  const aportesT=(month.investimentos||[]).reduce((s,i)=>s+Number(i.aporte||0),0);
  const resgatesT=(month.investimentos||[]).reduce((s,i)=>s+Number(i.resgate||0),0);
  const patrimonioT=(month.investimentos||[]).reduce((s,i)=>s+Number(i.atual||0),0);
  const saldo=recT-fixT-carT-pixT-aportesT+resgatesT;
  const despT=fixT+carT+pixT;
  const fixPend=month.fixas.filter(f=>f.status==="pendente"&&Number(f.valor)>0).length;
  const catMap={};
  [...Object.values(month.cartoes).flat(),...(month.variaveis||[]),...month.fixas.filter(f=>Number(f.valor)>0)].forEach(t=>{ catMap[t.cat]=(catMap[t.cat]||0)+Number(t.valor||0); });
  const topCats=Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const agendaOk=(month.plantoes||[]).some(p=>p.fromAgenda&&p.ativo!==false);
  const recAtrasado=[
    ...(month.plantoes||[]).filter(p=>p.ativo!==false&&p.statusReceb==="atrasado"),
    ...getReceitasFixas(month).filter(r=>r.status==="atrasado").map(r=>({local:r.nome})),
    ...((month.receitasExtra||[]).filter(r=>r.status==="atrasado")),
  ];

  return (
    <div className="dashboard-grid view-stack">
      <Card style={{background:"linear-gradient(135deg,rgba(124,106,247,.12),rgba(0,180,150,.08))",borderColor:"rgba(124,106,247,.18)"}}>
        <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Saldo livre do mês</div>
        <div className="mono" style={{fontSize:36,fontWeight:600,letterSpacing:-2,color:saldo>=0?"#15803d":"#dc2626"}}>{fmtBRL(saldo)}</div>
        <div style={{height:1,background:"rgba(15,23,42,.05)",margin:"12px 0"}}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[["Receita",recT,"#15803d"],["Despesas",despT,"#dc2626"]].map(([l,v,c])=>(
            <div key={l}><div style={{fontSize:10,color:"#7c8799"}}>{l}</div><div className="mono" style={{fontSize:19,color:c,fontWeight:600}}>{fmtBRL(v)}</div></div>
          ))}
        </div>
      </Card>

      <Card style={{padding:"12px 14px",borderColor:agendaOk?"rgba(74,222,128,.15)":"rgba(15,23,42,.07)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{fontSize:22}}>📅</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:600,color:agendaOk?"#15803d":"#172033"}}>{agendaOk?"Plantões sincronizados":"Plantões não sincronizados"}</div>
            <div style={{fontSize:11,color:"#7c8799"}}>{agendaOk?`${month.plantoes.reduce((s,p)=>s+p.horas,0)}h · ${fmtBRL(recT)}`:"Configure o Apps Script para sincronizar"}</div>
          </div>
          <button onClick={()=>setView("plantoes")} style={{background:"rgba(124,106,247,.15)",border:"1px solid rgba(124,106,247,.2)",borderRadius:8,padding:"6px 10px",color:"#5b58d6",fontSize:11,cursor:"pointer"}}>{agendaOk?"Ver":"Config"}</button>
        </div>
      </Card>

      {recAtrasado.length>0&&(
        <Card style={{borderColor:"rgba(239,68,68,.2)",background:"rgba(239,68,68,.04)",padding:"12px 14px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{fontSize:22}}>⚠️</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:"#dc2626"}}>{recAtrasado.length} recebimento{recAtrasado.length>1?"s":""} atrasado{recAtrasado.length>1?"s":""}</div>
              <div style={{fontSize:11,color:"#64748b"}}>{recAtrasado.map(r=>r.local||r.desc).join(", ")}</div>
            </div>
            <button onClick={()=>setView("plantoes")} style={{background:"rgba(239,68,68,.12)",border:"1px solid rgba(239,68,68,.25)",borderRadius:8,padding:"6px 10px",color:"#dc2626",fontSize:11,cursor:"pointer"}}>Ver</button>
          </div>
        </Card>
      )}

      {fixPend>0&&(
        <Card style={{borderColor:"rgba(251,191,36,.2)",background:"rgba(251,191,36,.04)",padding:"12px 14px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{fontSize:22}}>⏳</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:"#b45309"}}>{fixPend} despesa{fixPend>1?"s":""} pendente{fixPend>1?"s":""}</div>
              <div style={{fontSize:11,color:"#64748b"}}>Com valor lançado mas não pagas</div>
            </div>
            <button onClick={()=>setView("fixas")} style={{background:"rgba(251,191,36,.12)",border:"1px solid rgba(251,191,36,.25)",borderRadius:8,padding:"6px 10px",color:"#b45309",fontSize:11,cursor:"pointer"}}>Ver</button>
          </div>
        </Card>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {[{label:"Fixas",val:fixT,color:"#4f46e5",icon:"📋",v:"fixas"},{label:"Cartões",val:carT,color:"#c2410c",icon:"💳",v:"cartoes"},{label:"Pix/Var.",val:pixT,color:"#0e7490",icon:"📱",v:"variaveis"},{label:"Patrimônio",val:patrimonioT,color:"#6d28d9",icon:"📈",v:"investimentos"}].map(b=>(
          <Card key={b.label} style={{cursor:"pointer"}} onClick={()=>setView(b.v)}>
            <div style={{fontSize:20,marginBottom:4}}>{b.icon}</div>
            <div className="mono" style={{fontSize:16,fontWeight:600,color:b.color}}>{fmtBRL(b.val)}</div>
            <div style={{fontSize:11,color:"#7c8799",marginTop:2}}>{b.label}</div>
          </Card>
        ))}
      </div>

      {topCats.length>0&&(
        <Card>
          <div style={{fontSize:10,color:"#7c8799",fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Top Categorias</div>
          {topCats.map(([cat,val])=>{
            const pct=despT>0?Math.round(val/despT*100):0;
            return (
              <div key={cat} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:13,color:"#334155"}}>{cat}</span>
                  <span className="mono" style={{fontSize:12,color:"#64748b"}}>{fmtBRL(val)} · {pct}%</span>
                </div>
                <div style={{height:3,background:"rgba(15,23,42,.05)",borderRadius:2}}>
                  <div style={{height:"100%",width:`${pct}%`,background:"#5b58d6",borderRadius:2}}/>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}


// Status badge helper for receitas
const STATUS_OPTS = [
  {value:"aguardando", label:"⏳ Aguardando", color:"#b45309", bg:"rgba(251,191,36,.1)", border:"rgba(251,191,36,.2)"},
  {value:"recebido",   label:"✓ Recebido",   color:"#15803d", bg:"rgba(74,222,128,.1)", border:"rgba(74,222,128,.2)"},
  {value:"atrasado",   label:"⚠ Atrasado",   color:"#dc2626", bg:"rgba(239,68,68,.1)",  border:"rgba(239,68,68,.2)"},
];
function StatusBadge({value, onChange}) {
  const cur = STATUS_OPTS.find(s=>s.value===value)||STATUS_OPTS[0];
  const next = STATUS_OPTS[(STATUS_OPTS.indexOf(cur)+1)%STATUS_OPTS.length];
  return (
    <button onClick={()=>onChange(next.value)} style={{
      background:cur.bg, border:`1px solid ${cur.border}`,
      borderRadius:8, padding:"4px 10px", cursor:"pointer",
      fontSize:11, fontWeight:600, color:cur.color,
      whiteSpace:"nowrap",
    }}>{cur.label}</button>
  );
}

function PlantoesView({month,setMonth,mesKey,locaisConfig,setLocaisConfig}) {
  const [showPaste,setShowPaste]=useState(false);
  const [pasteJson,setPasteJson]=useState("");
  const [syncMsg,setSyncMsg]=useState(null);
  const [syncPeriodos,setSyncPeriodos]=useState(null);
  const [showAddExtra,setShowAddExtra]=useState(false);
  const [novaExtra,setNovaExtra]=useState({desc:"",valor:"",dia:"",status:"aguardando"});
  const [agendaLoading,setAgendaLoading]=useState(false);
  const [agendaMsg,setAgendaMsg]=useState(null);
  const [showAddLocal,setShowAddLocal]=useState(false);
  const [novoLocal,setNovoLocal]=useState({nome:"",valorH:"",diaReceb:""});
  const mesEncerrado=mesKey<curMes();

  const plantaoT=(month.plantoes||[]).filter(p=>p.ativo!==false).reduce((s,p)=>s+(p.horas*p.valorH),0);
  const receitasFixas=getReceitasFixas(month).filter(r=>r.ativo!==false);
  const receitasFixasT=receitasFixas.reduce((s,r)=>s+Number(r.valor||0),0);
  const extrasT=(month.receitasExtra||[]).reduce((s,r)=>s+Number(r.valor||0),0);
  const total=plantaoT+receitasFixasT+extrasT;

  const updPlantao=(i,f,v)=>{
    const p=[...month.plantoes];
    const editManual = ["n","horas"].includes(f) ? {editadoManualmente:true} : {};
    p[i]={...p[i],[f]:["n","horas","valorH"].includes(f)?Number(v)||0:v,...editManual};
    setMonth({...month,plantoes:p});
  };
  const togglePlantao=(i)=>{
    const p=[...month.plantoes];
    p[i]={...p[i],ativo:p[i].ativo===false?true:false};
    setMonth({...month,plantoes:p});
  };
  const syncAgenda = async () => {
    setAgendaLoading(true);
    setAgendaMsg(null);
    try {
      if(mesEncerrado) throw new Error("Mês encerrado: o histórico não é mais sincronizado");
      const {month:updatedMonth,data}=await syncAgendaMonth(month,mesKey,locaisConfig);
      const plantoesApi = data.plantoes || {};
      const locaisApi = Object.keys(plantoesApi);
      setMonth(updatedMonth);
      setSyncPeriodos(data.periodos||null);
      const resumo = locaisApi.map(l=>`${l}: ${plantoesApi[l].n} plant. ${plantoesApi[l].horas}h`).join(" · ");
      setAgendaMsg({ok:true, txt:`✓ Sincronizado — ${resumo}`});
    } catch(e) {
      setAgendaMsg({ok:false, txt:"Erro: "+e.message});
    } finally {
      setAgendaLoading(false);
    }
  };

  const addLocal=()=>{
    const nome=novoLocal.nome.trim();
    if(!nome||(month.plantoes||[]).some(p=>p.local===nome)) return;
    const novo={
      local:nome, n:0, horas:0, valorH:Number(novoLocal.valorH)||0,
      fromAgenda:false, ativo:true, diaReceb:Number(novoLocal.diaReceb)||0, statusReceb:"aguardando",
    };
    setMonth({...month, plantoes:[...(month.plantoes||[]), novo]});
    if(!locaisConfig.some(l=>l.nome===nome)) setLocaisConfig([...locaisConfig,makeLocalConfig(nome,{valorH:novo.valorH,diaReceb:novo.diaReceb})]);
    setNovoLocal({nome:"",valorH:"",diaReceb:""});
    setShowAddLocal(false);
  };
  const removeLocal=(nome)=>{
    setMonth({...month, plantoes:(month.plantoes||[]).filter(p=>p.local!==nome)});
    setLocaisConfig(locaisConfig.filter(l=>l.nome!==nome));
  };

  const addExtra=()=>{
    if(!novaExtra.desc||!novaExtra.valor) return;
    const extras=[...(month.receitasExtra||[]),{...novaExtra,valor:Number(novaExtra.valor),dia:Number(novaExtra.dia)||0,id:Date.now()}];
    setMonth({...month,receitasExtra:extras});
    setNovaExtra({desc:"",valor:""});
    setShowAddExtra(false);
  };
  const removeExtra=(id)=>setMonth({...month,receitasExtra:(month.receitasExtra||[]).filter(r=>r.id!==id)});

  const importJson=()=>{
    try {
      const data=JSON.parse(pasteJson);
      if(!data.plantoes) throw new Error("JSON inválido — campo 'plantoes' não encontrado");
      const plantoesApi=data.plantoes;
      let novos=month.plantoes.map(p=>{
        const d=plantoesApi[p.local];
        if(!d) return p;
        return {...p,n:d.n,horas:d.horas,fromAgenda:true};
      });
      const jaExistem=new Set(novos.map(p=>p.local));
      const locaisNovos=Object.keys(plantoesApi).filter(l=>!jaExistem.has(l));
      if(locaisNovos.length){
        const novosPlantoes=locaisNovos.map(l=>({
          local:l, n:plantoesApi[l].n||0, horas:plantoesApi[l].horas||0,
          valorH:0, fromAgenda:true, ativo:true, diaReceb:0, statusReceb:"aguardando",
        }));
        novos=[...novos,...novosPlantoes];
        setLocaisConfig([...locaisConfig,...locaisNovos.map(nome=>makeLocalConfig(nome))]);
      }
      setMonth({...month,plantoes:novos});
      setSyncPeriodos(data.periodos||null);
      setSyncMsg({ok:true,txt:`Importado! ${novos.filter(p=>p.fromAgenda&&p.ativo!==false).map(p=>p.local+": "+p.horas+"h").join(" · ")}${locaisNovos.length?` · novo(s): ${locaisNovos.join(", ")}`:""}`});
      setShowPaste(false);
      setPasteJson("");
    } catch(err) {
      setSyncMsg({ok:false,txt:"Erro: "+err.message});
    }
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>

      {/* Total receita */}
      <Card style={{background:"linear-gradient(135deg,rgba(74,222,128,.1),rgba(0,150,100,.06))",borderColor:"rgba(74,222,128,.2)"}}>
        <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Total receita do mês</div>
        <div className="mono" style={{fontSize:34,fontWeight:600,color:"#15803d",letterSpacing:-1}}>{fmtBRL(total)}</div>
        <div style={{height:1,background:"rgba(15,23,42,.05)",margin:"10px 0"}}/>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          {plantaoT>0&&<div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,color:"#64748b"}}>Plantões</span><span className="mono" style={{fontSize:11,color:"#15803d"}}>{fmtBRL(plantaoT)}</span></div>}
          {receitasFixas.map(r=><div key={r.id} style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,color:"#64748b"}}>{r.nome}</span><span className="mono" style={{fontSize:11,color:"#15803d"}}>{fmtBRL(r.valor)}</span></div>)}
          {extrasT>0&&<div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,color:"#64748b"}}>Receitas extras</span><span className="mono" style={{fontSize:11,color:"#15803d"}}>{fmtBRL(extrasT)}</span></div>}
        </div>
      </Card>

      {/* ── RECEITAS FIXAS ── */}
      <div style={{fontSize:10,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:1,padding:"2px 0"}}>Receitas fixas mensais</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {receitasFixas.map(r=><Card key={r.id} style={{padding:"12px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontSize:11,color:"#5b58d6",fontWeight:600}}>{r.icone||"💵"} {r.nome}</div>
            <StatusBadge value={r.status||"aguardando"} onChange={v=>setMonth({...month,receitasFixas:receitasFixas.map(x=>x.id===r.id?{...x,status:v}:x)})}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:8}}>
            <Inp label="Valor deste mês (R$)" type="number" value={r.valor||""} onChange={v=>setMonth({...month,receitasFixas:receitasFixas.map(x=>x.id===r.id?{...x,valor:Number(v)||0}:x)})} placeholder="0,00"/>
            <Inp label="Dia receb." type="number" value={r.dia||""} onChange={v=>setMonth({...month,receitasFixas:receitasFixas.map(x=>x.id===r.id?{...x,dia:Number(v)||0}:x)})} placeholder="5"/>
          </div>
        </Card>)}
      </div>

      {/* ── PLANTÕES ── */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"2px 0"}}>
        <div style={{fontSize:10,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>Plantões</div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={syncAgenda} disabled={agendaLoading||mesEncerrado} style={{background:"rgba(74,222,128,.15)",border:"1px solid rgba(74,222,128,.25)",borderRadius:8,padding:"4px 10px",color:mesEncerrado?"#94a3b8":"#15803d",fontSize:10,fontWeight:600,cursor:agendaLoading||mesEncerrado?"not-allowed":"pointer"}}>
            {agendaLoading?"⏳":mesEncerrado?"🔒":"🗓"} {agendaLoading?"Sincronizando...":mesEncerrado?"Mês encerrado":"Sincronizar agora"}
          </button>
          <button onClick={()=>setShowPaste(!showPaste)} style={{background:"rgba(124,106,247,.15)",border:"1px solid rgba(124,106,247,.25)",borderRadius:8,padding:"4px 10px",color:"#5b58d6",fontSize:10,fontWeight:600,cursor:"pointer"}}>📋 JSON</button>
        </div>
      </div>

      {/* Sync result */}
      {agendaMsg&&(
        <div style={{padding:"8px 12px",borderRadius:10,background:agendaMsg.ok?"rgba(74,222,128,.08)":"rgba(239,68,68,.08)",fontSize:12,color:agendaMsg.ok?"#15803d":"#dc2626",border:`1px solid ${agendaMsg.ok?"rgba(74,222,128,.2)":"rgba(239,68,68,.2)"}`}}>
          {agendaMsg.txt}
        </div>
      )}
      {syncMsg&&(
        <div style={{padding:"8px 12px",borderRadius:10,background:syncMsg.ok?"rgba(74,222,128,.08)":"rgba(239,68,68,.08)",fontSize:12,color:syncMsg.ok?"#15803d":"#dc2626"}}>
          {syncMsg.txt}
          {syncPeriodos&&<div style={{marginTop:4,display:"flex",flexDirection:"column",gap:2}}>
            {Object.entries(syncPeriodos).map(([l,p])=>(
              <span key={l} style={{fontSize:10,color:"#7c8799"}}>{l}: {p.inicio} → {p.fim}</span>
            ))}
          </div>}
        </div>
      )}

      {/* Paste JSON panel */}
      {showPaste&&(
        <Card style={{borderColor:"rgba(124,106,247,.2)"}}>
          <div style={{fontSize:12,color:"#5b58d6",fontWeight:600,marginBottom:10}}>📋 Importar da Google Agenda</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{fontSize:11,color:"#64748b",lineHeight:1.7}}>
              1. Abra este link no navegador:<br/>
              <span style={{wordBreak:"break-all",color:"#5b58d6",fontSize:10}}>{`${AGENDA_URL}?mes=${mesKey}`}</span>
            </div>
            <div style={{fontSize:11,color:"#64748b"}}>2. Copie o JSON e cole abaixo</div>
            <textarea value={pasteJson} onChange={e=>setPasteJson(e.target.value)}
              placeholder={`{"plantoes":{"Leonor":{"n":3,"horas":36},...}}`}
              style={{background:"rgba(15,23,42,.06)",border:"1px solid rgba(15,23,42,.1)",borderRadius:10,
                padding:"10px",color:"#172033",fontSize:11,outline:"none",width:"100%",
                minHeight:80,resize:"vertical",fontFamily:"'JetBrains Mono',monospace"}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <button onClick={()=>{setShowPaste(false);setPasteJson("");}} style={{padding:"10px",borderRadius:10,border:"1px solid rgba(15,23,42,.1)",background:"transparent",color:"#64748b",fontSize:13,cursor:"pointer"}}>Cancelar</button>
              <button onClick={importJson} style={{padding:"10px",borderRadius:10,border:"none",background:"#5b58d6",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>Importar</button>
            </div>
          </div>
        </Card>
      )}

      {/* Cards por local */}
      {(month.plantoes||[]).map((p,i)=>{
        const ativo=p.ativo!==false;
        return (
          <Card key={p.local} style={{opacity:ativo?1:.5,borderColor:ativo?"rgba(15,23,42,.07)":"rgba(15,23,42,.03)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:ativo?10:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{fontSize:14,fontWeight:600,color:ativo?"#5b58d6":"#7c8799"}}>{p.local}</div>
                {p.fromAgenda&&ativo&&<span style={{fontSize:10,color:"#15803d",background:"rgba(74,222,128,.1)",padding:"2px 7px",borderRadius:10}}>📅 agenda</span>}
                {p.bloqueadoSync&&ativo&&<span onClick={()=>{const pl=[...month.plantoes];pl[i]={...pl[i],bloqueadoSync:false,editadoManualmente:false};setMonth({...month,plantoes:pl});}} style={{fontSize:10,color:"#c2410c",background:"rgba(249,115,22,.1)",padding:"2px 7px",borderRadius:10,cursor:"pointer",border:"1px solid rgba(249,115,22,.2)"}}>🔒 fixo ✕</span>}
                {p.editadoManualmente&&!p.bloqueadoSync&&ativo&&<span onClick={()=>{const pl=[...month.plantoes];pl[i]={...pl[i],bloqueadoSync:true};setMonth({...month,plantoes:pl});}} style={{fontSize:10,color:"#b45309",background:"rgba(251,191,36,.1)",padding:"2px 7px",borderRadius:10,cursor:"pointer",border:"1px solid rgba(251,191,36,.2)"}}>✏ manual → fixar</span>}
              </div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>togglePlantao(i)} style={{
                  background:ativo?"rgba(239,68,68,.08)":"rgba(74,222,128,.08)",
                  border:`1px solid ${ativo?"rgba(239,68,68,.2)":"rgba(74,222,128,.2)"}`,
                  borderRadius:8,padding:"3px 10px",cursor:"pointer",fontSize:11,
                  color:ativo?"#dc2626":"#15803d",
                }}>{ativo?"Desativar":"Ativar"}</button>
                <button onClick={()=>removeLocal(p.local)} title="Remover local permanentemente" style={{
                  background:"transparent",border:"1px solid rgba(15,23,42,.08)",
                  borderRadius:8,padding:"3px 8px",cursor:"pointer",fontSize:11,color:"#7c8799",
                }}>🗑</button>
              </div>
            </div>
            {ativo&&(
              <>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  <Inp label="Nº Plant." type="number" value={p.n||""} onChange={v=>updPlantao(i,"n",v)} placeholder="0"/>
                  <Inp label="Horas" type="number" value={p.horas||""} onChange={v=>updPlantao(i,"horas",v)} placeholder="0"/>
                  <Inp label="Valor/h (R$)" type="number" value={p.valorH||""} onChange={v=>updPlantao(i,"valorH",v)} placeholder="0"/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8,paddingTop:8,borderTop:"1px solid rgba(15,23,42,.05)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:11,color:"#7c8799"}}>Recebimento:</span>
                    <span style={{fontSize:11,color:"#64748b"}}>dia</span>
                    <input type="number" value={p.diaReceb||""} onChange={e=>updPlantao(i,"diaReceb",e.target.value)}
                      placeholder="25" style={{width:40,background:"rgba(15,23,42,.06)",border:"1px solid rgba(15,23,42,.08)",
                      borderRadius:6,padding:"3px 6px",color:"#172033",fontSize:11,outline:"none",textAlign:"center"}}/>
                  </div>
                  <StatusBadge value={p.statusReceb||"aguardando"} onChange={v=>updPlantao(i,"statusReceb",v)}/>
                </div>
                {p.horas>0&&p.valorH>0&&(
                  <div style={{marginTop:8,padding:"7px 10px",background:"rgba(74,222,128,.07)",borderRadius:8,display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontSize:12,color:"#64748b"}}>{p.horas}h × {fmtBRL(p.valorH)}</span>
                    <span className="mono" style={{fontSize:13,color:"#15803d",fontWeight:600}}>{fmtBRL(p.horas*p.valorH)}</span>
                  </div>
                )}
              </>
            )}
          </Card>
        );
      })}

      {showAddLocal?(
        <Card style={{borderColor:"rgba(124,106,247,.2)"}}>
          <div style={{fontSize:12,color:"#5b58d6",fontWeight:600,marginBottom:10}}>+ Novo local de plantão</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <Inp label="Nome do local" value={novoLocal.nome} onChange={v=>setNovoLocal({...novoLocal,nome:v})} placeholder="Ex: Beneficência"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <Inp label="Valor/h (R$)" type="number" value={novoLocal.valorH} onChange={v=>setNovoLocal({...novoLocal,valorH:v})} placeholder="0"/>
              <Inp label="Dia receb." type="number" value={novoLocal.diaReceb} onChange={v=>setNovoLocal({...novoLocal,diaReceb:v})} placeholder="25"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:4}}>
              <Btn outline color="#64748b" onClick={()=>setShowAddLocal(false)}>Cancelar</Btn>
              <Btn color="#5b58d6" onClick={addLocal}>Adicionar</Btn>
            </div>
          </div>
        </Card>
      ):(
        <button onClick={()=>setShowAddLocal(true)} style={{padding:"12px",borderRadius:12,border:"1px dashed rgba(124,106,247,.3)",background:"transparent",color:"#5b58d6",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          + Adicionar local de plantão
        </button>
      )}
      <div style={{fontSize:10,color:"#94a3b8",textAlign:"center"}}>Locais adicionados aqui (ou que aparecerem novos ao sincronizar com o Google Agenda) já ficam disponíveis nos próximos meses, sem precisar editar código</div>

      {/* ── RECEITAS EXTRAS ── */}
      <div style={{fontSize:10,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:1,padding:"2px 0"}}>Receitas extras do mês</div>

      {(month.receitasExtra||[]).map(r=>(
        <Card key={r.id} style={{padding:"10px 14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,color:"#172033"}}>{r.desc}</div>
              {r.dia>0&&<div style={{fontSize:10,color:"#7c8799",marginTop:2}}>Dia {r.dia}</div>}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
              <StatusBadge value={r.status||"aguardando"} onChange={v=>{
                const extras=(month.receitasExtra||[]).map(x=>x.id===r.id?{...x,status:v}:x);
                setMonth({...month,receitasExtra:extras});
              }}/>
              <span className="mono" style={{fontSize:14,color:"#15803d",fontWeight:500}}>{fmtBRL(r.valor)}</span>
              <button onClick={()=>removeExtra(r.id)} style={{background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.15)",borderRadius:6,padding:"3px 7px",color:"#dc2626",fontSize:11,cursor:"pointer"}}>✕</button>
            </div>
          </div>
        </Card>
      ))}

      {showAddExtra?(
        <Card style={{borderColor:"rgba(74,222,128,.2)"}}>
          <div style={{fontSize:12,color:"#15803d",fontWeight:600,marginBottom:10}}>+ Nova receita extra</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <Inp label="Descrição" value={novaExtra.desc} onChange={v=>setNovaExtra({...novaExtra,desc:v})} placeholder="Ex: Consulta particular, plantão extra..."/>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:8}}>
              <Inp label="Valor (R$)" type="number" value={novaExtra.valor} onChange={v=>setNovaExtra({...novaExtra,valor:v})} placeholder="0,00"/>
              <Inp label="Dia receb." type="number" value={novaExtra.dia} onChange={v=>setNovaExtra({...novaExtra,dia:v})} placeholder="0"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:4}}>
              <button onClick={()=>setShowAddExtra(false)} style={{padding:"10px",borderRadius:10,border:"1px solid rgba(15,23,42,.1)",background:"transparent",color:"#64748b",fontSize:13,cursor:"pointer"}}>Cancelar</button>
              <button onClick={addExtra} style={{padding:"10px",borderRadius:10,border:"none",background:"#15803d",color:"#eef3f8",fontSize:13,fontWeight:600,cursor:"pointer"}}>Adicionar</button>
            </div>
          </div>
        </Card>
      ):(
        <button onClick={()=>setShowAddExtra(true)} style={{padding:"12px",borderRadius:12,border:"1px dashed rgba(74,222,128,.3)",background:"transparent",color:"#15803d",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          + Adicionar receita extra
        </button>
      )}
    </div>
  );
}

// FixaCard fora do FixasView para evitar recriação a cada render (causa do bug "edita todas")
function FixaCard({f, editing, setEditing, onUpd, onRemove, onRemovePermanent}) {
  const isOpen = editing === f.id;
  return (
    <Card style={{
      borderColor: f.status==="pago"?"rgba(74,222,128,.12)":f.extra?"rgba(251,191,36,.12)":"rgba(15,23,42,.07)",
      background:  f.status==="pago"?"rgba(74,222,128,.03)":"rgba(15,23,42,.04)",
      marginBottom:8,
    }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
            <span style={{fontSize:14,fontWeight:600,color:f.status==="pago"?"#15803d":"#172033"}}>{f.nome}</span>
            {f.extra&&<span style={{fontSize:9,color:"#b45309",background:"rgba(251,191,36,.12)",padding:"1px 6px",borderRadius:6}}>extra</span>}
          </div>
          <div style={{fontSize:11,color:"#7c8799",marginTop:1}}>{f.venc&&`${f.venc} · `}{f.cat}{f.duracao&&f.duracao!=="sempre"?` · ${f.duracao==="mes"?"só este mês":f.duracao}`:""}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
          <span className="mono" style={{fontSize:14,color:f.status==="pago"?"#15803d":"#64748b"}}>
            {Number(f.valor)>0?fmtBRL(f.valor):"—"}
          </span>
          <button onClick={()=>onUpd(f.id,"status",f.status==="pago"?"pendente":"pago")} style={{
            background:f.status==="pago"?"rgba(74,222,128,.12)":"rgba(251,191,36,.1)",
            border:`1px solid ${f.status==="pago"?"rgba(74,222,128,.25)":"rgba(251,191,36,.2)"}`,
            borderRadius:8,padding:"4px 8px",cursor:"pointer",fontSize:11,
            color:f.status==="pago"?"#15803d":"#b45309",
          }}>{f.status==="pago"?"✓":"⏳"}</button>
        </div>
      </div>
      <button onClick={()=>setEditing(isOpen?null:f.id)} style={{marginTop:8,background:"transparent",
        border:"1px solid rgba(15,23,42,.06)",borderRadius:8,padding:"4px 12px",
        color:"#7c8799",fontSize:11,cursor:"pointer",width:"100%"}}>
        {isOpen?"▲ fechar":"▼ editar"}
      </button>
      {isOpen&&(
        <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:8}}>
          <Inp label="Nome" value={f.nome||""} onChange={v=>onUpd(f.id,"nome",v)} placeholder="Nome da despesa"/>
          <Inp label="Valor (R$)" type="number" value={f.valor||""} onChange={v=>onUpd(f.id,"valor",v)} placeholder="0,00"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <Inp label="Vencimento" value={f.venc||""} onChange={v=>onUpd(f.id,"venc",v)} placeholder="Dia 10"/>
            <Sel label="Categoria" value={f.cat} onChange={v=>onUpd(f.id,"cat",v)} options={CATS}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <Sel label="Forma" value={f.forma} onChange={v=>onUpd(f.id,"forma",v)}
              options={[{value:"",label:"—"},{value:"Pix",label:"Variáveis"},{value:"Boleto",label:"Boleto"},{value:"Débito",label:"Débito auto."},{value:"Cartão",label:"Cartão"}]}/>
            <Sel label="Banco" value={f.banco} onChange={v=>onUpd(f.id,"banco",v)}
              options={[{value:"",label:"—"},{value:"Inter",label:"Inter"},{value:"Itaú",label:"Itaú"},{value:"Will",label:"Will"},{value:"Outro",label:"Outro"}]}/>
          </div>
          <Inp label="Data do pagamento" type="date" value={f.dataPgto||""} onChange={v=>onUpd(f.id,"dataPgto",v)}/>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            <label style={{fontSize:10,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:.8}}>Duração</label>
            <select value={f.duracao||"sempre"} onChange={e=>{
              const v=e.target.value;
              onUpd(f.id,"duracao",v);
              onUpd(f.id,"mesesRestantes",v==="sempre"?null:v==="mes"?1:Number(v.replace("x",""))||null);
            }} style={{background:"#ffffff",border:"1px solid rgba(15,23,42,.08)",borderRadius:10,padding:"8px 12px",color:"#172033",fontSize:13,outline:"none"}}>
              <option value="sempre">Todo mês (recorrente)</option>
              <option value="mes">Só este mês</option>
              <option value="2x">2 meses</option>
              <option value="3x">3 meses</option>
              <option value="4x">4 meses</option>
              <option value="6x">6 meses</option>
              <option value="12x">12 meses</option>
            </select>
            {f.duracao&&f.duracao!=="sempre"&&f.duracao!=="mes"&&(
              <div style={{fontSize:10,color:"#64748b"}}>
                {f.mesesRestantes!=null?`${f.mesesRestantes} mês(es) restante(s)`:""}
              </div>
            )}
          </div>
          <div style={{display:"grid",gridTemplateColumns:f.extra?"1fr":"1fr 1fr",gap:8}}>
            <button onClick={()=>onRemove(f.id)} style={{background:"rgba(239,68,68,.08)",
              border:"1px solid rgba(239,68,68,.15)",borderRadius:8,padding:"6px",
              color:"#dc2626",fontSize:12,cursor:"pointer"}}>
              Remover deste mês
            </button>
            {!f.extra&&<button onClick={()=>onRemovePermanent(f)} style={{background:"#dc2626",border:"1px solid #dc2626",borderRadius:8,padding:"6px",color:"#fff",fontSize:12,cursor:"pointer"}}>Excluir dos próximos meses</button>}
          </div>
        </div>
      )}
    </Card>
  );
}

function FixasView({month,setMonth,setFixasConfig}) {
  const [editing,setEditing]=useState(null);
  const [showAdd,setShowAdd]=useState(false);
  const [nova,setNova]=useState({nome:"",venc:"",cat:CATS[0],valor:"",forma:"",banco:"",dataPgto:""});

  const upd=(id,field,val)=>setMonth({...month,fixas:month.fixas.map(x=>x.id===id?{...x,[field]:field==="valor"?Number(val)||0:val}:x)});
  const remove=id=>setMonth({...month,fixas:month.fixas.filter(f=>f.id!==id)});
  const removePermanent=f=>{
    setFixasConfig(FIXAS_CONFIG.filter(t=>String(t.id)!==String(f.templateId??f.id)));
    setEditing(null);
  };
  const addFixa=()=>{
    if(!nova.nome) return;
    setMonth({...month,fixas:[...month.fixas,{...nova,valor:Number(nova.valor)||0,id:Date.now(),status:"pendente",extra:true}]});
    setNova({nome:"",venc:"",cat:CATS[0],valor:"",forma:"",banco:"",dataPgto:""});
    setShowAdd(false);
  };

  const total=month.fixas.reduce((s,f)=>s+Number(f.valor||0),0);
  const pend=month.fixas.filter(f=>f.status==="pendente").length;
  const grupos=[["pendente","⏳ Pendentes","#b45309"],["pago","✓ Pagas","#15803d"]];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <Card style={{background:"rgba(251,191,36,.04)",borderColor:"rgba(251,191,36,.12)"}}>
          <div style={{fontSize:10,color:"#64748b"}}>Pendentes</div>
          <div style={{fontSize:26,fontWeight:700,color:"#b45309"}}>{pend}</div>
        </Card>
        <Card style={{background:"rgba(129,140,248,.04)",borderColor:"rgba(129,140,248,.12)"}}>
          <div style={{fontSize:10,color:"#64748b"}}>Total do mês</div>
          <div className="mono" style={{fontSize:18,color:"#4f46e5",fontWeight:600}}>{fmtBRL(total)}</div>
        </Card>
      </div>

      {grupos.map(([status,label,color])=>{
        const items=month.fixas.filter(f=>f.status===status);
        if(!items.length) return null;
        return (
          <div key={status}>
            <div style={{fontSize:10,color,fontWeight:600,textTransform:"uppercase",letterSpacing:1,padding:"4px 0 6px"}}>
              {label}
            </div>
            {items.map(f=>(
              <FixaCard key={f.id} f={f} editing={editing} setEditing={setEditing} onUpd={upd} onRemove={remove} onRemovePermanent={removePermanent}/>
            ))}
          </div>
        );
      })}

      {showAdd?(
        <Card style={{borderColor:"rgba(251,191,36,.2)"}}>
          <div style={{fontSize:12,color:"#b45309",fontWeight:600,marginBottom:10}}>+ Nova despesa fixa (só este mês)</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <Inp label="Nome" value={nova.nome} onChange={v=>setNova({...nova,nome:v})} placeholder="Ex: Assinatura Adobe"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <Inp label="Vencimento" value={nova.venc} onChange={v=>setNova({...nova,venc:v})} placeholder="Dia 15"/>
              <Sel label="Categoria" value={nova.cat} onChange={v=>setNova({...nova,cat:v})} options={CATS}/>
            </div>
            <Inp label="Valor (R$)" type="number" value={nova.valor} onChange={v=>setNova({...nova,valor:v})} placeholder="0,00"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:4}}>
              <Btn outline color="#64748b" onClick={()=>setShowAdd(false)}>Cancelar</Btn>
              <Btn color="#b45309" onClick={addFixa} style={{color:"#eef3f8"}}>Adicionar</Btn>
            </div>
          </div>
        </Card>
      ):(
        <button onClick={()=>setShowAdd(true)} style={{padding:"12px",borderRadius:12,border:"1px dashed rgba(251,191,36,.3)",background:"transparent",color:"#b45309",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          + Adicionar despesa fixa (este mês)
        </button>
      )}
      <div style={{fontSize:10,color:"#94a3b8",textAlign:"center"}}>Em “editar”, você pode remover só deste mês ou excluir uma despesa recorrente dos próximos meses.</div>
    </div>
  );
}

function CartoesView({month, setMonth, mesKey, importCardEntries, projectMonthInstallments}) {
  const [activeCard,setActiveCard]=useState("inter");
  const [showForm,setShowForm]=useState(false);
  const [showImport,setShowImport]=useState(false);
  const [showPdfUpload,setShowPdfUpload]=useState(false);
  const [importJson,setImportJson]=useState("");
  const [importMsg,setImportMsg]=useState(null);
  const [pdfFile,setPdfFile]=useState(null);
  const [pdfProcessing,setPdfProcessing]=useState(false);
  const [pdfMsg,setPdfMsg]=useState("");
  const [pdfPreview,setPdfPreview]=useState([]);
  const pdfInputRef=useRef();

  // Limpa erros ao montar o componente
  useEffect(()=>{ setImportMsg(null); setPdfFile(null); setPdfPreview([]); },[]);
  const [form,setForm]=useState({desc:"",cat:CATS[0],parcela:"",valor:""});
  const card=CARDS.find(c=>c.id===activeCard);
  const items=month.cartoes[activeCard]||[];
  const total=items.reduce((s,t)=>s+Number(t.valor||0),0);
  const previsto=items.filter(t=>t.projetado).reduce((s,t)=>s+Number(t.valor||0),0);
  const confirmado=total-previsto;
  const totalAll=Object.values(month.cartoes).flat().reduce((s,t)=>s+Number(t.valor||0),0);
  const onPdfSelect=e=>{
    const f=e.target.files?.[0];
    if(f&&f.type==="application/pdf"){setPdfFile(f);setPdfPreview([]);}
  };

  const RULES_CAT = [
    [["market4u","carrefour","assai","padaria","panificadora","piriquito","hortifruti","atacadao","pao de acucar","supermercado","minuto pa"],"Mercado"],
    [["sampa cafe","oxxo","hamburger","osnir","mani ","cantina","churrascaria","restaurante","lanchonete","pizza","delta quality","cafe ","lanche"],"Comer fora"],
    [["ifd*","ifood","rappi","zee now","delivery"],"Delivery"],
    [["paypal *uber","uber br","uber do brasi","uber ","99app"],"Uber"],
    [["sem parar","estacionamento","blz estacion","posto ","auto posto","shellbox","intertag","combustivel"],"Carro"],
    [["applecombill","netflix","amazon kindle","google one","youtube","disney","mubi","openai","timeleft","granazen","viki","paypal *google","paypal *disney","spotify","conta vivo","vivo ","deezer","apple "],"Apps"],
    [["drogaria","farmacia","droga raia","drogasil"],"Farmácia"],
    [["smartfit","academia","n2b nutri","med park","hospital","clinica","amib","associacao paulista","uhuu"],"Saúde"],
    [["francisco lourenco","campea admin","danielle carvalho","peri construcoes","ana gomes","elizabeth lopes","faxin","condominio","energia"],"Casa"],
    [["conselho reg","conselho regional","medicina do estado","associacao de medicina","contabilizeasy","governo do parana","caixa economica federal","pagar me"],"Empresa"],
    [["mercadolivre","shopee","netshoes","redvirtua","maxspeed","grupo elite","americanas","magazine","amazon "],"Compras"],
    [["zig*","candeia","mikael","cinema","teatro","show ","evento","ingresso"],"Lazer"],
    [["zee dog","petshop","pet ","racao","veterinario"],"Pet"],
    [["iof "],"Impostos"],
    [["carolina rodrigues"],"Família/Presentes"],
  ];
  const categorizarLocal=desc=>{
    const d=(desc||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    for(const [keys,cat] of RULES_CAT) if(keys.some(k=>d.includes(k))) return cat;
    return "Outro";
  };

  const processPdf=async()=>{
    if(!pdfFile){ pdfInputRef.current?.click(); return; }
    setPdfProcessing(true); setPdfMsg("Lendo o PDF...");
    try{
      const base64=await new Promise((res,rej)=>{
        const r=new FileReader();
        r.onload=()=>res(r.result.split(",")[1]);
        r.onerror=()=>rej(new Error("Falha ao ler"));
        r.readAsDataURL(pdfFile);
      });
      setPdfMsg("Claude analisando a fatura...");
      const prompt=`Analise esta fatura do cartão ${card.label} e extraia os lançamentos de compras.
IGNORE: PAGTO DEBITO AUTOMATICO, créditos/estornos (com "+"), IOF INTERNACIONAL isolado, encargos/juros/multas, seção "Fatura anterior", seção "Recebidos".
Para cada compra extraia: {"desc":"nome limpo","valor":0.00,"parcela":"X/Y ou vazio","data":"DD/MM/YYYY"}
Limpe os nomes: remova "MLP*","IFD*","PAYPAL *","MARKET4U*COMPRA*123456". Market4U sem nome = "Mercado (Market4U)".
Retorne SOMENTE o array JSON.`;
      const res=await fetch("/api/claude",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-haiku-4-5-20251001",
          max_tokens:4000,
          messages:[{role:"user",content:[
            {type:"document",source:{type:"base64",media_type:"application/pdf",data:base64}},
            {type:"text",text:prompt}
          ]}]
        })
      });
      if(!res.ok) throw new Error(`API error ${res.status}`);
      const data=await res.json();
      const txt=data.content?.map(b=>b.text||"").join("")||"";
      const parsed=JSON.parse(txt.replace(/```json|```/g,"").trim());
      const comCat=parsed.map(t=>({...t,valor:Number(t.valor||0),cat:categorizarLocal(t.desc),id:Date.now()+Math.random()}));
      setPdfPreview(comCat);
      setPdfMsg("");
    }catch(e){
      setImportMsg({ok:false,txt:"Erro ao processar PDF: "+e.message});
      setShowPdfUpload(false);
    }finally{
      setPdfProcessing(false);
    }
  };

  const confirmPdfImport=()=>{
    const cartaoAlvo=activeCard;
    const resultado=importCardEntries(cartaoAlvo,pdfPreview);
    setImportMsg({ok:true,txt:`✓ ${pdfPreview.length} lançamentos importados · ${resultado.conciliados} previsão(ões) conciliada(s) · ${resultado.projetados} parcela(s) futura(s) programada(s)`});
    setShowPdfUpload(false); setPdfFile(null); setPdfPreview([]);
  };

  const add=()=>{
    if(!form.desc||!form.valor) return;
    importCardEntries(activeCard,[{...form,valor:Number(form.valor)}]);
    setForm({desc:"",cat:CATS[0],parcela:"",valor:""});
    setShowForm(false);
  };
  const remove=id=>setMonth({...month,cartoes:{...month.cartoes,[activeCard]:items.filter(t=>t.id!==id)}});
  const doImport=()=>{
    try{
      const data=JSON.parse(importJson);
      if(!data.lancamentos) throw new Error("JSON inválido");
      const cartaoAlvo=data.cartao||activeCard;
      const novos=data.lancamentos.map(l=>({...l,valor:Number(l.valor||0)}));
      const resultado=importCardEntries(cartaoAlvo,novos);
      if(cartaoAlvo!==activeCard) setActiveCard(cartaoAlvo);
      setImportMsg({ok:true,txt:`✓ ${novos.length} lançamentos importados · ${resultado.conciliados} previsão(ões) conciliada(s) · ${resultado.projetados} parcela(s) futura(s) programada(s)`});
      setImportJson(""); setShowImport(false);
    }catch(e){
      setImportMsg({ok:false,txt:"Erro: "+e.message});
    }
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",gap:6}}>
        {CARDS.map(c=>{
          const sub=(month.cartoes[c.id]||[]).reduce((s,t)=>s+Number(t.valor||0),0);
          return (
            <button key={c.id} onClick={()=>{setActiveCard(c.id);setImportMsg(null);setShowPdfUpload(false);setShowImport(false);setPdfFile(null);setPdfPreview([]);}} style={{flex:1,padding:"10px 4px",borderRadius:12,cursor:"pointer",border:`2px solid ${activeCard===c.id?c.color:"transparent"}`,background:activeCard===c.id?`${c.color}18`:"rgba(15,23,42,.03)"}}>
              <div style={{fontSize:20}}>{c.emoji}</div>
              <div style={{fontSize:10,color:activeCard===c.id?c.color:"#7c8799",fontWeight:600,marginTop:2}}>{c.label.split(" ")[0]}</div>
              <div className="mono" style={{fontSize:11,color:activeCard===c.id?c.color:"#94a3b8",marginTop:1}}>{fmtBRL(sub)}</div>
            </button>
          );
        })}
      </div>
      <Card style={{background:`${card.color}11`,borderColor:`${card.color}33`,padding:"12px 14px"}}>
        <div style={{display:"flex",justifyContent:"space-between"}}>
          <div><div style={{fontSize:10,color:"#64748b"}}>{card.label}</div><div className="mono" style={{fontSize:22,color:card.color,fontWeight:600}}>{fmtBRL(total)}</div></div>
          <div style={{textAlign:"right"}}><div style={{fontSize:10,color:"#64748b"}}>Total cartões</div><div className="mono" style={{fontSize:16,color:"#dc2626"}}>{fmtBRL(totalAll)}</div></div>
        </div>
      </Card>
      {previsto>0&&(
        <Card style={{padding:"10px 14px",background:"rgba(91,88,214,.04)",borderColor:"rgba(91,88,214,.14)"}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:12}}>
            <div><div style={{fontSize:10,color:"#64748b"}}>Fatura já lançada</div><div className="mono" style={{fontSize:14,color:"#334155",fontWeight:600}}>{fmtBRL(confirmado)}</div></div>
            <div style={{textAlign:"right"}}><div style={{fontSize:10,color:"#64748b"}}>Parcelas previstas</div><div className="mono" style={{fontSize:14,color:"#5b58d6",fontWeight:600}}>{fmtBRL(previsto)}</div></div>
          </div>
        </Card>
      )}
      {/* Import buttons */}
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>{setShowPdfUpload(!showPdfUpload);setShowImport(false);setImportMsg(null);setPdfFile(null);setPdfPreview([]);setPdfProcessing(false);}} style={{flex:1,padding:"9px",borderRadius:10,border:`1px solid ${card.color}44`,background:showPdfUpload?`${card.color}18`:"transparent",color:card.color,fontSize:12,fontWeight:600,cursor:"pointer"}}>
          📄 Importar PDF
        </button>
        <button onClick={()=>{setShowImport(!showImport);setShowPdfUpload(false);setImportMsg(null);}} style={{flex:1,padding:"9px",borderRadius:10,border:"1px solid rgba(15,23,42,.1)",background:showImport?"rgba(15,23,42,.06)":"transparent",color:"#64748b",fontSize:12,fontWeight:600,cursor:"pointer"}}>
          { } JSON
        </button>
        <button onClick={()=>setMonth({...month,cartoes:{...month.cartoes,[activeCard]:[]}})} style={{padding:"9px 14px",borderRadius:10,border:"1px solid rgba(239,68,68,.2)",background:"transparent",color:"#dc2626",fontSize:11,cursor:"pointer"}}>
          🗑
        </button>
      </div>
      <button onClick={()=>{
        const r=projectMonthInstallments();
        setImportMsg({ok:true,txt:`✓ ${r.projetados} parcela(s) futura(s) programada(s) a partir dos lançamentos deste mês`});
      }} style={{padding:"9px",borderRadius:10,border:"1px solid rgba(91,88,214,.18)",background:"rgba(91,88,214,.05)",color:"#5b58d6",fontSize:11,fontWeight:600,cursor:"pointer"}}>
        ↗ Projetar parcelamentos deste mês
      </button>

      {importMsg&&(
        <div style={{padding:"8px 12px",borderRadius:10,background:importMsg.ok?"rgba(74,222,128,.08)":"rgba(239,68,68,.08)",fontSize:12,color:importMsg.ok?"#15803d":"#dc2626",border:`1px solid ${importMsg.ok?"rgba(74,222,128,.2)":"rgba(239,68,68,.2)"}`}}>
          {importMsg.txt}
        </div>
      )}

      {/* PDF Upload panel */}
      {showPdfUpload&&(
        <Card style={{borderColor:`${card.color}33`}}>
          <div style={{fontSize:12,color:card.color,fontWeight:600,marginBottom:8}}>{card.emoji} Importar fatura — {card.label}</div>
          <div style={{fontSize:11,color:"#64748b",marginBottom:10,lineHeight:1.6}}>
            Selecione o PDF da fatura do cartão. O Claude vai ler, extrair e categorizar todos os lançamentos automaticamente.
          </div>

          {/* File drop area */}
          <div onClick={()=>{if(!pdfFile)pdfInputRef.current?.click();}} style={{
            border:`2px dashed ${card.color}44`,borderRadius:12,padding:"20px",
            textAlign:"center",cursor:"pointer",background:`${card.color}08`,
            transition:"all .2s",
          }}>
            <input ref={pdfInputRef} type="file" accept=".pdf,application/pdf"
              onChange={onPdfSelect} style={{display:"none"}}/>
            <div style={{fontSize:28,marginBottom:6}}>{pdfFile?"📄":"📂"}</div>
            {pdfFile
              ?<><div style={{fontSize:13,fontWeight:600,color:card.color}}>{pdfFile.name}</div>
                 <div style={{fontSize:10,color:"#64748b",marginTop:2}}>{(pdfFile.size/1024).toFixed(0)} KB · toque para trocar</div></>
              :<><div style={{fontSize:13,color:"#64748b",fontWeight:500}}>Toque para selecionar o PDF</div>
                 <div style={{fontSize:10,color:"#94a3b8",marginTop:2}}>Fatura {card.label}</div></>
            }
          </div>

          {pdfProcessing&&(
            <div style={{marginTop:10,padding:"10px 12px",borderRadius:10,background:"rgba(124,106,247,.08)",border:"1px solid rgba(124,106,247,.2)",fontSize:12,color:"#5b58d6",textAlign:"center"}}>
              ⚙️ {pdfMsg||"Processando..."}
            </div>
          )}

          {/* Preview dos lançamentos antes de confirmar */}
          {pdfPreview.length>0&&!pdfProcessing&&(
            <div style={{marginTop:10}}>
              <div style={{fontSize:11,color:"#64748b",marginBottom:6,display:"flex",justifyContent:"space-between"}}>
                <span>{pdfPreview.length} lançamentos encontrados</span>
                <span className="mono" style={{color:"#dc2626"}}>R$ {pdfPreview.reduce((s,t)=>s+t.valor,0).toFixed(2)}</span>
              </div>
              <div style={{maxHeight:200,overflowY:"auto",display:"flex",flexDirection:"column",gap:4}}>
                {pdfPreview.map((t,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:"rgba(15,23,42,.03)",borderRadius:8}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:11,color:"#172033",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.desc}</div>
                      <div style={{fontSize:9,color:"#7c8799"}}>{t.cat}{t.parcela?` · ${t.parcela}`:""}</div>
                    </div>
                    <span className="mono" style={{fontSize:11,color:card.color,marginLeft:8,flexShrink:0}}>{fmtBRL(t.valor)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10}}>
            <button onClick={()=>{setShowPdfUpload(false);setPdfFile(null);setPdfPreview([]);}} style={{padding:"10px",borderRadius:10,border:"1px solid rgba(15,23,42,.08)",background:"transparent",color:"#64748b",fontSize:13,cursor:"pointer"}}>Cancelar</button>
            <button onClick={pdfPreview.length>0?confirmPdfImport:(!pdfFile?(()=>pdfInputRef.current?.click()):processPdf)} disabled={pdfProcessing}
              style={{padding:"10px",borderRadius:10,border:"none",background:!pdfFile||pdfProcessing?"#1a1a2a":card.color,color:!pdfFile||pdfProcessing?"#94a3b8":"#fff",fontSize:13,fontWeight:600,cursor:!pdfFile||pdfProcessing?"not-allowed":"pointer"}}>
              {pdfProcessing?"Processando...":pdfPreview.length>0?"✅ Confirmar":"🤖 Processar"}
            </button>
          </div>
        </Card>
      )}

      {/* JSON Import panel */}
      {showImport&&(
        <Card style={{borderColor:"rgba(15,23,42,.1)"}}>
          <div style={{fontSize:12,color:"#64748b",fontWeight:600,marginBottom:8}}>Importar via JSON</div>
          <textarea value={importJson} onChange={e=>setImportJson(e.target.value)}
            placeholder='{"tipo":"cartao","cartao":"inter","lancamentos":[...]}'
            style={{width:"100%",minHeight:80,background:"rgba(0,0,0,.4)",border:"1px solid rgba(15,23,42,.1)",borderRadius:10,padding:10,color:"#172033",fontSize:10,outline:"none",resize:"vertical",fontFamily:"'JetBrains Mono',monospace",lineHeight:1.5}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
            <button onClick={()=>{setShowImport(false);setImportJson("");}} style={{padding:"10px",borderRadius:10,border:"1px solid rgba(15,23,42,.08)",background:"transparent",color:"#64748b",fontSize:13,cursor:"pointer"}}>Cancelar</button>
            <button onClick={doImport} style={{padding:"10px",borderRadius:10,border:"none",background:"#64748b",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>Importar</button>
          </div>
        </Card>
      )}

      {/* Contador */}
      {items.length>0&&(
        <div style={{fontSize:10,color:"#7c8799",textAlign:"center",padding:"2px 0"}}>
          {items.length} lançamento{items.length>1?"s":""} · toque na categoria para editar
        </div>
      )}

      {items.map(t=>(
        <Card key={t.id} style={{padding:"10px 14px"}}>
          {/* Linha 1: descrição + valor + remover */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,color:"#172033",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.desc}</div>
              <div style={{fontSize:10,color:"#64748b",marginTop:1}}>{t.data||""}{t.parcela?` · Parcela ${t.parcela}`:""}</div>
              {t.projetado&&<div style={{display:"inline-flex",marginTop:4,padding:"2px 7px",borderRadius:999,background:"rgba(91,88,214,.08)",color:"#5b58d6",fontSize:9,fontWeight:700}}>PREVISTO · será conciliado ao importar a fatura</div>}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
              <span className="mono" style={{fontSize:14,color:card.color,fontWeight:600}}>{fmtBRL(t.valor)}</span>
              <button onClick={()=>remove(t.id)} style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.15)",borderRadius:6,padding:"3px 7px",color:"#dc2626",fontSize:11,cursor:"pointer"}}>✕</button>
            </div>
          </div>
          {/* Linha 2: categoria editável */}
          <div style={{marginTop:8}}>
            <select value={t.cat||"Outro"} onChange={e=>{
              const updated=(month.cartoes[activeCard]||[]).map(x=>x.id===t.id?{...x,cat:e.target.value}:x);
              setMonth({...month,cartoes:{...month.cartoes,[activeCard]:updated}});
            }} style={{
              background:`${card.color}11`,border:`1px solid ${card.color}33`,
              borderRadius:8,padding:"5px 10px",color:card.color,
              fontSize:11,fontWeight:600,outline:"none",width:"100%",cursor:"pointer",
            }}>
              {CATS.map(cat=><option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        </Card>
      ))}
      {showForm&&(
        <Card style={{borderColor:`${card.color}33`}}>
          <div style={{fontSize:12,color:card.color,fontWeight:600,marginBottom:10}}>{card.emoji} Novo — {card.label}</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <Inp label="Descrição" value={form.desc} onChange={v=>setForm({...form,desc:v})} placeholder="Ex: Supermercado"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <Sel label="Categoria" value={form.cat} onChange={v=>setForm({...form,cat:v})} options={CATS}/>
              <Inp label="Parcela" value={form.parcela} onChange={v=>setForm({...form,parcela:v})} placeholder="Ex: 2/6"/>
            </div>
            <Inp label="Valor (R$)" type="number" value={form.valor} onChange={v=>setForm({...form,valor:v})} placeholder="0,00"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:4}}>
              <Btn outline color="#64748b" onClick={()=>setShowForm(false)}>Cancelar</Btn>
              <Btn color={card.color} onClick={add}>Salvar</Btn>
            </div>
          </div>
        </Card>
      )}
      <button onClick={()=>setShowForm(!showForm)} style={{padding:"12px",borderRadius:12,border:`1px dashed ${card.color}55`,background:"transparent",color:card.color,fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
        + Adicionar lançamento
      </button>
      <div style={{fontSize:10,color:"#cbd5e1",textAlign:"center"}}>💡 Envie o extrato PDF/CSV ao Claude para importar automaticamente</div>
    </div>
  );
}

function PixView({month,setMonth}) {
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({desc:"",cat:CATS[0],data:today(),banco:"Inter",valor:""});
  const total=(month.variaveis||[]).reduce((s,p)=>s+Number(p.valor||0),0);
  const onPdfSelect=e=>{
    const f=e.target.files?.[0];
    if(f&&f.type==="application/pdf"){setPdfFile(f);setPdfPreview([]);}
  };

  const RULES_CAT = [
    [["market4u","carrefour","assai","padaria","panificadora","piriquito","hortifruti","atacadao","pao de acucar","supermercado","minuto pa"],"Mercado"],
    [["sampa cafe","oxxo","hamburger","osnir","mani ","cantina","churrascaria","restaurante","lanchonete","pizza","delta quality","cafe ","lanche"],"Comer fora"],
    [["ifd*","ifood","rappi","zee now","delivery"],"Delivery"],
    [["paypal *uber","uber br","uber do brasi","uber ","99app"],"Uber"],
    [["sem parar","estacionamento","blz estacion","posto ","auto posto","shellbox","intertag","combustivel"],"Carro"],
    [["applecombill","netflix","amazon kindle","google one","youtube","disney","mubi","openai","timeleft","granazen","viki","paypal *google","paypal *disney","spotify","conta vivo","vivo ","deezer","apple "],"Apps"],
    [["drogaria","farmacia","droga raia","drogasil"],"Farmácia"],
    [["smartfit","academia","n2b nutri","med park","hospital","clinica","amib","associacao paulista","uhuu"],"Saúde"],
    [["francisco lourenco","campea admin","danielle carvalho","peri construcoes","ana gomes","elizabeth lopes","faxin","condominio","energia"],"Casa"],
    [["conselho reg","conselho regional","medicina do estado","associacao de medicina","contabilizeasy","governo do parana","caixa economica federal","pagar me"],"Empresa"],
    [["mercadolivre","shopee","netshoes","redvirtua","maxspeed","grupo elite","americanas","magazine","amazon "],"Compras"],
    [["zig*","candeia","mikael","cinema","teatro","show ","evento","ingresso"],"Lazer"],
    [["zee dog","petshop","pet ","racao","veterinario"],"Pet"],
    [["iof "],"Impostos"],
    [["carolina rodrigues"],"Família/Presentes"],
  ];
  const categorizarLocal=desc=>{
    const d=(desc||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    for(const [keys,cat] of RULES_CAT) if(keys.some(k=>d.includes(k))) return cat;
    return "Outro";
  };

  const processPdf=async()=>{
    if(!pdfFile){ pdfInputRef.current?.click(); return; }
    setPdfProcessing(true); setPdfMsg("Lendo o PDF...");
    try{
      const base64=await new Promise((res,rej)=>{
        const r=new FileReader();
        r.onload=()=>res(r.result.split(",")[1]);
        r.onerror=()=>rej(new Error("Falha ao ler"));
        r.readAsDataURL(pdfFile);
      });
      setPdfMsg("Claude analisando a fatura...");
      const prompt=`Analise esta fatura do cartão ${card.label} e extraia os lançamentos de compras.
IGNORE: PAGTO DEBITO AUTOMATICO, créditos/estornos (com "+"), IOF INTERNACIONAL isolado, encargos/juros/multas, seção "Fatura anterior", seção "Recebidos".
Para cada compra extraia: {"desc":"nome limpo","valor":0.00,"parcela":"X/Y ou vazio","data":"DD/MM/YYYY"}
Limpe os nomes: remova "MLP*","IFD*","PAYPAL *","MARKET4U*COMPRA*123456". Market4U sem nome = "Mercado (Market4U)".
Retorne SOMENTE o array JSON.`;
      const res=await fetch("/api/claude",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-haiku-4-5-20251001",
          max_tokens:4000,
          messages:[{role:"user",content:[
            {type:"document",source:{type:"base64",media_type:"application/pdf",data:base64}},
            {type:"text",text:prompt}
          ]}]
        })
      });
      if(!res.ok) throw new Error(`API error ${res.status}`);
      const data=await res.json();
      const txt=data.content?.map(b=>b.text||"").join("")||"";
      const parsed=JSON.parse(txt.replace(/```json|```/g,"").trim());
      const comCat=parsed.map(t=>({...t,valor:Number(t.valor||0),cat:categorizarLocal(t.desc),id:Date.now()+Math.random()}));
      setPdfPreview(comCat);
      setPdfMsg("");
    }catch(e){
      setImportMsg({ok:false,txt:"Erro ao processar PDF: "+e.message});
      setShowPdfUpload(false);
    }finally{
      setPdfProcessing(false);
    }
  };

  const confirmPdfImport=()=>{
    const cartaoAlvo=activeCard;
    const novos=[...(month.cartoes[cartaoAlvo]||[]),...pdfPreview];
    setMonth({...month,cartoes:{...month.cartoes,[cartaoAlvo]:novos}});
    setImportMsg({ok:true,txt:`✓ ${pdfPreview.length} lançamentos importados para ${card.label} · ${fmtBRL(pdfPreview.reduce((s,t)=>s+t.valor,0))}`});
    setShowPdfUpload(false); setPdfFile(null); setPdfPreview([]);
  };

  const add=()=>{
    if(!form.desc||!form.valor) return;
    setMonth({...month,variaveis:[...(month.variaveis||[]),{...form,valor:Number(form.valor),id:Date.now()}]});
    setForm({desc:"",cat:CATS[0],data:today(),banco:"Inter",valor:""});
    setShowForm(false);
  };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <Card style={{background:"rgba(34,211,238,.05)",borderColor:"rgba(34,211,238,.15)"}}>
        <div style={{fontSize:10,color:"#64748b"}}>Total Pix / Variáveis</div>
        <div className="mono" style={{fontSize:24,color:"#0e7490",fontWeight:600}}>{fmtBRL(total)}</div>
      </Card>
      {(month.variaveis||[]).map(p=>(
        <Card key={p.id} style={{padding:"10px 14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,color:"#172033"}}>{p.desc}</div>
              <div style={{fontSize:11,color:"#7c8799"}}>{p.cat} · {p.banco} · {p.data}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginLeft:8,flexShrink:0}}>
              <span className="mono" style={{fontSize:14,color:"#0e7490",fontWeight:500}}>{fmtBRL(p.valor)}</span>
              <button onClick={()=>setMonth({...month,variaveis:(month.variaveis||[]).filter(x=>x.id!==p.id)})} style={{background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.15)",borderRadius:6,padding:"3px 7px",color:"#dc2626",fontSize:11,cursor:"pointer"}}>✕</button>
            </div>
          </div>
        </Card>
      ))}
      {showForm&&(
        <Card style={{borderColor:"rgba(34,211,238,.2)"}}>
          <div style={{fontSize:12,color:"#0e7490",fontWeight:600,marginBottom:10}}>📱 Novo Pix / Variável</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <Inp label="Descrição" value={form.desc} onChange={v=>setForm({...form,desc:v})} placeholder="Ex: Farmácia"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <Sel label="Categoria" value={form.cat} onChange={v=>setForm({...form,cat:v})} options={CATS}/>
              <Sel label="Banco" value={form.banco} onChange={v=>setForm({...form,banco:v})} options={["Inter","Itaú","Will","Outro"]}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <Inp label="Data" type="date" value={form.data} onChange={v=>setForm({...form,data:v})}/>
              <Inp label="Valor (R$)" type="number" value={form.valor} onChange={v=>setForm({...form,valor:v})} placeholder="0,00"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:4}}>
              <Btn outline color="#64748b" onClick={()=>setShowForm(false)}>Cancelar</Btn>
              <Btn color="#0e7490" onClick={add} style={{color:"#eef3f8"}}>Salvar</Btn>
            </div>
          </div>
        </Card>
      )}
      <button onClick={()=>setShowForm(!showForm)} style={{padding:"12px",borderRadius:12,border:"1px dashed rgba(34,211,238,.35)",background:"transparent",color:"#0e7490",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
        + Adicionar pagamento
      </button>
    </div>
  );
}

const TIPOS_INVEST = ["Renda Fixa","Fundo","Ações","FIIs","Cripto","Previdência","Internacional","Outro"];
const CORES_TIPO = {
  "Renda Fixa":"#15803d","Fundo":"#4f46e5","Ações":"#c2410c","FIIs":"#b45309",
  "Cripto":"#e879f9","Previdência":"#0e7490","Internacional":"#38bdf8","Outro":"#94a3b8",
};
// Risco estimado por tipo de ativo (1=baixo risco, 5=muito alto) — heurística simples,
// não é uma análise de risco profissional, só uma referência dentro do app.
const RISCO_TIPO = {
  "Renda Fixa":   {score:1, label:"Baixo",      color:"#15803d"},
  "Previdência":  {score:1, label:"Baixo",      color:"#15803d"},
  "FIIs":         {score:3, label:"Médio",      color:"#b45309"},
  "Fundo":        {score:3, label:"Médio",      color:"#b45309"},
  "Outro":        {score:3, label:"Médio",      color:"#b45309"},
  "Internacional":{score:4, label:"Alto",       color:"#c2410c"},
  "Ações":        {score:5, label:"Muito alto", color:"#dc2626"},
  "Cripto":       {score:5, label:"Muito alto", color:"#dc2626"},
};
const RISCO_DEFAULT = {score:3, label:"Médio", color:"#b45309"};

function InvestView({month,setMonth,mesKey}) {
  const [editing,setEditing]=useState(null);
  const [showAdd,setShowAdd]=useState(false);
  const [showImport,setShowImport]=useState(false);
  const [importJson,setImportJson]=useState("");
  const [importMsg,setImportMsg]=useState(null);
  const [nova,setNova]=useState({produto:"",tipo:TIPOS_INVEST[0],atual:"",aporte:"",resgate:""});
  const [allMonths,setAllMonths]=useState({});
  const [loadingHistory,setLoadingHistory]=useState(true);

  useEffect(()=>{
    const [y,m]=mesKey.split("-").map(Number);
    const keys=[];
    for(let i=0;i<12;i++){
      const d=new Date(y,m-1-i,1);
      keys.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
    }
    Promise.all(keys.map(k=>load(`month:${k}`).then(d=>({k,d})))).then(results=>{
      const map={};
      results.forEach(({k,d})=>{ if(d) map[k]=d; });
      map[mesKey]=month;
      setAllMonths(map);
      setLoadingHistory(false);
    });
  },[mesKey,month]);

  const upd=(id,f,v)=>setMonth({...month,investimentosFotoConfirmada:f==="atual"?true:month.investimentosFotoConfirmada,investimentos:month.investimentos.map(i=>i.id===id?{...i,[f]:(["atual","aporte","resgate"].includes(f))?Number(v)||0:v}:i)});
  const remove=id=>setMonth({...month,investimentos:month.investimentos.filter(i=>i.id!==id)});
  const addInv=()=>{
    if(!nova.produto) return;
    setMonth({...month,investimentosFotoConfirmada:true,investimentos:[...month.investimentos,{id:Date.now(),produto:nova.produto,tipo:nova.tipo,atual:Number(nova.atual)||0,aporte:Number(nova.aporte)||0,resgate:Number(nova.resgate)||0}]});
    setNova({produto:"",tipo:TIPOS_INVEST[0],atual:"",aporte:"",resgate:""});
    setShowAdd(false);
  };
  const doImportInvest=()=>{
    try{
      const data=JSON.parse(importJson);
      const arr=Array.isArray(data)?data:data.investimentos;
      if(!Array.isArray(arr)) throw new Error("esperado um array de ativos (ou {\"investimentos\":[...]})");
      const novos=arr.map((a,i)=>({
        id:Date.now()+i,
        produto:a.produto||a.nome||"Sem nome",
        tipo:TIPOS_INVEST.includes(a.tipo)?a.tipo:"Outro",
        atual:Number(a.atual)||0,
        aporte:Number(a.aporte)||0,
        resgate:Number(a.resgate)||0,
      }));
      setMonth({...month,investimentosFotoConfirmada:true,investimentos:novos});
      setImportMsg({ok:true,txt:`✓ Fotografia registrada com ${novos.length} ativos`});
      setImportJson("");
      setShowImport(false);
    }catch(e){
      setImportMsg({ok:false,txt:"Erro: "+e.message});
    }
  };

  const totalAtu=month.investimentos.reduce((s,i)=>s+Number(i.atual||0),0);
  const totalAportes=month.investimentos.reduce((s,i)=>s+Number(i.aporte||0),0);
  const totalResgates=month.investimentos.reduce((s,i)=>s+Number(i.resgate||0),0);
  const prevKey=prevMesKey(mesKey);
  const prevMonth=allMonths[prevKey];
  const prevFotoConfirmada=hasFotoInvestimentos(prevMonth);
  const prevTotal=(prevMonth?.investimentos||[]).reduce((s,i)=>s+Number(i.atual||0),0);
  const prevAportes=(prevMonth?.investimentos||[]).reduce((s,i)=>s+Number(i.aporte||0),0);
  const prevResgates=(prevMonth?.investimentos||[]).reduce((s,i)=>s+Number(i.resgate||0),0);
  const fotoConfirmada=hasFotoInvestimentos(month);
  const rend=fotoConfirmada&&prevFotoConfirmada?totalAtu-prevTotal-prevAportes+prevResgates:null;
  const rendPct=rend!==null&&prevTotal>0?(rend/prevTotal*100):null;
  const [prevY,prevM]=prevKey.split("-");
  const periodoRendimento=`${MESES[Number(prevM)-1]}/${prevY}`;

  // Alocação por tipo
  const porTipo={};
  month.investimentos.forEach(i=>{ porTipo[i.tipo]=(porTipo[i.tipo]||0)+Number(i.atual||0); });
  const alocacao=Object.entries(porTipo).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);

  // Risco da carteira — média do risco de cada tipo, ponderada pelo valor atual de cada ativo
  const riscoScoreRaw = totalAtu>0
    ? month.investimentos.reduce((s,i)=>s+(RISCO_TIPO[i.tipo]||RISCO_DEFAULT).score*Number(i.atual||0),0)/totalAtu
    : 0;
  const riscoRound = totalAtu>0 ? Math.min(5,Math.max(1,Math.round(riscoScoreRaw))) : 0;
  const RISCO_LABELS=["","Baixo","Baixo-médio","Médio","Alto","Muito alto"];
  const RISCO_CORES=["","#15803d","#a3e635","#b45309","#c2410c","#dc2626"];
  const riscoLabel = RISCO_LABELS[riscoRound]||"—";
  const riscoCor = RISCO_CORES[riscoRound]||"#64748b";
  const ativosOrdenados=[...month.investimentos].sort((a,b)=>Number(b.atual||0)-Number(a.atual||0));
  const maiorAtivo=ativosOrdenados[0];
  const pctMaiorAtivo=maiorAtivo&&totalAtu>0?Number(maiorAtivo.atual||0)/totalAtu*100:0;
  const maiorTipo=alocacao[0];
  const pctMaiorTipo=maiorTipo&&totalAtu>0?maiorTipo[1]/totalAtu*100:0;
  const concentrado = pctMaiorAtivo>40||pctMaiorTipo>55;

  // Histórico — 12 meses
  const mesesOrdenados=Object.keys(allMonths).sort();
  const mesesLabel2=mesesOrdenados.map(k=>{ const[y,m]=k.split("-"); return `${MESES[+m-1]}/${String(y).slice(-2)}`; });
  const getAtuT=md=>(md?.investimentos||[]).reduce((s,i)=>s+Number(i.atual||0),0);
  const atuMeses=mesesOrdenados.map(k=>getAtuT(allMonths[k]));
  const maxHist=Math.max(...atuMeses,1);
  const mesesComDado=mesesOrdenados.filter((k,i)=>atuMeses[i]>0).length;

  // Projeção — extrapola a taxa média de crescimento mensal observada no histórico
  const idxComDado=atuMeses.map((v,i)=>v>0?i:-1).filter(i=>i>=0);
  let projecao=null;
  if(idxComDado.length>=2){
    const i0=idxComDado[0], i1=idxComDado[idxComDado.length-1];
    const n=i1-i0;
    if(n>=1&&atuMeses[i0]>0){
      const taxaMensal=Math.pow(atuMeses[i1]/atuMeses[i0],1/n)-1;
      projecao={
        meses:n,
        taxaMensal,
        proj6:atuMeses[i1]*Math.pow(1+taxaMensal,6),
        proj12:atuMeses[i1]*Math.pow(1+taxaMensal,12),
      };
    }
  }

  return (
    <div className="view-stack">
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10}}>
        <Card style={{background:"rgba(129,140,248,.05)",borderColor:"rgba(129,140,248,.15)"}}>
          <div style={{fontSize:10,color:"#64748b"}}>Fotografia em 01/{mesKey.split("-")[1]}</div>
          <div className="mono" style={{fontSize:18,color:"#4f46e5",fontWeight:600}}>{fmtBRL(totalAtu)}</div>
        </Card>
        <Card style={{background:"rgba(109,40,217,.05)",borderColor:"rgba(109,40,217,.15)"}}>
          <div style={{fontSize:10,color:"#64748b"}}>Aportes no mês</div>
          <div className="mono" style={{fontSize:18,color:"#6d28d9",fontWeight:600}}>{fmtBRL(totalAportes)}</div>
        </Card>
        <Card style={{background:"rgba(14,116,144,.05)",borderColor:"rgba(14,116,144,.15)"}}>
          <div style={{fontSize:10,color:"#64748b"}}>Resgates no mês</div>
          <div className="mono" style={{fontSize:18,color:"#0e7490",fontWeight:600}}>{fmtBRL(totalResgates)}</div>
        </Card>
      </div>

      <Card style={{background:rend===null?"#f8fafc":rend>=0?"rgba(21,128,61,.06)":"rgba(220,38,38,.05)",borderColor:rend===null?"#dfe6ef":rend>=0?"rgba(21,128,61,.18)":"rgba(220,38,38,.18)"}}>
        {rend===null?(
          <div>
            <div style={{fontSize:12,fontWeight:700,color:"#172033"}}>Rendimento de {periodoRendimento} ainda não calculado</div>
            <div style={{fontSize:11,color:"#64748b",marginTop:4}}>Registre a fotografia de {prevKey.split("-")[1]}/{prevKey.split("-")[0]} para comparar os saldos corretamente.</div>
          </div>
        ):(
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
            <div>
              <div style={{fontSize:10,color:"#64748b"}}>Rendimento de {periodoRendimento}</div>
              <div className="mono" style={{fontSize:20,color:rend>=0?"#15803d":"#dc2626",fontWeight:700}}>{fmtBRL(rend)}</div>
              <div style={{fontSize:10,color:"#64748b",marginTop:3}}>Variação da carteira, descontando aportes e considerando resgates</div>
            </div>
            {rendPct!==null&&<div style={{fontSize:15,fontWeight:700,color:rend>=0?"#15803d":"#dc2626",background:rend>=0?"rgba(21,128,61,.10)":"rgba(220,38,38,.10)",padding:"6px 12px",borderRadius:10}}>{rendPct>=0?"+":""}{rendPct.toFixed(2)}%</div>}
          </div>
        )}
      </Card>

      {/* Risco da carteira */}
      {month.investimentos.length>0&&totalAtu>0&&(
        <Card>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:10,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:.8}}>
              Risco da carteira
            </div>
            <span style={{fontSize:12,fontWeight:700,color:riscoCor}}>{riscoLabel}</span>
          </div>
          <div style={{display:"flex",gap:3,marginBottom:concentrado?10:8}}>
            {[1,2,3,4,5].map(n=>(
              <div key={n} style={{flex:1,height:6,borderRadius:3,background:n<=riscoRound?riscoCor:"rgba(15,23,42,.06)"}}/>
            ))}
          </div>
          {concentrado&&(
            <div style={{padding:"7px 10px",borderRadius:8,background:"rgba(251,191,36,.08)",border:"1px solid rgba(251,191,36,.2)",fontSize:11,color:"#b45309",marginBottom:8}}>
              ⚠ Concentração alta —{pctMaiorAtivo>40&&` ${maiorAtivo.produto} é ${pctMaiorAtivo.toFixed(0)}% da carteira`}{pctMaiorAtivo>40&&pctMaiorTipo>55?" · ":""}{pctMaiorTipo>55&&` ${maiorTipo[0]} concentra ${pctMaiorTipo.toFixed(0)}%`}
            </div>
          )}
          <div style={{fontSize:9,color:"#7c8799",lineHeight:1.6}}>
            Estimativa por tipo de ativo (Renda Fixa/Previdência = baixo; Fundos/FIIs = médio; Internacional = alto; Ações/Cripto = muito alto), ponderada pelo valor de cada posição. Não substitui uma análise profissional.
          </div>
        </Card>
      )}

      {/* Alocação por tipo */}
      {alocacao.length>1&&(
        <Card>
          <div style={{fontSize:10,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:.8,marginBottom:12}}>
            Alocação por tipo
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {alocacao.map(([tipo,val])=>{
              const pct=totalAtu>0?(val/totalAtu*100):0;
              const cor=CORES_TIPO[tipo]||"#5b58d6";
              return (
                <div key={tipo}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      <div style={{width:9,height:9,borderRadius:3,background:cor,flexShrink:0}}/>
                      <span style={{fontSize:12,color:"#334155"}}>{tipo}</span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:10,color:"#7c8799"}}>{pct.toFixed(1)}%</span>
                      <span className="mono" style={{fontSize:12,color:cor,fontWeight:600,minWidth:72,textAlign:"right"}}>{fmtBRL(val)}</span>
                    </div>
                  </div>
                  <div style={{height:5,background:"rgba(15,23,42,.05)",borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${pct}%`,background:cor,borderRadius:3,transition:"width .5s"}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Evolução mensal */}
      <Card>
        <div style={{fontSize:10,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:.8,marginBottom:14}}>
          Evolução — 12 meses
        </div>
        {loadingHistory?(
          <div style={{textAlign:"center",padding:"20px 0",color:"#94a3b8",fontSize:12}}>Carregando…</div>
        ):mesesComDado<2?(
          <div style={{textAlign:"center",padding:"12px 0",color:"#94a3b8",fontSize:11}}>Ainda não há histórico suficiente</div>
        ):(
          <>
            <div style={{display:"flex",alignItems:"flex-end",gap:4,height:120}}>
              {mesesOrdenados.map((k,i)=>{
                const isCur=k===mesKey;
                return (
                  <div key={k} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                    <div style={{width:"100%",display:"flex",alignItems:"flex-end",height:100}}>
                      <div title={fmtBRL(atuMeses[i])} style={{width:"100%",background:isCur?"#5b58d6":"#a7b0c4",borderRadius:"5px 5px 0 0",height:`${atuMeses[i]/maxHist*100}%`,minHeight:atuMeses[i]>0?3:0}}/>
                    </div>
                    <span style={{fontSize:8,color:isCur?"#172033":"#7c8799",fontWeight:isCur?700:400}}>{mesesLabel2[i]}</span>
                  </div>
                );
              })}
            </div>
            <div style={{fontSize:10,color:"#64748b",marginTop:8,textAlign:"center"}}>Cada barra representa a fotografia registrada no início do mês.</div>
          </>
        )}
      </Card>

      {/* Projeção */}
      <Card>
        <div style={{fontSize:10,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:.8,marginBottom:12}}>
          Projeção
        </div>
        {loadingHistory?(
          <div style={{textAlign:"center",padding:"20px 0",color:"#94a3b8",fontSize:12}}>Carregando…</div>
        ):!projecao?(
          <div style={{textAlign:"center",padding:"12px 0",color:"#94a3b8",fontSize:11}}>Histórico insuficiente pra projetar — precisa de pelo menos 2 meses com saldo</div>
        ):(
          <>
            <div style={{fontSize:11,color:"#64748b",marginBottom:10}}>
              Com base no crescimento médio dos últimos {projecao.meses} mês(es) (~{(projecao.taxaMensal*100).toFixed(2)}% ao mês):
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div style={{textAlign:"center",background:"rgba(15,23,42,.03)",borderRadius:10,padding:"10px 4px"}}>
                <div style={{fontSize:9,color:"#7c8799",textTransform:"uppercase",letterSpacing:.5}}>Em 6 meses</div>
                <div className="mono" style={{fontSize:15,color:"#6d28d9",fontWeight:600,marginTop:3}}>{fmtBRL(projecao.proj6)}</div>
              </div>
              <div style={{textAlign:"center",background:"rgba(15,23,42,.03)",borderRadius:10,padding:"10px 4px"}}>
                <div style={{fontSize:9,color:"#7c8799",textTransform:"uppercase",letterSpacing:.5}}>Em 12 meses</div>
                <div className="mono" style={{fontSize:15,color:"#6d28d9",fontWeight:600,marginTop:3}}>{fmtBRL(projecao.proj12)}</div>
              </div>
            </div>
            <div style={{fontSize:9,color:"#94a3b8",marginTop:10,lineHeight:1.6}}>
              Extrapolação simples do seu histórico dentro do app — não considera novos aportes, mudanças de mercado ou rebalanceamento. Não é recomendação de investimento.
            </div>
          </>
        )}
      </Card>

      {/* Lista de ativos */}
      <div style={{fontSize:10,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:.8,padding:"4px 0 2px"}}>
        Ativos
      </div>
      {month.investimentos.map(inv=>{
        const isOpen=editing===inv.id;
        const cor=CORES_TIPO[inv.tipo]||"#6d28d9";
        return (
          <Card key={inv.id}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:cor}}>{inv.produto||"Sem nome"}</div>
                <div style={{display:"flex",alignItems:"center",gap:6,marginTop:2}}>
                  <span style={{fontSize:10,color:"#7c8799"}}>{inv.tipo}</span>
                  <span style={{fontSize:9,fontWeight:600,color:(RISCO_TIPO[inv.tipo]||RISCO_DEFAULT).color,background:`${(RISCO_TIPO[inv.tipo]||RISCO_DEFAULT).color}18`,padding:"1px 6px",borderRadius:6}}>
                    {(RISCO_TIPO[inv.tipo]||RISCO_DEFAULT).label}
                  </span>
                </div>
              </div>
              <button onClick={()=>setEditing(isOpen?null:inv.id)} style={{background:"transparent",border:"1px solid rgba(15,23,42,.06)",borderRadius:8,padding:"4px 10px",color:"#7c8799",fontSize:11,cursor:"pointer",flexShrink:0}}>
                {isOpen?"▲":"editar"}
              </button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:8,marginTop:8}}>
              <Inp label="Saldo em 01 do mês" type="number" value={inv.atual||""} onChange={v=>upd(inv.id,"atual",v)} placeholder="0,00"/>
              <Inp label="Aportes no mês" type="number" value={inv.aporte||""} onChange={v=>upd(inv.id,"aporte",v)} placeholder="0,00"/>
              <Inp label="Resgates no mês" type="number" value={inv.resgate||""} onChange={v=>upd(inv.id,"resgate",v)} placeholder="0,00"/>
            </div>
            {isOpen&&(
              <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:8}}>
                <Inp label="Nome do ativo" value={inv.produto||""} onChange={v=>upd(inv.id,"produto",v)} placeholder="Ex: Tesouro Selic 2029"/>
                <Sel label="Tipo" value={inv.tipo} onChange={v=>upd(inv.id,"tipo",v)} options={TIPOS_INVEST}/>
                <button onClick={()=>remove(inv.id)} style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.15)",borderRadius:8,padding:"6px",color:"#dc2626",fontSize:12,cursor:"pointer"}}>
                  Remover ativo
                </button>
              </div>
            )}
          </Card>
        );
      })}
      {!month.investimentos.length&&(
        <div style={{textAlign:"center",padding:"20px 0",color:"#94a3b8",fontSize:12}}>Nenhum ativo cadastrado ainda</div>
      )}

      {importMsg&&(
        <div style={{padding:"8px 12px",borderRadius:10,background:importMsg.ok?"rgba(74,222,128,.08)":"rgba(239,68,68,.08)",fontSize:12,color:importMsg.ok?"#15803d":"#dc2626",border:`1px solid ${importMsg.ok?"rgba(74,222,128,.2)":"rgba(239,68,68,.2)"}`}}>
          {importMsg.txt}
        </div>
      )}

      {showImport&&(
        <Card style={{borderColor:"rgba(15,23,42,.1)"}}>
          <div style={{fontSize:12,color:"#64748b",fontWeight:600,marginBottom:8}}>Importar carteira via JSON</div>
          <div style={{fontSize:11,color:"#64748b",marginBottom:8,lineHeight:1.6}}>
            Cole a fotografia da carteira: {`[{"produto":"...","tipo":"Renda Fixa","atual":0}, ...]`}. Aportes e resgates são registrados separadamente.
          </div>
          <textarea value={importJson} onChange={e=>setImportJson(e.target.value)}
            placeholder='[{"produto":"CDB PICPAY","tipo":"Renda Fixa","atual":6055.77}]'
            style={{width:"100%",minHeight:100,background:"#f8fafc",border:"1px solid rgba(15,23,42,.1)",borderRadius:10,padding:10,color:"#172033",fontSize:10,outline:"none",resize:"vertical",fontFamily:"'IBM Plex Mono',monospace",lineHeight:1.5}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
            <button onClick={()=>{setShowImport(false);setImportJson("");}} style={{padding:"10px",borderRadius:10,border:"1px solid rgba(15,23,42,.08)",background:"transparent",color:"#64748b",fontSize:13,cursor:"pointer"}}>Cancelar</button>
            <button onClick={doImportInvest} style={{padding:"10px",borderRadius:10,border:"none",background:"#64748b",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>Importar</button>
          </div>
        </Card>
      )}

      {showAdd?(
        <Card style={{borderColor:"rgba(167,139,250,.2)"}}>
          <div style={{fontSize:12,color:"#6d28d9",fontWeight:600,marginBottom:10}}>+ Novo ativo</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <Inp label="Nome do ativo" value={nova.produto} onChange={v=>setNova({...nova,produto:v})} placeholder="Ex: Tesouro Selic 2029"/>
            <Sel label="Tipo" value={nova.tipo} onChange={v=>setNova({...nova,tipo:v})} options={TIPOS_INVEST}/>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:8}}>
              <Inp label="Saldo em 01 do mês" type="number" value={nova.atual} onChange={v=>setNova({...nova,atual:v})} placeholder="0,00"/>
              <Inp label="Aportes no mês" type="number" value={nova.aporte} onChange={v=>setNova({...nova,aporte:v})} placeholder="0,00"/>
              <Inp label="Resgates no mês" type="number" value={nova.resgate} onChange={v=>setNova({...nova,resgate:v})} placeholder="0,00"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:4}}>
              <Btn outline color="#64748b" onClick={()=>setShowAdd(false)}>Cancelar</Btn>
              <Btn color="#6d28d9" onClick={addInv}>Adicionar</Btn>
            </div>
          </div>
        </Card>
      ):(
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setShowAdd(true)} style={{flex:1,padding:"12px",borderRadius:12,border:"1px dashed rgba(167,139,250,.3)",background:"transparent",color:"#6d28d9",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            + Adicionar ativo
          </button>
          <button onClick={()=>setShowImport(true)} style={{padding:"12px 16px",borderRadius:12,border:"1px solid rgba(15,23,42,.1)",background:"transparent",color:"#64748b",fontSize:13,fontWeight:600,cursor:"pointer"}}>
            📋 JSON
          </button>
        </div>
      )}
      <div style={{fontSize:10,color:"#94a3b8",textAlign:"center"}}>A fotografia é o saldo no primeiro dia do mês. Ela não conta como despesa; somente aportes reduzem o saldo livre.</div>
    </div>
  );
}


function AnáliseView({month, mesKey, setMonth}) {
  const [catSel, setCatSel] = useState(null);
  const [visao, setVisao] = useState("mes"); // "mes" | "anual"
  const [allMonths, setAllMonths] = useState({});
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [catAnual, setCatAnual] = useState(null);

  const CORES_CAT = {
    "Mercado":"#15803d","Comer fora":"#c2410c","Delivery":"#fb923c",
    "Carro":"#94a3b8","Uber":"#64748b","Farmácia":"#dc2626",
    "Empresa":"#4f46e5","Casa":"#6d28d9","Apps":"#0e7490",
    "Lazer":"#b45309","Compras":"#e879f9","Pet":"#86efac",
    "Família/Presentes":"#f9a8d4","Impostos":"#6b7280",
    "Educação":"#34d399","Viagem":"#38bdf8","Outro":"#475569","Saúde":"#15803d",
  };

  const TAGS = [
    {id:"indispensavel", label:"✓ Indispensável", color:"#15803d", bg:"rgba(74,222,128,.12)"},
    {id:"evitavel",      label:"✗ Evitável",      color:"#dc2626", bg:"rgba(239,68,68,.12)"},
    {id:"indefinido",    label:"? Indefinido",    color:"#b45309", bg:"rgba(251,191,36,.12)"},
  ];

  useEffect(()=>{
    const [y,m] = mesKey.split("-").map(Number);
    const keys = [];
    for(let i=0;i<12;i++){
      const d = new Date(y, m-1-i, 1);
      keys.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
    }
    Promise.all(keys.map(k=>load(`month:${k}`).then(d=>({k,d})))).then(results=>{
      const map = {};
      results.forEach(({k,d})=>{ if(d) map[k]=d; });
      map[mesKey] = month;
      setAllMonths(map);
      setLoadingHistory(false);
    });
  },[mesKey]);

  // Atualiza tag de um lançamento
  const setTag = (lancId, tag) => {
    const novoCartoes = {};
    for(const [k,arr] of Object.entries(month.cartoes||{})) {
      novoCartoes[k] = arr.map(t => t.id===lancId ? {...t, tag} : t);
    }
    const novasVar = (month.variaveis||[]).map(t => t.id===lancId ? {...t, tag} : t);
    setMonth({...month, cartoes:novoCartoes, variaveis:novasVar});
  };

  const todosAtual = [
    ...Object.values(month.cartoes||{}).flat(),
    ...(month.variaveis||[]),
  ];
  const catTotaisAtual = {};
  todosAtual.forEach(t=>{ catTotaisAtual[t.cat]=(catTotaisAtual[t.cat]||0)+Number(t.valor||0); });
  const sortedAtual = Object.entries(catTotaisAtual).sort((a,b)=>b[1]-a[1]);
  const grandTotal = sortedAtual.reduce((s,[,v])=>s+v, 0);

  const fixT  = (month.fixas||[]).reduce((s,f)=>s+Number(f.valor||0),0);
  const carT  = Object.values(month.cartoes||{}).flat().reduce((s,t)=>s+Number(t.valor||0),0);
  const varT  = (month.variaveis||[]).reduce((s,p)=>s+Number(p.valor||0),0);
  const recT  = (month.plantoes||[]).filter(p=>p.ativo!==false).reduce((s,p)=>s+(p.horas*p.valorH),0)
              + totalReceitasFixas(month)
              + (month.receitasExtra||[]).reduce((s,r)=>s+Number(r.valor||0),0);
  const totalDesp = fixT+carT+varT;
  const saldo = recT - totalDesp;

  // Economia potencial (evitáveis)
  const evitavel = todosAtual.filter(t=>t.tag==="evitavel").reduce((s,t)=>s+Number(t.valor||0),0);
  const semTag = todosAtual.filter(t=>!t.tag).length;

  // Lançamentos da categoria selecionada
  const lancCatSel = catSel ? todosAtual.filter(t=>t.cat===catSel).sort((a,b)=>Number(b.valor||0)-Number(a.valor||0)) : [];

  // Anual
  const mesesOrdenados = Object.keys(allMonths).sort();
  const mesesLabel2 = mesesOrdenados.map(k=>{
    const [y,m]=k.split("-");
    return `${MESES[+m-1]}/${String(y).slice(-2)}`;
  });
  const getRecT = md => {
    if(!md) return 0;
    return (md.plantoes||[]).filter(p=>p.ativo!==false).reduce((s,p)=>s+(p.horas*p.valorH),0)
      + totalReceitasFixas(md)
      + (md.receitasExtra||[]).reduce((s,r)=>s+Number(r.valor||0),0);
  };
  const getDespT = md => {
    if(!md) return 0;
    return (md.fixas||[]).reduce((s,f)=>s+Number(f.valor||0),0)
      + Object.values(md.cartoes||{}).flat().reduce((s,t)=>s+Number(t.valor||0),0)
      + (md.variaveis||[]).reduce((s,p)=>s+Number(p.valor||0),0);
  };
  const receitasMeses = mesesOrdenados.map(k=>getRecT(allMonths[k]));
  const despesasMeses = mesesOrdenados.map(k=>getDespT(allMonths[k]));
  const saldosMeses   = mesesOrdenados.map((k,i)=>receitasMeses[i]-despesasMeses[i]);
  const maxBar = Math.max(...receitasMeses,...despesasMeses,1);

  const todasCatsAnual = new Set();
  Object.values(allMonths).forEach(md=>{
    [...Object.values(md?.cartoes||{}).flat(),...(md?.variaveis||[])].forEach(t=>{ if(t.cat) todasCatsAnual.add(t.cat); });
  });
  const catDados = catAnual ? mesesOrdenados.map(k=>{
    const md=allMonths[k]; if(!md) return 0;
    return [...Object.values(md.cartoes||{}).flat(),...(md.variaveis||[])].filter(t=>t.cat===catAnual).reduce((s,t)=>s+Number(t.valor||0),0);
  }) : [];
  const maxCat = Math.max(...catDados,1);

  const mesLabelAtual = mesLabel(mesKey);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>

      {/* Toggle Mês / Anual */}
      <div style={{display:"flex",gap:4,background:"rgba(15,23,42,.04)",borderRadius:12,padding:4}}>
        {[["mes","📅 Mês"],["anual","📊 Anual"]].map(([v,l])=>(
          <button key={v} onClick={()=>setVisao(v)} style={{
            flex:1,padding:"8px",borderRadius:9,border:"none",
            background:visao===v?"rgba(124,106,247,.3)":"transparent",
            color:visao===v?"#5b58d6":"#7c8799",fontSize:13,fontWeight:600,cursor:"pointer"
          }}>{l}</button>
        ))}
      </div>

      {visao==="mes"&&<>
        {/* Balanço */}
        <Card style={{padding:"12px"}}>
          <div style={{fontSize:10,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:.8,marginBottom:10}}>
            Balanço — {mesLabelAtual}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:10}}>
            {[["Receita",recT,"#15803d"],["Despesas",totalDesp,"#dc2626"],["Saldo",saldo,saldo>=0?"#15803d":"#dc2626"]].map(([l,v,cor])=>(
              <div key={l} style={{textAlign:"center",background:"rgba(15,23,42,.03)",borderRadius:10,padding:"8px 4px"}}>
                <div style={{fontSize:9,color:"#7c8799",textTransform:"uppercase",letterSpacing:.6}}>{l}</div>
                <div className="mono" style={{fontSize:13,fontWeight:600,color:cor,marginTop:3}}>{fmtBRL(v)}</div>
              </div>
            ))}
          </div>
          {recT>0&&(
            <>
              <div style={{height:5,borderRadius:3,background:"rgba(15,23,42,.06)",overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.min(totalDesp/recT*100,100)}%`,background:saldo>=0?"#c2410c":"#dc2626",borderRadius:3}}/>
              </div>
              <div style={{fontSize:10,color:"#7c8799",marginTop:4,textAlign:"right"}}>
                {(totalDesp/recT*100).toFixed(0)}% da receita comprometida
              </div>
            </>
          )}
        </Card>

        {/* Economia potencial */}
        {(evitavel>0||semTag>0)&&(
          <Card style={{borderColor:"rgba(251,191,36,.2)"}}>
            <div style={{fontSize:10,color:"#b45309",fontWeight:600,textTransform:"uppercase",letterSpacing:.8,marginBottom:8}}>
              💡 Análise de gastos
            </div>
            {evitavel>0&&(
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <span style={{fontSize:12,color:"#64748b"}}>Gastos evitáveis</span>
                <span className="mono" style={{fontSize:14,color:"#dc2626",fontWeight:700}}>{fmtBRL(evitavel)}</span>
              </div>
            )}
            {semTag>0&&(
              <div style={{fontSize:11,color:"#64748b"}}>
                {semTag} lançamento(s) ainda sem classificação — toque numa categoria abaixo para classificar
              </div>
            )}
            {evitavel>0&&recT>0&&(
              <div style={{marginTop:6,padding:"6px 10px",background:"rgba(74,222,128,.06)",borderRadius:8,fontSize:11,color:"#15803d"}}>
                Sem os gastos evitáveis, seu saldo seria {fmtBRL(saldo+evitavel)}
              </div>
            )}
          </Card>
        )}

        {/* Categorias */}
        {sortedAtual.length>0&&(
          <Card>
            <div style={{fontSize:10,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:.8,marginBottom:14}}>
              Gastos por categoria — {mesLabelAtual}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {sortedAtual.map(([cat,val])=>{
                const pct = grandTotal>0?(val/grandTotal*100):0;
                const cor = CORES_CAT[cat]||"#5b58d6";
                const isSelected = catSel===cat;
                return (
                  <div key={cat} onClick={()=>setCatSel(isSelected?null:cat)}
                    style={{cursor:"pointer",padding:"6px 8px",borderRadius:10,
                      background:isSelected?`${cor}14`:"transparent",
                      border:isSelected?`1px solid ${cor}33`:"1px solid transparent",
                      transition:"all .2s"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                      <div style={{display:"flex",alignItems:"center",gap:7}}>
                        <div style={{width:9,height:9,borderRadius:3,background:cor,flexShrink:0}}/>
                        <span style={{fontSize:12,color:isSelected?cor:"#334155",fontWeight:isSelected?600:400}}>{cat}</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:10,color:"#7c8799"}}>{pct.toFixed(1)}%</span>
                        <span className="mono" style={{fontSize:12,color:cor,fontWeight:600,minWidth:72,textAlign:"right"}}>{fmtBRL(val)}</span>
                      </div>
                    </div>
                    <div style={{height:5,background:"rgba(15,23,42,.05)",borderRadius:3,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${pct}%`,background:cor,borderRadius:3,transition:"width .5s"}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Lista de lançamentos da categoria selecionada */}
        {catSel&&lancCatSel.length>0&&(
          <Card style={{borderColor:`${CORES_CAT[catSel]||"#5b58d6"}33`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:11,color:CORES_CAT[catSel]||"#5b58d6",fontWeight:600,textTransform:"uppercase",letterSpacing:.6}}>
                {catSel}
              </div>
              <span className="mono" style={{fontSize:12,color:CORES_CAT[catSel]||"#5b58d6",fontWeight:700}}>
                {fmtBRL(lancCatSel.reduce((s,t)=>s+Number(t.valor||0),0))}
              </span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {lancCatSel.map((t,i)=>{
                const tagAtual = TAGS.find(tg=>tg.id===t.tag);
                return (
                  <div key={t.id||i} style={{padding:"8px 10px",background:"rgba(15,23,42,.03)",borderRadius:10,
                    borderLeft:`3px solid ${tagAtual?.color||"rgba(15,23,42,.1)"}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,color:"#172033",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.desc}</div>
                        <div style={{fontSize:10,color:"#7c8799",marginTop:2}}>{t.data}{t.parcela?` · ${t.parcela}`:""}</div>
                      </div>
                      <span className="mono" style={{fontSize:13,color:"#dc2626",fontWeight:600,marginLeft:8,flexShrink:0}}>{fmtBRL(t.valor)}</span>
                    </div>
                    {/* Tags */}
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                      {TAGS.map(tg=>(
                        <button key={tg.id} onClick={e=>{e.stopPropagation();setTag(t.id, t.tag===tg.id?null:tg.id);}}
                          style={{padding:"3px 8px",borderRadius:8,border:`1px solid ${t.tag===tg.id?tg.color:"rgba(15,23,42,.08)"}`,
                            background:t.tag===tg.id?tg.bg:"transparent",
                            color:t.tag===tg.id?tg.color:"#7c8799",fontSize:10,fontWeight:600,cursor:"pointer"}}>
                          {tg.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Top gastos */}
        {todosAtual.length>0&&(
          <Card>
            <div style={{fontSize:10,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:.8,marginBottom:10}}>
              Maiores gastos — {mesLabelAtual}
            </div>
            {[...todosAtual].sort((a,b)=>Number(b.valor||0)-Number(a.valor||0)).slice(0,8).map((t,i)=>{
              const tagAtual = TAGS.find(tg=>tg.id===t.tag);
              return (
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                  padding:"7px 0",borderBottom:"1px solid rgba(15,23,42,.04)"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,color:"#172033",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.desc}</div>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginTop:2}}>
                      <div style={{width:6,height:6,borderRadius:2,background:CORES_CAT[t.cat]||"#64748b",flexShrink:0}}/>
                      <span style={{fontSize:10,color:"#7c8799"}}>{t.cat}</span>
                      {tagAtual&&<span style={{fontSize:9,color:tagAtual.color,background:tagAtual.bg,padding:"1px 5px",borderRadius:4}}>{tagAtual.label}</span>}
                    </div>
                  </div>
                  <span className="mono" style={{fontSize:13,color:"#dc2626",fontWeight:500,marginLeft:8,flexShrink:0}}>{fmtBRL(t.valor)}</span>
                </div>
              );
            })}
          </Card>
        )}
      </>}

      {visao==="anual"&&<>
        {/* Receita vs Despesa */}
        <Card>
          <div style={{fontSize:10,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:.8,marginBottom:14}}>
            Receita vs Despesa — 12 meses
          </div>
          {loadingHistory?(
            <div style={{textAlign:"center",padding:"20px 0",color:"#94a3b8",fontSize:12}}>Carregando…</div>
          ):(
            <>
              <div style={{display:"flex",alignItems:"flex-end",gap:4,height:120}}>
                {mesesOrdenados.map((k,i)=>{
                  const rec=receitasMeses[i], desp=despesasMeses[i];
                  const isCur=k===mesKey;
                  return (
                    <div key={k} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                      <div style={{width:"100%",display:"flex",gap:1,alignItems:"flex-end",height:100}}>
                        <div style={{flex:1,background:"#15803d88",borderRadius:"3px 3px 0 0",height:`${rec/maxBar*100}%`,minHeight:rec>0?2:0}}/>
                        <div style={{flex:1,background:"#dc262688",borderRadius:"3px 3px 0 0",height:`${desp/maxBar*100}%`,minHeight:desp>0?2:0}}/>
                      </div>
                      <span style={{fontSize:8,color:isCur?"#172033":"#7c8799",fontWeight:isCur?700:400}}>{mesesLabel2[i]}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{display:"flex",gap:12,marginTop:8,justifyContent:"center"}}>
                {[["#15803d","Receita"],["#dc2626","Despesa"]].map(([cor,l])=>(
                  <div key={l} style={{display:"flex",alignItems:"center",gap:4}}>
                    <div style={{width:8,height:8,borderRadius:2,background:cor}}/>
                    <span style={{fontSize:10,color:"#64748b"}}>{l}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* Saldo mensal */}
        <Card>
          <div style={{fontSize:10,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:.8,marginBottom:12}}>
            Saldo mensal
          </div>
          {mesesOrdenados.map((k,i)=>{
            const saldoM=saldosMeses[i];
            const isCur=k===mesKey;
            return (
              <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                padding:"6px 10px",borderRadius:8,marginBottom:4,
                background:isCur?"rgba(15,23,42,.05)":"transparent",
                border:isCur?"1px solid rgba(15,23,42,.08)":"1px solid transparent"}}>
                <span style={{fontSize:12,color:isCur?"#172033":"#64748b",fontWeight:isCur?600:400}}>{mesesLabel2[i]}</span>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span className="mono" style={{fontSize:10,color:"#64748b"}}>{fmtBRL(receitasMeses[i])}</span>
                  <span style={{fontSize:10,color:"#94a3b8"}}>–</span>
                  <span className="mono" style={{fontSize:10,color:"#64748b"}}>{fmtBRL(despesasMeses[i])}</span>
                  <span style={{fontSize:10,color:"#94a3b8"}}>=</span>
                  <span className="mono" style={{fontSize:12,color:saldoM>=0?"#15803d":"#dc2626",fontWeight:600}}>{fmtBRL(saldoM)}</span>
                </div>
              </div>
            );
          })}
        </Card>

        {/* Categoria por mês */}
        <Card>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:10,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:.8}}>
              Categoria por mês
            </div>
            <select value={catAnual||""} onChange={e=>setCatAnual(e.target.value||null)}
              style={{background:"rgba(15,23,42,.07)",border:"1px solid rgba(15,23,42,.12)",borderRadius:8,
                padding:"5px 10px",color:"#5b58d6",fontSize:11,fontWeight:600,outline:"none",cursor:"pointer"}}>
              <option value="">Selecionar</option>
              {Array.from(todasCatsAnual).sort().map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {catAnual&&(
            <>
              <div style={{display:"flex",alignItems:"flex-end",gap:4,height:110}}>
                {mesesOrdenados.map((k,i)=>{
                  const val=catDados[i];
                  const isCur=k===mesKey;
                  const cor=CORES_CAT[catAnual]||"#5b58d6";
                  return (
                    <div key={k} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                      {val>0&&<span className="mono" style={{fontSize:7,color:cor}}>{val>=1000?`${(val/1000).toFixed(1)}k`:val.toFixed(0)}</span>}
                      <div style={{width:"100%",height:80,display:"flex",alignItems:"flex-end"}}>
                        <div style={{width:"100%",background:isCur?cor:`${cor}66`,borderRadius:"3px 3px 0 0",
                          height:`${val/maxCat*100}%`,minHeight:val>0?2:0}}/>
                      </div>
                      <span style={{fontSize:8,color:isCur?"#172033":"#7c8799",fontWeight:isCur?700:400}}>{mesesLabel2[i]}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{marginTop:10,padding:"8px 10px",background:"rgba(15,23,42,.03)",borderRadius:8,display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:11,color:"#64748b"}}>{catAnual} — média</span>
                <span className="mono" style={{fontSize:12,color:CORES_CAT[catAnual]||"#5b58d6",fontWeight:600}}>
                  {fmtBRL(catDados.filter(v=>v>0).reduce((s,v,_,a)=>s+v/a.length,0))}
                </span>
              </div>
            </>
          )}
          {!catAnual&&<div style={{textAlign:"center",padding:"20px 0",color:"#94a3b8",fontSize:12}}>Selecione uma categoria</div>}
        </Card>

        {/* Ranking */}
        <Card>
          <div style={{fontSize:10,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:.8,marginBottom:12}}>
            Total por categoria — período
          </div>
          {Array.from(todasCatsAnual).sort().map(cat=>{
            const total=mesesOrdenados.reduce((s,k)=>{
              const md=allMonths[k]; if(!md) return s;
              return s+[...Object.values(md.cartoes||{}).flat(),...(md.variaveis||[])].filter(t=>t.cat===cat).reduce((ss,t)=>ss+Number(t.valor||0),0);
            },0);
            const cor=CORES_CAT[cat]||"#5b58d6";
            const maxTotal=Math.max(...Array.from(todasCatsAnual).map(c=>mesesOrdenados.reduce((s,k)=>{
              const md=allMonths[k]; if(!md) return s;
              return s+[...Object.values(md.cartoes||{}).flat(),...(md.variaveis||[])].filter(t=>t.cat===c).reduce((ss,t)=>ss+Number(t.valor||0),0);
            },0)),1);
            return (
              <div key={cat} style={{marginBottom:10,cursor:"pointer"}} onClick={()=>{setCatAnual(cat===catAnual?null:cat);}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:8,height:8,borderRadius:2,background:cor,flexShrink:0}}/>
                    <span style={{fontSize:12,color:catAnual===cat?cor:"#334155",fontWeight:catAnual===cat?600:400}}>{cat}</span>
                  </div>
                  <span className="mono" style={{fontSize:11,color:cor}}>{fmtBRL(total)}</span>
                </div>
                <div style={{height:3,background:"rgba(15,23,42,.05)",borderRadius:2}}>
                  <div style={{height:"100%",width:`${total/maxTotal*100}%`,background:cor,borderRadius:2}}/>
                </div>
              </div>
            );
          })}
        </Card>
      </>}

    </div>
  );
}

function ConfigView({cats,setCats,locaisConfig,setLocaisConfig,fixasConfig,setFixasConfig,receitasFixasConfig,setReceitasFixasConfig}) {
  const [nova,setNova]=useState("");
  const [editIdx,setEditIdx]=useState(null);
  const [editVal,setEditVal]=useState("");
  const [novoLocal,setNovoLocal]=useState(null);
  const [novaFixa,setNovaFixa]=useState(null);
  const [novaReceita,setNovaReceita]=useState(null);

  const addCat=()=>{
    if(!nova.trim()||cats.includes(nova.trim())) return;
    const updated=[...cats,nova.trim()];
    setCats(updated);
    save("config:cats",updated);
    setNova("");
  };
  const removeCat=(cat)=>{
    const updated=cats.filter(c=>c!==cat);
    setCats(updated);
    save("config:cats",updated);
  };
  const saveEdit=(idx)=>{
    if(!editVal.trim()) return;
    const updated=cats.map((c,i)=>i===idx?editVal.trim():c);
    setCats(updated);
    save("config:cats",updated);
    setEditIdx(null);
  };
  const updateLocal=(id,campo,valor)=>setLocaisConfig(locaisConfig.map(l=>l.id===id?{...l,[campo]:["valorH","diaReceb","inicioDia","inicioMes","fimDia","fimMes"].includes(campo)?Number(valor)||0:valor}:l));
  const addAgendaLocal=()=>{
    if(!novoLocal?.nome?.trim()) return;
    setLocaisConfig([...locaisConfig,makeLocalConfig(novoLocal.nome.trim(),novoLocal)]);
    setNovoLocal(null);
  };
  const removeAgendaLocal=id=>setLocaisConfig(locaisConfig.filter(l=>l.id!==id));
  const updateFixa=(id,campo,valor)=>setFixasConfig(fixasConfig.map(f=>f.id===id?{...f,[campo]:campo==="valor"?Number(valor)||0:valor}:f));
  const addFixaConfig=()=>{
    if(!novaFixa?.nome?.trim()) return;
    setFixasConfig([...fixasConfig,{...novaFixa,id:`fixa-${Date.now()}`,nome:novaFixa.nome.trim(),valor:Number(novaFixa.valor)||0,ativo:true,duracao:"sempre"}]);
    setNovaFixa(null);
  };
  const updateReceita=(id,campo,valor)=>setReceitasFixasConfig(receitasFixasConfig.map(r=>r.id===id?{...r,[campo]:["valor","dia"].includes(campo)?Number(valor)||0:valor}:r));
  const addReceitaConfig=()=>{
    if(!novaReceita?.nome?.trim()) return;
    setReceitasFixasConfig([...receitasFixasConfig,{...novaReceita,id:`receita-${Date.now()}`,nome:novaReceita.nome.trim(),valor:Number(novaReceita.valor)||0,dia:Number(novaReceita.dia)||0,icone:"💵",ativo:true}]);
    setNovaReceita(null);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <Card>
        <div style={{fontSize:10,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:.8,marginBottom:4}}>Receitas fixas mensais</div>
        <div style={{fontSize:11,color:"#7c8799",lineHeight:1.6,marginBottom:12}}>Estes valores entram automaticamente em cada mês novo. Na aba Receita, você ainda pode ajustar somente o mês selecionado.</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {receitasFixasConfig.map(r=><div key={r.id} style={{padding:12,borderRadius:12,background:"rgba(21,128,61,.035)",border:"1px solid rgba(21,128,61,.12)",opacity:r.ativo===false?.55:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <span style={{fontSize:18}}>{r.icone||"💵"}</span>
              <input value={r.nome} onChange={e=>updateReceita(r.id,"nome",e.target.value)} aria-label="Nome da receita fixa" style={{flex:1,background:"transparent",border:"none",borderBottom:"1px solid rgba(15,23,42,.1)",padding:"5px 2px",color:"#172033",fontSize:13,fontWeight:600,outline:"none"}}/>
              <button onClick={()=>updateReceita(r.id,"ativo",r.ativo===false)} style={{background:"transparent",border:"1px solid rgba(15,23,42,.08)",borderRadius:7,padding:"4px 8px",color:r.ativo===false?"#15803d":"#64748b",fontSize:10,cursor:"pointer"}}>{r.ativo===false?"Ativar":"Pausar"}</button>
              <button onClick={()=>setReceitasFixasConfig(receitasFixasConfig.filter(x=>x.id!==r.id))} aria-label={`Excluir ${r.nome}`} style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.15)",borderRadius:7,padding:"4px 8px",color:"#dc2626",fontSize:10,cursor:"pointer"}}>✕</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:8}}><Inp label="Valor padrão (R$)" type="number" value={r.valor||""} onChange={v=>updateReceita(r.id,"valor",v)}/><Inp label="Dia receb." type="number" value={r.dia||""} onChange={v=>updateReceita(r.id,"dia",v)}/></div>
          </div>)}
        </div>
        {novaReceita?<div style={{marginTop:10,padding:12,border:"1px solid rgba(21,128,61,.2)",borderRadius:12}}><Inp label="Nome" value={novaReceita.nome||""} onChange={v=>setNovaReceita({...novaReceita,nome:v})}/><div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:8,marginTop:8}}><Inp label="Valor padrão (R$)" type="number" value={novaReceita.valor||""} onChange={v=>setNovaReceita({...novaReceita,valor:v})}/><Inp label="Dia receb." type="number" value={novaReceita.dia||""} onChange={v=>setNovaReceita({...novaReceita,dia:v})}/></div><div style={{display:"flex",gap:8,marginTop:10}}><Btn outline color="#64748b" onClick={()=>setNovaReceita(null)}>Cancelar</Btn><Btn color="#15803d" onClick={addReceitaConfig}>Adicionar</Btn></div></div>:<button onClick={()=>setNovaReceita({nome:"",valor:"",dia:5})} style={{marginTop:12,width:"100%",padding:10,borderRadius:10,border:"1px dashed rgba(21,128,61,.3)",background:"transparent",color:"#15803d",cursor:"pointer"}}>+ Adicionar receita fixa</button>}
      </Card>
      <Card>
        <div style={{fontSize:10,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:.8,marginBottom:4}}>Despesas fixas recorrentes</div>
        <div style={{fontSize:11,color:"#7c8799",lineHeight:1.6,marginBottom:12}}>Edite a lista que aparecerá no mês atual e nos próximos. Os meses antigos permanecem como estavam.</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {fixasConfig.map(f=><div key={f.id} style={{padding:12,borderRadius:12,background:"rgba(180,83,9,.025)",border:"1px solid rgba(180,83,9,.1)",opacity:f.ativo===false?.55:1}}>
            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:8}}><input value={f.nome} onChange={e=>updateFixa(f.id,"nome",e.target.value)} aria-label="Nome da despesa fixa" style={{flex:1,background:"transparent",border:"none",borderBottom:"1px solid rgba(15,23,42,.1)",padding:"5px 2px",color:"#172033",fontSize:13,fontWeight:600,outline:"none"}}/><button onClick={()=>updateFixa(f.id,"ativo",f.ativo===false)} style={{background:"transparent",border:"1px solid rgba(15,23,42,.08)",borderRadius:7,padding:"4px 8px",color:f.ativo===false?"#15803d":"#64748b",fontSize:10,cursor:"pointer"}}>{f.ativo===false?"Ativar":"Pausar"}</button><button onClick={()=>setFixasConfig(fixasConfig.filter(x=>x.id!==f.id))} aria-label={`Excluir ${f.nome}`} style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.15)",borderRadius:7,padding:"4px 8px",color:"#dc2626",fontSize:10,cursor:"pointer"}}>✕</button></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><Inp label="Vencimento" value={f.venc||""} onChange={v=>updateFixa(f.id,"venc",v)}/><Sel label="Categoria" value={f.cat||"Outro"} onChange={v=>updateFixa(f.id,"cat",v)} options={CATS}/></div>
            <div style={{marginTop:8}}><Inp label="Valor padrão opcional (R$)" type="number" value={f.valor||""} onChange={v=>updateFixa(f.id,"valor",v)} placeholder="Pode variar mês a mês"/></div>
          </div>)}
        </div>
        {novaFixa?<div style={{marginTop:10,padding:12,border:"1px solid rgba(180,83,9,.2)",borderRadius:12}}><Inp label="Nome" value={novaFixa.nome||""} onChange={v=>setNovaFixa({...novaFixa,nome:v})}/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}><Inp label="Vencimento" value={novaFixa.venc||""} onChange={v=>setNovaFixa({...novaFixa,venc:v})}/><Sel label="Categoria" value={novaFixa.cat||CATS[0]} onChange={v=>setNovaFixa({...novaFixa,cat:v})} options={CATS}/></div><div style={{marginTop:8}}><Inp label="Valor padrão (R$)" type="number" value={novaFixa.valor||""} onChange={v=>setNovaFixa({...novaFixa,valor:v})}/></div><div style={{display:"flex",gap:8,marginTop:10}}><Btn outline color="#64748b" onClick={()=>setNovaFixa(null)}>Cancelar</Btn><Btn color="#b45309" onClick={addFixaConfig}>Adicionar</Btn></div></div>:<button onClick={()=>setNovaFixa({nome:"",venc:"Dia 10",cat:CATS[0],valor:""})} style={{marginTop:12,width:"100%",padding:10,borderRadius:10,border:"1px dashed rgba(180,83,9,.3)",background:"transparent",color:"#b45309",cursor:"pointer"}}>+ Adicionar despesa fixa recorrente</button>}
      </Card>
      <Card>
        <div style={{fontSize:10,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:.8,marginBottom:12}}>
          Categorias de gastos
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {cats.map((cat,i)=>(
            <div key={cat} style={{display:"flex",alignItems:"center",gap:8}}>
              {editIdx===i?(
                <>
                  <input value={editVal} onChange={e=>setEditVal(e.target.value)}
                    style={{flex:1,background:"rgba(15,23,42,.06)",border:"1px solid rgba(124,106,247,.3)",borderRadius:8,padding:"6px 10px",color:"#172033",fontSize:13,outline:"none"}}/>
                  <button onClick={()=>saveEdit(i)} style={{background:"rgba(124,106,247,.2)",border:"1px solid rgba(124,106,247,.3)",borderRadius:7,padding:"5px 10px",color:"#5b58d6",fontSize:11,cursor:"pointer"}}>✓</button>
                  <button onClick={()=>setEditIdx(null)} style={{background:"transparent",border:"1px solid rgba(15,23,42,.08)",borderRadius:7,padding:"5px 10px",color:"#64748b",fontSize:11,cursor:"pointer"}}>✕</button>
                </>
              ):(
                <>
                  <span style={{flex:1,fontSize:13,color:"#172033"}}>{cat}</span>
                  <button onClick={()=>{setEditIdx(i);setEditVal(cat);}} style={{background:"rgba(15,23,42,.06)",border:"1px solid rgba(15,23,42,.08)",borderRadius:7,padding:"4px 9px",color:"#64748b",fontSize:11,cursor:"pointer"}}>✏</button>
                  <button onClick={()=>removeCat(cat)} style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.15)",borderRadius:7,padding:"4px 9px",color:"#dc2626",fontSize:11,cursor:"pointer"}}>✕</button>
                </>
              )}
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:8,marginTop:12}}>
          <input value={nova} onChange={e=>setNova(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&addCat()}
            placeholder="Nova categoria..."
            style={{flex:1,background:"rgba(15,23,42,.06)",border:"1px solid rgba(15,23,42,.08)",borderRadius:10,padding:"9px 12px",color:"#172033",fontSize:13,outline:"none"}}/>
          <button onClick={addCat} style={{background:"#5b58d6",border:"none",borderRadius:10,padding:"9px 14px",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>+</button>
        </div>
        <button onClick={()=>{setCats([...CATS_DEFAULT]);save("config:cats",[...CATS_DEFAULT]);}} style={{marginTop:8,background:"transparent",border:"1px solid rgba(15,23,42,.06)",borderRadius:8,padding:"6px",color:"#94a3b8",fontSize:11,cursor:"pointer",width:"100%"}}>
          Restaurar categorias padrão
        </button>
      </Card>
      <Card>
        <div style={{fontSize:10,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:.8,marginBottom:4}}>Google Agenda · locais de plantão</div>
        <div style={{fontSize:11,color:"#7c8799",lineHeight:1.6,marginBottom:12}}>Defina o texto procurado no título do evento e o período que compõe o recebimento do mês selecionado. Mês 0 é o próprio mês; −1 é o anterior.</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {locaisConfig.map(l=>(
            <div key={l.id} style={{padding:12,borderRadius:12,background:"rgba(15,23,42,.025)",border:"1px solid rgba(15,23,42,.07)",opacity:l.ativo===false?.55:1}}>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:9}}>
                <span style={{flex:1,color:"#5b58d6",fontSize:14,fontWeight:600}}>{l.nome}</span>
                <button onClick={()=>updateLocal(l.id,"ativo",l.ativo===false)} style={{background:"transparent",border:"1px solid rgba(15,23,42,.08)",borderRadius:7,padding:"4px 8px",color:l.ativo===false?"#15803d":"#64748b",fontSize:10,cursor:"pointer"}}>{l.ativo===false?"Ativar":"Pausar"}</button>
                <button onClick={()=>removeAgendaLocal(l.id)} style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.15)",borderRadius:7,padding:"4px 8px",color:"#dc2626",fontSize:10,cursor:"pointer"}}>✕</button>
              </div>
              <Inp label="Texto buscado no evento" value={l.busca} onChange={v=>updateLocal(l.id,"busca",v)} placeholder="Ex: Leonor"/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
                <Inp label="Valor/h (R$)" type="number" value={l.valorH||""} onChange={v=>updateLocal(l.id,"valorH",v)} placeholder="0"/>
                <Inp label="Dia receb." type="number" value={l.diaReceb||""} onChange={v=>updateLocal(l.id,"diaReceb",v)} placeholder="0"/>
              </div>
              <div style={{fontSize:10,color:"#64748b",margin:"10px 0 6px"}}>Competência do recebimento</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}><Inp label="Início · dia" type="number" value={l.inicioDia} onChange={v=>updateLocal(l.id,"inicioDia",v)}/><Inp label="Mês" type="number" value={l.inicioMes} onChange={v=>updateLocal(l.id,"inicioMes",v)}/></div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}><Inp label="Fim · dia" type="number" value={l.fimDia} onChange={v=>updateLocal(l.id,"fimDia",v)}/><Inp label="Mês" type="number" value={l.fimMes} onChange={v=>updateLocal(l.id,"fimMes",v)}/></div>
              </div>
            </div>
          ))}
        </div>
        {novoLocal?(
          <div style={{marginTop:10,padding:12,border:"1px solid rgba(124,106,247,.25)",borderRadius:12}}>
            <Inp label="Nome do local" value={novoLocal.nome||""} onChange={v=>setNovoLocal({...novoLocal,nome:v,busca:novoLocal.busca||v})}/>
            <div style={{marginTop:8}}><Inp label="Texto buscado no evento" value={novoLocal.busca||""} onChange={v=>setNovoLocal({...novoLocal,busca:v})}/></div>
            <div style={{display:"flex",gap:8,marginTop:10}}><Btn outline color="#64748b" onClick={()=>setNovoLocal(null)}>Cancelar</Btn><Btn color="#5b58d6" onClick={addAgendaLocal}>Adicionar</Btn></div>
          </div>
        ):<button onClick={()=>setNovoLocal({nome:"",busca:"",inicioDia:1,inicioMes:0,fimDia:31,fimMes:0})} style={{marginTop:12,width:"100%",padding:10,borderRadius:10,border:"1px dashed rgba(124,106,247,.3)",background:"transparent",color:"#5b58d6",cursor:"pointer"}}>+ Adicionar local</button>}
      </Card>
    </div>
  );
}


const NAV=[{id:"dashboard",label:"Início"},{id:"plantoes",label:"Receita"},{id:"fixas",label:"Fixas"},{id:"cartoes",label:"Cartões"},{id:"variaveis",label:"Variáveis"},{id:"investimentos",label:"Invest."},{id:"analise",label:"Análise"},{id:"config",label:"Config"}];

export default function App() {
  const [mesKey,setMesKeyRaw]=useState(curMes());
  const [month,setMonthRaw]=useState(null);
  const [view,setView]=useState("dashboard");
  const [saving,setSaving]=useState(false);
  const [gdriveStatus,setGdriveStatus]=useState("idle");
  const [cats,setCatsState]=useState(CATS_DEFAULT);
  const [locaisConfig,setLocaisConfigState]=useState(LOCAIS_DEFAULT_CONFIG);
  const [fixasConfig,setFixasConfigState]=useState(FIXAS_DEFAULT_CONFIG);
  const [receitasFixasConfig,setReceitasFixasConfigState]=useState(RECEITAS_FIXAS_DEFAULT_CONFIG);
  const [configReady,setConfigReady]=useState(false);
  const [configVersion,setConfigVersion]=useState(0);
  const autoAgendaRunning=useRef(false);
  const storageKey=`month:${mesKey}`;

  const setCats=(newCats)=>{ CATS=newCats; setCatsState(newCats); save("config:cats",newCats); setConfigVersion(v=>v+1); };
  const setLocaisConfig=(newConfig)=>{
    LOCAIS_CONFIG=newConfig;
    setLocaisConfigState(newConfig);
    save("config:agenda-locais",newConfig);
    setConfigVersion(v=>v+1);
    setMonthRaw(cur=>{
      if(!cur) return cur;
      const existentes=new Set((cur.plantoes||[]).map(p=>p.local));
      const faltantes=newConfig.filter(l=>l.ativo!==false&&!existentes.has(l.nome)).map(l=>({local:l.nome,n:0,horas:0,valorH:l.valorH,fromAgenda:false,ativo:true,diaReceb:l.diaReceb,statusReceb:"aguardando"}));
      return faltantes.length?{...cur,plantoes:[...(cur.plantoes||[]),...faltantes]}:cur;
    });
  };
  const setFixasConfig=(newConfig)=>{
    const previous=FIXAS_CONFIG;
    FIXAS_CONFIG=newConfig;
    setFixasConfigState(newConfig);
    save("config:fixas",newConfig);
    setConfigVersion(v=>v+1);
    setMonthRaw(cur=>{
      if(!cur||cur.key<curMes()) return cur;
      const extras=(cur.fixas||[]).filter(f=>f.extra);
      const recorrentes=newConfig.filter(f=>f.ativo!==false).map(t=>{
        const old=(cur.fixas||[]).find(f=>String(f.templateId??f.id)===String(t.id));
        const prev=previous.find(f=>String(f.id)===String(t.id));
        const mudouValor=Number(prev?.valor||0)!==Number(t.valor||0);
        return old?{...old,nome:t.nome,venc:t.venc,cat:t.cat,templateId:t.id,valor:old.status==="pago"&&Number(old.valor)>0?old.valor:mudouValor?Number(t.valor)||0:old.valor}:{...t,templateId:t.id,status:"pendente",forma:"",banco:"",dataPgto:"",valor:Number(t.valor)||0,extra:false,duracao:"sempre",mesesRestantes:null};
      });
      return {...cur,fixas:[...recorrentes,...extras]};
    });
  };
  const setReceitasFixasConfig=(newConfig)=>{
    const previous=RECEITAS_FIXAS_CONFIG;
    RECEITAS_FIXAS_CONFIG=newConfig;
    setReceitasFixasConfigState(newConfig);
    save("config:receitas-fixas",newConfig);
    setConfigVersion(v=>v+1);
    setMonthRaw(cur=>{
      if(!cur||cur.key<curMes()) return cur;
      const current=getReceitasFixas(cur);
      const receitasFixas=newConfig.filter(r=>r.ativo!==false).map(t=>{
        const old=current.find(r=>String(r.templateId??r.id)===String(t.id));
        const prev=previous.find(r=>String(r.id)===String(t.id));
        return {...t,templateId:t.id,status:old?.status||"aguardando",valor:Number(prev?.valor||0)!==Number(t.valor||0)?Number(t.valor)||0:Number(old?.valor??t.valor)||0,dia:Number(prev?.dia||0)!==Number(t.dia||0)?Number(t.dia)||0:Number(old?.dia??t.dia)||0};
      });
      return {...cur,receitasFixas};
    });
  };

  // Carrega o backup antes dos cadastros para manter configurações iguais em todos os dispositivos.
  useEffect(()=>{
    (async()=>{
      const hasLocal=Object.keys(localStorage).some(k=>k.startsWith("month:"));
      setGdriveStatus("connecting");
      try{
        const remoteData=await supabaseLoad();
        if(remoteData) {
          for(const [key,val] of Object.entries(remoteData)) {
            if(hasLocal&&!key.startsWith("config:")) continue;
            localStorage.setItem(key, typeof val==="string"?val:JSON.stringify(val));
          }
        }
      }catch{}
      const [catsSaved,agendaSaved,locaisLegado,fixasSaved,receitasSaved]=await Promise.all([load("config:cats"),load("config:agenda-locais"),load("config:locais"),load("config:fixas"),load("config:receitas-fixas")]);
      if(Array.isArray(catsSaved)&&catsSaved.length){CATS=catsSaved;setCatsState(catsSaved);}
      let agenda=agendaSaved;
      if(!Array.isArray(agenda)||!agenda.length) agenda=Array.isArray(locaisLegado)&&locaisLegado.length?locaisLegado.map(nome=>makeLocalConfig(nome)):LOCAIS_DEFAULT_CONFIG;
      agenda=agenda.map(l=>typeof l==="string"?makeLocalConfig(l):makeLocalConfig(l.nome,l));
      LOCAIS_CONFIG=agenda;setLocaisConfigState(agenda);
      if(Array.isArray(fixasSaved)){FIXAS_CONFIG=fixasSaved;setFixasConfigState(fixasSaved);}
      if(Array.isArray(receitasSaved)){RECEITAS_FIXAS_CONFIG=receitasSaved;setReceitasFixasConfigState(receitasSaved);}
      setGdriveStatus("idle");
      setConfigReady(true);
    })();
  },[]);

  useEffect(()=>{
    if(!configReady) return;
    setMonthRaw(null);
    load(storageKey).then(async d=>{
      if(!d){
        const seed=seedMonth(mesKey);
        // Continuidade: herda os nomes dos ativos, mas a fotografia do novo mês
        // precisa ser confirmada para não inventar rendimento.
        try{
          const prev=await load(`month:${prevMesKey(mesKey)}`);
          if(prev?.investimentos?.length) seed.investimentos=normalizeInvestimentos(prev.investimentos).map(i=>({...i,aporte:0,resgate:0}));
        }catch{}
        setMonthRaw(seed);
        return;
      }
      // Migrate: ensure all fields exist (handles old 'pix' format)
      const seed=seedMonth(mesKey);
      const migrated={
        ...seed,
        ...d,
        variaveis: d.variaveis||d.pix||[],
        cartoes: d.cartoes||seed.cartoes,
        plantoes:mergePlantoesConfig(d.plantoes||seed.plantoes),
        bolsaDia: d.bolsaDia||5,
        bolsaStatus: d.bolsaStatus||"aguardando",
        auxilioDia: d.auxilioDia||5,
        auxilioStatus: d.auxilioStatus||"aguardando",
        fixas: d.fixas||seed.fixas,
        receitasFixas:Array.isArray(d.receitasFixas)?d.receitasFixas:RECEITAS_FIXAS_CONFIG.filter(r=>r.ativo!==false).map(r=>({...r,templateId:r.id,status:r.id==="bolsa"?(d.bolsaStatus||"aguardando"):r.id==="auxilio"?(d.auxilioStatus||"aguardando"):"aguardando",valor:Number(r.id==="bolsa"&&d.bolsa||r.id==="auxilio"&&d.auxilio||r.valor)||0,dia:Number(r.id==="bolsa"&&d.bolsaDia||r.id==="auxilio"&&d.auxilioDia||r.dia)||0})),
        investimentos: normalizeInvestimentos(d.investimentos||seed.investimentos),
        investimentosFotoConfirmada: hasFotoInvestimentos(d),
        bolsa: d.bolsa||0,
        auxilio: d.auxilio||0,
        receitasExtra: d.receitasExtra||[],
      };
      setMonthRaw(migrated);
    });
    setView("dashboard");
  },[mesKey,configReady]);

  // Atualiza automaticamente o mês atual e os próximos cinco meses para manter
  // a previsão de receita viva. Meses encerrados nunca entram neste fluxo.
  useEffect(()=>{
    if(!configReady||!month||mesKey<curMes()||autoAgendaRunning.current) return;
    let cancelled=false;
    const run=async()=>{
      autoAgendaRunning.current=true;
      try{
        const base=curMes();
        const targets=mesKey===base
          ?Array.from({length:6},(_,i)=>addMonthsKey(base,i))
          :[mesKey];
        const configFingerprint=JSON.stringify(agendaRequestConfig(locaisConfig));
        let selectedUpdate=null;
        for(const key of targets){
          if(cancelled) break;
          let source;
          if(key===mesKey) source=month;
          else {
            try { source=JSON.parse(localStorage.getItem(`month:${key}`))||seedMonth(key); }
            catch { source=seedMonth(key); }
            source=migrateMonth(source,key);
          }
          const last=Date.parse(source?.agendaSincronizacao?.em||"");
          const fresh=Number.isFinite(last)&&Date.now()-last<6*60*60*1000;
          const sameConfig=source?.agendaSincronizacao?.config===configFingerprint;
          if(fresh&&sameConfig) continue;
          try{
            const result=await syncAgendaMonth(source,key,locaisConfig);
            localStorage.setItem(`month:${key}`,JSON.stringify(result.month));
            if(key===mesKey) selectedUpdate=result.month;
          }catch(e){
            console.warn(`Agenda auto-sync ${key} failed:`,e);
          }
        }
        if(!cancelled&&selectedUpdate) setMonthRaw(selectedUpdate);
        else if(!cancelled&&targets.length>1) setMonthRaw(cur=>cur?{...cur}:cur);
      }finally{
        autoAgendaRunning.current=false;
      }
    };
    run();
    return()=>{cancelled=true;};
  },[configReady,month?.key,mesKey,configVersion]);
useEffect(()=>{
    if(!month) return;
    setSaving(true);
    const t=setTimeout(async()=>{
      await save(storageKey,month);
      // Auto-sync to Supabase (debounced 3s) — com merge seguro pra não sobrescrever dados melhores no servidor
      try {
        const allKeys = Object.keys(localStorage).filter(k=>k.startsWith("month:")||k.startsWith("config:"));
        const localData = {};
        for(const key of allKeys) {
          try { localData[key] = JSON.parse(localStorage.getItem(key)); } catch {}
        }
        const remoteData = await supabaseLoad();
        const merged = { ...(remoteData||{}) };
        for(const [key, localVal] of Object.entries(localData)) {
          const remoteVal = merged[key];
          if(key.startsWith("config:")) {
            merged[key]=localVal;
          } else if(!remoteVal) {
            merged[key] = localVal;
          } else {
            merged[key] = countData(localVal) >= countData(remoteVal) ? localVal : remoteVal;
          }
        }
        await supabaseSave(merged);
      } catch(e) { console.warn("Auto-sync failed:", e); }
      setSaving(false);
    }, 3000);
    return()=>clearTimeout(t);
  },[month,configVersion]);

  const migrateMonth = (d, key) => {
    if(!d) return null;
    const seed = seedMonth(key);
    return {
      ...seed, ...d,
      variaveis: d.variaveis||d.pix||[],
      cartoes: d.cartoes||seed.cartoes,
      plantoes:mergePlantoesConfig(d.plantoes||seed.plantoes),
      bolsaDia:d.bolsaDia||5, bolsaStatus:d.bolsaStatus||"aguardando",
      auxilioDia:d.auxilioDia||5, auxilioStatus:d.auxilioStatus||"aguardando",
      fixas:d.fixas||seed.fixas, receitasFixas:Array.isArray(d.receitasFixas)?d.receitasFixas:seed.receitasFixas, investimentos:normalizeInvestimentos(d.investimentos||seed.investimentos),
      investimentosFotoConfirmada:hasFotoInvestimentos(d),
      bolsa:d.bolsa||0, auxilio:d.auxilio||0, receitasExtra:d.receitasExtra||[],
    };
  };

  const countData = (d) => {
    if(!d) return 0;
    return Object.values(d.cartoes||{}).flat().length
      + (d.variaveis||[]).length
      + (d.receitasExtra||[]).length
      + (d.plantoes||[]).filter(p=>p.n>0||p.horas>0).length
      + (d.fixas||[]).filter(f=>f.valor>0).length
      + (d.investimentos||[]).filter(i=>Number(i.atual)>0||Number(i.aporte)>0||Number(i.resgate)>0).length;
  };

  const scheduleInstallments = (cardId, entries, sourceKey=mesKey) => {
    let projetados=0;
    for(const entry of entries) {
      const p=parseParcela(entry.parcela);
      if(!p||p.atual>=p.total) continue;
      const parcelamentoId=entry.parcelamentoId||`${cardId}:${descKey(entry.desc)}:${Number(entry.valor||0).toFixed(2)}:${Date.now()}-${Math.random().toString(36).slice(2)}`;
      entry.parcelamentoId=parcelamentoId;
      for(let n=p.atual+1;n<=p.total;n++) {
        const targetKey=addMonthsKey(sourceKey,n-p.atual);
        const storageTarget=`month:${targetKey}`;
        let target;
        try { target=JSON.parse(localStorage.getItem(storageTarget))||seedMonth(targetKey); }
        catch { target=seedMonth(targetKey); }
        target.cartoes=target.cartoes||{inter:[],itau:[],will:[],xp:[]};
        const list=target.cartoes[cardId]||[];
        const future={...entry,id:`${parcelamentoId}:${n}`,parcela:`${n}/${p.total}`,parcelamentoId,projetado:true,origemMes:sourceKey};
        const idx=list.findIndex(x=>(x.parcelamentoId===parcelamentoId&&String(x.parcela)===future.parcela)||(x.projetado&&sameCardEntry(x,future)));
        if(idx<0) { list.push(future); projetados++; }
        else if(list[idx].projetado) list[idx]={...list[idx],...future,id:list[idx].id};
        target.cartoes[cardId]=list;
        localStorage.setItem(storageTarget,JSON.stringify(target));
      }
    }
    return projetados;
  };

  const importCardEntries = (cardId, rawEntries) => {
    const existing=[...(month?.cartoes?.[cardId]||[])];
    const used=new Set();
    let conciliados=0;
    const normalized=rawEntries.map((raw,i)=>{
      const incoming={...raw,valor:Number(raw.valor||0),id:raw.id||Date.now()+i+Math.random()};
      const idx=existing.findIndex((x,j)=>!used.has(j)&&x.projetado&&sameCardEntry(x,incoming));
      if(idx>=0) {
        used.add(idx); conciliados++;
        return {...existing[idx],...incoming,id:existing[idx].id,parcelamentoId:existing[idx].parcelamentoId,projetado:false,conciliado:true};
      }
      return incoming;
    });
    const updated=existing.map((x,i)=>{
      if(!used.has(i)) return x;
      const replacement=normalized.find(n=>n.id===x.id);
      return replacement||x;
    });
    normalized.filter(n=>!existing.some(x=>x.id===n.id)).forEach(n=>updated.push(n));
    const projetados=scheduleInstallments(cardId,normalized);
    setMonthRaw({...month,cartoes:{...month.cartoes,[cardId]:updated}});
    return {conciliados,projetados};
  };

  const projectMonthInstallments = () => {
    const next={...month,cartoes:{...month.cartoes}};
    let projetados=0;
    for(const [cardId,list] of Object.entries(month.cartoes||{})) {
      const copied=list.map(x=>({...x}));
      projetados+=scheduleInstallments(cardId,copied);
      next.cartoes[cardId]=copied;
    }
    setMonthRaw(next);
    return {projetados};
  };

  // Salva dados locais no Supabase
  const backupToDrive = async () => {
    setGdriveStatus("connecting");
    try {
      const allKeys = Object.keys(localStorage).filter(k=>k.startsWith("month:")||k.startsWith("config:"));
      const localData = {};
      for(const key of allKeys) {
        try { localData[key] = JSON.parse(localStorage.getItem(key)); } catch {}
      }
      await supabaseSave(localData);
      setGdriveStatus("synced");
      setTimeout(()=>setGdriveStatus("idle"), 3000);
    } catch(e) {
      console.error("Backup error:", e);
      setGdriveStatus("error");
      setTimeout(()=>setGdriveStatus("idle"), 3000);
    }
  };

  // Baixa dados do Supabase — só preenche meses ausentes localmente
  const restoreFromDrive = async () => {
    setGdriveStatus("connecting");
    try {
      const remoteData = await supabaseLoad() || {};
      for(const [key,val] of Object.entries(remoteData)) {
        localStorage.setItem(key, typeof val==="string"?val:JSON.stringify(val));
      }
      if(Array.isArray(remoteData["config:cats"])) { CATS=remoteData["config:cats"]; setCatsState(CATS); }
      if(Array.isArray(remoteData["config:agenda-locais"])) { LOCAIS_CONFIG=remoteData["config:agenda-locais"]; setLocaisConfigState(LOCAIS_CONFIG); }
      if(Array.isArray(remoteData["config:fixas"])) { FIXAS_CONFIG=remoteData["config:fixas"]; setFixasConfigState(FIXAS_CONFIG); }
      if(Array.isArray(remoteData["config:receitas-fixas"])) { RECEITAS_FIXAS_CONFIG=remoteData["config:receitas-fixas"]; setReceitasFixasConfigState(RECEITAS_FIXAS_CONFIG); }
      // Recarrega mês atual
      const cur = localStorage.getItem(storageKey);
      if(cur) {
        try { setMonthRaw(migrateMonth(JSON.parse(cur), mesKey)); } catch {}
      }
      setGdriveStatus("synced");
      setTimeout(()=>setGdriveStatus("idle"), 3000);
    } catch(e) {
      console.error("Restore error:", e);
      setGdriveStatus("error");
      setTimeout(()=>setGdriveStatus("idle"), 3000);
    }
  };

  const [autenticado, setAutenticado] = useState(()=>sessionStorage.getItem("auth")==="ok");
  const [senha, setSenha] = useState("");
  const [erroSenha, setErroSenha] = useState(false);

  const tentarLogin = () => {
    if(senha === "1821") {
      sessionStorage.setItem("auth","ok");
      setAutenticado(true);
    } else {
      setErroSenha(true);
      setSenha("");
      setTimeout(()=>setErroSenha(false), 2000);
    }
  };

  if(!autenticado) return (
    <>
      <style>{G}</style>
      <div style={{maxWidth:440,margin:"0 auto",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0 32px"}}>
        <div style={{fontSize:48,marginBottom:16}}>🦁</div>
        <div style={{fontSize:22,fontWeight:700,letterSpacing:-.5,marginBottom:4}}>Finanças Pessoais</div>
        <div style={{fontSize:12,color:"#94a3b8",marginBottom:40}}>Acesso restrito</div>
        <div style={{width:"100%",display:"flex",flexDirection:"column",gap:12}}>
          <input
            type="password"
            value={senha}
            onChange={e=>setSenha(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&tentarLogin()}
            placeholder="Senha"
            autoFocus
            style={{
              background:"#fff",
              border:`1px solid ${erroSenha?"rgba(220,38,38,.5)":"#dfe6ef"}`,
              borderRadius:12,padding:"14px 16px",color:"#172033",
              fontSize:16,outline:"none",width:"100%",textAlign:"center",
              letterSpacing:4,transition:"border .2s"
            }}
          />
          {erroSenha&&<div style={{textAlign:"center",fontSize:12,color:"#dc2626"}}>Senha incorreta</div>}
          <button onClick={tentarLogin} style={{
            background:"#5b58d6",border:"none",borderRadius:12,
            padding:"14px",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"
          }}>Entrar</button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <style>{G}</style>
      <div className="app-shell">
        <div style={{position:"sticky",top:0,zIndex:20,background:"rgba(238,243,248,.94)",backdropFilter:"blur(18px)",padding:"16px 24px 0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div>
              <div style={{fontSize:9,color:"#94a3b8",textTransform:"uppercase",letterSpacing:2}}>Finanças Pessoais</div>
              <div style={{fontSize:18,fontWeight:700,letterSpacing:-.5}}>{NAV.find(n=>n.id===view)?.label}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{display:"flex",gap:4,alignItems:"center"}}>
              {gdriveStatus==="connecting"&&<span style={{fontSize:10,color:"#64748b"}}>⏳</span>}
              {gdriveStatus==="synced"&&<span style={{fontSize:10,color:"#15803d"}}>✓ Sync</span>}
              {gdriveStatus==="error"&&<span style={{fontSize:10,color:"#dc2626",cursor:"pointer"}} onClick={backupToDrive}>↻ Retry</span>}
              <button onClick={restoreFromDrive} title="Carregar dados de outro dispositivo" style={{
                background:"rgba(15,23,42,.04)",border:"1px solid rgba(15,23,42,.08)",
                borderRadius:8,padding:"3px 8px",color:"#94a3b8",
                fontSize:10,cursor:"pointer",
              }}>⬇</button>
            </div>
            <div style={{width:6,height:6,borderRadius:"50%",background:saving?"#b45309":"#15803d",transition:"background .3s"}}/>
          </div>
          </div>
          <MonthNav mesKey={mesKey} setMesKey={setMesKeyRaw}/>
          <div className="desktop-tabs" style={{display:"flex",gap:6,overflowX:"auto",padding:"10px 0 4px",scrollbarWidth:"none"}}>
            {NAV.map(n=>(
              <button key={n.id} onClick={()=>setView(n.id)} style={{padding:"6px 14px",borderRadius:20,border:"none",cursor:"pointer",fontSize:12,fontWeight:500,background:view===n.id?"rgba(124,106,247,.25)":"rgba(15,23,42,.05)",color:view===n.id?"#5b58d6":"#64748b",flexShrink:0,transition:"all .2s"}}>
                {n.label}
              </button>
            ))}
          </div>
          <div style={{height:1,background:"rgba(15,23,42,.04)",marginTop:6}}/>
        </div>

        <div className="app-main">
          {!month?<div style={{textAlign:"center",padding:"60px 0",color:"#cbd5e1"}}>Carregando…</div>
            :view==="dashboard"?<Dashboard month={month} setView={setView}/>
            :view==="plantoes"?<PlantoesView month={month} setMonth={setMonthRaw} mesKey={mesKey} locaisConfig={locaisConfig} setLocaisConfig={setLocaisConfig}/>
            :view==="fixas"?<FixasView month={month} setMonth={setMonthRaw} setFixasConfig={setFixasConfig}/>
            :view==="cartoes"?<CartoesView month={month} setMonth={setMonthRaw} mesKey={mesKey} importCardEntries={importCardEntries} projectMonthInstallments={projectMonthInstallments}/>
            :view==="variaveis"?<PixView month={month} setMonth={setMonthRaw}/>
            :view==="investimentos"?<InvestView month={month} setMonth={setMonthRaw} mesKey={mesKey}/>
            :view==="analise"?<AnáliseView month={month} mesKey={mesKey} setMonth={setMonthRaw}/>
            :view==="config"?<ConfigView cats={cats} setCats={setCats} locaisConfig={locaisConfig} setLocaisConfig={setLocaisConfig} fixasConfig={fixasConfig} setFixasConfig={setFixasConfig} receitasFixasConfig={receitasFixasConfig} setReceitasFixasConfig={setReceitasFixasConfig}/>
            :null}
        </div>

        <div className="mobile-nav" style={{position:"fixed",bottom:0,left:0,width:"100%",background:"rgba(255,255,255,.94)",backdropFilter:"blur(20px)",borderTop:"1px solid #dfe6ef",display:"flex",padding:"8px 4px 18px",boxShadow:"0 -8px 24px rgba(43,55,80,.08)"}}>
          {NAV.filter(n=>["dashboard","plantoes","cartoes","variaveis","investimentos"].includes(n.id)).map(n=>(
            <button key={n.id} onClick={()=>setView(n.id)} style={{flex:1,padding:"6px 2px",border:"none",background:"transparent",cursor:"pointer",fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,color:view===n.id?"#5b58d6":"#94a3b8",transition:"color .2s",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <div style={{width:20,height:2,borderRadius:1,background:view===n.id?"#5b58d6":"transparent",transition:"all .2s"}}/>
              {n.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
