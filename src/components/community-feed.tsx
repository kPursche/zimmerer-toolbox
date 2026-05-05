"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase, type FeedMessage } from "@/lib/supabase";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export function CommunityFeed() {
  const [messages, setMessages] = useState<FeedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from("community_feed")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data }) => {
        if (data) setMessages(data as FeedMessage[]);
        setLoading(false);
      });

    const channel = supabase
      .channel("community_feed_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_feed" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as FeedMessage]);
        }
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
    });
    setText("");
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 56px - 1px)" }}>
      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {loading ? (
          <p className="text-center text-sm text-mu">Wird geladen…</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-mu">Noch keine Beiträge — schreib den ersten!</p>
        ) : (
          <div className="mx-auto max-w-2xl space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className="rounded-xl bg-s1 px-4 py-3">
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-oak">{msg.name}</span>
                  <span className="shrink-0 text-[11px] text-dm">{formatTime(msg.created_at)}</span>
                </div>
                <p className="text-sm leading-relaxed text-tx">{msg.message}</p>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Eingabe */}
      <div className="border-t border-bd bg-s1 px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-2">
          <input
            type="text"
            placeholder="Dein Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-bd bg-s2 px-3 py-1.5 text-sm text-tx placeholder:text-dm focus:outline-none focus:ring-1 focus:ring-oak"
          />
          <div className="flex gap-2">
            <Textarea
              placeholder="Schreib etwas… (Enter zum Senden)"
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
