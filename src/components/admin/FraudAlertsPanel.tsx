import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Mail, Bell, BellRing, Trash2, Plus, Send, Eye, RefreshCw, ShieldAlert,
} from "lucide-react";
import {
  loadAlertSettings, saveAlertSettings, loadEmailLog, clearEmailLog,
  detectAndDispatch, resetSnapshot,
  type FraudAlertSettings, type AlertSubscriber, type FraudEmailRecord,
} from "@/lib/fraud-alerts";
import { useNotifications } from "@/lib/notifications";
import { RISK_COLOR, type RiskLevel, type SupplierRiskProfile } from "@/lib/fraud-detection";

const LEVELS: RiskLevel[] = ["low", "medium", "high", "critical"];

interface Props {
  profiles: SupplierRiskProfile[];
}

export default function FraudAlertsPanel({ profiles }: Props) {
  const [settings, setSettings] = useState<FraudAlertSettings>(() => loadAlertSettings());
  const [log, setLog] = useState<FraudEmailRecord[]>(() => loadEmailLog());
  const [preview, setPreview] = useState<FraudEmailRecord | null>(null);
  const [newSub, setNewSub] = useState({ name: "", email: "", role: "" });
  const { addNotification } = useNotifications();

  useEffect(() => { saveAlertSettings(settings); }, [settings]);

  const stats = useMemo(() => {
    const last24 = Date.now() - 24 * 3600 * 1000;
    const recent = log.filter(l => new Date(l.sentAt).getTime() > last24);
    return {
      total: log.length,
      last24: recent.length,
      emails: log.filter(l => l.channel === "email").length,
      inApp: log.filter(l => l.channel === "in-app").length,
    };
  }, [log]);

  const runDetection = () => {
    const result = detectAndDispatch(profiles, {
      pushInApp: (n) => addNotification(n),
    });
    setLog(loadEmailLog());
    if (result.alerts.length === 0) {
      toast.info("No new fraud transitions", { description: "All suppliers at or above threshold have already been alerted." });
    } else {
      const totalRecipients = result.emails.reduce((s, e) => s + e.to.length, 0);
      toast.success(`${result.alerts.length} fraud alert${result.alerts.length === 1 ? "" : "s"} dispatched`, {
        description: `${result.emails.length} email${result.emails.length === 1 ? "" : "s"} to ${totalRecipients} recipients · ${result.inApp.length} in-app notification${result.inApp.length === 1 ? "" : "s"}.`,
      });
    }
  };

  const replayAll = () => {
    resetSnapshot();
    runDetection();
  };

  const toggleLevel = (lvl: RiskLevel) => {
    setSettings(s => ({
      ...s,
      triggerOn: s.triggerOn.includes(lvl) ? s.triggerOn.filter(l => l !== lvl) : [...s.triggerOn, lvl],
    }));
  };

  const updateSub = (id: string, patch: Partial<AlertSubscriber>) => {
    setSettings(s => ({ ...s, subscribers: s.subscribers.map(x => x.id === id ? { ...x, ...patch } : x) }));
  };

  const removeSub = (id: string) => {
    setSettings(s => ({ ...s, subscribers: s.subscribers.filter(x => x.id !== id) }));
  };

  const addSub = () => {
    if (!newSub.name || !newSub.email) {
      toast.error("Name and email are required");
      return;
    }
    setSettings(s => ({
      ...s,
      subscribers: [...s.subscribers, {
        id: `u-${Date.now()}`, name: newSub.name, email: newSub.email,
        role: newSub.role || "Reviewer", channels: { email: true, inApp: true },
      }],
    }));
    setNewSub({ name: "", email: "", role: "" });
    toast.success("Subscriber added");
  };

  const wipeLog = () => {
    clearEmailLog();
    setLog([]);
    toast.success("Notification log cleared");
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={BellRing} label="Alerts dispatched" value={stats.total} hint="All-time" />
        <StatCard icon={ShieldAlert} label="Last 24 hours" value={stats.last24} hint="Recent activity" />
        <StatCard icon={Mail} label="Emails sent" value={stats.emails} hint="Mock SMTP log" />
        <StatCard icon={Bell} label="In-app pushed" value={stats.inApp} hint="To notification center" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Trigger settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Trigger Rules</CardTitle>
            <CardDescription>Choose which risk levels fire automated notifications.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs mb-2 block">Alert on risk level</Label>
              <div className="flex flex-wrap gap-2">
                {LEVELS.map(lvl => {
                  const on = settings.triggerOn.includes(lvl);
                  return (
                    <button
                      key={lvl}
                      onClick={() => toggleLevel(lvl)}
                      className={`px-3 py-1.5 rounded-md border text-xs capitalize transition ${
                        on ? RISK_COLOR[lvl] + " border" : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {lvl}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Suppliers entering or escalating into these levels will trigger alerts.
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="text-sm font-medium">Alert on level escalation</p>
                <p className="text-[11px] text-muted-foreground">Re-send when a supplier worsens (e.g. high → critical).</p>
              </div>
              <Switch
                checked={settings.alertOnLevelUp}
                onCheckedChange={v => setSettings(s => ({ ...s, alertOnLevelUp: v }))}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={runDetection} className="flex-1 gap-2">
                <Send className="h-4 w-4" /> Run Detection & Dispatch
              </Button>
              <Button variant="outline" onClick={replayAll} title="Reset history & re-alert on every flagged supplier">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Subscribers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recipients</CardTitle>
            <CardDescription>Who receives email + in-app alerts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ScrollArea className="h-[220px] pr-2">
              <div className="space-y-2">
                {settings.subscribers.map(s => (
                  <div key={s.id} className="p-3 rounded-lg border">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{s.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{s.email}</p>
                        <Badge variant="secondary" className="text-[10px] mt-1">{s.role}</Badge>
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeSub(s.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs">
                      <label className="flex items-center gap-2">
                        <Checkbox checked={s.channels.email} onCheckedChange={v => updateSub(s.id, { channels: { ...s.channels, email: !!v } })} />
                        <Mail className="h-3 w-3" /> Email
                      </label>
                      <label className="flex items-center gap-2">
                        <Checkbox checked={s.channels.inApp} onCheckedChange={v => updateSub(s.id, { channels: { ...s.channels, inApp: !!v } })} />
                        <Bell className="h-3 w-3" /> In-app
                      </label>
                    </div>
                  </div>
                ))}
                {settings.subscribers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No recipients yet.</p>
                )}
              </div>
            </ScrollArea>

            <div className="border-t pt-3 grid grid-cols-2 gap-2">
              <Input placeholder="Name" value={newSub.name} onChange={e => setNewSub({ ...newSub, name: e.target.value })} className="h-9 text-sm" />
              <Input placeholder="Role" value={newSub.role} onChange={e => setNewSub({ ...newSub, role: e.target.value })} className="h-9 text-sm" />
              <Input placeholder="email@company.com" value={newSub.email} onChange={e => setNewSub({ ...newSub, email: e.target.value })} className="h-9 text-sm col-span-2" />
              <Button onClick={addSub} variant="outline" className="col-span-2 h-9 gap-2"><Plus className="h-4 w-4" /> Add Recipient</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notification log */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base">Notification Log</CardTitle>
              <CardDescription>Every email and in-app alert dispatched by the fraud engine.</CardDescription>
            </div>
            {log.length > 0 && (
              <Button variant="ghost" size="sm" onClick={wipeLog} className="text-xs">
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear log
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {log.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No alerts yet. Run detection above or trigger a new fraud scan to see dispatches here.
            </p>
          ) : (
            <ScrollArea className="h-[360px] pr-2">
              <div className="space-y-2">
                {log.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setPreview(r)}
                    className="w-full text-left p-3 rounded-lg border hover:bg-muted/40 transition"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                          {r.channel === "email" ? <Mail className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium truncate">{r.subject}</p>
                            <Badge variant="outline" className={`${RISK_COLOR[r.level]} text-[9px] capitalize`}>{r.level}</Badge>
                            <Badge variant="secondary" className="text-[9px] capitalize">{r.channel}</Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            To: {r.to.slice(0, 2).join(", ")}{r.to.length > 2 ? ` +${r.to.length - 2}` : ""}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(r.sentAt).toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                      <Eye className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Preview dialog */}
      <Dialog open={!!preview} onOpenChange={o => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  {preview.channel === "email" ? <Mail className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                  {preview.subject}
                </DialogTitle>
                <DialogDescription>
                  {preview.channel === "email" ? "Outbound email" : "In-app notification"} · {new Date(preview.sentAt).toLocaleString("en-IN")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="text-xs grid grid-cols-[80px_1fr] gap-1 p-3 rounded-lg border bg-muted/30">
                  <span className="text-muted-foreground">From:</span><span>fraud-engine@vyapar.os</span>
                  <span className="text-muted-foreground">To:</span><span>{preview.to.join(", ")}</span>
                  <span className="text-muted-foreground">Status:</span>
                  <span><Badge variant="outline" className="bg-success/15 text-success border-success/30 text-[10px] capitalize">{preview.status}</Badge></span>
                </div>
                <pre className="text-xs whitespace-pre-wrap p-3 rounded-lg border bg-card font-mono leading-relaxed">{preview.body}</pre>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint }: { icon: any; label: string; value: number; hint: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>
      </CardContent>
    </Card>
  );
}
