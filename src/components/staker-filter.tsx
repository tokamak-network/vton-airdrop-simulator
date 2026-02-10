"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface StakerFilterProps {
  onSearch: (params: { from: string; to: string; minAmount: number }) => void;
  isLoading: boolean;
}

export function StakerFilter({ onSearch, isLoading }: StakerFilterProps) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [minAmount, setMinAmount] = useState(100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!from || !to) return;
    onSearch({ from, to, minAmount });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Staker Lookup</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="from-date">Start Date</Label>
            <Input
              id="from-date"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="to-date">End Date</Label>
            <Input
              id="to-date"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="min-amount">Minimum Staking Amount (WTON)</Label>
            <Input
              id="min-amount"
              type="number"
              value={minAmount}
              onChange={(e) => setMinAmount(Number(e.target.value) || 0)}
              min={0}
              step={1}
            />
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isLoading || !from || !to}>
            {isLoading ? "Searching..." : "Search Stakers"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
