import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Browser dictation via the Web Speech API (Chrome / Edge / Android).
 * Falls back gracefully: `supported === false` when the API is unavailable.
 */
export function useSpeechInput(onTranscript: (text: string) => void, lang = "en-IN") {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recRef = useRef<any>(null);
  const cbRef = useRef(onTranscript);
  cbRef.current = onTranscript;

  const supported =
    typeof window !== "undefined" &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  useEffect(() => () => { try { recRef.current?.stop(); } catch { /* noop */ } }, []);

  const start = useCallback(() => {
    if (!supported || listening) return;
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (event: any) => {
      let finalText = "";
      let partial = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else partial += r[0].transcript;
      }
      setInterim(partial);
      if (finalText.trim()) cbRef.current(finalText.trim());
    };
    rec.onerror = () => { setListening(false); setInterim(""); };
    rec.onend = () => { setListening(false); setInterim(""); };

    recRef.current = rec;
    rec.start();
    setListening(true);
  }, [supported, listening, lang]);

  const stop = useCallback(() => {
    try { recRef.current?.stop(); } catch { /* noop */ }
    setListening(false);
    setInterim("");
  }, []);

  return { supported, listening, interim, start, stop, toggle: () => (listening ? stop() : start()) };
}
