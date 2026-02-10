"use client";

import { useState, useMemo, Fragment } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  AlertCircle,
  ExternalLink,
  ArrowDownToLine,
  ArrowUpFromLine,
  Database,
  FileSpreadsheet,
  FileJson,
} from "lucide-react";
import type { StakerLookupResponse, StakerResult, StakingEvent } from "@/lib/types";

const RAY = BigInt("1000000000000000000000000000"); // 1e27
const PAGE_SIZE = 20;

interface StakerResultsProps {
  data: StakerLookupResponse | null;
  isLoading: boolean;
  error: string | null;
}

type SortField = "totalStaked" | "depositCount" | "lastStakedAt";
type ViewMode = "all" | "netPositive";

export function StakerResults({ data, isLoading, error }: StakerResultsProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<SortField>("totalStaked");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedAddr, setExpandedAddr] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("netPositive");

  const filtered = useMemo(() => {
    if (!data) return [];
    let items = data.stakers;

    if (viewMode === "netPositive") {
      items = items.filter((s) => netOf(s) > BigInt(0));
    }

    if (search) {
      const q = search.toLowerCase();
      items = items.filter((s) => s.address.toLowerCase().includes(q));
    }

    items = [...items].sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortField === "totalStaked") {
        const diff = netOf(a) - netOf(b);
        return diff > BigInt(0) ? mul : diff < BigInt(0) ? -mul : 0;
      }
      return (a[sortField] - b[sortField]) * mul;
    });

    return items;
  }, [data, search, sortField, sortDir, viewMode]);

  const summary = useMemo(() => {
    let totalNet = BigInt(0);
    for (const s of filtered) {
      totalNet += netOf(s);
    }
    return { count: filtered.length, totalNet: totalNet.toString() };
  }, [filtered]);

  const netPositiveCount = useMemo(() => {
    if (!data) return 0;
    return data.stakers.filter((s) => netOf(s) > BigInt(0)).length;
  }, [data]);

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

  const handleCsvDownload = () => {
    if (!filtered.length) return;
    const header = "Address,Net Staked (WTON),Deposited (WTON),Withdrawn (WTON),Deposits,Withdrawals,Last Staked\n";
    const rows = filtered.map((s) => {
      const net = formatWton(netOf(s).toString());
      const dep = formatWton(s.totalStaked);
      const wd = formatWton(s.totalWithdrawn);
      const last = new Date(s.lastStakedAt * 1000).toISOString();
      return `${s.address},${net},${dep},${wd},${s.depositCount},${s.withdrawCount},${last}`;
    });
    const csv = header + rows.join("\n");
    downloadBlob(csv, "text/csv", "stakers.csv");
  };

  const handleJsonDownload = () => {
    if (!filtered.length) return;
    const json = JSON.stringify(filtered, null, 2);
    downloadBlob(json, "application/json", "stakers.json");
  };

  const switchView = (value: string) => {
    if (!value) return;
    setViewMode(value as ViewMode);
    setPage(0);
    setExpandedAddr(null);
  };

  /* ──── Error state ──── */
  if (error) {
    return (
      <Card className="border-destructive/20">
        <CardContent className="flex flex-col items-center py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <h3 className="mt-4 text-base font-semibold">Something went wrong</h3>
          <p className="mt-1.5 max-w-xs text-center text-sm text-muted-foreground leading-relaxed">{error}</p>
        </CardContent>
      </Card>
    );
  }

  /* ──── Loading — Skeleton ──── */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {[0, 1].map((i) => (
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
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-9 w-full" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-6">
                <Skeleton className="h-5 flex-[2]" />
                <Skeleton className="h-5 flex-1" />
                <Skeleton className="h-5 flex-[0.6]" />
                <Skeleton className="h-5 flex-1" />
              </div>
            ))}
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
          <h3 className="mt-5 text-base font-semibold">No search yet</h3>
          <p className="mt-2 max-w-[260px] text-center text-sm text-muted-foreground leading-relaxed">
            Configure the filters and click Search to query on-chain staker data.
          </p>
        </CardContent>
      </Card>
    );
  }

  /* ──── Results ──── */
  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          icon={<Users className="h-4 w-4" />}
          label="Stakers"
          value={summary.count.toLocaleString()}
          iconClassName="bg-primary/10 text-primary"
        />
        <MetricCard
          icon={<Coins className="h-4 w-4" />}
          label="Net Staked"
          value={`${formatWton(summary.totalNet)} WTON`}
          iconClassName="bg-chart-2/10 text-chart-2"
        />
      </div>

      {/* Data table card */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <CardTitle>Staker List</CardTitle>
            <Badge variant="secondary" className="tabular-nums">
              {filtered.length}
            </Badge>
          </div>
          <CardDescription>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={viewMode}
              onValueChange={switchView}
            >
              <ToggleGroupItem value="all" className="text-sm">
                All Depositors
                <Badge variant="secondary" className="ml-1.5 tabular-nums">
                  {data.stakers.length}
                </Badge>
              </ToggleGroupItem>
              <ToggleGroupItem value="netPositive" className="text-sm">
                Net Positive
                <Badge variant="secondary" className="ml-1.5 tabular-nums">
                  {netPositiveCount}
                </Badge>
              </ToggleGroupItem>
            </ToggleGroup>
          </CardDescription>
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
                <DropdownMenuItem onClick={handleJsonDownload} disabled={!filtered.length}>
                  <FileJson />
                  Download JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardAction>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Search input */}
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

          {/* Table */}
          <div className="rounded-lg border">
            <ScrollArea>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs font-semibold">Address</TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-right text-xs font-semibold"
                      onClick={() => toggleSort("totalStaked")}
                    >
                      Net (WTON)
                      <SortIcon field="totalStaked" />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-right text-xs font-semibold"
                      onClick={() => toggleSort("depositCount")}
                    >
                      Deposits
                      <SortIcon field="depositCount" />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-right text-xs font-semibold"
                      onClick={() => toggleSort("lastStakedAt")}
                    >
                      Last Staked
                      <SortIcon field="lastStakedAt" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((row) => {
                    const isExpanded = expandedAddr === row.address;
                    return (
                      <Fragment key={row.address}>
                        <TableRow
                          className="group cursor-pointer"
                          onClick={() => setExpandedAddr(isExpanded ? null : row.address)}
                        >
                          <TableCell className="font-mono text-sm text-muted-foreground py-3">
                            <span className="inline-flex items-center gap-2">
                              <ChevronRight
                                className={`h-3.5 w-3.5 text-muted-foreground/40 transition-transform duration-200 ${isExpanded ? "rotate-90 text-primary" : "group-hover:text-muted-foreground"}`}
                              />
                              {truncateAddress(row.address)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-sm font-medium py-3">
                            {formatWton(netOf(row).toString())}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm text-muted-foreground py-3">
                            {row.depositCount}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm text-muted-foreground py-3">
                            {formatDate(row.lastStakedAt)}
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableCell colSpan={4} className="p-0">
                              <EventDetail
                                events={row.events}
                                totalStaked={row.totalStaked}
                                totalWithdrawn={row.totalWithdrawn}
                                depositCount={row.depositCount}
                                withdrawCount={row.withdrawCount}
                              />
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                  {paged.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-12">
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

        {/* Pagination */}
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
    </div>
  );
}


/* ═══════════════════════════════════════════════════
   Event Detail — expanded row content
   ═══════════════════════════════════════════════════ */
function EventDetail({
  events,
  totalStaked,
  totalWithdrawn,
  depositCount,
  withdrawCount,
}: {
  events: StakingEvent[];
  totalStaked: string;
  totalWithdrawn: string;
  depositCount: number;
  withdrawCount: number;
}) {
  const depBig = BigInt(totalStaked);
  const wdBig = BigInt(totalWithdrawn);
  const netBig = depBig - wdBig;
  const total = depBig + wdBig;
  const depPct = total > BigInt(0) ? Number((depBig * BigInt(1000)) / total) / 10 : 100;

  return (
    <div className="px-6 py-6 space-y-5">
      {/* Infographic summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="py-4 gap-1.5 shadow-none">
          <CardContent className="px-4 py-0">
            <div className="flex items-center gap-1.5">
              <ArrowDownToLine className="h-3.5 w-3.5 text-chart-2" />
              <Badge variant="outline" className="text-chart-2 border-chart-2/30 text-xs">
                Deposited
              </Badge>
            </div>
            <p className="mt-2 text-base font-semibold tabular-nums font-mono">
              {formatWton(totalStaked)}
              <span className="ml-1 text-xs font-normal text-muted-foreground font-sans">WTON</span>
            </p>
            <p className="text-sm tabular-nums text-muted-foreground">{depositCount} txn{depositCount !== 1 && "s"}</p>
          </CardContent>
        </Card>

        <Card className="py-4 gap-1.5 shadow-none">
          <CardContent className="px-4 py-0">
            <div className="flex items-center gap-1.5">
              <ArrowUpFromLine className="h-3.5 w-3.5 text-chart-3" />
              <Badge variant="outline" className="text-chart-3 border-chart-3/30 text-xs">
                Withdrawn
              </Badge>
            </div>
            <p className="mt-2 text-base font-semibold tabular-nums font-mono">
              {formatWton(totalWithdrawn)}
              <span className="ml-1 text-xs font-normal text-muted-foreground font-sans">WTON</span>
            </p>
            <p className="text-sm tabular-nums text-muted-foreground">{withdrawCount} txn{withdrawCount !== 1 && "s"}</p>
          </CardContent>
        </Card>

        <Card className="py-4 gap-1.5 shadow-none">
          <CardContent className="px-4 py-0">
            <Badge variant="outline" className="text-xs">Net Position</Badge>
            <p className="mt-2 text-base font-semibold tabular-nums font-mono">
              {formatWton(netBig.toString())}
              <span className="ml-1 text-xs font-normal text-muted-foreground font-sans">WTON</span>
            </p>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-chart-3/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-chart-2"
                  style={{ width: `${depPct}%` }}
                />
              </div>
              <span className="text-xs font-medium tabular-nums text-muted-foreground">{depPct.toFixed(0)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Event table */}
      <ScrollArea className="max-h-[300px]">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[6%]" />
            <col className="w-[22%]" />
            <col className="w-[22%]" />
            <col className="w-[26%]" />
            <col className="w-[24%]" />
          </colgroup>
          <thead>
            <tr className="text-xs font-semibold text-muted-foreground">
              <th className="px-3 pb-2 text-left" />
              <th className="px-3 pb-2 text-left">Date</th>
              <th className="px-3 pb-2 text-right">Amount</th>
              <th className="px-3 pb-2 text-left">Layer2</th>
              <th className="px-3 pb-2 text-right">Tx</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            {events.map((evt) => (
              <tr key={evt.txHash} className="border-t border-border/40">
                <td className="px-3 py-2.5">
                  {evt.type === "deposit" ? (
                    <ArrowDownToLine className="h-3.5 w-3.5 text-chart-2" />
                  ) : (
                    <ArrowUpFromLine className="h-3.5 w-3.5 text-chart-3" />
                  )}
                </td>
                <td className="px-3 py-2.5 tabular-nums font-mono">{formatDate(evt.timestamp)}</td>
                <td className={`px-3 py-2.5 text-right tabular-nums font-mono font-medium ${evt.type === "deposit" ? "text-chart-2" : "text-chart-3"}`}>
                  {evt.type === "deposit" ? "+" : "-"}{formatWton(evt.amount)}
                </td>
                <td className="px-3 py-2.5 font-mono truncate">{truncateAddress(evt.layer2)}</td>
                <td className="px-3 py-2.5 text-right">
                  <a
                    href={`https://etherscan.io/tx/${evt.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="font-mono">{evt.txHash.slice(0, 10)}...</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Metric Card
   ═══════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════
   Utility functions
   ═══════════════════════════════════════════════════ */
function downloadBlob(content: string, type: string, filename: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatWton(ray: string): string {
  if (!ray || ray === "0") return "0";
  const big = BigInt(ray);
  const whole = big / RAY;
  const remainder = big % RAY;
  const decimal = remainder.toString().padStart(27, "0").slice(0, 2);
  const num = parseFloat(`${whole}.${decimal}`);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  return num.toFixed(2);
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function netOf(s: StakerResult): bigint {
  return BigInt(s.totalStaked) - BigInt(s.totalWithdrawn);
}

function truncateAddress(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}
