"use client";

import { useState } from "react";
import { StakerFilter } from "@/components/staker-filter";
import { StakerResults } from "@/components/staker-results";
import { AirdropConfig, type AirdropConfigValues } from "@/components/airdrop-config";
import { AirdropResults } from "@/components/airdrop-results";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { StakerLookupResponse, AirdropSimulationResult } from "@/lib/types";

export default function Home() {
  // Staker state
  const [stakerData, setStakerData] = useState<StakerLookupResponse | null>(null);
  const [stakerLoading, setStakerLoading] = useState(false);
  const [stakerError, setStakerError] = useState<string | null>(null);
  const [lastSearchParams, setLastSearchParams] = useState<{ from: string; to: string; minAmount: number } | null>(null);

  // Airdrop state
  const [airdropData, setAirdropData] = useState<AirdropSimulationResult | null>(null);
  const [airdropLoading, setAirdropLoading] = useState(false);
  const [airdropError, setAirdropError] = useState<string | null>(null);

  const handleStakerSearch = async (params: {
    from: string;
    to: string;
    minAmount: number;
  }) => {
    setStakerLoading(true);
    setStakerError(null);
    setLastSearchParams(params);
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

  const handleAirdropSimulate = async (config: AirdropConfigValues) => {
    if (!lastSearchParams) return;
    setAirdropLoading(true);
    setAirdropError(null);
    try {
      const query = new URLSearchParams({
        from: lastSearchParams.from,
        to: lastSearchParams.to,
        minAmount: lastSearchParams.minAmount.toString(),
        totalTokens: config.totalTokens.toString(),
        tokenSymbol: config.tokenSymbol,
        wA: config.wA.toString(),
        wD: config.wD.toString(),
        wS: config.wS.toString(),
      });
      const res = await fetch(`/api/airdrop?${query}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to simulate airdrop");
      }
      const data: AirdropSimulationResult = await res.json();
      setAirdropData(data);
    } catch (err) {
      setAirdropError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAirdropLoading(false);
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
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-[calc(4rem+2rem)] lg:self-start lg:max-h-[calc(100vh-6rem)]">
            <ScrollArea className="h-full">
              <div className="space-y-6 pr-2">
                <StakerFilter onSearch={handleStakerSearch} isLoading={stakerLoading} />
                <AirdropConfig
                  onSimulate={handleAirdropSimulate}
                  isLoading={airdropLoading}
                  disabled={!stakerData}
                />
              </div>
            </ScrollArea>
          </aside>

          {/* Main area with tabs */}
          <section className="min-w-0">
            <Tabs defaultValue="stakers">
              <TabsList variant="line" className="mb-6">
                <TabsTrigger value="stakers">Stakers</TabsTrigger>
                <TabsTrigger value="airdrop">Airdrop</TabsTrigger>
              </TabsList>
              <TabsContent value="stakers">
                <StakerResults data={stakerData} isLoading={stakerLoading} error={stakerError} />
              </TabsContent>
              <TabsContent value="airdrop">
                <AirdropResults data={airdropData} isLoading={airdropLoading} error={airdropError} />
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </main>
    </div>
  );
}
