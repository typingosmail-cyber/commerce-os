import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostComposer } from "@/components/social/PostComposer";
import { FeedPostCard } from "@/components/social/FeedPostCard";
import { AICopilotDock } from "@/components/ai/AICopilotDock";
import {
  COMPANIES, FeedPost, getFollows, getPosts, initials, toggleFollow,
} from "@/lib/social-feed";
import { generateText } from "@/lib/ai-agent";
import { Bot, Loader2, RefreshCw, ShieldCheck, TrendingUp, Users } from "lucide-react";

const FILTERS = [
  { id: "all", label: "For you" },
  { id: "following", label: "Following" },
  { id: "rfq_open", label: "Open RFQs" },
  { id: "price_drop", label: "Price moves" },
  { id: "capacity", label: "Capacity" },
];

export default function SocialFeed() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [follows, setFollows] = useState<string[]>([]);
  const [filter, setFilter] = useState("all");
  const [brief, setBrief] = useState<string>("");
  const [briefBusy, setBriefBusy] = useState(false);

  useEffect(() => {
    setPosts(getPosts());
    setFollows(getFollows());
  }, []);

  const loadBrief = async () => {
    setBriefBusy(true);
    try {
      const headlines = getPosts().slice(0, 6).map((p) => `- ${p.authorName}: ${p.text}`).join("\n");
      const out = await generateText(
        "insight",
        `Today's network activity:\n${headlines}\n\nWrite my morning trade brief as a Pune-based industrial buyer: 3 short bullets on what changed and 1 recommended action.`,
      );
      setBrief(out.trim());
    } catch (e) {
      setBrief(`Brief unavailable: ${(e as Error).message}`);
    } finally {
      setBriefBusy(false);
    }
  };

  useEffect(() => { loadBrief(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const visible = posts.filter((p) => {
    if (filter === "all") return true;
    if (filter === "following") return follows.includes(p.authorId) || p.authorId === "me";
    return p.kind === filter;
  });

  const suggestions = COMPANIES.filter((c) => !follows.includes(c.id));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="container flex-1 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
          {/* Left rail */}
          <aside className="hidden lg:block space-y-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary font-display text-lg font-bold text-primary-foreground">
                  {initials("Your Business")}
                </div>
                <p className="mt-2 font-semibold text-foreground">Your Business</p>
                <p className="text-xs text-muted-foreground">Industrial procurement · Pune</p>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 text-left">
                  <div>
                    <p className="font-display text-sm font-bold text-foreground">688</p>
                    <p className="text-[10px] uppercase text-muted-foreground">Trust score</p>
                  </div>
                  <div>
                    <p className="font-display text-sm font-bold text-foreground">{follows.length}</p>
                    <p className="text-[10px] uppercase text-muted-foreground">Following</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Quick links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 p-2 pt-0 text-sm">
                {[
                  { to: "/buyer/dashboard", label: "My RFQs" },
                  { to: "/trade-os", label: "Trade OS" },
                  { to: "/intelligence", label: "Demand intelligence" },
                  { to: "/escrow", label: "Escrow centre" },
                ].map((l) => (
                  <Link key={l.to} to={l.to} className="block rounded-md px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                    {l.label}
                  </Link>
                ))}
              </CardContent>
            </Card>
          </aside>

          {/* Feed */}
          <div className="space-y-4">
            <PostComposer onPost={setPosts} />

            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList className="w-full justify-start overflow-x-auto">
                {FILTERS.map((f) => <TabsTrigger key={f.id} value={f.id}>{f.label}</TabsTrigger>)}
              </TabsList>
            </Tabs>

            {visible.map((p) => <FeedPostCard key={p.id} post={p} onChange={setPosts} />)}
            {visible.length === 0 && (
              <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nothing here yet.</CardContent></Card>
            )}
          </div>

          {/* Right rail */}
          <aside className="space-y-4">
            <Card className="border-secondary/30 bg-secondary/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5"><Bot className="h-4 w-4 text-secondary" /> Your AI trade brief</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadBrief} disabled={briefBusy}>
                    {briefBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {briefBusy && !brief ? (
                  <p className="text-xs text-muted-foreground">Reading the network…</p>
                ) : (
                  <div className="space-y-1.5 text-xs leading-relaxed text-foreground">
                    {brief.split("\n").filter(Boolean).map((l, i) => (
                      <p key={i}>{l.replace(/\*\*/g, "")}</p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-1.5 text-sm"><Users className="h-4 w-4 text-secondary" /> Suppliers to follow</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {suggestions.slice(0, 4).map((c) => (
                  <div key={c.id} className="flex items-start gap-2.5">
                    <Link to={`/network/${c.id}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-bold text-foreground">
                      {initials(c.name)}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link to={`/network/${c.id}`} className="block truncate text-xs font-semibold text-foreground hover:underline">{c.name}</Link>
                      <p className="truncate text-[11px] text-muted-foreground">{c.city} · Trust {c.trustScore}</p>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => setFollows(toggleFollow(c.id))}>
                      Follow
                    </Button>
                  </div>
                ))}
                {suggestions.length === 0 && <p className="text-xs text-muted-foreground">You follow everyone in your category.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-1.5 text-sm"><TrendingUp className="h-4 w-4 text-secondary" /> Trending in fasteners</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0 text-xs">
                {[
                  { tag: "SS316", note: "142 posts · demand up 14%" },
                  { tag: "Class 8.8", note: "88 posts · 12 open RFQs" },
                  { tag: "Nickel surcharge", note: "61 posts · price watch" },
                  { tag: "IATF 16949", note: "34 posts · audits season" },
                ].map((t) => (
                  <div key={t.tag}>
                    <p className="font-semibold text-foreground">#{t.tag}</p>
                    <p className="text-muted-foreground">{t.note}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <Badge variant="outline" className="mb-2 gap-1 border-success/30 bg-success/10 text-success">
                  <ShieldCheck className="h-3 w-3" /> Verified network
                </Badge>
                <p className="text-xs text-muted-foreground">
                  Every company here is GST-verified with a live trust score. Posts from unverified accounts never enter your feed.
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      <Footer />
      <AICopilotDock />
    </div>
  );
}
