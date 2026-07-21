import { useMemo, useState } from "react";
import { Search, ArrowUpDown, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { SimulatedNote } from "@/components/ui/SimulatedNote";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSites, useFaults } from "@/lib/queries";

type SortKey = "name" | "city" | "ports" | "status" | "faults";
const PAGE_SIZE = 12;

interface Row {
  id: string;
  name: string;
  city: string;
  connectors: string;
  ports: number;
  online: boolean;
  faults: number;
}

export function Stations() {
  const { data: sites, isLoading } = useSites();
  const { data: faults } = useFaults();

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "online" | "offline" | "faults">("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [asc, setAsc] = useState(true);
  const [page, setPage] = useState(1);

  const rows = useMemo<Row[]>(() => {
    if (!sites) return [];
    const activeFaultsBySite = new Map<string, number>();
    for (const f of faults ?? []) {
      if (f.status !== "resolved")
        activeFaultsBySite.set(f.siteId, (activeFaultsBySite.get(f.siteId) ?? 0) + 1);
    }
    return sites.map((s) => ({
      id: s.id,
      name: s.name,
      city: s.city,
      connectors: s.connectorTypes.join(", "),
      ports: s.numPorts,
      online: s.online,
      faults: activeFaultsBySite.get(s.id) ?? 0,
    }));
  }, [sites, faults]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      online: rows.filter((r) => r.online).length,
      offline: rows.filter((r) => !r.online).length,
      faults: rows.filter((r) => r.faults > 0).length,
    }),
    [rows]
  );

  const filtered = useMemo(() => {
    const byTab = rows.filter((r) => {
      if (tab === "online") return r.online;
      if (tab === "offline") return !r.online;
      if (tab === "faults") return r.faults > 0;
      return true;
    });
    const q = query.trim().toLowerCase();
    const list = q
      ? byTab.filter(
          (r) =>
            r.name.toLowerCase().includes(q) || r.city.toLowerCase().includes(q)
        )
      : byTab;
    const dir = asc ? 1 : -1;
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case "ports":
          return (a.ports - b.ports) * dir;
        case "faults":
          return (a.faults - b.faults) * dir;
        case "status":
          return (Number(a.online) - Number(b.online)) * dir;
        case "city":
          return a.city.localeCompare(b.city) * dir;
        default:
          return a.name.localeCompare(b.name) * dir;
      }
    });
  }, [rows, tab, query, sortKey, asc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageRows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(true);
    }
    setPage(1);
  };

  const exportCsv = () => {
    const header = ["Station", "City", "Connectors", "Ports", "Status", "Active Faults"];
    const lines = filtered.map((r) =>
      [r.name, r.city, r.connectors, r.ports, r.online ? "Online" : "Offline", r.faults]
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

  const header = (label: string, key: SortKey, extra = "") => (
    <th className={`px-4 py-3 ${extra}`}>
      <button
        onClick={() => toggleSort(key)}
        className="inline-flex items-center gap-1 font-semibold text-navy-700 hover:text-navy-900"
      >
        {label}
        <ArrowUpDown
          className={`h-3 w-3 ${sortKey === key ? "text-brand-500" : "text-slate-300"}`}
        />
      </button>
    </th>
  );

  return (
    <div className="space-y-5">
      <Card className="p-0">
        {/* Status tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-4 pt-3">
          {(
            [
              { key: "all", label: "All" },
              { key: "online", label: "Online" },
              { key: "offline", label: "Offline" },
              { key: "faults", label: "Has faults" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                setPage(1);
              }}
              className={[
                "flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                tab === t.key
                  ? "border-brand-500 text-navy-800"
                  : "border-transparent text-slate-500 hover:text-navy-700",
              ].join(" ")}
            >
              {t.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  tab === t.key
                    ? "bg-brand-100 text-brand-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {counts[t.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search station or city…"
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              {filtered.length} stations
            </span>
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-navy-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/60 text-xs">
              <tr>
                {header("Station", "name")}
                {header("City", "city")}
                <th className="px-4 py-3 font-semibold text-navy-700">Connectors</th>
                {header("Ports", "ports")}
                {header("Status", "status")}
                {header("Faults *", "faults")}
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
                    <td className="px-4 py-3 text-slate-600">{r.city}</td>
                    <td className="px-4 py-3 text-slate-600">{r.connectors}</td>
                    <td className="px-4 py-3 text-slate-600">{r.ports}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.online
                            ? "bg-brand-50 text-brand-700"
                            : "bg-rose-50 text-rose-600"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            r.online ? "bg-brand-500" : "bg-rose-500"
                          }`}
                        />
                        {r.online ? "Online" : "Offline"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.faults > 0 ? (
                        <span className="font-medium text-amber-600">{r.faults}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-4 text-xs text-slate-500">
          <span>
            Page {current} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={current <= 1}
              className="rounded-md border border-slate-200 p-1.5 disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={current >= totalPages}
              className="rounded-md border border-slate-200 p-1.5 disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card>

      <SimulatedNote />
    </div>
  );
}
