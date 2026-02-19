"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Download,
  Users,
  Coins,
  PieChart,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  AlertCircle,
  Database,
  FileSpreadsheet,
  FileJson,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import type { AirdropSimulationResult, StakerScores } from "@/lib/types";

const PAGE_SIZE = 20;

interface AirdropResultsProps {
  data: AirdropSimulationResult | null;
  isLoading: boolean;
  error: string | null;
}

type SortField = "allocation" | "stakingAmount" | "stakingDuration" | "seigniorage" | "compositeScore";

const CHART_COLORS = {
  stakingAmount: "var(--chart-1)",
  stakingDuration: "var(--chart-2)",
  seigniorage: "var(--chart-4)",
};

export function AirdropResults({ data, isLoading, error }: AirdropResultsProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<SortField>("allocation");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    if (!data) return [];
    let items = data.stakerScores;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((s) => s.address.toLowerCase().includes(q));
    }
    items = [...items].sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortField === "allocation") return (a.allocation - b.allocation) * mul;
      if (sortField === "compositeScore") return (a.compositeScore - b.compositeScore) * mul;
      return (a.raw[sortField] - b.raw[sortField]) * mul;
    });
    return items;
  }, [data, search, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(0);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-30" />;
    return sortDir === "asc"
      ? <ArrowUp className="ml-1 inline h-3 w-3 text-primary" />
      : <ArrowDown className="ml-1 inline h-3 w-3 text-primary" />;
  };

  // Chart data: top 30 by allocation
  const chartData = useMemo(() => {
    if (!data) return [];
    return data.stakerScores.slice(0, 30).map((s) => ({
      address: truncateAddress(s.address),
      allocation: Math.round(s.allocation),
      stakingAmount: s.normalized.stakingAmount * (data.config.weights.stakingAmount / 100),
      stakingDuration: s.normalized.stakingDuration * (data.config.weights.stakingDuration / 100),
      seigniorage: s.normalized.seigniorage * (data.config.weights.seigniorage / 100),
    }));
  }, [data]);

  const handleCsvDownload = () => {
    if (!data || !filtered.length) return;
    const sym = data.config.tokenSymbol;
    const header = `Address,Staking Amount (WTON),Duration (days),Seigniorage (WTON),Score,Allocation (${sym}),Share (%)\n`;
    const rows = filtered.map((s) =>
      `${s.address},${fmt(s.raw.stakingAmount)},${fmt(s.raw.stakingDuration)},${fmt(s.raw.seigniorage)},${s.compositeScore.toFixed(6)},${fmt(s.allocation)},${s.allocationPct.toFixed(4)}`
    );
    downloadBlob(header + rows.join("\n"), "text/csv", "airdrop-distribution.csv");
  };

  const handleJsonDownload = () => {
    if (!data) return;
    downloadBlob(JSON.stringify(data, null, 2), "application/json", "airdrop-distribution.json");
  };

  /* ──── Error state ──── */
  if (error) {
    return (
      <Card className="border-destructive/20">
        <CardContent className="flex flex-col items-center py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <h3 className="mt-4 text-base font-semibold">Simulation Failed</h3>
          <p className="mt-1.5 max-w-xs text-center text-sm text-muted-foreground leading-relaxed">{error}</p>
        </CardContent>
      </Card>
    );
  }

  /* ──── Loading ──── */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-28" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="py-8">
            <Skeleton className="h-[240px] w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ──── Empty state ──── */
  if (!data) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center py-20">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
            <Database className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-5 text-base font-semibold">No simulation yet</h3>
          <p className="mt-2 max-w-[280px] text-center text-sm text-muted-foreground leading-relaxed">
            Search for stakers first, then configure airdrop parameters and click Simulate to see the distribution.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { summary, config } = data;
  const sym = config.tokenSymbol;

  /* ──── Results ──── */
  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          icon={<Users className="h-4 w-4" />}
          label="Eligible Stakers"
          value={summary.eligibleStakers.toLocaleString()}
          iconClassName="bg-primary/10 text-primary"
        />
        <MetricCard
          icon={<Coins className="h-4 w-4" />}
          label="Total Distributed"
          value={`${fmtCompact(summary.totalDistributed)} ${sym}`}
          iconClassName="bg-chart-2/10 text-chart-2"
        />
        <MetricCard
          icon={<PieChart className="h-4 w-4" />}
          label="Top 10% Concentration"
          value={`${summary.top10PctConcentration.toFixed(1)}%`}
          iconClassName="bg-chart-4/10 text-chart-4"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Allocation bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top 30 Allocations</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ left: 0, right: 0 }}>
                <XAxis dataKey="address" tick={{ fontSize: 10 }} interval={2} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => fmtCompact(v)} />
                <RechartsTooltip
                  formatter={(value) => [fmtCompact(Number(value)), sym]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" }}
                />
                <Bar dataKey="allocation" radius={[3, 3, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={`hsl(${220 + i * 4}, 70%, ${55 + (i % 3) * 5}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Score breakdown stacked bar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Score Breakdown (Top 30)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ left: 0, right: 0 }}>
                <XAxis dataKey="address" tick={{ fontSize: 10 }} interval={2} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartsTooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" }}
                  formatter={(value, name) => [
                    Number(value).toFixed(4),
                    name === "stakingAmount" ? "Staking Amt" : name === "stakingDuration" ? "Duration" : "Seigniorage",
                  ]}
                />
                <Legend
                  formatter={(value: string) =>
                    value === "stakingAmount" ? "Staking Amt" : value === "stakingDuration" ? "Duration" : "Seigniorage"
                  }
                  wrapperStyle={{ fontSize: 11 }}
                />
                <Bar dataKey="stakingAmount" stackId="a" fill={CHART_COLORS.stakingAmount} radius={[0, 0, 0, 0]} />
                <Bar dataKey="stakingDuration" stackId="a" fill={CHART_COLORS.stakingDuration} />
                <Bar dataKey="seigniorage" stackId="a" fill={CHART_COLORS.seigniorage} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Distribution table */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <CardTitle>Distribution Table</CardTitle>
            <Badge variant="secondary" className="tabular-nums">
              {filtered.length}
            </Badge>
          </div>
          <CardAction>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export data</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleCsvDownload} disabled={!filtered.length}>
                  <FileSpreadsheet />
                  Download CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleJsonDownload}>
                  <FileJson />
                  Download JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardAction>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Filter by address..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </div>

          <div className="rounded-lg border">
            <ScrollArea>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs font-semibold w-8">#</TableHead>
                    <TableHead className="text-xs font-semibold">Address</TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-right text-xs font-semibold"
                      onClick={() => toggleSort("stakingAmount")}
                    >
                      Staked (WTON)
                      <SortIcon field="stakingAmount" />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-right text-xs font-semibold"
                      onClick={() => toggleSort("stakingDuration")}
                    >
                      Duration (d)
                      <SortIcon field="stakingDuration" />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-right text-xs font-semibold"
                      onClick={() => toggleSort("seigniorage")}
                    >
                      Seigniorage
                      <SortIcon field="seigniorage" />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-right text-xs font-semibold"
                      onClick={() => toggleSort("compositeScore")}
                    >
                      Score
                      <SortIcon field="compositeScore" />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-right text-xs font-semibold"
                      onClick={() => toggleSort("allocation")}
                    >
                      {sym}
                      <SortIcon field="allocation" />
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold">Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((row, idx) => (
                    <TableRow key={row.address}>
                      <TableCell className="text-xs text-muted-foreground tabular-nums py-3">
                        {page * PAGE_SIZE + idx + 1}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground py-3">
                        {truncateAddress(row.address)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-sm py-3">
                        {fmtCompact(row.raw.stakingAmount)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-sm py-3">
                        {Math.round(row.raw.stakingDuration).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-sm text-chart-4 py-3">
                        {fmtCompact(row.raw.seigniorage)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-sm py-3">
                        {row.compositeScore.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-sm font-medium py-3">
                        {fmtCompact(row.allocation)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm text-muted-foreground py-3">
                        {row.allocationPct.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  ))}
                  {paged.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-12">
                        No stakers found matching the criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        </CardContent>

        {totalPages > 1 && (
          <CardFooter className="border-t justify-between">
            <p className="text-sm tabular-nums text-muted-foreground">
              {page * PAGE_SIZE + 1}&ndash;{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="min-w-[3rem] text-center text-sm tabular-nums text-muted-foreground">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Summary stats card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Distribution Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatItem label="Median Allocation" value={`${fmtCompact(summary.medianAllocation)} ${sym}`} icon={<TrendingUp className="h-3.5 w-3.5" />} />
            <StatItem label="Max Allocation" value={`${fmtCompact(summary.maxAllocation)} ${sym}`} icon={<ArrowUp className="h-3.5 w-3.5" />} />
            <StatItem label="Min Allocation" value={`${fmtCompact(summary.minAllocation)} ${sym}`} icon={<ArrowDown className="h-3.5 w-3.5" />} />
            <StatItem
              label="Gini-like Ratio"
              value={`${(summary.top10PctConcentration / 100).toFixed(2)}`}
              icon={<PieChart className="h-3.5 w-3.5" />}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  iconClassName,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  iconClassName: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconClassName}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StatItem({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

/* ─── Utilities ─── */

function downloadBlob(content: string, type: string, filename: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(2);
}

function fmt(n: number): string {
  return n.toFixed(6);
}

function truncateAddress(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}
