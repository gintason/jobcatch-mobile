/**
 * "Ask JobCatch" assistant — same backend as the web (/ai/chat/, Server-Sent
 * Events). `expo/fetch` gives us a streaming response body on iOS/Android, so
 * tokens appear as they arrive, like on the web.
 */
import { useCallback, useRef, useState } from "react";
import { fetch as expoFetch } from "expo/fetch";
import { api } from "./api";
import { API_URL } from "./config";
import { tokens } from "./tokens";

export interface AIMessage { role: "user" | "assistant"; content: string; isStreaming?: boolean; isError?: boolean }

function post(message: string, sessionId?: string) {
  return expoFetch(`${API_URL}/ai/chat/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokens.access() ?? ""}` },
    body: JSON.stringify({ message, session_id: sessionId }),
  });
}

export function useAIChatStream() {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isPending, setIsPending] = useState(false);
  const session = useRef<string | undefined>(undefined);
  const busy = useRef(false);

  const patchLast = useCallback((fn: (m: AIMessage) => AIMessage) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      return last?.role === "assistant" ? [...prev.slice(0, -1), fn(last)] : prev;
    });
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const message = text.trim();
    if (!message || busy.current) return;
    busy.current = true;
    setIsPending(true);
    setMessages((prev) => [...prev, { role: "user", content: message }, { role: "assistant", content: "", isStreaming: true }]);
    try {
      let res = await post(message, session.current);
      if (res.status === 401) {
        // Access token expired — any authenticated call refreshes it, then retry once.
        await api.get("/auth/me/");
        res = await post(message, session.current);
      }
      if (!res.ok || !res.body) {
        let detail = "Failed to get a response.";
        try { detail = ((await res.json()) as { detail?: string }).detail || detail; } catch { /* non-JSON body */ }
        throw new Error(detail);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const ev of events) {
          if (!ev.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(ev.slice(6).trim()) as { content?: string; session_id?: string };
            if (data.content !== undefined) patchLast((m) => ({ ...m, content: m.content + data.content }));
            else if (data.session_id) session.current = data.session_id;
          } catch { /* ignore a malformed chunk */ }
        }
      }
      patchLast((m) => ({ ...m, isStreaming: false }));
    } catch {
      patchLast((m) => ({ ...m, content: m.content || "Sorry, I couldn’t reach the assistant. Please try again.", isStreaming: false, isError: true }));
    } finally {
      busy.current = false;
      setIsPending(false);
    }
  }, [patchLast]);

  const reset = useCallback(() => { setMessages([]); session.current = undefined; }, []);
  return { messages, isPending, sendMessage, reset };
}
