import type { Metadata } from "next";
import { CommunityFeed } from "@/components/community-feed";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Community",
  description: "Austausch, Feedback und Ideen rund um die Zimmerer-Toolbox.",
};

export default function CommunityPage() {
  return <CommunityFeed />;
}
