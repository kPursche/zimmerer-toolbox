"use client";

import { useEffect, useRef, useState } from "react";
import { Reply, Send, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase, type FeedMessage } from "@/lib/supabase";

// Session-ID für Eigentümerprüfung (kein Login nötig)
function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("zb_session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("zb_session_id", id);
  }
  return id;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function ReplyPreview({ message }: { message: FeedMessage }) {
  return (
    <div className="mb-1 rounded border-l-2 border-oak bg-s2 px-2 py-1 text-xs text-mu">
      <span className="font-semibold text-oak">{message.name}: </span>
      <span className="line-clamp-1">{message.message}</span>
    </div>
  );
}

export function CommunityFeed() {
  const [messages, setMessages] = useState<FeedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<FeedMessage | null>(null);
  const [sessionId, setSessionId] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setSessionId(getSessionId());

    supabase
      .from("community_feed")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(200)
      .then(({ data }) => {
        if (data) setMessages(data as FeedMessage[]);
        setLoading(false);
      });

    const channel = supabase
      .channel("community_feed_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_feed" },
        (payload) => setMessages((prev) => [...prev, payload.new as FeedMessage])
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "community_feed" },
        (payload) => setMessages((prev) => prev.filter((m) => m.id !== payload.old.id))
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    await supabase.from("community_feed").insert({
      name: name.trim() || "Anonym",
      message: trimmed,
      reply_to: replyTo?.id ?? null,
      session_id: sessionId,
    });
    setText("");
    setReplyTo(null);
    setSending(false);
  }

  async function handleDelete(id: string) {
    await supabase.from("community_feed").delete().eq("id", id);
  }

  function handleReply(msg: FeedMessage) {
    setReplyTo(msg);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape") setReplyTo(null);
  }

  const msgMap = new Map(messages.map((m) => [m.id, m]));

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 56px - 1px)" }}>
      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {loading ? (
          <p className="text-center text-sm text-mu">Wird geladen…</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-mu">Noch keine Beiträge — schreib den ersten!</p>
        ) : (
          <div className="mx-auto max-w-2xl space-y-2">
            {messages.map((msg) => {
              const isOwn = msg.session_id === sessionId;
              const parent = msg.reply_to ? msgMap.get(msg.reply_to) : null;
              return (
                <div
                  key={msg.id}
                  className={`group flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
                >
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 ${isOwn ? "bg-oak/20" : "bg-s1"}`}>
                    {parent && <ReplyPreview message={parent} />}
                    <div className="mb-0.5 flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-oak">{msg.name}</span>
                      <span className="text-[10px] text-dm">{formatTime(msg.created_at)}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-tx">{msg.message}</p>
                  </div>

                  {/* Aktionen */}
                  <div className={`flex shrink-0 flex-col justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 ${isOwn ? "items-end" : "items-start"}`}>
                    <button
                      onClick={() => handleReply(msg)}
                      className="rounded p-1 text-mu hover:text-tx"
                      title="Antworten"
                    >
                      <Reply className="h-3.5 w-3.5" />
                    </button>
                    {isOwn && (
                      <button
                        onClick={() => handleDelete(msg.id)}
                        className="rounded p-1 text-mu hover:text-[#d47070]"
                        title="Löschen"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Eingabe */}
      <div className="border-t border-bd bg-s1 px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-2">
          {/* Antwort-Vorschau */}
          {replyTo && (
            <div className="flex items-center gap-2 rounded-md border-l-2 border-oak bg-s2 px-3 py-1.5">
              <Reply className="h-3.5 w-3.5 shrink-0 text-oak" />
              <div className="min-w-0 flex-1 text-xs text-mu">
                <span className="font-semibold text-oak">{replyTo.name}: </span>
                <span className="line-clamp-1">{replyTo.message}</span>
              </div>
              <button onClick={() => setReplyTo(null)} className="shrink-0 text-mu hover:text-tx">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <input
            type="text"
            placeholder="Dein Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-bd bg-s2 px-3 py-1.5 text-sm text-tx placeholder:text-dm focus:outline-none focus:ring-1 focus:ring-oak"
          />
          <div className="flex gap-2">
            <Textarea
              ref={inputRef}
              placeholder="Nachricht… (Enter zum Senden, Shift+Enter Zeilenumbruch)"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              className="resize-none border-bd bg-s2 text-tx placeholder:text-dm focus-visible:ring-oak"
            />
            <Button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="shrink-0 self-end bg-oak text-[#1a0800] hover:bg-oak/90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
