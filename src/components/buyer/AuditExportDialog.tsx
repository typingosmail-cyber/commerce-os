import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileSpreadsheet, RotateCcw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { CreditLimitAuditEntry } from "@/lib/bnpl";

type ColumnKey =
  | "date" | "timestamp" | "eventType" | "title" | "description" | "actor"
  | "factor" | "factorBefore" | "factorAfter" | "factorDelta"
  | "limitBefore" | "limitAfter" | "delta" | "direction" | "reference" | "id";

interface ColumnDef {
  key: ColumnKey;
  label: string;
  group: "Timestamps" | "Actor" | "Factor" | "Delta" | "Reference";
  value: (e: CreditLimitAuditEntry) => string | number;
}

const COLUMNS: ColumnDef[] = [
  { key: "date", label: "Date", group: "Timestamps", value: (e) => e.date },
  { key: "timestamp", label: "Timestamp (ISO)", group: "Timestamps", value: (e) => new Date(`${e.date}T00:00:00Z`).toISOString() },
  { key: "eventType", label: "Event type", group: "Timestamps", value: (e) => e.eventType },
  { key: "title", label: "Title", group: "Timestamps", value: (e) => e.title },
  { key: "description", label: "Description", group: "Timestamps", value: (e) => e.description },
  { key: "actor", label: "Actor", group: "Actor", value: (e) => e.actor },
  { key: "factor", label: "Factor", group: "Factor", value: (e) => e.factor ?? "" },
  { key: "factorBefore", label: "Factor before", group: "Factor", value: (e) => e.factorBefore ?? "" },
  { key: "factorAfter", label: "Factor after", group: "Factor", value: (e) => e.factorAfter ?? "" },
  { key: "factorDelta", label: "Factor delta", group: "Factor", value: (e) => (e.factorBefore !== undefined && e.factorAfter !== undefined ? e.factorAfter - e.factorBefore : "") },
  { key: "limitBefore", label: "Limit before (INR)", group: "Delta", value: (e) => e.limitBefore },
  { key: "limitAfter", label: "Limit after (INR)", group: "Delta", value: (e) => e.limitAfter },
  { key: "delta", label: "Limit delta (INR)", group: "Delta", value: (e) => e.delta },
  { key: "direction", label: "Direction", group: "Delta", value: (e) => (e.delta > 0 ? "increase" : e.delta < 0 ? "decrease" : "neutral") },
  { key: "reference", label: "Reference ID", group: "Reference", value: (e) => e.reference ?? "" },
  { key: "artifactIds", label: "Linked artifact IDs", group: "Reference", value: (e) => (e.artifacts ?? []).map(a => a.id).join(" | ") },
  { key: "artifactDetail", label: "Linked artifacts (detail)", group: "Reference", value: (e) => (e.artifacts ?? []).map(a => `${a.kind}:${a.id} — ${a.label}`).join(" | ") },
  { key: "id", label: "Audit entry ID", group: "Reference", value: (e) => e.id },
];

const DEFAULT_COLUMNS: ColumnKey[] = [
  "date", "eventType", "title", "actor", "factor", "factorBefore", "factorAfter",
  "limitBefore", "limitAfter", "delta", "reference",
];

const GROUPS = ["Timestamps", "Actor", "Factor", "Delta", "Reference"] as const;

export function AuditExportDialog({
  open, onOpenChange, entries, filteredEntries, activeFilter,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entries: CreditLimitAuditEntry[];
  filteredEntries: CreditLimitAuditEntry[];
  activeFilter: string;
}) {
  const [selected, setSelected] = useState<ColumnKey[]>(DEFAULT_COLUMNS);
  const [scope, setScope] = useState<"all" | "filtered">("all");
  const [order, setOrder] = useState<"newest" | "oldest">("newest");
  const [delimiter, setDelimiter] = useState<"," | ";" | "\t">(",");
  const [includeHeader, setIncludeHeader] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [fileName, setFileName] = useState("credit-limit-audit-trail");

  const cols = useMemo(() => COLUMNS.filter((c) => selected.includes(c.key)), [selected]);

  const rows = useMemo(() => {
    let list = scope === "filtered" ? filteredEntries : entries;
    if (fromDate) list = list.filter((e) => e.date >= fromDate);
    if (toDate) list = list.filter((e) => e.date <= toDate);
    const sorted = [...list].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return order === "newest" ? sorted : sorted.reverse();
  }, [scope, entries, filteredEntries, fromDate, toDate, order]);

  const toggle = (key: ColumnKey) =>
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const buildCsv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines: string[] = [];
    if (includeHeader) lines.push(cols.map((c) => esc(c.label)).join(delimiter));
    for (const e of rows) lines.push(cols.map((c) => esc(c.value(e))).join(delimiter));
    return lines.join("\n");
  };

  const preview = useMemo(() => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const head = includeHeader ? [cols.map((c) => esc(c.label)).join(delimiter)] : [];
    return [...head, ...rows.slice(0, 3).map((e) => cols.map((c) => esc(c.value(e))).join(delimiter))].join("\n");
  }, [cols, rows, delimiter, includeHeader]);

  const download = () => {
    if (cols.length === 0) {
      toast({ title: "Select at least one column", variant: "destructive" });
      return;
    }
    const blob = new Blob(["\uFEFF" + buildCsv()], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName || "audit-trail"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Audit trail exported", description: `${rows.length} events × ${cols.length} columns downloaded.` });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Export audit trail to CSV
          </DialogTitle>
          <DialogDescription>Pick the columns, range and format before downloading.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Rows to include</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All events ({entries.length})</SelectItem>
                  <SelectItem value="filtered">Current view — {activeFilter} ({filteredEntries.length})</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sort order</Label>
              <Select value={order} onValueChange={(v) => setOrder(v as typeof order)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">From date</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">To date</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Columns ({cols.length} selected)</Label>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelected(COLUMNS.map((c) => c.key))}>Select all</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelected(DEFAULT_COLUMNS)}>
                  <RotateCcw className="h-3 w-3 mr-1" /> Reset
                </Button>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {GROUPS.map((g) => (
                <div key={g} className="rounded-lg border p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">{g}</p>
                  <div className="space-y-2">
                    {COLUMNS.filter((c) => c.group === g).map((c) => (
                      <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={selected.includes(c.key)} onCheckedChange={() => toggle(c.key)} />
                        <span className="text-foreground">{c.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Delimiter</Label>
              <Select value={delimiter} onValueChange={(v) => setDelimiter(v as typeof delimiter)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value=",">Comma (,)</SelectItem>
                  <SelectItem value=";">Semicolon (;)</SelectItem>
                  <SelectItem value={"\t"}>Tab</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">File name</Label>
              <Input value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="credit-limit-audit-trail" />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={includeHeader} onCheckedChange={(v) => setIncludeHeader(Boolean(v))} />
            <span>Include header row</span>
          </label>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs">Preview</Label>
              <Badge variant="secondary" className="text-[10px]">{rows.length} rows</Badge>
            </div>
            <pre className="text-[11px] bg-muted rounded-lg p-3 overflow-x-auto whitespace-pre">
              {cols.length === 0 ? "Select at least one column." : preview || "No rows match the selected range."}
            </pre>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={download} disabled={cols.length === 0 || rows.length === 0}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Download CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
