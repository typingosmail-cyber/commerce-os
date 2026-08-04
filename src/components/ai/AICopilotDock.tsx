import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { streamAgent, type AgentMessage } from "@/lib/ai-agent";
import { Bot, Send, X, Loader2, Sparkles, Square } from "lucide-react";
import { cn } from "@/lib/utils";

const QUICK_PROMPTS = [
  "Shortlist SS316 bolt suppliers in Pune under ₹42/pc",
  "Draft an RFQ for 24,000 M10x50 Class 8.8 bolts",
  "What are SS304 sheet prices likely to do this month?",
  "How should I negotiate 2/10 net-45 with a new supplier?",
];

function renderText(text: string) {
  // Lightweight markdown: bold, bullets, line breaks.
  return text.split("\n").map((line, i) => {
    const bullet = /^\s*[-*]\s+/.test(line);
    const clean = line.replace(/^\s*[-*]\s+/, "");
    const parts = clean.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith("**") && p.endsWith("**") ? (
        <strong key={j} className="font-semibold">{p.slice(2, -2)}</strong>
      ) : (
        <span key={j}>{p}</span>
      ),
    );
    return (
      <p key={i} className={cn("text-sm leading-relaxed", bullet && "pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-secondary")}>
        {parts}
      </p>
    );
  });
}

export function AICopilotDock() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      role: "assistant",
      content:
        "I'm **VyaparAI**, your trade copilot. I can shortlist suppliers, draft RFQs, benchmark prices, review risk and plan payment terms. What are you sourcing today?",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, busy]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setError(null);
    setInput("");
    const history: AgentMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await streamAgent(history, (chunk) => {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: next[next.length - 1].content + chunk,
          };
          return next;
        });
      }, controller.signal);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError((e as Error).message);
        setMessages((prev) => prev.slice(0, -1));
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-lg hover:bg-primary/90 transition-all animate-fade-in"
      >
        <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <Bot className="h-3.5 w-3.5" />
        </span>
        <span className="text-sm font-medium hidden sm:inline">Ask VyaparAI</span>
      </button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 flex w-[min(420px,calc(100vw-2rem))] h-[min(600px,calc(100vh-2rem))] flex-col overflow-hidden shadow-2xl border-primary/20">
      <div className="flex items-center justify-between border-b bg-primary px-4 py-3 text-primary-foreground">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <Bot className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-display font-semibold leading-tight">VyaparAI Copilot</p>
            <p className="text-[11px] text-primary-foreground/70 leading-tight">Sourcing · Pricing · Risk · Terms</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-2.5", m.role === "user" && "justify-end")}>
            {m.role === "assistant" && (
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-secondary">
                <Bot className="h-3.5 w-3.5" />
              </span>
            )}
            <div className={cn("max-w-[85%] space-y-1.5", m.role === "user" && "rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-primary-foreground")}>
              {m.content ? renderText(m.content) : busy ? (
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                </span>
              ) : null}
            </div>
          </div>
        ))}
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
        )}
        {messages.length <= 1 && (
          <div className="space-y-1.5 pt-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Try</p>
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="w-full rounded-md border border-border px-3 py-2 text-left text-xs text-foreground hover:border-secondary/60 hover:bg-secondary/5 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t p-3"
      >
        <div className="flex items-end gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Ask about suppliers, prices, terms…"
            className="min-h-[42px] max-h-32 resize-none text-sm"
          />
          {busy ? (
            <Button type="button" size="icon" variant="outline" onClick={() => abortRef.current?.abort()}>
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" size="icon" disabled={!input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
          <Sparkles className="h-3 w-3 text-secondary" /> Grounded on network trust scores, price history & capacity signals.
        </p>
      </form>
    </Card>
  );
}
