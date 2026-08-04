/* ============================================================
   CABTECNI — Gemini chat proxy (Vercel serverless function)

   The site itself is static (GitHub Pages), so it cannot hold an API
   key: anything in the page source is public. This function is the
   only place the key exists. The browser calls here, this calls
   Gemini, the key never leaves the server.

   Required environment variable (set in the Vercel dashboard):
     GEMINI_API_KEY   your key from https://aistudio.google.com/apikey

   Optional:
     GEMINI_MODEL     defaults to gemini-2.0-flash
     ALLOWED_ORIGINS  comma-separated; defaults to the list below
   ============================================================ */

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

// Only these origins may call the function. Without this, anyone could
// point their own site at this endpoint and spend the free quota.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  "https://almeida2019.github.io,http://localhost:4599,http://127.0.0.1:4599"
).split(",").map(function (s) { return s.trim(); });

// Guard-rails against abuse and runaway cost.
const MAX_MESSAGE_CHARS = 1000;
const MAX_HISTORY_TURNS = 12;

/* ---- What the assistant is allowed to know ----
   Taken from the live site copy so it cannot invent services or
   sectors the company does not actually offer. */
const COMPANY_FACTS = `
COMPANY
CABTECNI, Lda is a private company, 100% Angolan owned and managed, with
customer satisfaction as its main objective. It is a worldwide sourcing
company: it supplies, moves and maintains the equipment and materials that
keep industrial operations running.
It operates through its South African headquarters, NAS Global (Pty) Ltd,
with over 5 years of combined experience. CABTECNI is an official partner
of NAS GLOBAL.

SECTORS SERVED (7)
Oil & Gas, Petrochemical, Mining, Power Generation, Construction,
Commercial Industry, Agriculture.

SERVICES (8)
1. Procurement — global sourcing, ordering, expediting and delivery; the
   full procurement cycle, including RFQs, purchase order management,
   import, customs clearance and documentation.
2. Logistics — international and domestic freight forwarding (air, sea,
   road), customs clearance, warehousing, consolidation, project and
   heavy-cargo logistics to remote sites, shipment tracking.
3. Bolt Torquing & Tensioning — controlled hydraulic torquing and
   tensioning for critical joints, flange management, joint-integrity
   assurance, on-site service for shutdowns and turnarounds, full torque
   documentation for compliance.
4. Equipment Rental — short and long-term rental of industrial tools and
   machinery, calibrated, maintained and inspection-ready, with fast
   mobilisation to site.
5. Labour Supply — qualified and certified skilled and semi-skilled
   personnel: technicians, tradespeople, riggers and support crews, for
   industrial and construction projects, shutdowns and turnarounds.
6. Electric Motor Maintenance & Rewinding — diagnostics, fault-finding,
   rewinding of AC and DC motors, bearing replacement, mechanical repairs,
   load and insulation testing, preventive maintenance programmes.
7. Valve Services — supply, repair, refurbishment and reconditioning of
   industrial valves, pressure and leak testing to industry standards,
   maintenance during shutdowns, certified documentation and traceability.
8. Piping Manufacturing — fabrication of pipe spools and piping assemblies
   to drawings and industry codes, cutting, fitting, welding, finishing,
   quality control and inspection (NDT on request), coating and delivery.

CONTACT
Phone: +244 935 62 51 51
Email: sales@cabtecni.com
Email (NAS Global HQ): sales@nas-global.co.za
Location: Luanda, Município de Belas, Distrito do Kilamba, Angola
Hours: Monday to Friday, 08:00 to 17:00. Closed Saturday and Sunday.
Website contact page: /contact.html
`.trim();

const LANGUAGE_NAMES = {
  pt: "Portuguese (European/Angolan Portuguese, not Brazilian)",
  en: "English",
  es: "Spanish",
  fr: "French"
};

function buildSystemPrompt(lang) {
  const language = LANGUAGE_NAMES[lang] || LANGUAGE_NAMES.pt;
  return `You are the assistant on the CABTECNI website. You help visitors
understand what CABTECNI does and guide them toward making an enquiry.

ALWAYS reply in ${language}, regardless of the language the visitor writes in.

Use only the information below. It is the complete and authoritative record
of this company.

${COMPANY_FACTS}

RULES
- Answer only questions about CABTECNI, its services, sectors, coverage and
  how to get in touch. If asked about anything unrelated, briefly say it is
  outside what you can help with and offer to answer a question about
  CABTECNI instead.
- Never invent services, sectors, prices, timelines, certifications, client
  names or project references. If a detail is not in the information above,
  say you do not have it and point the visitor to the contact details.
- Never quote prices or commit to delivery dates. Those depend on scope, so
  direct the visitor to request a quote via the contact page or by email.
- Be brief. Two or three short sentences is usually right. Use a short list
  only when genuinely listing several items.
- Write plainly and professionally, as a knowledgeable colleague would. Do
  not use em dashes. Do not use markdown headings or bold.
- If the visitor seems ready to buy or has a specific requirement, point
  them to sales@cabtecni.com or +244 935 62 51 51.`;
}

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.indexOf(origin) > -1 ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || "";
  const headers = corsHeaders(origin);
  Object.keys(headers).forEach(function (k) { res.setHeader(k, headers[k]); });

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Reject calls from origins we do not recognise.
  if (origin && ALLOWED_ORIGINS.indexOf(origin) === -1) {
    return res.status(403).json({ error: "Origin not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set");
    return res.status(500).json({ error: "server_misconfigured" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const lang = LANGUAGE_NAMES[body.lang] ? body.lang : "pt";
    const messages = Array.isArray(body.messages) ? body.messages : [];

    if (!messages.length) return res.status(400).json({ error: "no_messages" });

    // Trim history and clamp message length so a single caller cannot
    // send an enormous prompt and burn the quota.
    const trimmed = messages.slice(-MAX_HISTORY_TURNS).map(function (m) {
      return {
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: String(m.text || "").slice(0, MAX_MESSAGE_CHARS) }]
      };
    });

    const url = "https://generativelanguage.googleapis.com/v1beta/models/" +
      DEFAULT_MODEL + ":generateContent?key=" + apiKey;

    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: buildSystemPrompt(lang) }] },
        contents: trimmed,
        generationConfig: {
          temperature: 0.3,          // low: we want factual, not creative
          maxOutputTokens: 400,
          topP: 0.9
        }
      })
    });

    if (!geminiRes.ok) {
      const detail = await geminiRes.text();
      console.error("Gemini error", geminiRes.status, detail);
      // Do not leak the upstream error (it can contain the key) to the browser.
      return res.status(502).json({ error: "upstream_error", status: geminiRes.status });
    }

    const data = await geminiRes.json();
    const reply =
      data &&
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0] &&
      data.candidates[0].content.parts[0].text;

    if (!reply) {
      // Usually means the response was blocked by a safety filter.
      return res.status(200).json({ reply: null, blocked: true });
    }

    return res.status(200).json({ reply: reply.trim() });
  } catch (err) {
    console.error("chat handler failed", err);
    return res.status(500).json({ error: "internal_error" });
  }
};
