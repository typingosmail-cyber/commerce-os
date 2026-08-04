import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import {
  FeedPost, KIND_META, timeAgo, initials, getLikes, toggleLike, savePosts, getPosts,
} from "@/lib/social-feed";
import { generateText } from "@/lib/ai-agent";
import {
  ThumbsUp, MessageSquare, Repeat2, ShieldCheck, Bot, Loader2, Send, FileText, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface Props {
  post: FeedPost;
  onChange: (posts: FeedPost[]) => void;
}

export function FeedPostCard({ post, onChange }: Props) {
  const [likes, setLikes] = useState<string[]>(getLikes());
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");
  const [drafting, setDrafting] = useState(false);
  const liked = likes.includes(post.id);
  const meta = KIND_META[post.kind];

  const mutate = (fn: (p: FeedPost) => FeedPost) => {
    const next = getPosts().map((p) => (p.id === post.id ? fn(p) : p));
    savePosts(next);
    onChange(next);
  };

  const handleLike = () => {
    const next = toggleLike(post.id);
    setLikes(next);
    mutate((p) => ({ ...p, likes: p.likes + (next.includes(post.id) ? 1 : -1) }));
  };

  const handleRepost = () => {
    mutate((p) => ({ ...p, reposts: p.reposts + 1 }));
    toast({ title: "Reposted to your network" });
  };

  const addComment = (text: string, aiAssisted = false) => {
    if (!text.trim()) return;
    mutate((p) => ({
      ...p,
      comments: [
        ...p.comments,
        {
          id: `c-${Date.now()}`,
          authorId: "me",
          authorName: "Your Business",
          text: text.trim(),
          createdAt: new Date().toISOString(),
          aiAssisted,
        },
      ],
    }));
    setComment("");
  };

  const draftReply = async () => {
    setDrafting(true);
    try {
      const text = await generateText(
        "comment",
        `Post by ${post.authorName} (${post.authorTagline}):\n"${post.text}"\n\nDraft my reply as a Pune-based buyer of industrial fasteners and raw materials.`,
      );
      setComment(text.trim());
      setShowComments(true);
    } catch (e) {
      toast({ title: "AI unavailable", description: (e as Error).message, variant: "destructive" });
    } finally {
      setDrafting(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-start gap-3 p-4 pb-3">
          <Link
            to={`/network/${post.authorId}`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary font-display text-sm font-bold text-primary-foreground"
          >
            {initials(post.authorName)}
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Link to={`/network/${post.authorId}`} className="font-semibold text-foreground hover:underline">
                {post.authorName}
              </Link>
              <Badge variant="outline" className="gap-1 border-success/30 bg-success/10 text-success text-[10px]">
                <ShieldCheck className="h-3 w-3" /> {post.trustScore}
              </Badge>
              <Badge variant="outline" className={cn("text-[10px]", meta.tone)}>{meta.label}</Badge>
            </div>
            <p className="truncate text-xs text-muted-foreground">{post.authorTagline}</p>
            <p className="text-[11px] text-muted-foreground">{timeAgo(post.createdAt)} · {post.city}</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 pb-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{post.text}</p>
          {post.aiAssisted && (
            <p className="mt-2 inline-flex items-center gap-1 text-[10px] text-secondary">
              <Sparkles className="h-3 w-3" /> Drafted with VyaparAI
            </p>
          )}
        </div>

        {post.metric && post.metric.length > 0 && (
          <div className="mx-4 mb-3 grid grid-cols-3 gap-2 rounded-lg border border-border bg-muted/40 p-3">
            {post.metric.map((m) => (
              <div key={m.label}>
                <p className="font-display text-sm font-bold text-foreground">{m.value}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{m.label}</p>
              </div>
            ))}
          </div>
        )}

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pb-3">
            {post.tags.map((t) => (
              <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">#{t}</span>
            ))}
          </div>
        )}

        {post.agentInsight && (
          <div className="mx-4 mb-3 rounded-lg border border-secondary/30 bg-secondary/5 p-3">
            <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-secondary">
              <Bot className="h-3.5 w-3.5" /> Agent insight
            </p>
            <p className="text-xs leading-relaxed text-foreground">{post.agentInsight}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between border-t px-2 py-1">
          <div className="flex items-center">
            <Button variant="ghost" size="sm" onClick={handleLike} className={cn("gap-1.5 text-xs", liked && "text-secondary")}>
              <ThumbsUp className={cn("h-4 w-4", liked && "fill-current")} /> {post.likes}
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => setShowComments((s) => !s)}>
              <MessageSquare className="h-4 w-4" /> {post.comments.length}
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={handleRepost}>
              <Repeat2 className="h-4 w-4" /> {post.reposts}
            </Button>
          </div>
          <div className="flex items-center gap-1">
            {post.kind === "rfq_open" && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs" asChild>
                <Link to="/buyer/dashboard"><FileText className="h-4 w-4" /> Quote</Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-secondary" onClick={draftReply} disabled={drafting}>
              {drafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} AI reply
            </Button>
          </div>
        </div>

        {showComments && (
          <div className="space-y-3 border-t bg-muted/20 p-4">
            {post.comments.map((c) => (
              <div key={c.id} className="flex gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-semibold text-foreground">
                  {initials(c.authorName)}
                </span>
                <div className="min-w-0 flex-1 rounded-lg bg-card px-3 py-2 border">
                  <p className="text-xs font-semibold text-foreground">
                    {c.authorName}
                    <span className="ml-2 font-normal text-muted-foreground">{timeAgo(c.createdAt)}</span>
                    {c.aiAssisted && <span className="ml-2 font-normal text-secondary">· AI assisted</span>}
                  </p>
                  <p className="text-sm text-foreground">{c.text}</p>
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment…"
                onKeyDown={(e) => { if (e.key === "Enter") addComment(comment, false); }}
                className="text-sm"
              />
              <Button size="icon" onClick={() => addComment(comment)} disabled={!comment.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
