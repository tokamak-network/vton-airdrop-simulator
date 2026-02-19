"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Weight, Coins } from "lucide-react";

export interface AirdropConfigValues {
  totalTokens: number;
  tokenSymbol: string;
  wA: number; // stakingAmount weight
  wD: number; // stakingDuration weight
  wS: number; // seigniorage weight
}

interface AirdropConfigProps {
  onSimulate: (config: AirdropConfigValues) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function AirdropConfig({ onSimulate, isLoading, disabled }: AirdropConfigProps) {
  const [totalTokens, setTotalTokens] = useState(1_000_000);
  const [tokenSymbol, setTokenSymbol] = useState("TOKEN");
  const [wA, setWA] = useState(33);
  const [wD, setWD] = useState(33);
  const wS = 100 - wA - wD;

  const handleWAChange = (value: number[]) => {
    const newWA = value[0];
    // Ensure wD doesn't exceed remaining
    const maxWD = 100 - newWA;
    setWA(newWA);
    if (wD > maxWD) setWD(maxWD);
  };

  const handleWDChange = (value: number[]) => {
    const newWD = value[0];
    const maxWA = 100 - newWD;
    setWD(newWD);
    if (wA > maxWA) setWA(maxWA);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSimulate({ totalTokens, tokenSymbol, wA, wD, wS });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Airdrop Config</CardTitle>
        <CardDescription className="text-sm">
          Configure token distribution parameters
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Total tokens */}
          <fieldset className="space-y-3">
            <Label htmlFor="total-tokens" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Coins className="h-3.5 w-3.5" />
              Total Distribution
            </Label>
            <div className="relative">
              <Input
                id="total-tokens"
                type="number"
                className="pr-20 font-mono"
                value={totalTokens}
                onChange={(e) => setTotalTokens(Number(e.target.value) || 0)}
                min={1}
                step={1000}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <Input
                  className="h-6 w-16 border-0 bg-muted px-1.5 text-center text-xs font-semibold"
                  value={tokenSymbol}
                  onChange={(e) => setTokenSymbol(e.target.value.toUpperCase().slice(0, 6))}
                  maxLength={6}
                />
              </div>
            </div>
          </fieldset>

          <Separator />

          {/* Weights */}
          <fieldset className="space-y-4">
            <Label className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Weight className="h-3.5 w-3.5" />
              Criteria Weights
            </Label>

            {/* Staking Amount */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Staking Amount</span>
                <Badge variant="secondary" className="text-xs font-mono tabular-nums">
                  {wA}%
                </Badge>
              </div>
              <Slider
                value={[wA]}
                onValueChange={handleWAChange}
                min={0}
                max={100}
                step={1}
              />
            </div>

            {/* Staking Duration */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Staking Duration</span>
                <Badge variant="secondary" className="text-xs font-mono tabular-nums">
                  {wD}%
                </Badge>
              </div>
              <Slider
                value={[wD]}
                onValueChange={handleWDChange}
                min={0}
                max={100 - wA}
                step={1}
              />
            </div>

            {/* Seigniorage (computed) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Seigniorage</span>
                <Badge variant="outline" className="text-xs font-mono tabular-nums">
                  {wS}%
                </Badge>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary/40 transition-all"
                  style={{ width: `${wS}%` }}
                />
              </div>
            </div>
          </fieldset>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || disabled || totalTokens <= 0 || wS < 0}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Simulating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Simulate Airdrop
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
