import { generateText } from "@/lib/ai-agent";
import {
  MOCK_CONVERSATIONS,
  MOCK_RFQS,
  MOCK_SUPPLIERS,
  getMessagesFromStorage,
  saveMessagesToStorage,
  type Conversation,
} from "@/lib/mock-data";
import type { Message, RFQ, RFQResponse } from "@/lib/types";

const CONV_KEY = "vyapar_conversations";

/* ---------------- conversations persistence ---------------- */

export function getConversationsFromStorage(): Conversation[] {
  const raw = localStorage.getItem(CONV_KEY);
  return raw ? (JSON.parse(raw) as Conversation[]) : MOCK_CONVERSATIONS;
}

export function saveConversationsToStorage(convs: Conversation[]) {
  localStorage.setItem(CONV_KEY, JSON.stringify(convs));
}

/* ---------------- counterparty matches ---------------- */

export type MatchSource = "rfq" | "deal";

export interface CounterpartyMatch {
  id: string;
  source: MatchSource;
  /** RFQ id or order/deal id */
  sourceId: string;
  sourceTitle: string;
  supplierId: string;
  supplierName: string;
  supplierCity?: string;
  trustScore?: number;
  matchScore: number;
  /** short reasons for the match */
  reasons: string[];
  quantity?: number;
  unit?: string;
  budget?: number;
  pricePerUnit?: number;
  leadTimeDays?: number;
  deliveryLocation?: string;
  deliveryDate?: string;
}

function scoreMatch(m: Omit<CounterpartyMatch, "matchScore">, trust: number) {
  let score = Math.round((trust / 1000) * 60);
  if (m.pricePerUnit && m.budget && m.quantity) {
    const target = m.budget / m.quantity;
    if (m.pricePerUnit <= target) score += 25;
    else if (m.pricePerUnit <= target * 1.08) score += 15;
    else score += 5;
  } else score += 12;
  if (m.leadTimeDays !== undefined) score += m.leadTimeDays <= 7 ? 15 : m.leadTimeDays <= 14 ? 9 : 4;
  else score += 8;
  return Math.min(99, score);
}

/** Builds counterparty matches from RFQ responses and category/product overlap. */
export function getCounterpartyMatches(rfqs: RFQ[] = MOCK_RFQS): CounterpartyMatch[] {
  const matches: CounterpartyMatch[] = [];

  for (const rfq of rfqs) {
    // 1. suppliers who already responded to the RFQ
    for (const r of rfq.responses as RFQResponse[]) {
      const sup = MOCK_SUPPLIERS.find((s) => s.id === r.supplierId || s.name === r.supplierName);
      const trust = sup?.trustScore?.score ?? r.supplierScore ?? 700;
      const base = {
        id: `match-${rfq.id}-${r.supplierId}`,
        source: "rfq" as const,
        sourceId: rfq.id,
        sourceTitle: rfq.title,
        supplierId: sup?.id ?? r.supplierId,
        supplierName: r.supplierName,
        supplierCity: sup?.city,
        trustScore: trust,
        reasons: [
          `Quoted ₹${r.pricePerUnit}/${rfq.unit}`,
          `${r.leadTimeDays}-day lead time`,
          `Trust ${trust}`,
        ],
        quantity: rfq.quantity,
        unit: rfq.unit,
        budget: rfq.budget,
        pricePerUnit: r.pricePerUnit,
        leadTimeDays: r.leadTimeDays,
        deliveryLocation: rfq.deliveryLocation,
        deliveryDate: rfq.deliveryDate,
      };
      matches.push({ ...base, matchScore: scoreMatch(base, trust) });
    }

    // 2. category matches with no response yet
    const responded = new Set(rfq.responses.map((r) => r.supplierName));
    for (const s of MOCK_SUPPLIERS) {
      if (responded.has(s.name)) continue;
      const words = rfq.title.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);
      const productHit = s.products.some((p) => words.some((w) => p.toLowerCase().includes(w)));
      const categoryHit = s.industry === rfq.category || s.subIndustry === rfq.category;
      if (!productHit && !categoryHit) continue;
      const trust = s.trustScore?.score ?? 700;
      const base = {
        id: `match-${rfq.id}-${s.id}`,
        source: "rfq" as const,
        sourceId: rfq.id,
        sourceTitle: rfq.title,
        supplierId: s.id,
        supplierName: s.name,
        supplierCity: s.city,
        trustScore: trust,
        reasons: [
          productHit ? "Product catalog match" : `Category: ${s.industry}`,
          s.city ? `Based in ${s.city}` : "Verified supplier",
          `Trust ${trust}`,
        ],
        quantity: rfq.quantity,
        unit: rfq.unit,
        budget: rfq.budget,
        deliveryLocation: rfq.deliveryLocation,
        deliveryDate: rfq.deliveryDate,
      };
      matches.push({ ...base, matchScore: scoreMatch(base, trust) });
    }
  }

  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

