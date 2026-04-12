import { useState, useRef } from "react";

const CATS = ["Mercado","Comer fora","Delivery","Carro","Uber","Farmácia","Empresa","Casa","Apps","Lazer","Compras","Pet","Família/Presentes","Impostos","Educação","Viagem","Outro"];
const CARDS = ["inter","itau","will"];
const CARD_LABELS = { inter:"🟠 Inter", itau:"🔵 Itaú", will:"🟡 Will" };
const CARD_COLORS = { inter:"#E05A00", itau:"#0D2B6E", will:"#B8860B" };
const fmtBRL = v => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v||0);

const G = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Sora',sans-serif;background:#0a0a0f;color:#f0f0f5;min-height:100vh;}
  .mono{font-family:'JetBrains Mono',monospace;}
  input,select,button,textarea{font-family:'Sora',sans-serif;}
  ::-webkit-scrollbar{width:3px;} ::-webkit-scrollbar-thumb{background:#222;}
  @keyframes spin{to{transform:rotate(360deg)}}
  .spin{display:inline-block;animation:spin 1s linear infinite;}
`;

const Card = ({children,style={}}) => (
  <div style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",borderRadius:14,padding:14,...style}}>
    {children}
  </div>
);

const Sel = ({value,onChange,options,style={}}) => (
  <select value={value} onChange={e=>onChange(e.target.value)}
    style={{background:"#111118",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,padding:"5px 8px",color:"#f0f0f5",fontSize:11,outline:"none",...style}}>
    {options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
  </select>
);

function pdfToBase64(file) {
  return new Promise((res,rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = () => rej(new Error("Falha ao ler o arquivo"));
    r.readAsDataURL(file);
  });
}

async function processarComClaude(base64, tipo, cartao) {
  const prompt = tipo === "fatura_cartao"
    ? `Analise esta fatura do cartão ${cartao.toUpperCase()} e extraia os lançamentos de compras.

IGNORE: PAGTO DEBITO AUTOMATICO, créditos/estornos (valores com "+"), IOF INTERNACIONAL isolado, encargos/juros/multas, seção "Fatura anterior" (IOF ADIC, JUROS DE MORA, MULTA, IOF ROTATIVO), seção "Recebidos", pagamentos de fatura.

Para cada compra válida extraia:
{"desc":"nome limpo","valor":0.00,"parcela":"X/Y ou vazio","data":"DD/MM/YYYY"}

Limpe os nomes: remova "MLP*", "IFD*", "PAYPAL *", "MARKET4U*COMPRA*123456". Market4U sem nome = "Mercado (Market4U)".
Parcelas "(Parcela XX de YY)" = "XX/YY".

Retorne SOMENTE o array JSON.`
    : `Analise este extrato bancário e extraia apenas as saídas de dinheiro.

INCLUA: "Pix enviado" (nome após CPF), "Compra no debito" (nome estabelecimento), "Pagamento efetuado" (beneficiário, exceto pagamentos da própria fatura Inter), "Deb Mensal".

IGNORE: "Pix recebido", "Credito liberado", "Cashback", pagamentos de fatura do cartão Inter.

Para cada saída:
{"desc":"descrição limpa","valor":0.00,"data":"DD/MM/YYYY","tipo":"pix ou debito ou pagamento"}

Retorne SOMENTE o array JSON.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({
      model:"claude-sonnet-4-20250514",
      max_tokens:4000,
      messages:[{
        role:"user",
        content:[
          {type:"document",source:{type:"base64",media_type:"application/pdf",data:base64}},
          {type:"text",text:prompt}
        ]
      }]
    })
  });
  if(!res.ok) throw new Error(`Erro API: ${res.status}`);
  const data = await res.json();
  const txt = data.content?.map(b=>b.text||"").join("")||"";
  return JSON.parse(txt.replace(/```json|```/g,"").trim());
}

