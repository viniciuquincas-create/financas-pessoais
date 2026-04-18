export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const AGENDA_URL = "https://script.google.com/macros/s/AKfycbxDfXcA9Fs8KUM8yEU0cVkZXdlIQFfs0n0Q9J5NMtCtTf0u_z5mcp-nIyMM_9aSYe1txA/exec";

  try {
    const response = await fetch(AGENDA_URL);
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
