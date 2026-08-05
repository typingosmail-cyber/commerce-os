import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getMessagesFromStorage, saveMessagesToStorage, MOCK_SUPPLIERS } from "@/lib/mock-data";
import type { Conversation } from "@/lib/mock-data";
import { Message } from "@/lib/types";
import {
  getConversationsFromStorage,
  saveConversationsToStorage,
  getCounterpartyMatches,
  startConversationFromMatch,
  draftIntro,
  draftFollowUp,
  type CounterpartyMatch,
} from "@/lib/dm-drafts";
import { toast } from "sonner";
import {
  Send,
  MessageCircle,
  Package,
  Shield,
  User,
  Bot,
  Sparkle,
  Loader2,
  Handshake,
  X,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const FOLLOWUP_GOALS = [
  "Push for a firm price and MOQ",
  "Ask for test certificates & compliance docs",
  "Confirm delivery date and logistics",
  "Negotiate payment terms / credit",
];

export default function MessagesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedSupplier = searchParams.get("supplier");

  const [conversations, setConversations] = useState<Conversation[]>(() =>
    getConversationsFromStorage(),
  );
  const [activeConvId, setActiveConvId] = useState<string | null>(() => {
    const convs = getConversationsFromStorage();
    return preselectedSupplier
      ? convs.find((c) => c.participantId === preselectedSupplier)?.id || convs[0]?.id || null
      : convs[0]?.id || null;
  });
  const [messages, setMessages] = useState<Message[]>(getMessagesFromStorage());
  const [newMessage, setNewMessage] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [matchesOpen, setMatchesOpen] = useState(false);
  const [matches] = useState<CounterpartyMatch[]>(() => getCounterpartyMatches());
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const convMessages = messages.filter((m) => m.conversationId === activeConvId);
  const isNewThread = convMessages.length === 0;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [convMessages.length]);

  const persistConvs = (next: Conversation[]) => {
    setConversations(next);
    saveConversationsToStorage(next);
  };

  const handleSend = () => {
    if (!newMessage.trim() || !activeConvId || !activeConv) return;
    const text = newMessage.trim();
    const msg: Message = {
      id: `m-${Date.now()}`,
      conversationId: activeConvId,
      senderId: "buyer1",
      senderName: "Acme Manufacturing",
      senderType: "buyer",
      text,
      timestamp: new Date().toISOString(),
    };
    const updated = [...messages, msg];
    setMessages(updated);
    saveMessagesToStorage(updated);
    persistConvs(
      conversations.map((c) =>
        c.id === activeConvId ? { ...c, lastMessage: text, lastMessageTime: msg.timestamp } : c,
      ),
    );
    setNewMessage("");

    // Simulate supplier auto-reply
    setTimeout(() => {
      const supplier = MOCK_SUPPLIERS.find((s) => s.id === activeConv?.participantId);
      const reply: Message = {
        id: `m-${Date.now() + 1}`,
        conversationId: activeConvId,
        senderId: activeConv?.participantId || "s1",
        senderName: supplier?.name || activeConv?.participantName || "Supplier",
        senderType: "supplier",
        text: getAutoReply(text),
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => {
        const next = [...prev, reply];
        saveMessagesToStorage(next);
        return next;
      });
      persistConvs(
        getConversationsFromStorage().map((c) =>
          c.id === activeConvId
            ? { ...c, lastMessage: reply.text, lastMessageTime: reply.timestamp }
            : c,
        ),
      );
    }, 1500);
  };

  /** AI drafts an intro (empty thread) or a follow-up (ongoing thread) into the composer. */
  const handleAiDraft = async (goal?: string) => {
    if (!activeConv || drafting) return;
    setDrafting(true);
    try {
      let text: string;
      if (isNewThread) {
        const match =
          matches.find(
            (m) =>
              m.supplierId === activeConv.participantId &&
              m.sourceTitle === activeConv.productContext,
          ) || matches.find((m) => m.supplierId === activeConv.participantId);
        text = match
          ? await draftIntro(match)
          : await draftFollowUp(activeConv, convMessages, goal || "Open the conversation");
      } else {
        text = await draftFollowUp(activeConv, convMessages, goal);
      }
      setNewMessage(text);
      toast.success(isNewThread ? "AI introduction drafted" : "AI follow-up drafted");
    } catch (e) {
      toast.error((e as Error).message || "Could not draft message");
    } finally {
      setDrafting(false);
    }
  };

  /** Opens (or creates) a thread for a match and immediately drafts the AI intro. */
  const handleStartFromMatch = async (m: CounterpartyMatch) => {
    const conv = startConversationFromMatch(m);
    persistConvs(getConversationsFromStorage());
    setActiveConvId(conv.id);
    setMatchesOpen(false);
    setDrafting(true);
    try {
      const text = await draftIntro(m);
      setNewMessage(text);
      toast.success(`AI introduction drafted for ${m.supplierName}`);
    } catch (e) {
      toast.error((e as Error).message || "Could not draft introduction");
    } finally {
      setDrafting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="container py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-140px)]">
          {/* Conversation list */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="p-3 border-b flex items-center justify-between gap-2">
                <h3 className="font-display font-semibold text-sm text-foreground">Conversations</h3>
                <Dialog open={matchesOpen} onOpenChange={setMatchesOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      <Handshake className="h-3.5 w-3.5 mr-1" /> Matches
                      <Badge className="ml-1.5 h-4 px-1 text-[10px]">{matches.length}</Badge>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="font-display flex items-center gap-2">
                        <Handshake className="h-4 w-4 text-primary" /> Counterparty matches
                      </DialogTitle>
                      <DialogDescription>
                        Suppliers matched to your RFQs and deals. Start a thread and VyaparAI drafts
                        the introduction with your specs, target price and timeline.
                      </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[55vh] pr-3">
                      <div className="space-y-2">
                        {matches.map((m) => (
                          <div
                            key={m.id}
                            className="rounded-lg border p-3 flex items-start justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm text-foreground">
                                  {m.supplierName}
                                </span>
                                <Badge variant="secondary" className="text-[10px]">
                                  {m.matchScore}% match
                                </Badge>
                                <Badge variant="outline" className="text-[10px] uppercase">
                                  {m.source}
                                </Badge>
                              </div>
                              <p className="text-xs text-primary mt-0.5 flex items-center gap-1">
                                <Package className="h-3 w-3" /> {m.sourceTitle}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {m.reasons.join(" · ")}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              className="shrink-0"
                              disabled={drafting}
                              onClick={() => handleStartFromMatch(m)}
                            >
                              <Sparkle className="h-3.5 w-3.5 mr-1" /> AI intro
                            </Button>
                          </div>
                        ))}
                        {matches.length === 0 && (
                          <p className="text-sm text-muted-foreground py-6 text-center">
                            No counterparty matches yet. Post an RFQ to get matched.
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              </div>
              <ScrollArea className="h-[calc(100vh-210px)]">
                {conversations.map((conv) => (
                  <div key={conv.id}>
                    <button
                      className={`w-full p-3 text-left hover:bg-muted/50 transition-colors ${activeConvId === conv.id ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
                      onClick={() => setActiveConvId(conv.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary">{conv.participantName.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground text-sm truncate">{conv.participantName}</span>
                            {conv.unreadCount > 0 && (
                              <Badge className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">{conv.unreadCount}</Badge>
                            )}
                          </div>
                          {conv.productContext && (
                            <span className="text-[10px] text-primary flex items-center gap-1 mt-0.5"><Package className="h-2.5 w-2.5" /> {conv.productContext}</span>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{conv.lastMessage}</p>
                        </div>
                      </div>
                    </button>
                    <Separator />
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat area */}
          <Card className="md:col-span-2 flex flex-col overflow-hidden">
            {activeConv ? (
              <>
                {/* Chat header */}
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{activeConv.participantName.charAt(0)}</span>
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-foreground text-sm">{activeConv.participantName}</h3>
                      {activeConv.productContext && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3" /> {activeConv.productContext}</span>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {
                    const supplier = MOCK_SUPPLIERS.find(s => s.id === activeConv.participantId);
                    if (supplier) navigate(`/supplier/${supplier.id}`);
                  }}>
                    <Shield className="h-3.5 w-3.5 mr-1" /> View Profile
                  </Button>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                  <div className="space-y-4">
                    {isNewThread && (
                      <div className="rounded-lg border border-dashed p-4 text-center">
                        <Bot className="h-6 w-6 mx-auto text-primary mb-2" />
                        <p className="text-sm font-medium text-foreground">
                          New match — no messages yet
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Let VyaparAI write the introduction using this deal's specs.
                        </p>
                        <Button
                          size="sm"
                          className="mt-3"
                          disabled={drafting}
                          onClick={() => handleAiDraft()}
                        >
                          {drafting ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                          ) : (
                            <Sparkle className="h-3.5 w-3.5 mr-1" />
                          )}
                          Draft introduction
                        </Button>
                      </div>
                    )}
                    {convMessages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.senderType === "buyer" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${msg.senderType === "buyer" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <User className="h-3 w-3 opacity-60" />
                            <span className="text-[10px] font-medium opacity-70">{msg.senderName}</span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                          <p className={`text-[10px] mt-1 ${msg.senderType === "buyer" ? "opacity-60" : "text-muted-foreground"}`}>
                            {new Date(msg.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* AI draft bar */}
                <div className="px-4 pt-3 flex items-center gap-2 flex-wrap border-t">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                    <Bot className="h-3.5 w-3.5 text-primary" /> AI draft:
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 text-xs"
                    disabled={drafting}
                    onClick={() => handleAiDraft()}
                  >
                    {drafting ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Sparkle className="h-3 w-3 mr-1" />
                    )}
                    {isNewThread ? "Introduction" : "Follow-up"}
                  </Button>
                  {!isNewThread &&
                    FOLLOWUP_GOALS.map((g) => (
                      <Button
                        key={g}
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={drafting}
                        onClick={() => handleAiDraft(g)}
                      >
                        {g}
                      </Button>
                    ))}
                </div>

                {/* Input */}
                <div className="p-4 pt-2">
                  <div className="flex gap-2 items-end">
                    {newMessage.includes("\n") ? (
                      <div className="flex-1 relative">
                        <Textarea
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          rows={4}
                          className="resize-none pr-8"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => setNewMessage("")}
                          aria-label="Clear draft"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message, or let AI draft it..."
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        className="flex-1"
                      />
                    )}
                    <Button onClick={handleSend} disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Select a conversation</p>
                  <p className="text-sm mt-1">Choose a supplier to start chatting</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function getAutoReply(userMessage: string): string {
  const lower = userMessage.toLowerCase();
  if (lower.includes("price") || lower.includes("cost") || lower.includes("rate")) {
    return "We can offer competitive pricing for bulk orders. Could you share the exact quantity and delivery location? We'll prepare a detailed quotation.";
  }
  if (lower.includes("delivery") || lower.includes("ship") || lower.includes("dispatch")) {
    return "Standard delivery is 5-7 working days. Express delivery (2-3 days) is available at 10% extra. Which works best for you?";
  }
  if (lower.includes("sample")) {
    return "Yes, we can send product samples! There's a nominal courier charge of ₹200-500 depending on your location. Shall I arrange one?";
  }
  if (lower.includes("certificate") || lower.includes("test")) {
    return "All our products come with test certificates and compliance documentation. I'll share the relevant certificates once we finalize the order specifications.";
  }
  return "Thank you for your message. Let me check and get back to you shortly with the details. Is there anything specific you'd like to know about our products?";
}
