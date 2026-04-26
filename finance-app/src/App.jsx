import { useState, useEffect, useRef } from "react";


// ── Supabase Sync ─────────────────────────────────────────────
const SUPABASE_URL = "https://jrzcbthmmkaaeyuakhsb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyemNidGhtbWthYWV5dWFraHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMTM3NDEsImV4cCI6MjA5MjY4OTc0MX0.YXSdk38JHCRB7A6xxokUWlJW4Rv7yuXTlcFnP2esIxM";

async function supabaseLoad() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/financas?id=eq.vinicius&select=dados`, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
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
      "Authorization": `Bearer ${SUPABASE_KEY}`,
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
  { id:"will",  label:"Will",              color:"#B8860B", bg:"#FFFBE6", emoji:"🟡" },
];
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
const LOCAIS = ["Leonor","CDT","SEPACO"];
const AGENDA_URL = "https://script.google.com/macros/s/AKfycbxDfXcA9Fs8KUM8yEU0cVkZXdlIQFfs0n0Q9J5NMtCtTf0u_z5mcp-nIyMM_9aSYe1txA/exec";
const MESES  = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const fmtBRL = v => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v||0);
const today  = () => new Date().toISOString().split("T")[0];
const curMes = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };
const mesLabel = k => { const[y,m]=k.split("-"); return `${MESES[+m-1].toUpperCase()} / ${y}`; };

const load = async (key,fb=null) => { try{ const r=await window.storage.get(key); return r?JSON.parse(r.value):fb; }catch{ return fb; }};
const save = async (key,val)     => { try{ await window.storage.set(key,JSON.stringify(val)); }catch{} };

const seedMonth = key => ({
  key,
  plantoes: LOCAIS.map((l,i)=>({
    local:l, n:0, horas:0, valorH:0, fromAgenda:false, ativo:true,
    diaReceb: l==="Leonor"?15:0,
    statusReceb:"aguardando",
  })),
  bolsa: 0,
  bolsaDia: 5,
  bolsaStatus: "aguardando",
  auxilio: 0,
  auxilioDia: 5,
  auxilioStatus: "aguardando",
  receitasExtra: [],
  fixas: FIXAS_BASE.map((f,i)=>({...f,id:i+1,status:"pendente",forma:"",banco:"",dataPgto:"",valor:0,extra:false,duracao:f.duracao||"sempre",mesesRestantes:null})),
  cartoes: {inter:[],itau:[],will:[]},
  variaveis: [],
  investimentos: [
    {id:1,produto:"CDB / Tesouro Direto",tipo:"Renda Fixa",aplicado:0,atual:0},
    {id:2,produto:"Fundo de Investimento",tipo:"Fundo",aplicado:0,atual:0},
  ],
});

const G = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
  body{font-family:'Sora',sans-serif;background:#0a0a0f;color:#f0f0f5;min-height:100vh;}
  .mono{font-family:'JetBrains Mono',monospace;}
  input,select,button{font-family:'Sora',sans-serif;}
  ::-webkit-scrollbar{width:3px;} ::-webkit-scrollbar-thumb{background:#222;}
`;

