import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bell, Mail, MessageSquare, Smartphone, PlayCircle, CheckCheck, Clock, AlertTriangle, CalendarClock, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNotifications } from "@/lib/notifications";
import {
  getReminderConfig, setReminderConfig, listReminders, scanReminders, acknowledgeReminder,
  acknowledgeAll, clearReminders, reminderStats, KIND_LABEL, KIND_TONE, CHANNEL_LABEL, DELIVERY_LABEL,
  type ReminderConfig, type ReminderRecord, type ChannelDelivery,
} from "@/lib/due-reminders";
import type { CreditLine } from "@/lib/bnpl";


const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const timeAgo = (iso: string) => {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

export function DueRemindersPanel({ lines }: { lines: CreditLine[] }) {
  const [cfg, setCfg] = useState<ReminderConfig>(() => getReminderConfig());
  const [tick, setTick] = useState(0);
  const { addNotification } = useNotifications();
  const records = useMemo(() => { void tick; return listReminders(); }, [tick]);
  const stats = useMemo(() => reminderStats(records), [records]);

  // Auto-scan on mount and every minute while panel is open.
  useEffect(() => {
    const run = (silent = false) => {
      const emitted = scanReminders(lines);
      if (emitted.length > 0) {
        setTick((n) => n + 1);
        for (const r of emitted.filter((x) => x.channels.includes("inapp"))) {
          addNotification({
            type: r.kind === "overdue" ? "fraud" : "deal",
            title: r.kind === "overdue" ? `Overdue EMI · ${r.orderRef}` :
                   r.kind === "due_today" ? `EMI due today · ${r.orderRef}` :
                   `EMI due in ${r.daysUntilDue}d · ${r.orderRef}`,
            message: r.message,
            actionUrl: "/buyer/credit",
          });
        }
        if (!silent) {
          toast({
            title: `${emitted.length} reminder${emitted.length === 1 ? "" : "s"} dispatched`,
            description: `${emitted.filter((r) => r.kind === "overdue").length} overdue · ${emitted.filter((r) => r.kind === "due_today").length} due today · ${emitted.filter((r) => r.kind === "upcoming").length} upcoming`,
          });
        }
      }
    };
    run(true);
    const iv = setInterval(() => run(true), 60_000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines]);

  const patch = (p: Partial<ReminderConfig>) => setCfg(setReminderConfig(p));
  const toggleUpcoming = (day: number) => {
    const set = new Set(cfg.upcomingDaysBefore);
    if (set.has(day)) set.delete(day); else set.add(day);
    patch({ upcomingDaysBefore: [...set].sort((a, b) => b - a) });
  };

  const runNow = () => {
    const emitted = scanReminders(lines);
    setTick((n) => n + 1);
    toast({
      title: emitted.length ? `Dispatched ${emitted.length} reminder${emitted.length === 1 ? "" : "s"}` : "Nothing to send",
      description: emitted.length
        ? `${emitted.filter((r) => r.kind === "overdue").length} overdue · ${emitted.filter((r) => r.kind === "due_today").length} due today · ${emitted.filter((r) => r.kind === "upcoming").length} upcoming`
        : "No installments matched the reminder windows right now.",
      variant: emitted.some((r) => r.kind === "overdue") ? "destructive" : "default",
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-4 gap-3">
        <StatCard icon={<Bell className="h-4 w-4" />} label="Total sent" value={stats.total} tone="muted" />
        <StatCard icon={<AlertTriangle className="h-4 w-4" />} label="Overdue" value={stats.overdue} tone="destructive" />
        <StatCard icon={<CalendarClock className="h-4 w-4" />} label="Due today" value={stats.dueToday} tone="warning" />
        <StatCard icon={<Clock className="h-4 w-4" />} label="Upcoming" value={stats.upcoming} tone="info" />
      </div>

      <Tabs defaultValue="log">
        <TabsList>
          <TabsTrigger value="log">Reminder log {stats.unacked > 0 && <Badge variant="secondary" className="ml-2 h-4 px-1.5 text-[10px]">{stats.unacked}</Badge>}</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-lg">Due-date reminders</CardTitle>
                <CardDescription>Email, SMS and in-app alerts fired for each active credit line's next installments.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={runNow} className="gap-1.5">
                  <PlayCircle className="h-3.5 w-3.5" /> Run scan now
                </Button>
                <Button size="sm" variant="outline" onClick={() => { acknowledgeAll(); setTick((n) => n + 1); }} className="gap-1.5" disabled={stats.unacked === 0}>
                  <CheckCheck className="h-3.5 w-3.5" /> Ack all
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { clearReminders(); setTick((n) => n + 1); }} className="gap-1.5 text-muted-foreground" disabled={records.length === 0}>
                  <Trash2 className="h-3.5 w-3.5" /> Clear
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {records.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  No reminders yet. When an installment enters an upcoming, due-today or overdue window the alert lands here.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Installment</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Kind</TableHead>
                      <TableHead>Channels</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.slice(0, 60).map((r) => (
                      <TableRow key={r.id} className={r.acknowledged ? "opacity-60" : ""}>
                        <TableCell className="text-xs whitespace-nowrap">{timeAgo(r.sentAt)}</TableCell>
                        <TableCell className="font-mono text-xs">{r.orderRef}</TableCell>
                        <TableCell className="text-xs">#{r.installmentNo} · {r.dueDate}</TableCell>
                        <TableCell className="text-xs font-semibold">{fmt(r.amount)}</TableCell>
                        <TableCell>
                          <Badge variant={KIND_TONE[r.kind] === "destructive" ? "destructive" : KIND_TONE[r.kind] === "warning" ? "default" : "secondary"} className="text-[10px]">
                            {KIND_LABEL[r.kind]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1.5 flex-wrap">
                            {(r.deliveries ?? r.channels.map((c) => ({ channel: c, state: "sent" as const, attempts: 1, updatedAt: r.sentAt }))).map((d: ChannelDelivery) => (
                              <span
                                key={d.channel}
                                title={`${CHANNEL_LABEL[d.channel]} · ${DELIVERY_LABEL[d.state]}${d.detail ? ` — ${d.detail}` : ""}`}
                                className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] ${
                                  d.state === "failed" ? "border-destructive/40 text-destructive"
                                  : d.state === "sent" ? "border-border text-muted-foreground"
                                  : "border-dashed text-muted-foreground"
                                }`}
                              >
                                <ChannelIcon c={d.channel} />
                                {DELIVERY_LABEL[d.state]}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-[10px] text-muted-foreground font-mono max-w-[140px] truncate" title={r.dedupeKey}>{r.dedupeKey ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate" title={r.message}>{r.message}</TableCell>

                        <TableCell className="text-right">
                          {r.acknowledged
                            ? <Badge variant="outline" className="text-[10px]">Acked</Badge>
                            : <Button size="sm" variant="ghost" onClick={() => { acknowledgeReminder(r.id); setTick((n) => n + 1); }}>Ack</Button>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Reminder settings</CardTitle>
              <CardDescription>Control when and how you're alerted about upcoming and overdue EMIs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Enable due-date reminders</p>
                  <p className="text-xs text-muted-foreground">Turn all reminders on or off globally.</p>
                </div>
                <Switch checked={cfg.enabled} onCheckedChange={(v) => patch({ enabled: v })} />
              </div>

              <div>
                <Label className="text-xs">Send upcoming reminders (days before due)</Label>
                <div className="flex gap-2 flex-wrap mt-2">
                  {[14, 7, 5, 3, 1].map((d) => (
                    <Button
                      key={d}
                      type="button"
                      size="sm"
                      variant={cfg.upcomingDaysBefore.includes(d) ? "default" : "outline"}
                      onClick={() => toggleUpcoming(d)}
                    >
                      {d}d
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  A single "due today" alert always fires on the due date, and overdue alerts repeat until acknowledged.
                </p>
              </div>

              <div>
                <Label className="text-xs">Overdue re-alert cadence: every {cfg.overdueRepeatHours}h</Label>
                <Slider
                  value={[cfg.overdueRepeatHours]}
                  min={6} max={72} step={6}
                  onValueChange={(v) => patch({ overdueRepeatHours: v[0] })}
                  className="mt-3"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                {(["email", "sms", "inapp"] as const).map((ch) => (
                  <div key={ch} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <ChannelIcon c={ch} /> <span className="text-sm">{CHANNEL_LABEL[ch]}</span>
                    </div>
                    <Switch checked={cfg.channels[ch]} onCheckedChange={(v) => patch({ channels: { ...cfg.channels, [ch]: v } })} />
                  </div>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Contact email</Label>
                  <Input value={cfg.contactEmail} onChange={(e) => patch({ contactEmail: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Contact mobile</Label>
                  <Input value={cfg.contactSms} onChange={(e) => patch({ contactSms: e.target.value })} className="mt-1" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Quiet hours start ({cfg.quietStartHour}:00)</Label>
                  <Slider value={[cfg.quietStartHour]} min={0} max={23} step={1} onValueChange={(v) => patch({ quietStartHour: v[0] })} className="mt-3" />
                </div>
                <div>
                  <Label className="text-xs">Quiet hours end ({cfg.quietEndHour}:00)</Label>
                  <Slider value={[cfg.quietEndHour]} min={0} max={23} step={1} onValueChange={(v) => patch({ quietEndHour: v[0] })} className="mt-3" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                During quiet hours only in-app alerts fire. Overdue reminders bypass quiet hours.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "muted" | "destructive" | "warning" | "info" }) {
  const toneCls =
    tone === "destructive" ? "text-destructive" :
    tone === "warning" ? "text-warning" :
    tone === "info" ? "text-primary" : "text-muted-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`flex items-center gap-2 text-xs ${toneCls}`}>{icon}<span>{label}</span></div>
        <p className="text-2xl font-display font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

function ChannelIcon({ c }: { c: "email" | "sms" | "inapp" }) {
  const cls = "h-3.5 w-3.5 text-muted-foreground";
  if (c === "email") return <Mail className={cls} aria-label="Email" />;
  if (c === "sms") return <MessageSquare className={cls} aria-label="SMS" />;
  return <Smartphone className={cls} aria-label="In-app" />;
}