const RULES = [
  [["market4u","carrefour","assai","padaria","panificadora","piriquito","hortifruti","atacadao","pao de acucar","supermercado"],"Mercado"],
  [["sampa cafe","oxxo","hamburger","osnir","mani ","cantina","churrascaria","restaurante","lanchonete","pizza","minuto pa","delta quality","bar ","lanche","cafe "],"Comer fora"],
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

function categorizar(desc) {
  const d = (desc||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  for(const [keys,cat] of RULES) if(keys.some(k=>d.includes(k))) return cat;
  return "Outro";
}

export default function App() {
  const [step,setStep]=useState("input");
  const [tipo,setTipo]=useState("fatura_cartao");
  const [cartao,setCartao]=useState("inter");
  const [arquivo,setArquivo]=useState(null);
  const [loading,setLoading]=useState(false);
  const [loadMsg,setLoadMsg]=useState("");
  const [erro,setErro]=useState(null);
  const [transacoes,setTransacoes]=useState([]);
  const [jsonFinal,setJsonFinal]=useState(null);
  const [copiado,setCopiado]=useState(false);
  const inputRef=useRef();

  const onFile=e=>{
    const f=e.target.files?.[0];
    if(f&&f.type==="application/pdf"){setArquivo(f);setErro(null);}
    else if(f) setErro("Selecione um arquivo PDF.");
  };

  const processar=async()=>{
    if(!arquivo) return;
    setLoading(true);setErro(null);
    try{
      setLoadMsg("Lendo o PDF...");
      const base64=await pdfToBase64(arquivo);
      setLoadMsg("Claude analisando o extrato...");
      const parsed=await processarComClaude(base64,tipo,cartao);
      setLoadMsg("Categorizando...");
      setTransacoes(parsed.map((t,i)=>({...t,id:i,cat:categorizar(t.desc),incluir:true,parcela:t.parcela||""})));
      setStep("review");
    }catch(e){
      setErro("Erro: "+e.message);
    }finally{
      setLoading(false);setLoadMsg("");
    }
  };

  const updT=(id,f,v)=>setTransacoes(ts=>ts.map(t=>t.id===id?{...t,[f]:v}:t));

  const confirmar=()=>{
    const inc=transacoes.filter(t=>t.incluir);
    const total=inc.reduce((s,t)=>s+Number(t.valor||0),0);
    setJsonFinal(tipo==="fatura_cartao"
      ?{tipo:"cartao",cartao,lancamentos:inc.map(({desc,cat,parcela,valor})=>({desc,cat,parcela,valor:Number(valor)})),total}
      :{tipo:"variaveis",lancamentos:inc.map(({desc,cat,data,valor,tipo:tp})=>({desc,cat,banco:"Inter",data,tipo:tp,valor:Number(valor)})),total}
    );
    setStep("done");
  };

  const copiar=()=>{
    navigator.clipboard?.writeText(JSON.stringify(jsonFinal,null,2));
    setCopiado(true);setTimeout(()=>setCopiado(false),2000);
  };

  const reset=()=>{setStep("input");setTransacoes([]);setJsonFinal(null);setArquivo(null);setErro(null);};

  const totalInc=transacoes.filter(t=>t.incluir).reduce((s,t)=>s+Number(t.valor||0),0);
  const catTotals=CATS.reduce((acc,cat)=>{
    const v=transacoes.filter(t=>t.incluir&&t.cat===cat).reduce((s,t)=>s+Number(t.valor||0),0);
    if(v>0) acc[cat]=v; return acc;
  },{});

  return (
    <>
      <style>{G}</style>
      <div style={{maxWidth:680,margin:"0 auto",padding:"20px 16px 60px",minHeight:"100vh"}}>

        {/* Header */}
        <div style={{marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:9,color:"#2a2a35",textTransform:"uppercase",letterSpacing:2}}>Importador de Extrato</div>
            <div style={{fontSize:20,fontWeight:700,letterSpacing:-.5,marginTop:2}}>
              {step==="input"?"📄 Selecionar PDF":step==="review"?"✏️ Revisar lançamentos":"✅ JSON gerado"}
            </div>
          </div>
          {step!=="input"&&<button onClick={reset} style={{background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.08)",borderRadius:8,padding:"6px 14px",color:"#555",fontSize:12,cursor:"pointer",marginTop:4}}>← Novo</button>}
        </div>

        {/* ── INPUT ── */}
        {step==="input"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Card>
              <div style={{fontSize:10,color:"#555",fontWeight:600,textTransform:"uppercase",letterSpacing:.8,marginBottom:10}}>Tipo de extrato</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[["fatura_cartao","💳 Fatura de cartão"],["extrato_bancario","📱 Extrato bancário (Pix)"]].map(([v,l])=>(
                  <button key={v} onClick={()=>setTipo(v)} style={{padding:"12px 8px",borderRadius:10,cursor:"pointer",fontSize:12,fontWeight:600,border:`2px solid ${tipo===v?"#7c6af7":"rgba(255,255,255,.08)"}`,background:tipo===v?"rgba(124,106,247,.12)":"rgba(255,255,255,.03)",color:tipo===v?"#a89cf7":"#555",transition:"all .2s"}}>{l}</button>
                ))}
              </div>
              {tipo==="fatura_cartao"&&(
                <div style={{marginTop:12}}>
                  <div style={{fontSize:10,color:"#555",fontWeight:600,textTransform:"uppercase",letterSpacing:.8,marginBottom:8}}>Cartão</div>
                  <div style={{display:"flex",gap:8}}>
                    {CARDS.map(c=>(
                      <button key={c} onClick={()=>setCartao(c)} style={{flex:1,padding:"10px 4px",borderRadius:10,cursor:"pointer",border:`2px solid ${cartao===c?CARD_COLORS[c]:"rgba(255,255,255,.08)"}`,background:cartao===c?`${CARD_COLORS[c]}18`:"rgba(255,255,255,.03)",color:cartao===c?CARD_COLORS[c]:"#555",fontSize:12,fontWeight:600,transition:"all .2s"}}>{CARD_LABELS[c]}</button>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <Card style={{cursor:"pointer",borderColor:arquivo?"rgba(124,106,247,.3)":"rgba(255,255,255,.07)",background:arquivo?"rgba(124,106,247,.06)":"rgba(255,255,255,.04)"}} onClick={()=>inputRef.current?.click()}>
              <input ref={inputRef} type="file" accept=".pdf,application/pdf" onChange={onFile} style={{display:"none"}}/>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"24px 0",gap:10}}>
                <div style={{fontSize:40}}>{arquivo?"📄":"📂"}</div>
                {arquivo
                  ?<><div style={{fontSize:13,fontWeight:600,color:"#a89cf7"}}>{arquivo.name}</div><div style={{fontSize:11,color:"#555"}}>{(arquivo.size/1024).toFixed(0)} KB · toque para trocar</div></>
                  :<><div style={{fontSize:13,fontWeight:600,color:"#555"}}>Toque para selecionar o PDF</div><div style={{fontSize:11,color:"#333"}}>Fatura do cartão ou extrato bancário</div></>
                }
              </div>
            </Card>

            {erro&&<div style={{padding:"10px 14px",borderRadius:10,background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",fontSize:12,color:"#f87171"}}>⚠️ {erro}</div>}

            <button onClick={processar} disabled={loading||!arquivo} style={{padding:"15px",borderRadius:12,border:"none",background:loading||!arquivo?"#111118":"#7c6af7",color:loading||!arquivo?"#333":"#fff",fontSize:14,fontWeight:600,cursor:loading||!arquivo?"not-allowed":"pointer",transition:"all .2s"}}>
              {loading?<><span className="spin">⚙️</span> {loadMsg}</>:"🤖 Processar com IA"}
            </button>

            <div style={{fontSize:10,color:"#1e1e28",textAlign:"center",lineHeight:1.8}}>
              O Claude lê o PDF, extrai os lançamentos e categoriza automaticamente.<br/>
              Você revisa e ajusta antes de importar para o app.
            </div>
          </div>
        )}

        {/* ── REVIEW ── */}
        {step==="review"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <Card style={{padding:"12px"}}>
                <div style={{fontSize:10,color:"#555"}}>Incluídos</div>
                <div style={{fontSize:24,fontWeight:700}}>{transacoes.filter(t=>t.incluir).length}</div>
                <div style={{fontSize:10,color:"#333",marginTop:2}}>{transacoes.filter(t=>!t.incluir).length} excluídos</div>
              </Card>
              <Card style={{background:"rgba(239,68,68,.05)",borderColor:"rgba(239,68,68,.15)",padding:"12px"}}>
                <div style={{fontSize:10,color:"#555"}}>Total</div>
                <div className="mono" style={{fontSize:20,fontWeight:600,color:"#f87171"}}>{fmtBRL(totalInc)}</div>
                {tipo==="fatura_cartao"&&<div style={{fontSize:10,color:"#444",marginTop:2}}>{CARD_LABELS[cartao]}</div>}
              </Card>
            </div>

            {Object.keys(catTotals).length>0&&(
              <Card style={{padding:"12px"}}>
                <div style={{fontSize:10,color:"#555",fontWeight:600,textTransform:"uppercase",letterSpacing:.8,marginBottom:8}}>Por categoria</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).map(([cat,val])=>(
                    <div key={cat} style={{background:"rgba(124,106,247,.08)",border:"1px solid rgba(124,106,247,.15)",borderRadius:8,padding:"4px 10px"}}>
                      <span style={{fontSize:11,color:"#a89cf7"}}>{cat}</span>
                      <span className="mono" style={{fontSize:10,color:"#444",marginLeft:6}}>{fmtBRL(val)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button onClick={()=>setTransacoes(ts=>ts.map(t=>({...t,incluir:true})))} style={{background:"rgba(74,222,128,.08)",border:"1px solid rgba(74,222,128,.2)",borderRadius:8,padding:"5px 12px",color:"#4ade80",fontSize:11,cursor:"pointer"}}>✓ Todos</button>
              <button onClick={()=>setTransacoes(ts=>ts.map(t=>({...t,incluir:false})))} style={{background:"rgba(239,68,68,.06)",border:"1px solid rgba(239,68,68,.15)",borderRadius:8,padding:"5px 12px",color:"#f87171",fontSize:11,cursor:"pointer"}}>– Nenhum</button>
            </div>

            <Card style={{padding:0,overflow:"hidden"}}>
              {transacoes.map((t,idx)=>(
                <div key={t.id} style={{padding:"10px 14px",borderBottom:idx<transacoes.length-1?"1px solid rgba(255,255,255,.04)":"none",background:t.incluir?"transparent":"rgba(0,0,0,.25)",opacity:t.incluir?1:.4,transition:"all .15s"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <button onClick={()=>updT(t.id,"incluir",!t.incluir)} style={{width:24,height:24,borderRadius:7,border:"none",flexShrink:0,cursor:"pointer",background:t.incluir?"rgba(74,222,128,.18)":"rgba(255,255,255,.06)",color:t.incluir?"#4ade80":"#333",fontSize:13,fontWeight:700}}>
                      {t.incluir?"✓":"–"}
                    </button>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,color:"#f0f0f5",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.desc}</div>
                      <div style={{fontSize:10,color:"#444",marginTop:1}}>{t.data||""}{t.parcela?` · Parcela ${t.parcela}`:""}{t.tipo?` · ${t.tipo}`:""}</div>
                    </div>
                    <Sel value={t.cat} onChange={v=>updT(t.id,"cat",v)} options={CATS} style={{maxWidth:118,fontSize:10}}/>
                    <span className="mono" style={{fontSize:13,color:"#f87171",fontWeight:500,minWidth:76,textAlign:"right",flexShrink:0}}>{fmtBRL(t.valor)}</span>
                  </div>
                </div>
              ))}
            </Card>

            <button onClick={confirmar} style={{padding:"14px",borderRadius:12,border:"none",background:"#7c6af7",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>✅ Gerar JSON para o app</button>
          </div>
        )}

        {/* ── DONE ── */}
        {step==="done"&&jsonFinal&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Card style={{background:"rgba(74,222,128,.05)",borderColor:"rgba(74,222,128,.2)"}}>
              <div style={{fontSize:14,fontWeight:600,color:"#4ade80",marginBottom:4}}>✅ Pronto!</div>
              <div style={{fontSize:12,color:"#555",marginBottom:12}}>{jsonFinal.lancamentos.length} lançamentos · {fmtBRL(jsonFinal.total)}</div>
              <div style={{fontSize:12,color:"#666",lineHeight:1.9}}>
                <strong style={{color:"#888"}}>Como importar:</strong><br/>
                1. Copie o JSON abaixo<br/>
                2. No app → <strong style={{color:"#a89cf7"}}>{jsonFinal.tipo==="cartao"?`Cartões → ${CARD_LABELS[jsonFinal.cartao]}`:"Variáveis"}</strong><br/>
                3. Toque em <strong style={{color:"#a89cf7"}}>"Importar JSON"</strong>
              </div>
            </Card>

            <Card>
              <div style={{fontSize:10,color:"#555",fontWeight:600,textTransform:"uppercase",letterSpacing:.8,marginBottom:10}}>Por categoria</div>
              {Object.entries(jsonFinal.lancamentos.reduce((acc,l)=>{acc[l.cat]=(acc[l.cat]||0)+l.valor;return acc;},{})).sort((a,b)=>b[1]-a[1]).map(([cat,val])=>(
                <div key={cat} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,.04)"}}>
                  <span style={{fontSize:12,color:"#ccc"}}>{cat}</span>
                  <span className="mono" style={{fontSize:12,color:"#f87171"}}>{fmtBRL(val)}</span>
                </div>
              ))}
            </Card>

            <Card style={{padding:0,overflow:"hidden"}}>
              <div style={{padding:"10px 14px",borderBottom:"1px solid rgba(255,255,255,.06)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:11,color:"#555",fontWeight:600}}>JSON</span>
                <button onClick={copiar} style={{background:copiado?"rgba(74,222,128,.15)":"rgba(124,106,247,.15)",border:`1px solid ${copiado?"rgba(74,222,128,.3)":"rgba(124,106,247,.25)"}`,borderRadius:7,padding:"5px 14px",color:copiado?"#4ade80":"#a89cf7",fontSize:11,cursor:"pointer",fontWeight:600,transition:"all .2s"}}>
                  {copiado?"✓ Copiado!":"📋 Copiar"}
                </button>
              </div>
              <textarea readOnly value={JSON.stringify(jsonFinal,null,2)}
                style={{width:"100%",height:260,background:"rgba(0,0,0,.5)",border:"none",padding:14,color:"#7c6af7",fontSize:10,outline:"none",resize:"vertical",fontFamily:"'JetBrains Mono',monospace",lineHeight:1.5,borderRadius:"0 0 14px 14px"}}/>
            </Card>

            <button onClick={reset} style={{padding:"12px",borderRadius:12,border:"1px solid rgba(255,255,255,.08)",background:"transparent",color:"#444",fontSize:13,cursor:"pointer"}}>Processar outro extrato</button>
          </div>
        )}
      </div>
    </>
  );
}
