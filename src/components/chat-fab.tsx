"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";

export function ChatFab() {
  const pathname = usePathname();
  if (pathname === "/community") return null;

  return (
    <Link
      href="/community"
      aria-label="Community-Chat öffnen"
      className="fixed bottom-5 right-5 z-50 flex items-center justify-center rounded-2xl shadow-lg transition-transform hover:scale-105 active:scale-95"
      style={{
        background: "linear-gradient(145deg, #d4a44f, #9a6828)",
        boxShadow: "0 2px 10px rgba(201,146,74,0.4)",
        width: 52,
        height: 52,
      }}
    >
      <MessageCircle className="h-5 w-5 text-[#1a0800]" />
    </Link>
  );
}