/* ---------------- AI drafting ---------------- */

const BUYER_NAME = "Acme Manufacturing Ltd";

function matchBrief(m: CounterpartyMatch) {
  const target = m.budget && m.quantity ? Math.round(m.budget / m.quantity) : undefined;
  return [
    `Sender: ${BUYER_NAME} (buyer, Pune, industrial manufacturer).`,
    `Recipient: ${m.supplierName}${m.supplierCity ? `, ${m.supplierCity}` : ""} (supplier, trust score ${m.trustScore ?? "n/a"}).`,
    `Matched on ${m.source === "rfq" ? "RFQ" : "deal"}: ${m.sourceTitle}.`,
    m.quantity ? `Requirement: ${m.quantity} ${m.unit}.` : "",
    target ? `Target price: about ₹${target}/${m.unit}.` : "",
    m.pricePerUnit ? `Their quote: ₹${m.pricePerUnit}/${m.unit}.` : "",
    m.leadTimeDays ? `Quoted lead time: ${m.leadTimeDays} days.` : "",
    m.deliveryLocation ? `Delivery to ${m.deliveryLocation}${m.deliveryDate ? ` by ${m.deliveryDate}` : ""}.` : "",
    `Why matched: ${m.reasons.join("; ")}.`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** AI-drafted first message for a fresh counterparty match. */
export async function draftIntro(m: CounterpartyMatch): Promise<string> {
  return (await generateText("dm_intro", matchBrief(m))).trim();
}

/** AI-drafted follow-up using the thread so far. */
export async function draftFollowUp(
  conv: Conversation,
  msgs: Message[],
  goal?: string,
): Promise<string> {
  const transcript = msgs
    .slice(-10)
    .map((m) => `${m.senderType === "buyer" ? "Us" : m.senderName}: ${m.text}`)
    .join("\n");
  const prompt = [
    `Sender: ${BUYER_NAME} (buyer).`,
    `Counterparty: ${conv.participantName} (${conv.participantType}).`,
    conv.productContext ? `Deal context: ${conv.productContext}.` : "",
    goal ? `Goal of this follow-up: ${goal}.` : "",
    "",
    "Conversation so far:",
    transcript || "(no messages yet)",
  ]
    .filter(Boolean)
    .join("\n");
  return (await generateText("dm_followup", prompt)).trim();
}

/* ---------------- start a conversation from a match ---------------- */

export function startConversationFromMatch(m: CounterpartyMatch): Conversation {
  const convs = getConversationsFromStorage();
  const existing = convs.find(
    (c) => c.participantId === m.supplierId && c.productContext === m.sourceTitle,
  );
  if (existing) return existing;

  const conv: Conversation = {
    id: `conv-${m.supplierId}-${Date.now()}`,
    participantId: m.supplierId,
    participantName: m.supplierName,
    participantType: "supplier",
    lastMessage: "New match — draft an introduction",
    lastMessageTime: new Date().toISOString(),
    unreadCount: 0,
    productContext: m.sourceTitle,
  };
  saveConversationsToStorage([conv, ...convs]);
  return conv;
}

export function appendMessage(conv: Conversation, text: string): Message {
  const msg: Message = {
    id: `m-${Date.now()}`,
    conversationId: conv.id,
    senderId: "buyer1",
    senderName: BUYER_NAME,
    senderType: "buyer",
    text,
    timestamp: new Date().toISOString(),
  };
  saveMessagesToStorage([...getMessagesFromStorage(), msg]);
  const convs = getConversationsFromStorage().map((c) =>
    c.id === conv.id ? { ...c, lastMessage: text, lastMessageTime: msg.timestamp } : c,
  );
  saveConversationsToStorage(convs);
  return msg;
}
