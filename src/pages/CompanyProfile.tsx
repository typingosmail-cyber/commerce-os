import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeedPostCard } from "@/components/social/FeedPostCard";
import { AICopilotDock } from "@/components/ai/AICopilotDock";
import {
  FeedPost, getCompany, getFollows, getPosts, initials, toggleFollow,
} from "@/lib/social-feed";
import { generateText } from "@/lib/ai-agent";
import {
  Bot, Loader2, MapPin, MessageSquare, ShieldCheck, Sparkles, ThumbsUp, Calendar, FileText,
} from "lucide-react";

export default function CompanyProfile() {
  const { id = "" } = useParams();
  const company = getCompany(id);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [follows, setFollows] = useState<string[]>([]);
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPosts(getPosts());
    setFollows(getFollows());
    setBrief("");
  }, [id]);

  const authorPosts = useMemo(() => posts.filter((p) => p.authorId === id), [posts, id]);
  const following = follows.includes(id);

  const runBrief = async () => {
    if (!company) return;
    setBusy(true);
    try {
      const out = await generateText(
        "insight",
        `Assess this company as a trading counterparty for a Pune industrial buyer.\n\n` +
          `Name: ${company.name}\nRole: ${company.role}\nIndustry: ${company.industry}\n` +
          `Location: ${company.city}, ${company.state}\nTrust score: ${company.trustScore}/1000\n` +
          `Since: ${company.since}\nCapabilities: ${company.capabilities.join(", ")}\n` +
          `Stats: ${company.stats.map((s) => `${s.label} ${s.value}`).join(", ")}\n` +
          `Recent posts: ${authorPosts.map((p) => p.text).join(" | ") || "none"}\n\n` +
          `Give: strengths, risks to watch, and how to structure a first order.`,
      );
      setBrief(out.trim());
    } catch (e) {
      setBrief(`Assessment unavailable: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  if (!company) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <main className="container flex-1 py-16 text-center">
          <p className="text-muted-foreground">Company not found.</p>
          <Button asChild className="mt-4"><Link to="/feed">Back to feed</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="container flex-1 py-6 space-y-6">
        {/* Cover + identity */}
        <Card className="overflow-hidden">
          <div className="h-28 bg-gradient-to-r from-primary via-primary/90 to-secondary/60" />
          <CardContent className="relative p-4 pt-0">
            <div className="-mt-10 flex flex-wrap items-end gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-xl border-4 border-card bg-primary font-display text-xl font-bold text-primary-foreground">
                {initials(company.name)}
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-xl font-bold text-foreground">{company.name}</h1>
                  {company.verified && (
                    <Badge variant="outline" className="gap-1 border-success/30 bg-success/10 text-success">
                      <ShieldCheck className="h-3 w-3" /> GST verified
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{company.tagline}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {company.city}, {company.state}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Since {company.since}</span>
                  <span>{company.followers.toLocaleString("en-IN")} followers</span>
                  <span className="font-mono">{company.gstin}</span>
                </p>
              </div>
              <div className="flex gap-2 pb-1">
                <Button variant={following ? "outline" : "default"} size="sm" onClick={() => setFollows(toggleFollow(company.id))}>
                  {following ? "Following" : "Follow"}
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/messages"><MessageSquare className="mr-1.5 h-4 w-4" /> Message</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/buyer/dashboard"><FileText className="mr-1.5 h-4 w-4" /> Send RFQ</Link>
                </Button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4 md:grid-cols-4">
              <div>
                <p className="font-display text-lg font-bold text-foreground">{company.trustScore}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Trust score / 1000</p>
              </div>
              {company.stats.map((s) => (
                <div key={s.label}>
                  <p className="font-display text-lg font-bold text-foreground">{s.value}</p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <Tabs defaultValue="posts">
              <TabsList>
                <TabsTrigger value="posts">Posts ({authorPosts.length})</TabsTrigger>
                <TabsTrigger value="about">About</TabsTrigger>
              </TabsList>

              <TabsContent value="posts" className="mt-4 space-y-4">
                {authorPosts.map((p) => <FeedPostCard key={p.id} post={p} onChange={setPosts} />)}
                {authorPosts.length === 0 && (
                  <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No posts yet.</CardContent></Card>
                )}
              </TabsContent>

              <TabsContent value="about" className="mt-4 space-y-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Capabilities</CardTitle></CardHeader>
                  <CardContent className="flex flex-wrap gap-2 pt-0">
                    {company.capabilities.map((c) => <Badge key={c} variant="secondary">{c}</Badge>)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Endorsements from the network</CardTitle></CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    {company.endorsements.map((e) => (
                      <div key={e.skill} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{e.skill}</span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <ThumbsUp className="h-3.5 w-3.5" /> {e.count}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <aside className="space-y-4">
            <Card className="border-secondary/30 bg-secondary/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-1.5 text-sm">
                  <Bot className="h-4 w-4 text-secondary" /> AI counterparty assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {brief ? (
                  <div className="space-y-1.5 text-xs leading-relaxed text-foreground">
                    {brief.split("\n").filter(Boolean).map((l, i) => <p key={i}>{l.replace(/\*\*/g, "")}</p>)}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Have VyaparAI read this company's trust history, capacity signals and posts before you commit an order.
                  </p>
                )}
                <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={runBrief} disabled={busy}>
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-secondary" />}
                  {brief ? "Re-run assessment" : "Assess this supplier"}
                </Button>
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
