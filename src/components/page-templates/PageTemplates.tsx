import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, AreaChart, Area, BarChart, Bar,
} from "recharts";
import {
  ArrowRight, CheckCircle2, Circle, Loader2, ShieldCheck, TrendingUp, Sparkles, Search,
} from "lucide-react";
import type { PageDef } from "@/lib/page-registry";

function PageHero({ p }: { p: PageDef }) {
  return (
    <section className="bg-gradient-to-br from-primary/5 via-background to-secondary/5 border-b">
      <div className="container py-10 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-3">
          <Badge variant="outline" className="text-xs">{p.category}</Badge>
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">{p.title}</h1>
          <p className="text-lg text-muted-foreground max-w-3xl">{p.tagline}</p>
        </div>
        <div className="flex gap-2">
          {p.ctaPrimary && <Button asChild><Link to={p.ctaPrimary.to}>{p.ctaPrimary.label} <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>}
          {p.ctaSecondary && <Button asChild variant="outline"><Link to={p.ctaSecondary.to}>{p.ctaSecondary.label}</Link></Button>}
        </div>
      </div>
    </section>
  );
}

function PainCureBand({ p }: { p: PageDef }) {
  return (
    <section className="container py-8 grid md:grid-cols-2 gap-4">
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader className="pb-2"><CardTitle className="text-sm uppercase tracking-wide text-destructive">The pain</CardTitle></CardHeader>
        <CardContent className="text-foreground">{p.pain}</CardContent>
      </Card>
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2"><CardTitle className="text-sm uppercase tracking-wide text-primary flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> The cure</CardTitle></CardHeader>
        <CardContent className="text-foreground">{p.cure}</CardContent>
      </Card>
    </section>
  );
}

