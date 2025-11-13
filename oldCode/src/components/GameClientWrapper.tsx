"use client"; // ✅ Mark this component as a Client Component

import dynamic from "next/dynamic";

const PlayerBiddingGame = dynamic(() => import("@/components/PlayerBiddingGame"), { ssr: false });

export default function ClientWrapper() {
  return <PlayerBiddingGame />;
}