const Card = ({children,style={}}) => (
  <div style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",borderRadius:16,padding:16,...style}}>
    {children}
  </div>
);
const Inp = ({label,type="text",value,onChange,placeholder,style={}}) => (
  <div style={{display:"flex",flexDirection:"column",gap:4,...style}}>
    {label&&<label style={{fontSize:10,color:"#555",fontWeight:600,textTransform:"uppercase",letterSpacing:.8}}>{label}</label>}
    <input type={type} value={value??""} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.08)",borderRadius:10,padding:"10px 12px",color:"#f0f0f5",fontSize:14,outline:"none",width:"100%"}}/>
  </div>
);
const Sel = ({label,value,onChange,options,style={}}) => (
  <div style={{display:"flex",flexDirection:"column",gap:4,...style}}>
    {label&&<label style={{fontSize:10,color:"#555",fontWeight:600,textTransform:"uppercase",letterSpacing:.8}}>{label}</label>}
    <select value={value??""} onChange={e=>onChange(e.target.value)}
      style={{background:"#111118",border:"1px solid rgba(255,255,255,.08)",borderRadius:10,padding:"10px 12px",color:"#f0f0f5",fontSize:14,outline:"none",width:"100%"}}>
      {options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
    </select>
  </div>
);
const Btn = ({children,onClick,color="#7c6af7",outline,style={}}) => (
  <button onClick={onClick} style={{padding:"11px 16px",borderRadius:11,border:outline?`1px solid ${color}55`:"none",
    background:outline?"transparent":color,color:outline?color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",width:"100%",...style}}>
    {children}
  </button>
);

function MonthNav({mesKey,setMesKey}) {
  const [y,m]=mesKey.split("-").map(Number);
  const go=d=>{ const dt=new Date(y,m-1+d); setMesKey(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`); };
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(255,255,255,.04)",borderRadius:12,padding:"8px 14px",border:"1px solid rgba(255,255,255,.07)"}}>
      <button onClick={()=>go(-1)} style={{background:"none",border:"none",color:"#555",fontSize:22,cursor:"pointer",lineHeight:1}}>‹</button>
      <span style={{fontSize:14,fontWeight:700,letterSpacing:.5}}>{mesLabel(mesKey)}</span>
      <button onClick={()=>go(+1)} style={{background:"none",border:"none",color:"#555",fontSize:22,cursor:"pointer",lineHeight:1}}>›</button>
    </div>
  );
}

function Dashboard({month,setView}) {
  const plantaoT=month.plantoes.filter(p=>p.ativo!==false).reduce((s,p)=>s+(p.horas*p.valorH),0);
  const recT=plantaoT+Number(month.bolsa||0)+Number(month.auxilio||0)+(month.receitasExtra||[]).reduce((s,r)=>s+Number(r.valor||0),0);
  const fixT=month.fixas.reduce((s,f)=>s+Number(f.valor||0),0);
  const carT=Object.values(month.cartoes).flat().reduce((s,t)=>s+Number(t.valor||0),0);
  const pixT=(month.variaveis||[]).reduce((s,p)=>s+Number(p.valor||0),0);
  const invT=month.investimentos.reduce((s,i)=>s+Number(i.aplicado||0),0);
  const saldo=recT-fixT-carT-pixT-invT;
  const despT=fixT+carT+pixT;
  const fixPend=month.fixas.filter(f=>f.status==="pendente"&&Number(f.valor)>0).length;
  const catMap={};
  [...Object.values(month.cartoes).flat(),...(month.variaveis||[])].forEach(t=>{ catMap[t.cat]=(catMap[t.cat]||0)+Number(t.valor||0); });
  const topCats=Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const agendaOk=(month.plantoes||[]).some(p=>p.fromAgenda&&p.ativo!==false);
  const recAtrasado=[
    ...(month.plantoes||[]).filter(p=>p.ativo!==false&&p.statusReceb==="atrasado"),
    ...(month.bolsaStatus==="atrasado"?[{local:"Bolsa"}]:[]),
    ...(month.auxilioStatus==="atrasado"?[{local:"Auxílio"}]:[]),
    ...((month.receitasExtra||[]).filter(r=>r.status==="atrasado")),
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <Card style={{background:"linear-gradient(135deg,rgba(124,106,247,.12),rgba(0,180,150,.08))",borderColor:"rgba(124,106,247,.18)"}}>
        <div style={{fontSize:10,color:"#555",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Saldo livre do mês</div>
        <div className="mono" style={{fontSize:36,fontWeight:600,letterSpacing:-2,color:saldo>=0?"#4ade80":"#f87171"}}>{fmtBRL(saldo)}</div>
        <div style={{height:1,background:"rgba(255,255,255,.05)",margin:"12px 0"}}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[["Receita",recT,"#4ade80"],["Despesas",despT,"#f87171"]].map(([l,v,c])=>(
            <div key={l}><div style={{fontSize:10,color:"#444"}}>{l}</div><div className="mono" style={{fontSize:19,color:c,fontWeight:600}}>{fmtBRL(v)}</div></div>
          ))}
        </div>
      </Card>

      <Card style={{padding:"12px 14px",borderColor:agendaOk?"rgba(74,222,128,.15)":"rgba(255,255,255,.07)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{fontSize:22}}>📅</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:600,color:agendaOk?"#4ade80":"#f0f0f5"}}>{agendaOk?"Plantões sincronizados":"Plantões não sincronizados"}</div>
            <div style={{fontSize:11,color:"#444"}}>{agendaOk?`${month.plantoes.reduce((s,p)=>s+p.horas,0)}h · ${fmtBRL(recT)}`:"Configure o Apps Script para sincronizar"}</div>
          </div>
          <button onClick={()=>setView("plantoes")} style={{background:"rgba(124,106,247,.15)",border:"1px solid rgba(124,106,247,.2)",borderRadius:8,padding:"6px 10px",color:"#a89cf7",fontSize:11,cursor:"pointer"}}>{agendaOk?"Ver":"Config"}</button>
        </div>
      </Card>

      {recAtrasado.length>0&&(
        <Card style={{borderColor:"rgba(239,68,68,.2)",background:"rgba(239,68,68,.04)",padding:"12px 14px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{fontSize:22}}>⚠️</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:"#f87171"}}>{recAtrasado.length} recebimento{recAtrasado.length>1?"s":""} atrasado{recAtrasado.length>1?"s":""}</div>
              <div style={{fontSize:11,color:"#666"}}>{recAtrasado.map(r=>r.local||r.desc).join(", ")}</div>
            </div>
            <button onClick={()=>setView("plantoes")} style={{background:"rgba(239,68,68,.12)",border:"1px solid rgba(239,68,68,.25)",borderRadius:8,padding:"6px 10px",color:"#f87171",fontSize:11,cursor:"pointer"}}>Ver</button>
          </div>
        </Card>
      )}

      {fixPend>0&&(
        <Card style={{borderColor:"rgba(251,191,36,.2)",background:"rgba(251,191,36,.04)",padding:"12px 14px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{fontSize:22}}>⏳</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:"#fbbf24"}}>{fixPend} despesa{fixPend>1?"s":""} pendente{fixPend>1?"s":""}</div>
              <div style={{fontSize:11,color:"#666"}}>Com valor lançado mas não pagas</div>
            </div>
            <button onClick={()=>setView("fixas")} style={{background:"rgba(251,191,36,.12)",border:"1px solid rgba(251,191,36,.25)",borderRadius:8,padding:"6px 10px",color:"#fbbf24",fontSize:11,cursor:"pointer"}}>Ver</button>
          </div>
        </Card>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {[{label:"Fixas",val:fixT,color:"#818cf8",icon:"📋",v:"fixas"},{label:"Cartões",val:carT,color:"#f97316",icon:"💳",v:"cartoes"},{label:"Pix/Var.",val:pixT,color:"#22d3ee",icon:"📱",v:"variaveis"},{label:"Investido",val:invT,color:"#a78bfa",icon:"📈",v:"investimentos"}].map(b=>(
          <Card key={b.label} style={{cursor:"pointer"}} onClick={()=>setView(b.v)}>
            <div style={{fontSize:20,marginBottom:4}}>{b.icon}</div>
            <div className="mono" style={{fontSize:16,fontWeight:600,color:b.color}}>{fmtBRL(b.val)}</div>
            <div style={{fontSize:11,color:"#444",marginTop:2}}>{b.label}</div>
          </Card>
        ))}
      </div>

      {topCats.length>0&&(
        <Card>
          <div style={{fontSize:10,color:"#444",fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Top Categorias</div>
          {topCats.map(([cat,val])=>{
            const pct=despT>0?Math.round(val/despT*100):0;
            return (
              <div key={cat} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:13,color:"#ccc"}}>{cat}</span>
                  <span className="mono" style={{fontSize:12,color:"#666"}}>{fmtBRL(val)} · {pct}%</span>
                </div>
                <div style={{height:3,background:"rgba(255,255,255,.05)",borderRadius:2}}>
                  <div style={{height:"100%",width:`${pct}%`,background:"#7c6af7",borderRadius:2}}/>
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
  {value:"aguardando", label:"⏳ Aguardando", color:"#fbbf24", bg:"rgba(251,191,36,.1)", border:"rgba(251,191,36,.2)"},
  {value:"recebido",   label:"✓ Recebido",   color:"#4ade80", bg:"rgba(74,222,128,.1)", border:"rgba(74,222,128,.2)"},
  {value:"atrasado",   label:"⚠ Atrasado",   color:"#f87171", bg:"rgba(239,68,68,.1)",  border:"rgba(239,68,68,.2)"},
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

function PlantoesView({month,setMonth,mesKey}) {
  const [showPaste,setShowPaste]=useState(false);
  const [pasteJson,setPasteJson]=useState("");
  const [syncMsg,setSyncMsg]=useState(null);
  const [syncPeriodos,setSyncPeriodos]=useState(null);
  const [showAddExtra,setShowAddExtra]=useState(false);
  const [novaExtra,setNovaExtra]=useState({desc:"",valor:"",dia:"",status:"aguardando"});
  const [agendaLoading,setAgendaLoading]=useState(false);
  const [agendaMsg,setAgendaMsg]=useState(null);

  const plantaoT=(month.plantoes||[]).filter(p=>p.ativo!==false).reduce((s,p)=>s+(p.horas*p.valorH),0);
  const bolsaV=Number(month.bolsa||0);
  const auxilioV=Number(month.auxilio||0);
  const extrasT=(month.receitasExtra||[]).reduce((s,r)=>s+Number(r.valor||0),0);
  const total=plantaoT+bolsaV+auxilioV+extrasT;

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
      const res = await fetch(`/api/agenda?mes=${mesKey}`);
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // data format: {"plantoes":{"Leonor":{"n":9,"horas":153},...}, "periodos":{...}}
      const plantoes = data.plantoes || {};
      const locais = Object.keys(plantoes);
      if(!locais.length) throw new Error("Nenhum plantão encontrado");
      const updated = month.plantoes.map(p => {
        const d = plantoes[p.local];
        if(!d) return p;
        // Se está fixado, nunca sobrescreve
        if(p.bloqueadoSync || p.editadoManualmente) return p;
        return {...p, n: d.n||0, horas: d.horas||0, fromAgenda:true};
      });
      setMonth({...month, plantoes: updated});
      const resumo = locais.map(l=>`${l}: ${plantoes[l].n} plant. ${plantoes[l].horas}h`).join(" · ");
      setAgendaMsg({ok:true, txt:`✓ Sincronizado — ${resumo}`});
    } catch(e) {
      setAgendaMsg({ok:false, txt:"Erro: "+e.message});
    } finally {
      setAgendaLoading(false);
    }
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
      const novos=month.plantoes.map(p=>{
        const d=data.plantoes?.[p.local];
        if(!d) return p;
        return {...p,n:d.n,horas:d.horas,fromAgenda:true};
      });
      setMonth({...month,plantoes:novos});
      setSyncPeriodos(data.periodos||null);
      setSyncMsg({ok:true,txt:`Importado! ${novos.filter(p=>p.fromAgenda&&p.ativo!==false).map(p=>p.local+": "+p.horas+"h").join(" · ")}`});
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
        <div style={{fontSize:10,color:"#555",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Total receita do mês</div>
        <div className="mono" style={{fontSize:34,fontWeight:600,color:"#4ade80",letterSpacing:-1}}>{fmtBRL(total)}</div>
        <div style={{height:1,background:"rgba(255,255,255,.05)",margin:"10px 0"}}/>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          {plantaoT>0&&<div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,color:"#555"}}>Plantões</span><span className="mono" style={{fontSize:11,color:"#4ade80"}}>{fmtBRL(plantaoT)}</span></div>}
          {bolsaV>0&&<div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,color:"#555"}}>Bolsa residência</span><span className="mono" style={{fontSize:11,color:"#4ade80"}}>{fmtBRL(bolsaV)}</span></div>}
          {auxilioV>0&&<div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,color:"#555"}}>Auxílio moradia</span><span className="mono" style={{fontSize:11,color:"#4ade80"}}>{fmtBRL(auxilioV)}</span></div>}
          {extrasT>0&&<div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,color:"#555"}}>Receitas extras</span><span className="mono" style={{fontSize:11,color:"#4ade80"}}>{fmtBRL(extrasT)}</span></div>}
        </div>
      </Card>

      {/* ── BOLSA + AUXÍLIO ── */}
      <div style={{fontSize:10,color:"#555",fontWeight:600,textTransform:"uppercase",letterSpacing:1,padding:"2px 0"}}>Receitas fixas mensais</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        <Card style={{padding:"12px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontSize:11,color:"#a89cf7",fontWeight:600}}>🎓 Bolsa residência</div>
            <StatusBadge value={month.bolsaStatus||"aguardando"} onChange={v=>setMonth({...month,bolsaStatus:v})}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:8}}>
            <Inp label="Valor (R$)" type="number" value={month.bolsa||""} onChange={v=>setMonth({...month,bolsa:Number(v)||0})} placeholder="0,00"/>
            <Inp label="Dia receb." type="number" value={month.bolsaDia||""} onChange={v=>setMonth({...month,bolsaDia:Number(v)||0})} placeholder="5"/>
          </div>
        </Card>
        <Card style={{padding:"12px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontSize:11,color:"#a89cf7",fontWeight:600}}>🏠 Auxílio moradia</div>
            <StatusBadge value={month.auxilioStatus||"aguardando"} onChange={v=>setMonth({...month,auxilioStatus:v})}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:8}}>
            <Inp label="Valor (R$)" type="number" value={month.auxilio||""} onChange={v=>setMonth({...month,auxilio:Number(v)||0})} placeholder="0,00"/>
            <Inp label="Dia receb." type="number" value={month.auxilioDia||""} onChange={v=>setMonth({...month,auxilioDia:Number(v)||0})} placeholder="5"/>
          </div>
        </Card>
      </div>

      {/* ── PLANTÕES ── */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"2px 0"}}>
        <div style={{fontSize:10,color:"#555",fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>Plantões</div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={syncAgenda} disabled={agendaLoading} style={{background:"rgba(74,222,128,.15)",border:"1px solid rgba(74,222,128,.25)",borderRadius:8,padding:"4px 10px",color:"#4ade80",fontSize:10,fontWeight:600,cursor:agendaLoading?"not-allowed":"pointer"}}>
            {agendaLoading?"⏳":"🗓"} {agendaLoading?"Sincronizando...":"Sincronizar"}
          </button>
          <button onClick={()=>setShowPaste(!showPaste)} style={{background:"rgba(124,106,247,.15)",border:"1px solid rgba(124,106,247,.25)",borderRadius:8,padding:"4px 10px",color:"#a89cf7",fontSize:10,fontWeight:600,cursor:"pointer"}}>📋 JSON</button>
        </div>
      </div>

      {/* Sync result */}
      {agendaMsg&&(
        <div style={{padding:"8px 12px",borderRadius:10,background:agendaMsg.ok?"rgba(74,222,128,.08)":"rgba(239,68,68,.08)",fontSize:12,color:agendaMsg.ok?"#4ade80":"#f87171",border:`1px solid ${agendaMsg.ok?"rgba(74,222,128,.2)":"rgba(239,68,68,.2)"}`}}>
          {agendaMsg.txt}
        </div>
      )}
      {syncMsg&&(
        <div style={{padding:"8px 12px",borderRadius:10,background:syncMsg.ok?"rgba(74,222,128,.08)":"rgba(239,68,68,.08)",fontSize:12,color:syncMsg.ok?"#4ade80":"#f87171"}}>
          {syncMsg.txt}
          {syncPeriodos&&<div style={{marginTop:4,display:"flex",flexDirection:"column",gap:2}}>
            {Object.entries(syncPeriodos).map(([l,p])=>(
              <span key={l} style={{fontSize:10,color:"#444"}}>{l}: {p.inicio} → {p.fim}</span>
            ))}
          </div>}
        </div>
      )}

      {/* Paste JSON panel */}
      {showPaste&&(
        <Card style={{borderColor:"rgba(124,106,247,.2)"}}>
          <div style={{fontSize:12,color:"#a89cf7",fontWeight:600,marginBottom:10}}>📋 Importar da Google Agenda</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{fontSize:11,color:"#666",lineHeight:1.7}}>
              1. Abra este link no navegador:<br/>
              <span style={{wordBreak:"break-all",color:"#7c6af7",fontSize:10}}>{`${AGENDA_URL}?mes=${mesKey}`}</span>
            </div>
            <div style={{fontSize:11,color:"#666"}}>2. Copie o JSON e cole abaixo</div>
            <textarea value={pasteJson} onChange={e=>setPasteJson(e.target.value)}
              placeholder={`{"plantoes":{"Leonor":{"n":3,"horas":36},...}}`}
              style={{background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,
                padding:"10px",color:"#f0f0f5",fontSize:11,outline:"none",width:"100%",
                minHeight:80,resize:"vertical",fontFamily:"'JetBrains Mono',monospace"}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <button onClick={()=>{setShowPaste(false);setPasteJson("");}} style={{padding:"10px",borderRadius:10,border:"1px solid rgba(255,255,255,.1)",background:"transparent",color:"#555",fontSize:13,cursor:"pointer"}}>Cancelar</button>
              <button onClick={importJson} style={{padding:"10px",borderRadius:10,border:"none",background:"#7c6af7",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>Importar</button>
            </div>
          </div>
        </Card>
      )}

      {/* Cards por local */}
      {(month.plantoes||[]).map((p,i)=>{
        const ativo=p.ativo!==false;
        return (
          <Card key={p.local} style={{opacity:ativo?1:.5,borderColor:ativo?"rgba(255,255,255,.07)":"rgba(255,255,255,.03)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:ativo?10:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{fontSize:14,fontWeight:600,color:ativo?"#a89cf7":"#444"}}>{p.local}</div>
                {p.fromAgenda&&ativo&&<span style={{fontSize:10,color:"#4ade80",background:"rgba(74,222,128,.1)",padding:"2px 7px",borderRadius:10}}>📅 agenda</span>}
                {p.bloqueadoSync&&ativo&&<span onClick={()=>{const pl=[...month.plantoes];pl[i]={...pl[i],bloqueadoSync:false,editadoManualmente:false};setMonth({...month,plantoes:pl});}} style={{fontSize:10,color:"#f97316",background:"rgba(249,115,22,.1)",padding:"2px 7px",borderRadius:10,cursor:"pointer",border:"1px solid rgba(249,115,22,.2)"}}>🔒 fixo ✕</span>}
                {p.editadoManualmente&&!p.bloqueadoSync&&ativo&&<span onClick={()=>{const pl=[...month.plantoes];pl[i]={...pl[i],bloqueadoSync:true};setMonth({...month,plantoes:pl});}} style={{fontSize:10,color:"#fbbf24",background:"rgba(251,191,36,.1)",padding:"2px 7px",borderRadius:10,cursor:"pointer",border:"1px solid rgba(251,191,36,.2)"}}>✏ manual → fixar</span>}
              </div>
              <button onClick={()=>togglePlantao(i)} style={{
                background:ativo?"rgba(239,68,68,.08)":"rgba(74,222,128,.08)",
                border:`1px solid ${ativo?"rgba(239,68,68,.2)":"rgba(74,222,128,.2)"}`,
                borderRadius:8,padding:"3px 10px",cursor:"pointer",fontSize:11,
                color:ativo?"#f87171":"#4ade80",
              }}>{ativo?"Desativar":"Ativar"}</button>
            </div>
            {ativo&&(
              <>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  <Inp label="Nº Plant." type="number" value={p.n||""} onChange={v=>updPlantao(i,"n",v)} placeholder="0"/>
                  <Inp label="Horas" type="number" value={p.horas||""} onChange={v=>updPlantao(i,"horas",v)} placeholder="0"/>
                  <Inp label="Valor/h (R$)" type="number" value={p.valorH||""} onChange={v=>updPlantao(i,"valorH",v)} placeholder="0"/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8,paddingTop:8,borderTop:"1px solid rgba(255,255,255,.05)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:11,color:"#444"}}>Recebimento:</span>
                    <span style={{fontSize:11,color:"#666"}}>dia</span>
                    <input type="number" value={p.diaReceb||""} onChange={e=>updPlantao(i,"diaReceb",e.target.value)}
                      placeholder="25" style={{width:40,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.08)",
                      borderRadius:6,padding:"3px 6px",color:"#f0f0f5",fontSize:11,outline:"none",textAlign:"center"}}/>
                  </div>
                  <StatusBadge value={p.statusReceb||"aguardando"} onChange={v=>updPlantao(i,"statusReceb",v)}/>
                </div>
                {p.horas>0&&p.valorH>0&&(
                  <div style={{marginTop:8,padding:"7px 10px",background:"rgba(74,222,128,.07)",borderRadius:8,display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontSize:12,color:"#555"}}>{p.horas}h × {fmtBRL(p.valorH)}</span>
                    <span className="mono" style={{fontSize:13,color:"#4ade80",fontWeight:600}}>{fmtBRL(p.horas*p.valorH)}</span>
                  </div>
                )}
              </>
            )}
          </Card>
        );
      })}

      {/* ── RECEITAS EXTRAS ── */}
      <div style={{fontSize:10,color:"#555",fontWeight:600,textTransform:"uppercase",letterSpacing:1,padding:"2px 0"}}>Receitas extras do mês</div>

      {(month.receitasExtra||[]).map(r=>(
        <Card key={r.id} style={{padding:"10px 14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,color:"#f0f0f5"}}>{r.desc}</div>
              {r.dia>0&&<div style={{fontSize:10,color:"#444",marginTop:2}}>Dia {r.dia}</div>}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
              <StatusBadge value={r.status||"aguardando"} onChange={v=>{
                const extras=(month.receitasExtra||[]).map(x=>x.id===r.id?{...x,status:v}:x);
                setMonth({...month,receitasExtra:extras});
              }}/>
              <span className="mono" style={{fontSize:14,color:"#4ade80",fontWeight:500}}>{fmtBRL(r.valor)}</span>
              <button onClick={()=>removeExtra(r.id)} style={{background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.15)",borderRadius:6,padding:"3px 7px",color:"#f87171",fontSize:11,cursor:"pointer"}}>✕</button>
            </div>
          </div>
        </Card>
      ))}

      {showAddExtra?(
        <Card style={{borderColor:"rgba(74,222,128,.2)"}}>
          <div style={{fontSize:12,color:"#4ade80",fontWeight:600,marginBottom:10}}>+ Nova receita extra</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <Inp label="Descrição" value={novaExtra.desc} onChange={v=>setNovaExtra({...novaExtra,desc:v})} placeholder="Ex: Consulta particular, plantão extra..."/>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:8}}>
              <Inp label="Valor (R$)" type="number" value={novaExtra.valor} onChange={v=>setNovaExtra({...novaExtra,valor:v})} placeholder="0,00"/>
              <Inp label="Dia receb." type="number" value={novaExtra.dia} onChange={v=>setNovaExtra({...novaExtra,dia:v})} placeholder="0"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:4}}>
              <button onClick={()=>setShowAddExtra(false)} style={{padding:"10px",borderRadius:10,border:"1px solid rgba(255,255,255,.1)",background:"transparent",color:"#555",fontSize:13,cursor:"pointer"}}>Cancelar</button>
              <button onClick={addExtra} style={{padding:"10px",borderRadius:10,border:"none",background:"#4ade80",color:"#0a0a0f",fontSize:13,fontWeight:600,cursor:"pointer"}}>Adicionar</button>
            </div>
          </div>
        </Card>
      ):(
        <button onClick={()=>setShowAddExtra(true)} style={{padding:"12px",borderRadius:12,border:"1px dashed rgba(74,222,128,.3)",background:"transparent",color:"#4ade80",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          + Adicionar receita extra
        </button>
      )}
    </div>
  );
}

// FixaCard fora do FixasView para evitar recriação a cada render (causa do bug "edita todas")
function FixaCard({f, editing, setEditing, onUpd, onRemove}) {
  const isOpen = editing === f.id;
  return (
    <Card style={{
      borderColor: f.status==="pago"?"rgba(74,222,128,.12)":f.extra?"rgba(251,191,36,.12)":"rgba(255,255,255,.07)",
      background:  f.status==="pago"?"rgba(74,222,128,.03)":"rgba(255,255,255,.04)",
      marginBottom:8,
    }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
            <span style={{fontSize:14,fontWeight:600,color:f.status==="pago"?"#4ade80":"#f0f0f5"}}>{f.nome}</span>
            {f.extra&&<span style={{fontSize:9,color:"#fbbf24",background:"rgba(251,191,36,.12)",padding:"1px 6px",borderRadius:6}}>extra</span>}
          </div>
          <div style={{fontSize:11,color:"#444",marginTop:1}}>{f.venc&&`${f.venc} · `}{f.cat}{f.duracao&&f.duracao!=="sempre"?` · ${f.duracao==="mes"?"só este mês":f.duracao}`:""}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
          <span className="mono" style={{fontSize:14,color:f.status==="pago"?"#4ade80":"#888"}}>
            {Number(f.valor)>0?fmtBRL(f.valor):"—"}
          </span>
          <button onClick={()=>onUpd(f.id,"status",f.status==="pago"?"pendente":"pago")} style={{
            background:f.status==="pago"?"rgba(74,222,128,.12)":"rgba(251,191,36,.1)",
            border:`1px solid ${f.status==="pago"?"rgba(74,222,128,.25)":"rgba(251,191,36,.2)"}`,
            borderRadius:8,padding:"4px 8px",cursor:"pointer",fontSize:11,
            color:f.status==="pago"?"#4ade80":"#fbbf24",
          }}>{f.status==="pago"?"✓":"⏳"}</button>
        </div>
      </div>
      <button onClick={()=>setEditing(isOpen?null:f.id)} style={{marginTop:8,background:"transparent",
        border:"1px solid rgba(255,255,255,.06)",borderRadius:8,padding:"4px 12px",
        color:"#444",fontSize:11,cursor:"pointer",width:"100%"}}>
        {isOpen?"▲ fechar":"▼ editar"}
      </button>
      {isOpen&&(
        <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:8}}>
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
            <label style={{fontSize:10,color:"#555",fontWeight:600,textTransform:"uppercase",letterSpacing:.8}}>Duração</label>
            <select value={f.duracao||"sempre"} onChange={e=>{
              const v=e.target.value;
              onUpd(f.id,"duracao",v);
              onUpd(f.id,"mesesRestantes",v==="sempre"?null:v==="mes"?1:Number(v.replace("x",""))||null);
            }} style={{background:"#111118",border:"1px solid rgba(255,255,255,.08)",borderRadius:10,padding:"8px 12px",color:"#f0f0f5",fontSize:13,outline:"none"}}>
              <option value="sempre">Todo mês (recorrente)</option>
              <option value="mes">Só este mês</option>
              <option value="2x">2 meses</option>
              <option value="3x">3 meses</option>
              <option value="4x">4 meses</option>
              <option value="6x">6 meses</option>
              <option value="12x">12 meses</option>
            </select>
            {f.duracao&&f.duracao!=="sempre"&&f.duracao!=="mes"&&(
              <div style={{fontSize:10,color:"#555"}}>
                {f.mesesRestantes!=null?`${f.mesesRestantes} mês(es) restante(s)`:""}
              </div>
            )}
          </div>
          {f.extra&&(
            <button onClick={()=>onRemove(f.id)} style={{background:"rgba(239,68,68,.08)",
              border:"1px solid rgba(239,68,68,.15)",borderRadius:8,padding:"6px",
              color:"#f87171",fontSize:12,cursor:"pointer"}}>
              Remover esta despesa
            </button>
          )}
        </div>
      )}
    </Card>
  );
}

function FixasView({month,setMonth}) {
  const [editing,setEditing]=useState(null);
  const [showAdd,setShowAdd]=useState(false);
  const [nova,setNova]=useState({nome:"",venc:"",cat:CATS[0],valor:"",forma:"",banco:"",dataPgto:""});

  const upd=(id,field,val)=>setMonth({...month,fixas:month.fixas.map(x=>x.id===id?{...x,[field]:field==="valor"?Number(val)||0:val}:x)});
  const remove=id=>setMonth({...month,fixas:month.fixas.filter(f=>f.id!==id)});
  const addFixa=()=>{
    if(!nova.nome) return;
    setMonth({...month,fixas:[...month.fixas,{...nova,valor:Number(nova.valor)||0,id:Date.now(),status:"pendente",extra:true}]});
    setNova({nome:"",venc:"",cat:CATS[0],valor:"",forma:"",banco:"",dataPgto:""});
    setShowAdd(false);
  };

  const total=month.fixas.reduce((s,f)=>s+Number(f.valor||0),0);
  const pend=month.fixas.filter(f=>f.status==="pendente").length;
  const grupos=[["pendente","⏳ Pendentes","#fbbf24"],["pago","✓ Pagas","#4ade80"]];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <Card style={{background:"rgba(251,191,36,.04)",borderColor:"rgba(251,191,36,.12)"}}>
          <div style={{fontSize:10,color:"#666"}}>Pendentes</div>
          <div style={{fontSize:26,fontWeight:700,color:"#fbbf24"}}>{pend}</div>
        </Card>
        <Card style={{background:"rgba(129,140,248,.04)",borderColor:"rgba(129,140,248,.12)"}}>
          <div style={{fontSize:10,color:"#666"}}>Total do mês</div>
          <div className="mono" style={{fontSize:18,color:"#818cf8",fontWeight:600}}>{fmtBRL(total)}</div>
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
              <FixaCard key={f.id} f={f} editing={editing} setEditing={setEditing} onUpd={upd} onRemove={remove}/>
            ))}
          </div>
        );
      })}

      {showAdd?(
        <Card style={{borderColor:"rgba(251,191,36,.2)"}}>
          <div style={{fontSize:12,color:"#fbbf24",fontWeight:600,marginBottom:10}}>+ Nova despesa fixa (só este mês)</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <Inp label="Nome" value={nova.nome} onChange={v=>setNova({...nova,nome:v})} placeholder="Ex: Assinatura Adobe"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <Inp label="Vencimento" value={nova.venc} onChange={v=>setNova({...nova,venc:v})} placeholder="Dia 15"/>
              <Sel label="Categoria" value={nova.cat} onChange={v=>setNova({...nova,cat:v})} options={CATS}/>
            </div>
            <Inp label="Valor (R$)" type="number" value={nova.valor} onChange={v=>setNova({...nova,valor:v})} placeholder="0,00"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:4}}>
              <Btn outline color="#555" onClick={()=>setShowAdd(false)}>Cancelar</Btn>
              <Btn color="#fbbf24" onClick={addFixa} style={{color:"#0a0a0f"}}>Adicionar</Btn>
            </div>
          </div>
        </Card>
      ):(
        <button onClick={()=>setShowAdd(true)} style={{padding:"12px",borderRadius:12,border:"1px dashed rgba(251,191,36,.3)",background:"transparent",color:"#fbbf24",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          + Adicionar despesa fixa (este mês)
        </button>
      )}
      <div style={{fontSize:10,color:"#2a2a35",textAlign:"center"}}>Despesas "extra" são exclusivas deste mês e podem ser removidas</div>
    </div>
  );
}

function CartoesView({month,setMonth}) {
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
    const novos=[...(month.cartoes[cartaoAlvo]||[]),...pdfPreview];
    setMonth({...month,cartoes:{...month.cartoes,[cartaoAlvo]:novos}});
    setImportMsg({ok:true,txt:`✓ ${pdfPreview.length} lançamentos importados para ${card.label} · ${fmtBRL(pdfPreview.reduce((s,t)=>s+t.valor,0))}`});
    setShowPdfUpload(false); setPdfFile(null); setPdfPreview([]);
  };

  const add=()=>{
    if(!form.desc||!form.valor) return;
    setMonth({...month,cartoes:{...month.cartoes,[activeCard]:[...items,{...form,valor:Number(form.valor),id:Date.now()}]}});
    setForm({desc:"",cat:CATS[0],parcela:"",valor:""});
    setShowForm(false);
  };
  const remove=id=>setMonth({...month,cartoes:{...month.cartoes,[activeCard]:items.filter(t=>t.id!==id)}});
  const doImport=()=>{
    try{
      const data=JSON.parse(importJson);
      if(!data.lancamentos) throw new Error("JSON inválido");
      const cartaoAlvo=data.cartao||activeCard;
      const novos=data.lancamentos.map(l=>({...l,id:Date.now()+Math.random(),valor:Number(l.valor||0)}));
      setMonth({...month,cartoes:{...month.cartoes,[cartaoAlvo]:[...(month.cartoes[cartaoAlvo]||[]),...novos]}});
      if(cartaoAlvo!==activeCard) setActiveCard(cartaoAlvo);
      setImportMsg({ok:true,txt:`✓ ${novos.length} lançamentos importados para ${CARD_LABELS[cartaoAlvo]||cartaoAlvo} · R$ ${data.total?.toFixed(2)||""}`});
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
            <button key={c.id} onClick={()=>{setActiveCard(c.id);setImportMsg(null);setShowPdfUpload(false);setShowImport(false);setPdfFile(null);setPdfPreview([]);}} style={{flex:1,padding:"10px 4px",borderRadius:12,cursor:"pointer",border:`2px solid ${activeCard===c.id?c.color:"transparent"}`,background:activeCard===c.id?`${c.color}18`:"rgba(255,255,255,.03)"}}>
              <div style={{fontSize:20}}>{c.emoji}</div>
              <div style={{fontSize:10,color:activeCard===c.id?c.color:"#444",fontWeight:600,marginTop:2}}>{c.label.split(" ")[0]}</div>
              <div className="mono" style={{fontSize:11,color:activeCard===c.id?c.color:"#333",marginTop:1}}>{fmtBRL(sub)}</div>
            </button>
          );
        })}
      </div>
      <Card style={{background:`${card.color}11`,borderColor:`${card.color}33`,padding:"12px 14px"}}>
        <div style={{display:"flex",justifyContent:"space-between"}}>
          <div><div style={{fontSize:10,color:"#666"}}>{card.label}</div><div className="mono" style={{fontSize:22,color:card.color,fontWeight:600}}>{fmtBRL(total)}</div></div>
          <div style={{textAlign:"right"}}><div style={{fontSize:10,color:"#666"}}>Total cartões</div><div className="mono" style={{fontSize:16,color:"#f87171"}}>{fmtBRL(totalAll)}</div></div>
        </div>
      </Card>
      {/* Import buttons */}
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>{setShowPdfUpload(!showPdfUpload);setShowImport(false);setImportMsg(null);setPdfFile(null);setPdfPreview([]);setPdfProcessing(false);}} style={{flex:1,padding:"9px",borderRadius:10,border:`1px solid ${card.color}44`,background:showPdfUpload?`${card.color}18`:"transparent",color:card.color,fontSize:12,fontWeight:600,cursor:"pointer"}}>
          📄 Importar PDF
        </button>
        <button onClick={()=>{setShowImport(!showImport);setShowPdfUpload(false);setImportMsg(null);}} style={{flex:1,padding:"9px",borderRadius:10,border:"1px solid rgba(255,255,255,.1)",background:showImport?"rgba(255,255,255,.06)":"transparent",color:"#888",fontSize:12,fontWeight:600,cursor:"pointer"}}>
          { } JSON
        </button>
        <button onClick={()=>setMonth({...month,cartoes:{...month.cartoes,[activeCard]:[]}})} style={{padding:"9px 14px",borderRadius:10,border:"1px solid rgba(239,68,68,.2)",background:"transparent",color:"#f87171",fontSize:11,cursor:"pointer"}}>
          🗑
        </button>
      </div>

      {importMsg&&(
        <div style={{padding:"8px 12px",borderRadius:10,background:importMsg.ok?"rgba(74,222,128,.08)":"rgba(239,68,68,.08)",fontSize:12,color:importMsg.ok?"#4ade80":"#f87171",border:`1px solid ${importMsg.ok?"rgba(74,222,128,.2)":"rgba(239,68,68,.2)"}`}}>
          {importMsg.txt}
        </div>
      )}

      {/* PDF Upload panel */}
      {showPdfUpload&&(
        <Card style={{borderColor:`${card.color}33`}}>
          <div style={{fontSize:12,color:card.color,fontWeight:600,marginBottom:8}}>{card.emoji} Importar fatura — {card.label}</div>
          <div style={{fontSize:11,color:"#555",marginBottom:10,lineHeight:1.6}}>
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
                 <div style={{fontSize:10,color:"#555",marginTop:2}}>{(pdfFile.size/1024).toFixed(0)} KB · toque para trocar</div></>
              :<><div style={{fontSize:13,color:"#555",fontWeight:500}}>Toque para selecionar o PDF</div>
                 <div style={{fontSize:10,color:"#333",marginTop:2}}>Fatura {card.label}</div></>
            }
          </div>

          {pdfProcessing&&(
            <div style={{marginTop:10,padding:"10px 12px",borderRadius:10,background:"rgba(124,106,247,.08)",border:"1px solid rgba(124,106,247,.2)",fontSize:12,color:"#a89cf7",textAlign:"center"}}>
              ⚙️ {pdfMsg||"Processando..."}
            </div>
          )}

          {/* Preview dos lançamentos antes de confirmar */}
          {pdfPreview.length>0&&!pdfProcessing&&(
            <div style={{marginTop:10}}>
              <div style={{fontSize:11,color:"#555",marginBottom:6,display:"flex",justifyContent:"space-between"}}>
                <span>{pdfPreview.length} lançamentos encontrados</span>
                <span className="mono" style={{color:"#f87171"}}>R$ {pdfPreview.reduce((s,t)=>s+t.valor,0).toFixed(2)}</span>
              </div>
              <div style={{maxHeight:200,overflowY:"auto",display:"flex",flexDirection:"column",gap:4}}>
                {pdfPreview.map((t,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:"rgba(255,255,255,.03)",borderRadius:8}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:11,color:"#f0f0f5",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.desc}</div>
                      <div style={{fontSize:9,color:"#444"}}>{t.cat}{t.parcela?` · ${t.parcela}`:""}</div>
                    </div>
                    <span className="mono" style={{fontSize:11,color:card.color,marginLeft:8,flexShrink:0}}>{fmtBRL(t.valor)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10}}>
            <button onClick={()=>{setShowPdfUpload(false);setPdfFile(null);setPdfPreview([]);}} style={{padding:"10px",borderRadius:10,border:"1px solid rgba(255,255,255,.08)",background:"transparent",color:"#555",fontSize:13,cursor:"pointer"}}>Cancelar</button>
            <button onClick={pdfPreview.length>0?confirmPdfImport:(!pdfFile?(()=>pdfInputRef.current?.click()):processPdf)} disabled={pdfProcessing}
              style={{padding:"10px",borderRadius:10,border:"none",background:!pdfFile||pdfProcessing?"#1a1a2a":card.color,color:!pdfFile||pdfProcessing?"#333":"#fff",fontSize:13,fontWeight:600,cursor:!pdfFile||pdfProcessing?"not-allowed":"pointer"}}>
              {pdfProcessing?"Processando...":pdfPreview.length>0?"✅ Confirmar":"🤖 Processar"}
            </button>
          </div>
        </Card>
      )}

      {/* JSON Import panel */}
      {showImport&&(
        <Card style={{borderColor:"rgba(255,255,255,.1)"}}>
          <div style={{fontSize:12,color:"#888",fontWeight:600,marginBottom:8}}>Importar via JSON</div>
          <textarea value={importJson} onChange={e=>setImportJson(e.target.value)}
            placeholder='{"tipo":"cartao","cartao":"inter","lancamentos":[...]}'
            style={{width:"100%",minHeight:80,background:"rgba(0,0,0,.4)",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,padding:10,color:"#f0f0f5",fontSize:10,outline:"none",resize:"vertical",fontFamily:"'JetBrains Mono',monospace",lineHeight:1.5}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
            <button onClick={()=>{setShowImport(false);setImportJson("");}} style={{padding:"10px",borderRadius:10,border:"1px solid rgba(255,255,255,.08)",background:"transparent",color:"#555",fontSize:13,cursor:"pointer"}}>Cancelar</button>
            <button onClick={doImport} style={{padding:"10px",borderRadius:10,border:"none",background:"#555",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>Importar</button>
          </div>
        </Card>
      )}

      {/* Contador */}
      {items.length>0&&(
        <div style={{fontSize:10,color:"#444",textAlign:"center",padding:"2px 0"}}>
          {items.length} lançamento{items.length>1?"s":""} · toque na categoria para editar
        </div>
      )}

      {items.map(t=>(
        <Card key={t.id} style={{padding:"10px 14px"}}>
          {/* Linha 1: descrição + valor + remover */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,color:"#f0f0f5",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.desc}</div>
              <div style={{fontSize:10,color:"#555",marginTop:1}}>{t.data||""}{t.parcela?` · Parcela ${t.parcela}`:""}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
              <span className="mono" style={{fontSize:14,color:card.color,fontWeight:600}}>{fmtBRL(t.valor)}</span>
              <button onClick={()=>remove(t.id)} style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.15)",borderRadius:6,padding:"3px 7px",color:"#f87171",fontSize:11,cursor:"pointer"}}>✕</button>
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
              <Btn outline color="#555" onClick={()=>setShowForm(false)}>Cancelar</Btn>
              <Btn color={card.color} onClick={add}>Salvar</Btn>
            </div>
          </div>
        </Card>
      )}
      <button onClick={()=>setShowForm(!showForm)} style={{padding:"12px",borderRadius:12,border:`1px dashed ${card.color}55`,background:"transparent",color:card.color,fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
        + Adicionar lançamento
      </button>
      <div style={{fontSize:10,color:"#1e1e28",textAlign:"center"}}>💡 Envie o extrato PDF/CSV ao Claude para importar automaticamente</div>
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
        <div style={{fontSize:10,color:"#666"}}>Total Pix / Variáveis</div>
        <div className="mono" style={{fontSize:24,color:"#22d3ee",fontWeight:600}}>{fmtBRL(total)}</div>
      </Card>
      {(month.variaveis||[]).map(p=>(
        <Card key={p.id} style={{padding:"10px 14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,color:"#f0f0f5"}}>{p.desc}</div>
              <div style={{fontSize:11,color:"#444"}}>{p.cat} · {p.banco} · {p.data}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginLeft:8,flexShrink:0}}>
              <span className="mono" style={{fontSize:14,color:"#22d3ee",fontWeight:500}}>{fmtBRL(p.valor)}</span>
              <button onClick={()=>setMonth({...month,variaveis:(month.variaveis||[]).filter(x=>x.id!==p.id)})} style={{background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.15)",borderRadius:6,padding:"3px 7px",color:"#f87171",fontSize:11,cursor:"pointer"}}>✕</button>
            </div>
          </div>
        </Card>
      ))}
      {showForm&&(
        <Card style={{borderColor:"rgba(34,211,238,.2)"}}>
          <div style={{fontSize:12,color:"#22d3ee",fontWeight:600,marginBottom:10}}>📱 Novo Pix / Variável</div>
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
              <Btn outline color="#555" onClick={()=>setShowForm(false)}>Cancelar</Btn>
              <Btn color="#22d3ee" onClick={add} style={{color:"#0a0a0f"}}>Salvar</Btn>
            </div>
          </div>
        </Card>
      )}
      <button onClick={()=>setShowForm(!showForm)} style={{padding:"12px",borderRadius:12,border:"1px dashed rgba(34,211,238,.35)",background:"transparent",color:"#22d3ee",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
        + Adicionar pagamento
      </button>
    </div>
  );
}

function InvestView({month,setMonth}) {
  const upd=(id,f,v)=>setMonth({...month,investimentos:month.investimentos.map(i=>i.id===id?{...i,[f]:Number(v)||0}:i)});
  const totalApl=month.investimentos.reduce((s,i)=>s+Number(i.aplicado||0),0);
  const totalAtu=month.investimentos.reduce((s,i)=>s+Number(i.atual||0),0);
  const rend=totalAtu-totalApl;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <Card style={{background:"rgba(167,139,250,.05)",borderColor:"rgba(167,139,250,.15)"}}>
          <div style={{fontSize:10,color:"#666"}}>Total Aplicado</div>
          <div className="mono" style={{fontSize:18,color:"#a78bfa",fontWeight:600}}>{fmtBRL(totalApl)}</div>
        </Card>
        <Card style={{background:rend>=0?"rgba(74,222,128,.05)":"rgba(239,68,68,.05)",borderColor:rend>=0?"rgba(74,222,128,.15)":"rgba(239,68,68,.15)"}}>
          <div style={{fontSize:10,color:"#666"}}>Rendimento Mês</div>
          <div className="mono" style={{fontSize:18,color:rend>=0?"#4ade80":"#f87171",fontWeight:600}}>{fmtBRL(rend)}</div>
        </Card>
      </div>
      {month.investimentos.map(inv=>(
        <Card key={inv.id}>
          <div style={{fontSize:13,fontWeight:600,color:"#a78bfa",marginBottom:8}}>{inv.produto}<span style={{fontSize:10,color:"#444",fontWeight:400,marginLeft:6}}>{inv.tipo}</span></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <Inp label="Valor Aplicado" type="number" value={inv.aplicado||""} onChange={v=>upd(inv.id,"aplicado",v)} placeholder="0,00"/>
            <Inp label="Valor Atual" type="number" value={inv.atual||""} onChange={v=>upd(inv.id,"atual",v)} placeholder="0,00"/>
          </div>
          {inv.aplicado>0&&(
            <div style={{marginTop:8,padding:"7px 10px",borderRadius:8,background:inv.atual>=inv.aplicado?"rgba(74,222,128,.07)":"rgba(239,68,68,.07)",display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:12,color:"#555"}}>Rendimento</span>
              <span className="mono" style={{fontSize:13,fontWeight:600,color:inv.atual>=inv.aplicado?"#4ade80":"#f87171"}}>{fmtBRL(inv.atual-inv.aplicado)} ({((inv.atual-inv.aplicado)/inv.aplicado*100).toFixed(1)}%)</span>
            </div>
          )}
        </Card>
      ))}
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
    "Mercado":"#4ade80","Comer fora":"#f97316","Delivery":"#fb923c",
    "Carro":"#94a3b8","Uber":"#64748b","Farmácia":"#f87171",
    "Empresa":"#818cf8","Casa":"#a78bfa","Apps":"#22d3ee",
    "Lazer":"#fbbf24","Compras":"#e879f9","Pet":"#86efac",
    "Família/Presentes":"#f9a8d4","Impostos":"#6b7280",
    "Educação":"#34d399","Viagem":"#38bdf8","Outro":"#475569","Saúde":"#4ade80",
  };

  const TAGS = [
    {id:"indispensavel", label:"✓ Indispensável", color:"#4ade80", bg:"rgba(74,222,128,.12)"},
    {id:"evitavel",      label:"✗ Evitável",      color:"#f87171", bg:"rgba(239,68,68,.12)"},
    {id:"indefinido",    label:"? Indefinido",    color:"#fbbf24", bg:"rgba(251,191,36,.12)"},
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
              + Number(month.bolsa||0) + Number(month.auxilio||0)
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
      + Number(md.bolsa||0) + Number(md.auxilio||0)
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
      <div style={{display:"flex",gap:4,background:"rgba(255,255,255,.04)",borderRadius:12,padding:4}}>
        {[["mes","📅 Mês"],["anual","📊 Anual"]].map(([v,l])=>(
          <button key={v} onClick={()=>setVisao(v)} style={{
            flex:1,padding:"8px",borderRadius:9,border:"none",
            background:visao===v?"rgba(124,106,247,.3)":"transparent",
            color:visao===v?"#a89cf7":"#444",fontSize:13,fontWeight:600,cursor:"pointer"
          }}>{l}</button>
        ))}
      </div>

      {visao==="mes"&&<>
        {/* Balanço */}
        <Card style={{padding:"12px"}}>
          <div style={{fontSize:10,color:"#555",fontWeight:600,textTransform:"uppercase",letterSpacing:.8,marginBottom:10}}>
            Balanço — {mesLabelAtual}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:10}}>
            {[["Receita",recT,"#4ade80"],["Despesas",totalDesp,"#f87171"],["Saldo",saldo,saldo>=0?"#4ade80":"#f87171"]].map(([l,v,cor])=>(
              <div key={l} style={{textAlign:"center",background:"rgba(255,255,255,.03)",borderRadius:10,padding:"8px 4px"}}>
                <div style={{fontSize:9,color:"#444",textTransform:"uppercase",letterSpacing:.6}}>{l}</div>
                <div className="mono" style={{fontSize:13,fontWeight:600,color:cor,marginTop:3}}>{fmtBRL(v)}</div>
              </div>
            ))}
          </div>
          {recT>0&&(
            <>
              <div style={{height:5,borderRadius:3,background:"rgba(255,255,255,.06)",overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.min(totalDesp/recT*100,100)}%`,background:saldo>=0?"#f97316":"#f87171",borderRadius:3}}/>
              </div>
              <div style={{fontSize:10,color:"#444",marginTop:4,textAlign:"right"}}>
                {(totalDesp/recT*100).toFixed(0)}% da receita comprometida
              </div>
            </>
          )}
        </Card>

        {/* Economia potencial */}
        {(evitavel>0||semTag>0)&&(
          <Card style={{borderColor:"rgba(251,191,36,.2)"}}>
            <div style={{fontSize:10,color:"#fbbf24",fontWeight:600,textTransform:"uppercase",letterSpacing:.8,marginBottom:8}}>
              💡 Análise de gastos
            </div>
            {evitavel>0&&(
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <span style={{fontSize:12,color:"#888"}}>Gastos evitáveis</span>
                <span className="mono" style={{fontSize:14,color:"#f87171",fontWeight:700}}>{fmtBRL(evitavel)}</span>
              </div>
            )}
            {semTag>0&&(
              <div style={{fontSize:11,color:"#555"}}>
                {semTag} lançamento(s) ainda sem classificação — toque numa categoria abaixo para classificar
              </div>
            )}
            {evitavel>0&&recT>0&&(
              <div style={{marginTop:6,padding:"6px 10px",background:"rgba(74,222,128,.06)",borderRadius:8,fontSize:11,color:"#4ade80"}}>
                Sem os gastos evitáveis, seu saldo seria {fmtBRL(saldo+evitavel)}
              </div>
            )}
          </Card>
        )}

        {/* Categorias */}
        {sortedAtual.length>0&&(
          <Card>
            <div style={{fontSize:10,color:"#555",fontWeight:600,textTransform:"uppercase",letterSpacing:.8,marginBottom:14}}>
              Gastos por categoria — {mesLabelAtual}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {sortedAtual.map(([cat,val])=>{
                const pct = grandTotal>0?(val/grandTotal*100):0;
                const cor = CORES_CAT[cat]||"#7c6af7";
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
                        <span style={{fontSize:12,color:isSelected?cor:"#ccc",fontWeight:isSelected?600:400}}>{cat}</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:10,color:"#444"}}>{pct.toFixed(1)}%</span>
                        <span className="mono" style={{fontSize:12,color:cor,fontWeight:600,minWidth:72,textAlign:"right"}}>{fmtBRL(val)}</span>
                      </div>
                    </div>
                    <div style={{height:5,background:"rgba(255,255,255,.05)",borderRadius:3,overflow:"hidden"}}>
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
          <Card style={{borderColor:`${CORES_CAT[catSel]||"#7c6af7"}33`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:11,color:CORES_CAT[catSel]||"#7c6af7",fontWeight:600,textTransform:"uppercase",letterSpacing:.6}}>
                {catSel}
              </div>
              <span className="mono" style={{fontSize:12,color:CORES_CAT[catSel]||"#7c6af7",fontWeight:700}}>
                {fmtBRL(lancCatSel.reduce((s,t)=>s+Number(t.valor||0),0))}
              </span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {lancCatSel.map((t,i)=>{
                const tagAtual = TAGS.find(tg=>tg.id===t.tag);
                return (
                  <div key={t.id||i} style={{padding:"8px 10px",background:"rgba(255,255,255,.03)",borderRadius:10,
                    borderLeft:`3px solid ${tagAtual?.color||"rgba(255,255,255,.1)"}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,color:"#f0f0f5",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.desc}</div>
                        <div style={{fontSize:10,color:"#444",marginTop:2}}>{t.data}{t.parcela?` · ${t.parcela}`:""}</div>
                      </div>
                      <span className="mono" style={{fontSize:13,color:"#f87171",fontWeight:600,marginLeft:8,flexShrink:0}}>{fmtBRL(t.valor)}</span>
                    </div>
                    {/* Tags */}
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                      {TAGS.map(tg=>(
                        <button key={tg.id} onClick={e=>{e.stopPropagation();setTag(t.id, t.tag===tg.id?null:tg.id);}}
                          style={{padding:"3px 8px",borderRadius:8,border:`1px solid ${t.tag===tg.id?tg.color:"rgba(255,255,255,.08)"}`,
                            background:t.tag===tg.id?tg.bg:"transparent",
                            color:t.tag===tg.id?tg.color:"#444",fontSize:10,fontWeight:600,cursor:"pointer"}}>
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
            <div style={{fontSize:10,color:"#555",fontWeight:600,textTransform:"uppercase",letterSpacing:.8,marginBottom:10}}>
              Maiores gastos — {mesLabelAtual}
            </div>
            {[...todosAtual].sort((a,b)=>Number(b.valor||0)-Number(a.valor||0)).slice(0,8).map((t,i)=>{
              const tagAtual = TAGS.find(tg=>tg.id===t.tag);
              return (
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                  padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,.04)"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,color:"#f0f0f5",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.desc}</div>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginTop:2}}>
                      <div style={{width:6,height:6,borderRadius:2,background:CORES_CAT[t.cat]||"#555",flexShrink:0}}/>
                      <span style={{fontSize:10,color:"#444"}}>{t.cat}</span>
                      {tagAtual&&<span style={{fontSize:9,color:tagAtual.color,background:tagAtual.bg,padding:"1px 5px",borderRadius:4}}>{tagAtual.label}</span>}
                    </div>
                  </div>
                  <span className="mono" style={{fontSize:13,color:"#f87171",fontWeight:500,marginLeft:8,flexShrink:0}}>{fmtBRL(t.valor)}</span>
                </div>
              );
            })}
          </Card>
        )}
      </>}

      {visao==="anual"&&<>
        {/* Receita vs Despesa */}
        <Card>
          <div style={{fontSize:10,color:"#555",fontWeight:600,textTransform:"uppercase",letterSpacing:.8,marginBottom:14}}>
            Receita vs Despesa — 12 meses
          </div>
          {loadingHistory?(
            <div style={{textAlign:"center",padding:"20px 0",color:"#333",fontSize:12}}>Carregando…</div>
          ):(
            <>
              <div style={{display:"flex",alignItems:"flex-end",gap:4,height:120}}>
                {mesesOrdenados.map((k,i)=>{
                  const rec=receitasMeses[i], desp=despesasMeses[i];
                  const isCur=k===mesKey;
                  return (
                    <div key={k} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                      <div style={{width:"100%",display:"flex",gap:1,alignItems:"flex-end",height:100}}>
                        <div style={{flex:1,background:"#4ade8088",borderRadius:"3px 3px 0 0",height:`${rec/maxBar*100}%`,minHeight:rec>0?2:0}}/>
                        <div style={{flex:1,background:"#f8717188",borderRadius:"3px 3px 0 0",height:`${desp/maxBar*100}%`,minHeight:desp>0?2:0}}/>
                      </div>
                      <span style={{fontSize:8,color:isCur?"#f0f0f5":"#444",fontWeight:isCur?700:400}}>{mesesLabel2[i]}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{display:"flex",gap:12,marginTop:8,justifyContent:"center"}}>
                {[["#4ade80","Receita"],["#f87171","Despesa"]].map(([cor,l])=>(
                  <div key={l} style={{display:"flex",alignItems:"center",gap:4}}>
                    <div style={{width:8,height:8,borderRadius:2,background:cor}}/>
                    <span style={{fontSize:10,color:"#555"}}>{l}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* Saldo mensal */}
        <Card>
          <div style={{fontSize:10,color:"#555",fontWeight:600,textTransform:"uppercase",letterSpacing:.8,marginBottom:12}}>
            Saldo mensal
          </div>
          {mesesOrdenados.map((k,i)=>{
            const saldoM=saldosMeses[i];
            const isCur=k===mesKey;
            return (
              <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                padding:"6px 10px",borderRadius:8,marginBottom:4,
                background:isCur?"rgba(255,255,255,.05)":"transparent",
                border:isCur?"1px solid rgba(255,255,255,.08)":"1px solid transparent"}}>
                <span style={{fontSize:12,color:isCur?"#f0f0f5":"#666",fontWeight:isCur?600:400}}>{mesesLabel2[i]}</span>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span className="mono" style={{fontSize:10,color:"#555"}}>{fmtBRL(receitasMeses[i])}</span>
                  <span style={{fontSize:10,color:"#333"}}>–</span>
                  <span className="mono" style={{fontSize:10,color:"#555"}}>{fmtBRL(despesasMeses[i])}</span>
                  <span style={{fontSize:10,color:"#333"}}>=</span>
                  <span className="mono" style={{fontSize:12,color:saldoM>=0?"#4ade80":"#f87171",fontWeight:600}}>{fmtBRL(saldoM)}</span>
                </div>
              </div>
            );
          })}
        </Card>

        {/* Categoria por mês */}
        <Card>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:10,color:"#555",fontWeight:600,textTransform:"uppercase",letterSpacing:.8}}>
              Categoria por mês
            </div>
            <select value={catAnual||""} onChange={e=>setCatAnual(e.target.value||null)}
              style={{background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.12)",borderRadius:8,
                padding:"5px 10px",color:"#a89cf7",fontSize:11,fontWeight:600,outline:"none",cursor:"pointer"}}>
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
                  const cor=CORES_CAT[catAnual]||"#7c6af7";
                  return (
                    <div key={k} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                      {val>0&&<span className="mono" style={{fontSize:7,color:cor}}>{val>=1000?`${(val/1000).toFixed(1)}k`:val.toFixed(0)}</span>}
                      <div style={{width:"100%",height:80,display:"flex",alignItems:"flex-end"}}>
                        <div style={{width:"100%",background:isCur?cor:`${cor}66`,borderRadius:"3px 3px 0 0",
                          height:`${val/maxCat*100}%`,minHeight:val>0?2:0}}/>
                      </div>
                      <span style={{fontSize:8,color:isCur?"#f0f0f5":"#444",fontWeight:isCur?700:400}}>{mesesLabel2[i]}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{marginTop:10,padding:"8px 10px",background:"rgba(255,255,255,.03)",borderRadius:8,display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:11,color:"#555"}}>{catAnual} — média</span>
                <span className="mono" style={{fontSize:12,color:CORES_CAT[catAnual]||"#7c6af7",fontWeight:600}}>
                  {fmtBRL(catDados.filter(v=>v>0).reduce((s,v,_,a)=>s+v/a.length,0))}
                </span>
              </div>
            </>
          )}
          {!catAnual&&<div style={{textAlign:"center",padding:"20px 0",color:"#333",fontSize:12}}>Selecione uma categoria</div>}
        </Card>

        {/* Ranking */}
        <Card>
          <div style={{fontSize:10,color:"#555",fontWeight:600,textTransform:"uppercase",letterSpacing:.8,marginBottom:12}}>
            Total por categoria — período
          </div>
          {Array.from(todasCatsAnual).sort().map(cat=>{
            const total=mesesOrdenados.reduce((s,k)=>{
              const md=allMonths[k]; if(!md) return s;
              return s+[...Object.values(md.cartoes||{}).flat(),...(md.variaveis||[])].filter(t=>t.cat===cat).reduce((ss,t)=>ss+Number(t.valor||0),0);
            },0);
            const cor=CORES_CAT[cat]||"#7c6af7";
            const maxTotal=Math.max(...Array.from(todasCatsAnual).map(c=>mesesOrdenados.reduce((s,k)=>{
              const md=allMonths[k]; if(!md) return s;
              return s+[...Object.values(md.cartoes||{}).flat(),...(md.variaveis||[])].filter(t=>t.cat===c).reduce((ss,t)=>ss+Number(t.valor||0),0);
            },0)),1);
            return (
              <div key={cat} style={{marginBottom:10,cursor:"pointer"}} onClick={()=>{setCatAnual(cat===catAnual?null:cat);}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:8,height:8,borderRadius:2,background:cor,flexShrink:0}}/>
                    <span style={{fontSize:12,color:catAnual===cat?cor:"#ccc",fontWeight:catAnual===cat?600:400}}>{cat}</span>
                  </div>
                  <span className="mono" style={{fontSize:11,color:cor}}>{fmtBRL(total)}</span>
                </div>
                <div style={{height:3,background:"rgba(255,255,255,.05)",borderRadius:2}}>
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

function ConfigView({cats,setCats}) {
  const [nova,setNova]=useState("");
  const [editIdx,setEditIdx]=useState(null);
  const [editVal,setEditVal]=useState("");

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

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <Card>
        <div style={{fontSize:10,color:"#555",fontWeight:600,textTransform:"uppercase",letterSpacing:.8,marginBottom:12}}>
          Categorias de gastos
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {cats.map((cat,i)=>(
            <div key={cat} style={{display:"flex",alignItems:"center",gap:8}}>
              {editIdx===i?(
                <>
                  <input value={editVal} onChange={e=>setEditVal(e.target.value)}
                    style={{flex:1,background:"rgba(255,255,255,.06)",border:"1px solid rgba(124,106,247,.3)",borderRadius:8,padding:"6px 10px",color:"#f0f0f5",fontSize:13,outline:"none"}}/>
                  <button onClick={()=>saveEdit(i)} style={{background:"rgba(124,106,247,.2)",border:"1px solid rgba(124,106,247,.3)",borderRadius:7,padding:"5px 10px",color:"#a89cf7",fontSize:11,cursor:"pointer"}}>✓</button>
                  <button onClick={()=>setEditIdx(null)} style={{background:"transparent",border:"1px solid rgba(255,255,255,.08)",borderRadius:7,padding:"5px 10px",color:"#555",fontSize:11,cursor:"pointer"}}>✕</button>
                </>
              ):(
                <>
                  <span style={{flex:1,fontSize:13,color:"#f0f0f5"}}>{cat}</span>
                  <button onClick={()=>{setEditIdx(i);setEditVal(cat);}} style={{background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.08)",borderRadius:7,padding:"4px 9px",color:"#666",fontSize:11,cursor:"pointer"}}>✏</button>
                  <button onClick={()=>removeCat(cat)} style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.15)",borderRadius:7,padding:"4px 9px",color:"#f87171",fontSize:11,cursor:"pointer"}}>✕</button>
                </>
              )}
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:8,marginTop:12}}>
          <input value={nova} onChange={e=>setNova(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&addCat()}
            placeholder="Nova categoria..."
            style={{flex:1,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.08)",borderRadius:10,padding:"9px 12px",color:"#f0f0f5",fontSize:13,outline:"none"}}/>
          <button onClick={addCat} style={{background:"#7c6af7",border:"none",borderRadius:10,padding:"9px 14px",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>+</button>
        </div>
        <button onClick={()=>{setCats([...CATS_DEFAULT]);save("config:cats",[...CATS_DEFAULT]);}} style={{marginTop:8,background:"transparent",border:"1px solid rgba(255,255,255,.06)",borderRadius:8,padding:"6px",color:"#333",fontSize:11,cursor:"pointer",width:"100%"}}>
          Restaurar categorias padrão
        </button>
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
  const storageKey=`month:${mesKey}`;

  const setCats=(newCats)=>{ CATS=newCats; setCatsState(newCats); };

  // Load cats from storage
  useEffect(()=>{
    load("config:cats").then(d=>{ if(d&&Array.isArray(d)){ CATS=d; setCatsState(d); } });
  },[]);

  // Auto-load from Supabase on first open if localStorage is empty
  useEffect(()=>{
    const hasLocal = Object.keys(localStorage).some(k=>k.startsWith("month:"));
    if(!hasLocal) {
      setGdriveStatus("connecting");
      supabaseLoad().then(remoteData=>{
        if(remoteData) {
          for(const [key,val] of Object.entries(remoteData)) {
            localStorage.setItem(key, typeof val==="string"?val:JSON.stringify(val));
          }
        }
        setGdriveStatus("idle");
      }).catch(()=>setGdriveStatus("idle"));
    }
  },[]);

  useEffect(()=>{
    setMonthRaw(null);
    load(storageKey).then(d=>{
      if(!d){ setMonthRaw(seedMonth(mesKey)); return; }
      // Migrate: ensure all fields exist (handles old 'pix' format)
      const seed=seedMonth(mesKey);
      const migrated={
        ...seed,
        ...d,
        variaveis: d.variaveis||d.pix||[],
        cartoes: d.cartoes||seed.cartoes,
        plantoes: (d.plantoes||seed.plantoes).map((p,i)=>({
          ativo:true,
          diaReceb: seed.plantoes[i]?.diaReceb||0,
          statusReceb:"aguardando",
          ...p,
        })),
        bolsaDia: d.bolsaDia||5,
        bolsaStatus: d.bolsaStatus||"aguardando",
        auxilioDia: d.auxilioDia||5,
        auxilioStatus: d.auxilioStatus||"aguardando",
        fixas: d.fixas||seed.fixas,
        investimentos: d.investimentos||seed.investimentos,
        bolsa: d.bolsa||0,
        auxilio: d.auxilio||0,
        receitasExtra: d.receitasExtra||[],
      };
      setMonthRaw(migrated);
    });
    setView("dashboard");
  },[mesKey]);
  useEffect(()=>{
    if(!month) return;
    setSaving(true);
    const t=setTimeout(async()=>{
      await save(storageKey,month);
      // Auto-sync to Supabase (debounced 3s)
      try {
        const allKeys = Object.keys(localStorage).filter(k=>k.startsWith("month:"));
        const localData = {};
        for(const key of allKeys) {
          try { localData[key] = JSON.parse(localStorage.getItem(key)); } catch {}
        }
        await supabaseSave(localData);
      } catch(e) { console.warn("Auto-sync failed:", e); }
      setSaving(false);
    }, 3000);
    return()=>clearTimeout(t);
  },[month]);

  const migrateMonth = (d, key) => {
    if(!d) return null;
    const seed = seedMonth(key);
    return {
      ...seed, ...d,
      variaveis: d.variaveis||d.pix||[],
      cartoes: d.cartoes||seed.cartoes,
      plantoes: (d.plantoes||seed.plantoes).map((p,i)=>({
        ativo:true, diaReceb:seed.plantoes[i]?.diaReceb||0, statusReceb:"aguardando", ...p,
      })),
      bolsaDia:d.bolsaDia||5, bolsaStatus:d.bolsaStatus||"aguardando",
      auxilioDia:d.auxilioDia||5, auxilioStatus:d.auxilioStatus||"aguardando",
      fixas:d.fixas||seed.fixas, investimentos:d.investimentos||seed.investimentos,
      bolsa:d.bolsa||0, auxilio:d.auxilio||0, receitasExtra:d.receitasExtra||[],
    };
  };

  const countData = (d) => {
    if(!d) return 0;
    return Object.values(d.cartoes||{}).flat().length
      + (d.variaveis||[]).length
      + (d.receitasExtra||[]).length
      + (d.plantoes||[]).filter(p=>p.n>0||p.horas>0).length
      + (d.fixas||[]).filter(f=>f.valor>0).length;
  };

  // Salva dados locais no Supabase
  const backupToDrive = async () => {
    setGdriveStatus("connecting");
    try {
      const allKeys = Object.keys(localStorage).filter(k=>k.startsWith("month:"));
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
      <div style={{maxWidth:480,margin:"0 auto",minHeight:"100vh",background:"#0a0a0f",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0 32px"}}>
        <div style={{fontSize:48,marginBottom:16}}>🦁</div>
        <div style={{fontSize:22,fontWeight:700,letterSpacing:-.5,marginBottom:4}}>Finanças Pessoais</div>
        <div style={{fontSize:12,color:"#333",marginBottom:40}}>Acesso restrito</div>
        <div style={{width:"100%",display:"flex",flexDirection:"column",gap:12}}>
          <input
            type="password"
            value={senha}
            onChange={e=>setSenha(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&tentarLogin()}
            placeholder="Senha"
            autoFocus
            style={{
              background:"rgba(255,255,255,.06)",
              border:`1px solid ${erroSenha?"rgba(239,68,68,.5)":"rgba(255,255,255,.1)"}`,
              borderRadius:12,padding:"14px 16px",color:"#f0f0f5",
              fontSize:16,outline:"none",width:"100%",textAlign:"center",
              letterSpacing:4,transition:"border .2s"
            }}
          />
          {erroSenha&&<div style={{textAlign:"center",fontSize:12,color:"#f87171"}}>Senha incorreta</div>}
          <button onClick={tentarLogin} style={{
            background:"#7c6af7",border:"none",borderRadius:12,
            padding:"14px",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"
          }}>Entrar</button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <style>{G}</style>
      <div style={{maxWidth:480,margin:"0 auto",minHeight:"100vh",background:"#0a0a0f",display:"flex",flexDirection:"column"}}>
        <div style={{position:"sticky",top:0,zIndex:20,background:"linear-gradient(#0a0a0f 80%,transparent)",padding:"14px 16px 0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div>
              <div style={{fontSize:9,color:"#2a2a35",textTransform:"uppercase",letterSpacing:2}}>Finanças Pessoais</div>
              <div style={{fontSize:18,fontWeight:700,letterSpacing:-.5}}>{NAV.find(n=>n.id===view)?.label}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{display:"flex",gap:4,alignItems:"center"}}>
              {gdriveStatus==="connecting"&&<span style={{fontSize:10,color:"#555"}}>⏳</span>}
              {gdriveStatus==="synced"&&<span style={{fontSize:10,color:"#4ade80"}}>✓ Sync</span>}
              {gdriveStatus==="error"&&<span style={{fontSize:10,color:"#f87171",cursor:"pointer"}} onClick={backupToDrive}>↻ Retry</span>}
              <button onClick={restoreFromDrive} title="Carregar dados de outro dispositivo" style={{
                background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",
                borderRadius:8,padding:"3px 8px",color:"#333",
                fontSize:10,cursor:"pointer",
              }}>⬇</button>
            </div>
            <div style={{width:6,height:6,borderRadius:"50%",background:saving?"#fbbf24":"#4ade80",transition:"background .3s"}}/>
          </div>
          </div>
          <MonthNav mesKey={mesKey} setMesKey={setMesKeyRaw}/>
          <div style={{display:"flex",gap:4,overflowX:"auto",padding:"8px 0 2px",scrollbarWidth:"none"}}>
            {NAV.map(n=>(
              <button key={n.id} onClick={()=>setView(n.id)} style={{padding:"6px 14px",borderRadius:20,border:"none",cursor:"pointer",fontSize:12,fontWeight:500,background:view===n.id?"rgba(124,106,247,.25)":"rgba(255,255,255,.05)",color:view===n.id?"#a89cf7":"#555",flexShrink:0,transition:"all .2s"}}>
                {n.label}
              </button>
            ))}
          </div>
          <div style={{height:1,background:"rgba(255,255,255,.04)",marginTop:6}}/>
        </div>

        <div style={{flex:1,padding:"10px 16px 90px"}}>
          {!month?<div style={{textAlign:"center",padding:"60px 0",color:"#222"}}>Carregando…</div>
            :view==="dashboard"?<Dashboard month={month} setView={setView}/>
            :view==="plantoes"?<PlantoesView month={month} setMonth={setMonthRaw} mesKey={mesKey}/>
            :view==="fixas"?<FixasView month={month} setMonth={setMonthRaw}/>
            :view==="cartoes"?<CartoesView month={month} setMonth={setMonthRaw}/>
            :view==="variaveis"?<PixView month={month} setMonth={setMonthRaw}/>
            :view==="investimentos"?<InvestView month={month} setMonth={setMonthRaw}/>
            :view==="analise"?<AnáliseView month={month} mesKey={mesKey} setMonth={setMonthRaw}/>
            :view==="config"?<ConfigView cats={cats} setCats={setCats}/>
            :null}
        </div>

        <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"rgba(10,10,15,.92)",backdropFilter:"blur(20px)",borderTop:"1px solid rgba(255,255,255,.05)",display:"flex",padding:"8px 4px 18px"}}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>setView(n.id)} style={{flex:1,padding:"6px 2px",border:"none",background:"transparent",cursor:"pointer",fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,color:view===n.id?"#a89cf7":"#2a2a35",transition:"color .2s",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <div style={{width:20,height:2,borderRadius:1,background:view===n.id?"#7c6af7":"transparent",transition:"all .2s"}}/>
              {n.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