function KPIGrid({ kpis }: { kpis: NonNullable<PageDef["kpis"]> }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {kpis.map((k) => (
        <Card key={k.label}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="text-2xl font-bold mt-1">{k.value}</p>
            {k.delta && <p className={`text-xs mt-1 ${k.tone === "bad" ? "text-destructive" : k.tone === "warn" ? "text-orange-500" : "text-success"}`}>{k.delta}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DashboardTemplate({ p }: { p: PageDef }) {
  return (
    <>
      <PageHero p={p} />
      <PainCureBand p={p} />
      <section className="container pb-12 space-y-6">
        {p.kpis && <KPIGrid kpis={p.kpis} />}
        {p.chartData && (
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Trend (last 12 weeks)</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer>
                <AreaChart data={p.chartData}>
                  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs>
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#g)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
        {p.sections?.map((s) => (
          <Card key={s.title}>
            <CardHeader><CardTitle className="text-lg">{s.title}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-muted-foreground">{s.body}</p>
              {s.bullets && <ul className="grid sm:grid-cols-2 gap-2">{s.bullets.map((b) => <li key={b} className="flex items-start gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />{b}</li>)}</ul>}
            </CardContent>
          </Card>
        ))}
      </section>
    </>
  );
}

function WorkflowTemplate({ p }: { p: PageDef }) {
  const steps = p.steps ?? [];
  const done = steps.filter((s) => s.status === "done").length;
  return (
    <>
      <PageHero p={p} />
      <PainCureBand p={p} />
      <section className="container pb-12 space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Live progress</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Progress value={(done / Math.max(steps.length, 1)) * 100} />
            <div className="grid md:grid-cols-2 gap-3">
              {steps.map((s, i) => (
                <div key={s.title} className="flex gap-3 p-3 rounded-lg border bg-card">
                  <div className="mt-0.5">
                    {s.status === "done" ? <CheckCircle2 className="h-5 w-5 text-success" /> : s.status === "active" ? <Loader2 className="h-5 w-5 text-primary animate-spin" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div>
                    <p className="font-medium">{i + 1}. {s.title}</p>
                    <p className="text-sm text-muted-foreground">{s.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        {p.sections?.map((s) => (
          <Card key={s.title}><CardHeader><CardTitle className="text-lg">{s.title}</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-muted-foreground">{s.body}</p>{s.bullets && <ul className="space-y-2">{s.bullets.map((b) => <li key={b} className="flex items-start gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />{b}</li>)}</ul>}</CardContent></Card>
        ))}
      </section>
    </>
  );
}

function DirectoryTemplate({ p }: { p: PageDef }) {
  const [q, setQ] = useState("");
  const rows = p.rows ?? [];
  const filtered = useMemo(() => rows.filter((r) => (r.name + r.meta + r.tag).toLowerCase().includes(q.toLowerCase())), [q, rows]);
  return (
    <>
      <PageHero p={p} />
      <PainCureBand p={p} />
      <section className="container pb-12 space-y-4">
        <div className="flex gap-2 max-w-md">
          <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <Badge variant="outline" className="self-center">{filtered.length} results</Badge>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((r, i) => (
            <Card key={i} className="hover:shadow-md transition">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">{r.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.meta}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">{r.score}</p>
                  <Badge variant="outline" className="text-[10px]">{r.tag}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}

function ToolTemplate({ p }: { p: PageDef }) {
  const initial = useMemo(() => Object.fromEntries((p.fields ?? []).map((f) => [f.key, f.default])), [p]);
  const [state, setState] = useState<Record<string, number | string>>(initial);
  const numericTotal = Object.values(state).filter((v) => typeof v === "number").reduce((a, b) => (a as number) + (b as number), 0) as number;
  const fakeResult = Math.round(numericTotal * 1.18 + 4200);
  const chart = Array.from({ length: 6 }, (_, i) => ({ label: `S${i + 1}`, value: Math.round(fakeResult * (0.7 + i * 0.07)) }));
  return (
    <>
      <PageHero p={p} />
      <PainCureBand p={p} />
      <section className="container pb-12 grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Inputs</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {p.fields?.map((f) => (
              <div key={f.key}>
                <label className="text-xs text-muted-foreground">{f.label}{f.suffix && ` (${f.suffix})`}</label>
                {f.type === "number" ? (
                  <Input type="number" value={state[f.key] as number} onChange={(e) => setState({ ...state, [f.key]: Number(e.target.value) })} />
                ) : (
                  <select className="w-full h-10 px-3 rounded-md border bg-background text-sm" value={state[f.key] as string} onChange={(e) => setState({ ...state, [f.key]: e.target.value })}>
                    {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                )}
              </div>
            ))}
            {p.formula && <><Separator /><p className="text-xs text-muted-foreground font-mono">{p.formula}</p></>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Result</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-xs text-muted-foreground">Estimated outcome</p>
              <p className="text-3xl font-bold text-primary">₹ {fakeResult.toLocaleString("en-IN")}</p>
            </div>
            <div className="h-48">
              <ResponsiveContainer><BarChart data={chart}><XAxis dataKey="label" fontSize={12} /><YAxis fontSize={12} /><Tooltip /><Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground">Estimates are illustrative; final values depend on supplier terms and category.</p>
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function GuideTemplate({ p }: { p: PageDef }) {
  return (
    <>
      <PageHero p={p} />
      <PainCureBand p={p} />
      <section className="container pb-12 grid md:grid-cols-[220px_1fr] gap-6">
        <aside className="hidden md:block">
          <Card className="sticky top-20"><CardHeader><CardTitle className="text-sm">On this page</CardTitle></CardHeader><CardContent>
            <ul className="space-y-2 text-sm">{p.sections?.map((s) => <li key={s.title}><a className="text-muted-foreground hover:text-primary" href={`#${s.title.replace(/\s+/g, "-")}`}>{s.title}</a></li>)}</ul>
          </CardContent></Card>
        </aside>
        <article className="space-y-6">
          {p.sections?.map((s) => (
            <Card key={s.title} id={s.title.replace(/\s+/g, "-")}>
              <CardHeader><CardTitle>{s.title}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground leading-relaxed">{s.body}</p>
                {s.bullets && <ul className="space-y-2">{s.bullets.map((b) => <li key={b} className="flex items-start gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />{b}</li>)}</ul>}
              </CardContent>
            </Card>
          ))}
        </article>
      </section>
    </>
  );
}

function LandingTemplate({ p }: { p: PageDef }) {
  const chart = Array.from({ length: 8 }, (_, i) => ({ label: `M${i + 1}`, value: 40 + i * 8 }));
  return (
    <>
      <PageHero p={p} />
      <PainCureBand p={p} />
      <section className="container pb-12 grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-lg">Why it works</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer><LineChart data={chart}><XAxis dataKey="label" fontSize={12} /><YAxis fontSize={12} /><Tooltip /><Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Painkiller proof</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">SLA</span><span className="font-semibold">99.2%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Avg cycle</span><span className="font-semibold">26 min</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Risk caught</span><span className="font-semibold">94%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Escrow fee</span><span className="font-semibold">0%</span></div>
            {p.ctaPrimary && <Button asChild className="w-full mt-2"><Link to={p.ctaPrimary.to}>{p.ctaPrimary.label}</Link></Button>}
          </CardContent>
        </Card>
        {p.sections?.map((s) => (
          <Card key={s.title} className="md:col-span-3">
            <CardHeader><CardTitle className="text-lg">{s.title}</CardTitle></CardHeader>
            <CardContent className="space-y-3"><p className="text-muted-foreground">{s.body}</p>{s.bullets && <ul className="grid sm:grid-cols-2 gap-2">{s.bullets.map((b) => <li key={b} className="flex items-start gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />{b}</li>)}</ul>}</CardContent>
          </Card>
        ))}
      </section>
    </>
  );
}

export function PageRenderer({ p }: { p: PageDef }) {
  switch (p.template) {
    case "dashboard": return <DashboardTemplate p={p} />;
    case "workflow": return <WorkflowTemplate p={p} />;
    case "directory": return <DirectoryTemplate p={p} />;
    case "tool": return <ToolTemplate p={p} />;
    case "guide": return <GuideTemplate p={p} />;
    case "landing":
    default: return <LandingTemplate p={p} />;
  }
}
