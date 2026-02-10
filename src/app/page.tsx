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
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Staker Lookup</h1>
          <p className="text-sm text-muted-foreground">
            Search stakers by date range and minimum staking amount on Tokamak
            Network
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
          <aside>
            <StakerFilter onSearch={handleStakerSearch} isLoading={stakerLoading} />
          </aside>
          <section>
            <StakerResults data={stakerData} isLoading={stakerLoading} error={stakerError} />
          </section>
        </div>
      </main>
    </div>
  );
}
