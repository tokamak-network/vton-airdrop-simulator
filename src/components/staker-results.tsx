"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StakerLookupResponse } from "@/lib/types";

const RAY = BigInt("1000000000000000000000000000"); // 1e27
const PAGE_SIZE = 20;

interface StakerResultsProps {
  data: StakerLookupResponse | null;
  isLoading: boolean;
  error: string | null;
}

type SortField = "totalStaked" | "depositCount" | "firstStakedAt" | "lastStakedAt";

export function StakerResults({ data, isLoading, error }: StakerResultsProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<SortField>("totalStaked");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    if (!data) return [];
    let items = data.stakers;

    if (search) {
      const q = search.toLowerCase();
      items = items.filter((s) => s.address.toLowerCase().includes(q));
    }

    items = [...items].sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortField === "totalStaked") {
        const diff = BigInt(a.totalStaked) - BigInt(b.totalStaked);
        return diff > BigInt(0) ? mul : diff < BigInt(0) ? -mul : 0;
      }
      return (a[sortField] - b[sortField]) * mul;
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

  const sortIndicator = (field: SortField) =>
    sortField === field ? (sortDir === "asc" ? " \u2191" : " \u2193") : "";

  const handleCsvDownload = () => {
    if (!filtered.length) return;
    const header = "Address,Total Staked (WTON),Deposit Count,First Staked,Last Staked\n";
    const rows = filtered.map((s) => {
      const staked = formatWton(s.totalStaked);
      const first = new Date(s.firstStakedAt * 1000).toISOString();
      const last = new Date(s.lastStakedAt * 1000).toISOString();
      return `${s.address},${staked},${s.depositCount},${first},${last}`;
    });
    const csv = header + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stakers.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <span className="ml-3 text-muted-foreground">
              Searching stakers...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground py-12">
            Set date range and minimum staking amount, then click Search to find stakers.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <SummaryCard
          title="Unique Stakers"
          value={data.summary.uniqueStakers.toLocaleString()}
        />
        <SummaryCard
          title="Total Staked"
          value={`${formatWton(data.summary.totalStakedAmount)} WTON`}
        />
      </div>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Staker List</span>
            <Button variant="outline" size="sm" onClick={handleCsvDownload} disabled={!filtered.length}>
              Download CSV
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search by address..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />

          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Address</TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-right"
                    onClick={() => toggleSort("totalStaked")}
                  >
                    Total Staked (WTON){sortIndicator("totalStaked")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-right"
                    onClick={() => toggleSort("depositCount")}
                  >
                    Deposits{sortIndicator("depositCount")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-right"
                    onClick={() => toggleSort("firstStakedAt")}
                  >
                    First Staked{sortIndicator("firstStakedAt")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-right"
                    onClick={() => toggleSort("lastStakedAt")}
                  >
                    Last Staked{sortIndicator("lastStakedAt")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((row) => (
                  <TableRow key={row.address}>
                    <TableCell className="font-mono text-sm">
                      {truncateAddress(row.address)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatWton(row.totalStaked)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.depositCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {formatDate(row.firstStakedAt)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {formatDate(row.lastStakedAt)}
                    </TableCell>
                  </TableRow>
                ))}
                {paged.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No stakers found matching the criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {page * PAGE_SIZE + 1}-
                {Math.min((page + 1) * PAGE_SIZE, filtered.length)} of{" "}
                {filtered.length}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
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

function truncateAddress(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}
