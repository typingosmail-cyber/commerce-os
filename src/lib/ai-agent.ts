import { supabase } from "@/integrations/supabase/client";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/b2b-agent`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export type AgentMessage = { role: "user" | "assistant"; content: string };

/** One-shot generation (post drafts, insights, comments). */
export async function generateText(mode: string, prompt: string): Promise<string> {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON}` },
    body: JSON.stringify({ mode, prompt, stream: false }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "AI request failed");
  return (data.text as string) ?? "";
}

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

/** One-shot generation with multimodal parts (text + images/documents as data URLs). */
export async function generateTextParts(mode: string, parts: ContentPart[]): Promise<string> {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON}` },
    body: JSON.stringify({ mode, stream: false, messages: [{ role: "user", content: parts }] }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "AI request failed");
  return (data.text as string) ?? "";
}

function parseJSONBlock<T>(raw: string): T {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI returned no JSON.");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

/** JSON generation from multimodal parts (BOM images, spec sheets). */
export async function generateJSONParts<T = unknown>(mode: string, parts: ContentPart[]): Promise<T> {
  return parseJSONBlock<T>(await generateTextParts(mode, parts));
}

/** JSON generation (structured intent extraction). */
export async function generateJSON<T = unknown>(mode: string, prompt: string): Promise<T> {
  return parseJSONBlock<T>(await generateText(mode, prompt));
}

/** Streaming copilot chat. Calls onDelta with incremental text. */
export async function streamAgent(
  messages: AgentMessage[],
  onDelta: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON}` },
    body: JSON.stringify({ mode: "copilot", messages, stream: true }),
    signal,
  });

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "AI request failed");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const json = JSON.parse(payload);
        const delta = json?.choices?.[0]?.delta?.content;
        if (delta) onDelta(delta as string);
      } catch {
        /* partial frame — ignore */
      }
    }
  }
}

// keep the supabase import meaningful for future authed calls
export const agentClient = supabase;
