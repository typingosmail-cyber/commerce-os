import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { pageRegistry, pagesByCategory, totalPages } from "@/lib/page-registry";
import { Search, ArrowRight } from "lucide-react";

const TEMPLATE_BADGE: Record<string, string> = {
  dashboard: "Dashboard", workflow: "Workflow", directory: "Directory",
  tool: "Calculator", guide: "Playbook", landing: "Solution",
};

export default function SolutionsHub() {
  const [q, setQ] = useState("");
  const [active, setActive] = useState<string>("All");

  const categories = ["All", ...Object.keys(pagesByCategory)];
  const filtered = useMemo(() => {
    return pageRegistry.filter((p) => {
      const matchesCat = active === "All" || p.category === active;
      const matchesQ = !q || (p.title + p.tagline + p.pain + p.cure).toLowerCase().includes(q.toLowerCase());
      return matchesCat && matchesQ;
    });
  }, [q, active]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="bg-gradient-to-br from-primary/5 via-background to-secondary/5 border-b">
          <div className="container py-12 space-y-4">
            <Badge variant="outline">{totalPages} painkillers</Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">The full Vyapar OS solution map</h1>
            <p className="text-lg text-muted-foreground max-w-3xl">Every painkiller across trust, trade, logistics, finance, compliance and intelligence — searchable in one place.</p>
            <div className="max-w-xl relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9 h-11" placeholder="Search painkillers, calculators, playbooks…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
        </section>

        <section className="container py-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((c) => (
              <Button key={c} size="sm" variant={active === c ? "default" : "outline"} className="shrink-0" onClick={() => setActive(c)}>
                {c} {c !== "All" && <span className="ml-1 text-xs opacity-70">({pagesByCategory[c]?.length ?? 0})</span>}
              </Button>
            ))}
          </div>
        </section>

        <section className="container pb-16">
          <p className="text-sm text-muted-foreground mb-3">{filtered.length} result{filtered.length === 1 ? "" : "s"}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <Link key={p.slug} to={`/p/${p.slug}`}>
                <Card className="h-full hover:shadow-lg hover:border-primary/50 transition-all">
                  <CardContent className="p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px]">{p.category}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{TEMPLATE_BADGE[p.template]}</Badge>
                    </div>
                    <h3 className="font-display font-bold text-base leading-tight">{p.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{p.tagline}</p>
                    <p className="text-xs text-primary inline-flex items-center gap-1 pt-1">Open painkiller <ArrowRight className="h-3 w-3" /></p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
