import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MOCK_CONVERSATIONS, getMessagesFromStorage, saveMessagesToStorage, MOCK_SUPPLIERS } from "@/lib/mock-data";
import type { Conversation } from "@/lib/mock-data";
import { Message } from "@/lib/types";
import { ArrowLeft, Send, MessageCircle, Package, Shield, User } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function MessagesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedSupplier = searchParams.get("supplier");

  const [conversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [activeConvId, setActiveConvId] = useState<string | null>(
    preselectedSupplier
      ? MOCK_CONVERSATIONS.find(c => c.participantId === preselectedSupplier)?.id || null
      : MOCK_CONVERSATIONS[0]?.id || null
  );
  const [messages, setMessages] = useState<Message[]>(getMessagesFromStorage());
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find(c => c.id === activeConvId);
  const convMessages = messages.filter(m => m.conversationId === activeConvId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [convMessages.length]);

  const handleSend = () => {
    if (!newMessage.trim() || !activeConvId) return;
    const msg: Message = {
      id: `m-${Date.now()}`,
      conversationId: activeConvId,
      senderId: "buyer1",
      senderName: "Acme Manufacturing",
      senderType: "buyer",
      text: newMessage.trim(),
      timestamp: new Date().toISOString(),
    };
    const updated = [...messages, msg];
    setMessages(updated);
    saveMessagesToStorage(updated);
    setNewMessage("");

    // Simulate supplier auto-reply
    setTimeout(() => {
      const supplier = MOCK_SUPPLIERS.find(s => s.id === activeConv?.participantId);
      const reply: Message = {
        id: `m-${Date.now() + 1}`,
        conversationId: activeConvId,
        senderId: activeConv?.participantId || "s1",
        senderName: supplier?.name || activeConv?.participantName || "Supplier",
        senderType: "supplier",
        text: getAutoReply(newMessage.trim()),
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => {
        const next = [...prev, reply];
        saveMessagesToStorage(next);
        return next;
      });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="container py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-140px)]">
          {/* Conversation list */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="p-3 border-b">
                <h3 className="font-display font-semibold text-sm text-foreground">Conversations</h3>
              </div>
              <ScrollArea className="h-[calc(100vh-210px)]">
                {conversations.map(conv => (
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
                    {convMessages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.senderType === "buyer" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${msg.senderType === "buyer" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <User className="h-3 w-3 opacity-60" />
                            <span className="text-[10px] font-medium opacity-70">{msg.senderName}</span>
                          </div>
                          <p className="text-sm">{msg.text}</p>
                          <p className={`text-[10px] mt-1 ${msg.senderType === "buyer" ? "opacity-60" : "text-muted-foreground"}`}>
                            {new Date(msg.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      onKeyDown={e => e.key === "Enter" && handleSend()}
                      className="flex-1"
                    />
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
