import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FeedPost, PostKind, KIND_META, initials, getPosts, savePosts } from "@/lib/social-feed";
import { generateText } from "@/lib/ai-agent";
import { Sparkles, Loader2, Send, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const KINDS: PostKind[] = ["deal_closed", "price_drop", "rfq_open", "capacity", "certification", "insight", "showcase"];

interface Props {
  onPost: (posts: FeedPost[]) => void;
}

export function PostComposer({ onPost }: Props) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<PostKind>("insight");
  const [text, setText] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiAssisted, setAiAssisted] = useState(false);

  const runAI = async (instruction: string) => {
    setAiBusy(true);
    try {
      const out = await generateText(
        "post",
        `Post type: ${KIND_META[kind].label}. ${instruction}\n\nCurrent draft (may be empty or rough notes):\n${text || "(none)"}`,
      );
      setText(out.trim());
      setAiAssisted(true);
    } catch (e) {
      toast({ title: "AI unavailable", description: (e as Error).message, variant: "destructive" });
    } finally {
      setAiBusy(false);
    }
  };

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, "");
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const publish = () => {
    if (!text.trim()) return;
    const post: FeedPost = {
      id: `p-${Date.now()}`,
      authorId: "me",
      authorName: "Your Business",
      authorRole: "buyer",
      authorTagline: "Industrial procurement · Pune",
      city: "Pune",
      trustScore: 688,
      kind,
      text: text.trim(),
      tags,
      createdAt: new Date().toISOString(),
      likes: 0,
      reposts: 0,
      aiAssisted,
      comments: [],
    };
    const next = [post, ...getPosts()];
    savePosts(next);
    onPost(next);
    setText("");
    setTags([]);
    setAiAssisted(false);
    setOpen(false);
    toast({ title: "Posted to your network" });
  };

  if (!open) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary font-display text-xs font-bold text-primary-foreground">
            {initials("Your Business")}
          </span>
          <button
            onClick={() => setOpen(true)}
            className="flex-1 rounded-full border border-border px-4 py-2.5 text-left text-sm text-muted-foreground hover:border-secondary/60 hover:bg-muted/50 transition-colors"
          >
            Share a deal, price move, capacity or open RFQ…
          </button>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => setOpen(true)}>
            <Sparkles className="h-4 w-4 text-secondary" /> <span className="hidden sm:inline">AI draft</span>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-secondary/30">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="font-display font-semibold text-foreground">Create post</p>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Select value={kind} onValueChange={(v) => setKind(v as PostKind)}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            {KINDS.map((k) => <SelectItem key={k} value={k}>{KIND_META[k].label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="Write here, or drop rough notes and let VyaparAI shape them into a post…"
          className="resize-none text-sm"
        />

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" disabled={aiBusy} onClick={() => runAI("Write this post from scratch or from the notes.")}>
            {aiBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-secondary" />} Draft with AI
          </Button>
          <Button variant="outline" size="sm" disabled={aiBusy || !text.trim()} onClick={() => runAI("Rewrite the draft to be sharper and more credible, keeping every number.")}>
            Polish
          </Button>
          <Button variant="outline" size="sm" disabled={aiBusy || !text.trim()} onClick={() => runAI("Rewrite the draft with more concrete numbers, specs and commercial detail.")}>
            Add specifics
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tags.map((t) => (
            <Badge key={t} variant="secondary" className="gap-1">
              #{t}
              <button onClick={() => setTags(tags.filter((x) => x !== t))}><X className="h-3 w-3" /></button>
            </Badge>
          ))}
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            placeholder="Add tag + Enter"
            className="h-8 w-40 text-xs"
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={publish} disabled={!text.trim()} className="gap-1.5">
            <Send className="h-4 w-4" /> Post
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
