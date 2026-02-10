"use client";

import { useState } from "react";
import { StakerFilter } from "@/components/staker-filter";
import { StakerResults } from "@/components/staker-results";
import type { StakerLookupResponse } from "@/lib/types";

export default function Home() {
  const [stakerData, setStakerData] = useState<StakerLookupResponse | null>(null);
  const [stakerLoading, setStakerLoading] = useState(false);
  const [stakerError, setStakerError] = useState<string | null>(null);

  const handleStakerSearch = async (params: {
    from: string;
    to: string;
    minAmount: number;
  }) => {
    setStakerLoading(true);
    setStakerError(null);
    try {
      const query = new URLSearchParams({
        from: params.from,
        to: params.to,
        minAmount: params.minAmount.toString(),
      });
      const res = await fetch(`/api/stakers?${query}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to fetch stakers");
      }
      const data: StakerLookupResponse = await res.json();
      setStakerData(data);
    } catch (err) {
      setStakerError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setStakerLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-6">
          <div>
            <h1 className="text-base font-semibold">Airdrop Simulator</h1>
            <p className="text-xs text-muted-foreground">Tokamak Network Staker Lookup</p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-8">
          <aside className="lg:sticky lg:top-[calc(4rem+2rem)] lg:self-start">
            <StakerFilter onSearch={handleStakerSearch} isLoading={stakerLoading} />
          </aside>
          <section className="min-w-0">
            <StakerResults data={stakerData} isLoading={stakerLoading} error={stakerError} />
          </section>
        </div>
      </main>
    </div>
  );
}
