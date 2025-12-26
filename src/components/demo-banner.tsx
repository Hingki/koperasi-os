"use client";

import { useEffect, useState } from "react";

export function DemoBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const isDemo = process.env.NEXT_PUBLIC_APP_MODE === "demo";
    setIsVisible(isDemo);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="bg-yellow-400 text-yellow-950 px-4 py-2 text-center text-sm font-bold shadow-sm z-50 relative">
      ⚠️ MODE DEMO / LATIHAN — Semua transaksi menggunakan uang fantasi dan tidak akan diproses secara riil.
    </div>
  );
}
