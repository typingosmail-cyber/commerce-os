import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  AlarmClock, Bell, CheckCheck, Eye, Play, RefreshCw, Timer, X, Trash2, Clock,
} from "lucide-react";
import {
  loadSlaConfig, saveSlaConfig, loadSlaAlerts, onSlaAlertsChange, scanSla,
  ackSlaAlert, ackAll, clearAckedAlerts, slaSummary,
  type SlaConfig, type SlaAlert,
} from "@/lib/sla-reminders";
import type { QueueDoc } from "@/lib/reviewer";
import { timeAgo, timeUntil } from "@/lib/reviewer";
import { useNotifications } from "@/lib/notifications";

interface Props {
  queue: QueueDoc[];
  reviewerName: string;
  onReviewDoc?: (doc: QueueDoc) => void;
}

export function SlaRemindersPanel({ queue, reviewerName, onReviewDoc }: Props) {
  const [cfg, setCfg] = useState<SlaConfig>(() => loadSlaConfig());
  const [alerts, setAlerts] = useState<SlaAlert[]>(() => loadSlaAlerts());
  const [recipientInput, setRecipientInput] = useState("");
  const { addNotification } = useNotifications();

  useEffect(() => onSlaAlertsChange(() => setAlerts(loadSlaAlerts())), []);

  // Auto-scan every 60s + on queue change
  useEffect(() => {
    const run = () => {
      const res = scanSla(queue, loadSlaConfig());
      if (res.fired.length && cfg.inApp) {
        res.fired.forEach(a => {
          addNotification({
            type: a.state === "overdue" ? "escrow" : "system",
            title: a.state === "overdue" ? "SLA breached" : "SLA nearing",
            message: `${a.documentName} · ${a.supplierName} — ${
              a.state === "overdue"
                ? `overdue by ${Math.abs(a.hoursDelta).toFixed(1)}h`
                : `${a.hoursDelta.toFixed(1)}h remaining`
            }`,
            actionUrl: "/admin/reviewer",
            metadata: { supplierId: a.supplierId, documentId: a.docId },
          });
        });
      }
      if (res.fired.length && cfg.toast) {
        toast.warning(`${res.fired.length} SLA reminder${res.fired.length > 1 ? "s" : ""} fired`, {
          description: `${res.fired.filter(a => a.state === "overdue").length} overdue · ${res.fired.filter(a => a.state === "nearing").length} nearing`,
        });
      }
    };
    run();
    const t = setInterval(run, 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, cfg.enabled, cfg.warnHours, cfg.reAlertHours, cfg.inApp, cfg.toast]);

  const summary = useMemo(() => slaSummary(queue, cfg.warnHours), [queue, cfg.warnHours, alerts]);

  const patch = (p: Partial<SlaConfig>) => {
    const next = { ...cfg, ...p };
    setCfg(next);
    saveSlaConfig(next);
  };

  const runNow = () => {
    const res = scanSla(queue, cfg);
    toast.success("SLA scan complete", {
      description: `${res.nearing.length} nearing · ${res.overdue.length} overdue · ${res.fired.length} new alerts.`,
    });
  };

  const addRecipient = () => {
    const v = recipientInput.trim();
    if (!v) return;
    if (cfg.recipients.includes(v)) { toast.error("Recipient already added"); return; }
    patch({ recipients: [...cfg.recipients, v] });
    setRecipientInput("");
  };

  const removeRecipient = (r: string) =>
    patch({ recipients: cfg.recipients.filter(x => x !== r) });

  const unacked = alerts.filter(a => !a.acknowledged);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat label="Nearing SLA" value={summary.nearing} icon={Timer} tone="warn" />
        <MiniStat label="Overdue" value={summary.overdue} icon={AlarmClock} tone={summary.overdue > 0 ? "bad" : "muted"} />
        <MiniStat label="Unacked Alerts" value={summary.unacked} icon={Bell} tone={summary.unacked > 0 ? "warn" : "muted"} />
        <MiniStat label="Total Fired" value={summary.totalAlerts} icon={Clock} tone="muted" />
      </div>

      {/* Config */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <AlarmClock className="h-4 w-4 text-primary" /> SLA breach reminders
              </CardTitle>
              <CardDescription>
                Auto-alert reviewers when documents approach or pass their SLA. Scans run every minute.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Enabled</Label>
              <Switch checked={cfg.enabled} onCheckedChange={v => patch({ enabled: v })} />
              <Button size="sm" variant="outline" onClick={runNow}>
                <Play className="h-3.5 w-3.5 mr-1" /> Run scan now
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <div className="flex justify-between mb-1.5">
                <Label className="text-xs">Warn when ≤ time left</Label>
                <span className="text-xs font-mono">{cfg.warnHours}h</span>
              </div>
              <Slider min={1} max={24} step={1} value={[cfg.warnHours]}
                onValueChange={v => patch({ warnHours: v[0] })} disabled={!cfg.enabled} />
              <p className="text-[11px] text-muted-foreground mt-1">
                Docs within this window are flagged as "nearing".
              </p>
            </div>
            <div>
              <div className="flex justify-between mb-1.5">
                <Label className="text-xs">Re-alert cadence (overdue)</Label>
                <span className="text-xs font-mono">every {cfg.reAlertHours}h</span>
              </div>
              <Slider min={1} max={24} step={1} value={[cfg.reAlertHours]}
                onValueChange={v => patch({ reAlertHours: v[0] })} disabled={!cfg.enabled} />
              <p className="text-[11px] text-muted-foreground mt-1">
                How often the same overdue doc re-fires until it's acted on.
              </p>
            </div>
          </div>

          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-sm font-medium">Delivery channels</p>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-xs">
                <Switch checked={cfg.inApp} onCheckedChange={v => patch({ inApp: v })} disabled={!cfg.enabled} />
                In-app notification
              </label>
              <label className="flex items-center gap-2 text-xs">
                <Switch checked={cfg.toast} onCheckedChange={v => patch({ toast: v })} disabled={!cfg.enabled} />
                On-screen toast
              </label>
              <label className="flex items-center gap-2 text-xs">
                <Switch checked={cfg.email} onCheckedChange={v => patch({ email: v })} disabled={!cfg.enabled} />
                Email digest (mock)
              </label>
            </div>
          </div>

          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-sm font-medium">Reviewer recipients</p>
            <div className="flex gap-2">
              <Input placeholder="reviewer@team.com or role name"
                value={recipientInput}
                onChange={e => setRecipientInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addRecipient()}
                className="h-8 text-xs" />
              <Button size="sm" variant="outline" onClick={addRecipient}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {cfg.recipients.length === 0 && (
                <span className="text-xs text-muted-foreground italic">No recipients — falls back to on-duty reviewers.</span>
              )}
              {cfg.recipients.map(r => (
                <Badge key={r} variant="outline" className="text-[10px] gap-1">
                  {r}
                  <button onClick={() => removeRecipient(r)} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* At-risk docs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Documents needing attention</CardTitle>
          <CardDescription>Live view of pending docs classified against the current SLA config.</CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            const rows = queue
              .filter(d => d.status === "uploaded")
              .map(d => {
                const diffH = (new Date(d.slaDueAt).getTime() - Date.now()) / 3600_000;
                const state = diffH < 0 ? "overdue" : diffH <= cfg.warnHours ? "nearing" : "on_track";
                return { d, state, diffH };
              })
              .filter(r => r.state !== "on_track")
              .sort((a, b) => a.diffH - b.diffH);
            if (rows.length === 0) return (
              <p className="text-sm text-muted-foreground py-6 text-center">All pending docs are within SLA 🎉</p>
            );
            return (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>State</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>SLA</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ d, state, diffH }) => (
                    <TableRow key={d.id} className={state === "overdue" ? "bg-destructive/5" : "bg-yellow-500/5"}>
                      <TableCell>
                        <Badge variant="outline" className={state === "overdue"
                          ? "bg-destructive/15 text-destructive border-destructive/30 text-[10px]"
                          : "bg-yellow-500/15 text-yellow-700 border-yellow-500/30 text-[10px]"}>
                          {state === "overdue"
                            ? `Overdue ${Math.abs(diffH).toFixed(1)}h`
                            : `${diffH.toFixed(1)}h left`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{d.name}</TableCell>
                      <TableCell>
                        <div className="text-sm">{d.supplierName}</div>
                        <div className="text-[11px] text-muted-foreground">{d.supplierId}</div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{timeUntil(d.slaDueAt)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{timeAgo(d.submittedAt)}</TableCell>
                      <TableCell>
                        {onReviewDoc && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onReviewDoc(d)}>
                            <Eye className="h-3 w-3 mr-1" /> Review
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            );
          })()}
        </CardContent>
      </Card>

      {/* Alert log */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" /> Reminder log ({alerts.length})
              </CardTitle>
              <CardDescription>{unacked.length} unacknowledged.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { ackAll(reviewerName); toast.success("All alerts acknowledged"); }}
                disabled={unacked.length === 0}>
                <CheckCheck className="h-3.5 w-3.5 mr-1" /> Ack all
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { clearAckedAlerts(); toast.info("Acknowledged alerts cleared"); }}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear acked
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAlerts(loadSlaAlerts())}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No reminders fired yet — trigger a scan or wait until a doc nears its SLA.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>State</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Delta</TableHead>
                  <TableHead>Fired</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.slice(0, 40).map(a => (
                  <TableRow key={a.id} className={a.acknowledged ? "opacity-60" : ""}>
                    <TableCell>
                      <Badge variant="outline" className={a.state === "overdue"
                        ? "bg-destructive/15 text-destructive border-destructive/30 text-[10px] capitalize"
                        : "bg-yellow-500/15 text-yellow-700 border-yellow-500/30 text-[10px] capitalize"}>
                        {a.state}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{a.documentName}</TableCell>
                    <TableCell className="text-xs">
                      {a.supplierName}
                      <div className="text-[10px] text-muted-foreground">{a.supplierId}</div>
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {a.state === "overdue" ? `+${Math.abs(a.hoursDelta).toFixed(1)}h` : `-${a.hoursDelta.toFixed(1)}h`}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{timeAgo(a.firedAt)}</TableCell>
                    <TableCell>
                      {a.acknowledged ? (
                        <Badge variant="outline" className="text-[10px]">Acked · {a.ackedBy}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">Open</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!a.acknowledged && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs"
                          onClick={() => { ackSlaAlert(a.id, reviewerName); toast.success("Alert acknowledged"); }}>
                          Ack
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({
  label, value, icon: Icon, tone,
}: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; tone: "warn" | "bad" | "muted" }) {
  const toneClass =
    tone === "bad" ? "bg-destructive/10 text-destructive" :
    tone === "warn" ? "bg-yellow-500/10 text-yellow-700" :
    "bg-muted text-muted-foreground";
  return (
    <Card>
      <CardContent className="p-3 flex items-center justify-between">
        <div>
          <p className="text-[11px] text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold">{value}</p>
        </div>
        <div className={`h-9 w-9 rounded-md flex items-center justify-center ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}
