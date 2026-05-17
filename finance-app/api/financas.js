// api/financas.js — adicionar na pasta /api do seu projeto Vercel
// Acesse: https://vinifinancas.vercel.app/api/financas

const SUPABASE_URL = "https://jrzcbthmmkaaeyuakhsb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyemNidGhtbWthYWV5dWFraHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMTM3NDEsImV4cCI6MjA5MjY4OTc0MX0.YXSdk38JHCRB7A6xxokUWlJW4Rv7yuXTlcFnP2esIxM";

export default async function handler(req, res) {
  // CORS — permite acesso do Claude e de qualquer origem
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/financas?id=eq.vinicius&select=dados`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const rows = await response.json();
    if (!rows?.length || !rows[0]?.dados) {
      return res.status(404).json({ error: "Sem dados" });
    }

    const raw = rows[0].dados;
    const normalized = {};
    for (const [k, v] of Object.entries(raw)) {
      try { normalized[k] = typeof v === "string" ? JSON.parse(v) : v; }
      catch { normalized[k] = v; }
    }

    res.status(200).json(normalized);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
