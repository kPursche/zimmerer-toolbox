"use client";

import { useState } from "react";
import { MessageSquarePlus, X, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type Status = "idle" | "sending" | "sent" | "error";

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSend() {
    if (!message.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, name }),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  function handleClose() {
    setOpen(false);
    setTimeout(() => {
      setMessage("");
      setName("");
      setStatus("idle");
    }, 300);
  }

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Feedback senden"
        className="fixed bottom-5 right-5 z-50 flex h-13 w-13 items-center justify-center rounded-2xl shadow-lg transition-transform hover:scale-105 active:scale-95"
        style={{
          background: "linear-gradient(145deg, #d4a44f, #9a6828)",
          boxShadow: "0 2px 10px rgba(201,146,74,0.4)",
          width: 52,
          height: 52,
        }}
      >
        <MessageSquarePlus className="h-5 w-5 text-[#1a0800]" />
      </button>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="max-w-sm border-bd bg-s1 text-tx">
          <DialogHeader>
            <DialogTitle className="text-tx">Feedback senden</DialogTitle>
          </DialogHeader>

          {status === "sent" ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle className="h-10 w-10 text-pine" />
              <p className="font-semibold text-tx">Danke für dein Feedback!</p>
              <p className="text-sm text-mu">Ich melde mich bei Bedarf.</p>
              <Button onClick={handleClose} className="mt-2 bg-oak text-[#1a0800] hover:bg-oak/90">
                Schließen
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Dein Name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-bd bg-s2 px-3 py-2 text-sm text-tx placeholder:text-dm focus:outline-none focus:ring-1 focus:ring-oak"
              />
              <Textarea
                placeholder="Was kann ich verbessern?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="border-bd bg-s2 text-tx placeholder:text-dm focus-visible:ring-oak"
              />
              {status === "error" && (
                <p className="text-sm text-[#d47070]">Senden fehlgeschlagen — bitte nochmal versuchen.</p>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={handleClose} className="text-mu hover:text-tx">
                  <X className="mr-1 h-4 w-4" /> Abbrechen
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={!message.trim() || status === "sending"}
                  className="bg-oak text-[#1a0800] hover:bg-oak/90 disabled:opacity-50"
                >
                  <Send className="mr-1 h-4 w-4" />
                  {status === "sending" ? "Wird gesendet…" : "Senden"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
