import { useMemo, useState } from "react";
import {
  Search,
  ArrowUpDown,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSites } from "@/lib/queries";
import type { SiteAgg } from "@/services/mock-data";
import { formatNumber } from "@/lib/format";

type SortKey = "name" | "zip" | "sessions" | "energyKwh" | "co2Kg" | "avgDurationMin";
const PAGE_SIZES = [10, 25, 50];

export function Stations() {
  const { data: sites, isLoading } = useSites();
  const rows = (sites ?? []) as SiteAgg[];

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("energyKwh");
  const [asc, setAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? rows.filter(
          (r) => r.name.toLowerCase().includes(q) || r.zip.toLowerCase().includes(q)
        )
      : rows;
    const dir = asc ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortKey === "name" || sortKey === "zip")
        return a[sortKey].localeCompare(b[sortKey]) * dir;
      return (a[sortKey] - b[sortKey]) * dir;
    });
  }, [rows, query, sortKey, asc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, totalPages);
  const startIdx = (current - 1) * pageSize;
  const pageRows = filtered.slice(startIdx, startIdx + pageSize);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(key === "name" || key === "zip");
    }
    setPage(1);
  };

  const exportCsv = () => {
    const header = ["Station", "ZIP", "Sessions", "Energy_kWh", "CO2_kg", "Avg_Duration_min"];
    const lines = filtered.map((r) =>
      [r.name, r.zip, r.sessions, r.energyKwh, r.co2Kg, r.avgDurationMin]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "powertech-stations.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const th = (label: string, key: SortKey, right = false) => (
    <th className={`px-4 py-3 ${right ? "text-right" : ""}`}>
      <button
        onClick={() => toggleSort(key)}
        className={`inline-flex items-center gap-1 font-semibold text-navy-700 hover:text-navy-900 ${
          right ? "flex-row-reverse" : ""
        }`}
      >
        {label}
        <ArrowUpDown
          className={`h-3 w-3 ${sortKey === key ? "text-brand-500" : "text-slate-300"}`}
        />
      </button>
    </th>
  );

  const pagination = (
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
      <div className="flex items-center gap-2">
        <span>Results per page:</span>
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}
          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-navy-700 focus:border-brand-400 focus:outline-none"
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <span className="tabular-nums">
        Results{" "}
        {filtered.length === 0
          ? "0"
          : `${startIdx + 1}–${Math.min(startIdx + pageSize, filtered.length)}`}{" "}
        of {formatNumber(filtered.length)}
      </span>
      <div className="flex items-center gap-1">
        {[
          { icon: ChevronsLeft, to: 1, dis: current <= 1 },
          { icon: ChevronLeft, to: current - 1, dis: current <= 1 },
          { icon: ChevronRight, to: current + 1, dis: current >= totalPages },
          { icon: ChevronsRight, to: totalPages, dis: current >= totalPages },
        ].map((b, i) => {
          const Icon = b.icon;
          return (
            <button
              key={i}
              onClick={() => setPage(b.to)}
              disabled={b.dis}
              className="rounded-md border border-slate-200 p-1.5 hover:bg-slate-50 disabled:opacity-40"
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
      <span className="tabular-nums">
        Page {current} of {totalPages}
      </span>
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        {/* Full-width search */}
        <div className="border-b border-slate-100 p-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search station or ZIP…"
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>
        </div>

        {/* Toolbar: Export (left) · pagination (right) */}
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 self-start text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            <Download className="h-4 w-4" />
            Export Data
          </button>
          {pagination}
        </div>

        {/* Table — body scrolls, header stays */}
        <div className="max-h-[calc(100vh-16rem)] overflow-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50 text-xs">
              <tr>
                {th("Station", "name")}
                {th("ZIP", "zip")}
                {th("Sessions", "sessions", true)}
                {th("Energy (kWh)", "energyKwh", true)}
                {th("CO₂ (kg)", "co2Kg", true)}
                {th("Avg Duration", "avgDurationMin", true)}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="px-4 py-3" colSpan={6}>
                      <Skeleton className="h-5 w-full" />
                    </td>
                  </tr>
                ))
              ) : pageRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-400" colSpan={6}>
                    No stations match “{query}”.
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-navy-800">{r.name}</td>
                    <td className="px-4 py-3 text-slate-600">{r.zip}</td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatNumber(r.sessions)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatNumber(r.energyKwh)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatNumber(r.co2Kg)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {r.avgDurationMin} min
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
