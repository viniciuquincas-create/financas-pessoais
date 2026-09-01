export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const AGENDA_URL = "https://script.google.com/macros/s/AKfycbxDfXcA9Fs8KUM8yEU0cVkZXdlIQFfs0n0Q9J5NMtCtTf0u_z5mcp-nIyMM_9aSYe1txA/exec";

  // Pass the mes parameter from the request, or use current month
  const mes = req.query.mes || (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  })();

  let config = [];
  try {
    config = JSON.parse(req.query.config || "[]");
    if (!Array.isArray(config)) throw new Error("config inválida");
    config = config.slice(0, 30).map(local => ({
      nome: String(local.nome || "").slice(0, 80),
      busca: String(local.busca || local.nome || "").slice(0, 120),
      inicioDia: Math.min(31, Math.max(1, Number(local.inicioDia) || 1)),
      inicioMes: Math.min(12, Math.max(-12, Number(local.inicioMes) || 0)),
      fimDia: Math.min(31, Math.max(1, Number(local.fimDia) || 31)),
      fimMes: Math.min(12, Math.max(-12, Number(local.fimMes) || 0)),
    })).filter(local => local.nome && local.busca);
  } catch {
    return res.status(400).json({ error: "Configuração de locais inválida" });
  }

  try {
    const params = new URLSearchParams({ mes });
    if (config.length) params.set("config", JSON.stringify(config));
    const response = await fetch(`${AGENDA_URL}?${params.toString()}`);
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
