import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface BureauRequest {
  buyerId: string;
  gstin?: string;
  pan?: string;
  legalName?: string;
}

/** Deterministic hash so the same buyer always gets the same simulated bureau file. */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function rand(seed: string, i: number) {
  return (hash(`${seed}:${i}`) % 10000) / 10000;
}

function simulate(req: BureauRequest) {
  const seed = `${req.buyerId}|${req.gstin ?? ""}|${req.pan ?? ""}`;
  const r = (i: number) => rand(seed, i);

  const commercialScore = Math.round(500 + r(1) * 400); // 500-900 CIBIL-like
  const risky = commercialScore < 700;

  return {
    buyerId: req.buyerId,
    provider: "simulated",
    fetchedAt: new Date().toISOString(),
    entity: {
      legalName: req.legalName ?? "Registered entity",
      gstin: req.gstin ?? null,
      pan: req.pan ?? null,
      vintageMonths: Math.round(18 + r(2) * 120),
    },
    bureau: {
      commercialScore,
      scoreBand: commercialScore >= 780 ? "low" : commercialScore >= 700 ? "moderate" : commercialScore >= 620 ? "elevated" : "high",
      maxDpdLast12m: risky ? Math.round(r(3) * 90) : Math.round(r(3) * 15),
      accountsWithDpd90Plus: risky ? Math.round(r(4) * 3) : 0,
      writtenOffAmount: risky && r(5) > 0.6 ? Math.round(r(6) * 900000 / 10000) * 10000 : 0,
      suitFiledCount: risky && r(7) > 0.8 ? 1 : 0,
      creditEnquiriesLast30d: Math.round(r(8) * 9),
      totalSanctionedLimit: Math.round((800000 + r(9) * 6000000) / 50000) * 50000,
      utilisationPct: Math.round(30 + r(10) * 70),
      chequeBouncesLast6m: risky ? Math.round(r(11) * 4) : 0,
    },
    compliance: {
      gstFilingDefaults12m: risky ? Math.round(r(12) * 5) : Math.round(r(12) * 1),
      gstStatus: r(13) > 0.06 ? "active" : "suspended",
      epfoArrears: risky && r(14) > 0.85,
      directorDisqualified: r(15) > 0.96,
    },
    fraud: {
      consortiumHits: r(16) > 0.88 ? Math.round(1 + r(17) * 2) : 0,
      syntheticIdentityScore: Math.round(r(18) * 100),
      watchlistHit: r(19) > 0.95,
      pepMatch: r(20) > 0.97,
      negativeMediaMentions: r(21) > 0.8 ? Math.round(1 + r(22) * 3) : 0,
      linkedDefaulterEntities: r(23) > 0.85 ? Math.round(1 + r(24) * 2) : 0,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = (await req.json()) as BureauRequest;
    if (!body?.buyerId || typeof body.buyerId !== 'string' || body.buyerId.length > 64) {
      return new Response(JSON.stringify({ error: 'buyerId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (body.gstin && !/^[0-9A-Z]{15}$/.test(body.gstin)) {
      return new Response(JSON.stringify({ error: 'gstin must be 15 alphanumeric characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('BUREAU_API_KEY');
    const apiUrl = Deno.env.get('BUREAU_API_URL');

    // Live provider path — used automatically once credentials are configured.
    if (apiKey && apiUrl) {
      const upstream = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          reference_id: body.buyerId,
          gstin: body.gstin ?? null,
          pan: body.pan ?? null,
          legal_name: body.legalName ?? null,
          products: ['commercial_bureau', 'gst_compliance', 'fraud_consortium'],
        }),
      });

      if (!upstream.ok) {
        const detail = await upstream.text();
        return new Response(
          JSON.stringify({ error: 'bureau_provider_error', status: upstream.status, detail: detail.slice(0, 500) }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const data = await upstream.json();
      return new Response(JSON.stringify({ ...data, provider: 'live', fetchedAt: new Date().toISOString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(simulate(body)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
