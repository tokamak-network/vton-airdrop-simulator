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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Calendar, Coins } from "lucide-react";

interface StakerFilterProps {
  onSearch: (params: { from: string; to: string; minAmount: number }) => void;
  isLoading: boolean;
}

const PRESETS = [
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
  { label: "All", days: 0 },
] as const;

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function today(): string {
  return formatDate(new Date());
}

// DepositManager V1 deployment date (block 10837675)
const EARLIEST_DATE = "2020-09-11";

export function StakerFilter({ onSearch, isLoading }: StakerFilterProps) {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [minAmount, setMinAmount] = useState(100);
  const [activePreset, setActivePreset] = useState<string>("");

  const applyPreset = (value: string) => {
    if (!value) {
      setActivePreset("");
      return;
    }
    const days = Number(value);
    const end = today();
    setTo(end);
    if (days === 0) {
      setFrom(EARLIEST_DATE);
    } else {
      const start = new Date();
      start.setDate(start.getDate() - days);
      setFrom(formatDate(start));
    }
    setActivePreset(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!from || !to) return;
    onSearch({ from, to, minAmount });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Query Builder</CardTitle>
        <CardDescription className="text-sm">Configure staker search parameters</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Period presets */}
          <fieldset className="space-y-3">
            <Label className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              Period
            </Label>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={activePreset}
              onValueChange={applyPreset}
              className="w-full"
            >
              {PRESETS.map(({ label, days }) => (
                <ToggleGroupItem
                  key={days}
                  value={String(days)}
                  className="flex-1 text-xs"
                >
                  {label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </fieldset>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="from-date" className="text-sm text-muted-foreground">
                From
              </Label>
              <Input
                id="from-date"
                type="date"
                value={from}
                min={EARLIEST_DATE}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setActivePreset("");
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to-date" className="text-sm text-muted-foreground">
                To
              </Label>
              <Input
                id="to-date"
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => {
                  setTo(e.target.value);
                  setActivePreset("");
                }}
                required
              />
            </div>
          </div>

          <Separator />

          {/* Min amount */}
          <fieldset className="space-y-3">
            <Label htmlFor="min-amount" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Coins className="h-3.5 w-3.5" />
              Min. Staking Amount
            </Label>
            <div className="relative">
              <Input
                id="min-amount"
                type="number"
                className="pr-16 font-mono"
                value={String(minAmount)}
                onChange={(e) => {
                  const raw = e.target.value;
                  const n = Number(raw);
                  if (raw === "" || Number.isNaN(n)) {
                    setMinAmount(0);
                  } else {
                    setMinAmount(n);
                    // Force DOM sync to strip leading zeros
                    e.target.value = String(n);
                  }
                }}
                min={0}
                step={1}
              />
              <Badge
                variant="secondary"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold"
              >
                WTON
              </Badge>
            </div>
          </fieldset>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !from || !to}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Search Stakers
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
