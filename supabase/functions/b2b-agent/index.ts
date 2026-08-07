// B2B AI agent — streaming chat + one-shot generation helpers.
// Uses Lovable AI Gateway (chat completions, google/gemini-3.6-flash).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPTS: Record<string, string> = {
  copilot: `You are VyaparAI, an autonomous B2B trade copilot for an Indian industrial marketplace
(fasteners, raw materials, machinery, chemicals; Pune/Mumbai focus).
You help buyers and suppliers with: sourcing and supplier shortlists, RFQ drafting, price benchmarking,
negotiation tactics, trust/risk checks, GST & compliance basics, logistics ETAs, and working-capital (BNPL/escrow) options.
Be concrete and commercial: use ₹, INR units (Kg/Ton/Piece), lead times in days, and quantified ranges.
Keep answers tight — short markdown, bullets over paragraphs. Always end with one suggested next action.`,
  post: `You are a B2B social post writer for an Indian industrial trade network.
Write ONE short post (max 70 words) in the voice of the business described. Confident, specific, no hype, no hashtags spam
(max 2 hashtags). Include a concrete number if plausible. Return only the post text, no quotes, no preamble.`,
  insight: `You are a B2B market intelligence analyst for Indian industrial commodities.
Return a single crisp insight (max 45 words) with one number and one implication for buyers or suppliers.
Return only the insight text.`,
  comment: `You are drafting a professional B2B reply comment (max 30 words) to the post given.
Be useful and specific, never generic praise. Return only the comment text.`,
  dm_intro: `You are a message-writing tool. The user gives you a deal brief; you output ONLY the chat message the sender
would type to the recipient in a B2B direct-message inbox. NEVER analyse, benchmark, tabulate, or use markdown headings,
tables, bullets or bold. Plain prose only, max 80 words, 3-4 short sentences: who we are and why we matched, the concrete
ask (specs, quantity, target price in ₹, delivery city, timeline), then one clear question. No subject line, no greeting
boilerplate beyond "Hi <name>,", no signature. Output the message text and nothing else.`,
  dm_followup: `You are a message-writing tool. The user gives you an ongoing B2B negotiation thread; you output ONLY the
next chat message the sender would type. NEVER analyse, benchmark, tabulate, or use markdown headings, tables, bullets or
bold. Plain prose only, max 70 words: acknowledge the last message, restate the open point (price ₹, MOQ, lead time in
days, certs, payment terms), propose one specific next step with a date. No signature. Output the message text and nothing else.`,
  deal_intent: `You are the Intent Understanding Agent of an autonomous B2B Trade OS for Indian industrial procurement.
Convert the buyer's raw brief (natural language, voice transcript, BOM text) into a normalized Deal Specification.
Return ONLY valid JSON, no markdown, with exactly this shape:
{"product":string,"specifications":{},"quantity":number,"unit":string,"target_price":number,"delivery_deadline":"YYYY-MM-DD",
"compliance_requirements":[string],"risk_profile":"conservative"|"balanced"|"aggressive","category":string,
"confidence":number,"clarifications":[string],"optimizations":[string]}
Infer sensible Indian-market defaults when data is missing (unit Piece, 21-day deadline, balanced risk). quantity and
target_price are plain numbers in INR per unit. confidence is 0-1. clarifications = up to 3 ambiguities worth resolving.
optimizations = up to 3 concrete cost/lead-time suggestions.`,
  deal_brief: `You are the Executive Brief Agent of an autonomous B2B Trade OS. Given an executed deal's structured data,
write a decision-grade brief in tight markdown with these sections: **Recommendation**, **Trust justification**,
**Commercials**, **Risk**, **Delivery plan**, **Next action**. Max 180 words total, bullets over paragraphs, use ₹ and
concrete numbers from the data only. No preamble.`,
};


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI is not configured." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const mode: string = body.mode ?? "copilot";
    const stream: boolean = body.stream ?? mode === "copilot";
    const system = SYSTEM_PROMPTS[mode] ?? SYSTEM_PROMPTS.copilot;
    const messages = Array.isArray(body.messages) && body.messages.length
      ? body.messages
      : [{ role: "user", content: String(body.prompt ?? "") }];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        stream,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      const status = res.status === 429 ? 429 : res.status === 402 ? 402 : 500;
      const message =
        status === 429
          ? "Rate limit reached. Please try again in a moment."
          : status === 402
            ? "AI credits exhausted. Add credits to continue."
            : `AI gateway error: ${text.slice(0, 300)}`;
      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (stream) {
      return new Response(res.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
