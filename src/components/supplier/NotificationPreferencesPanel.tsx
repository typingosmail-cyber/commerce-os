import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Bell, Mail, Moon, RotateCcw, Save, Inbox, Send } from "lucide-react";
import {
  loadPrefs, savePrefs, resetPrefs, onPrefsChange,
  loadDigestQueue, onDigestChange, flushDigestFor, DOC_TYPE_OPTIONS,
  DEFAULT_DOC_TYPE_PREF, FREQ_LABEL,
  type NotificationPreferences, type DocTypePref, type NotifChannel,
  type NotifFrequency, type ReviewDecisionKind, type DigestItem,
} from "@/lib/notification-preferences";

const KINDS: { key: ReviewDecisionKind; label: string }[] = [
  { key: "approved",   label: "Approvals" },
  { key: "rejected",   label: "Rejections" },
  { key: "needs_info", label: "Info requests" },
];
const FREQS: NotifFrequency[] = ["instant", "daily", "weekly", "off"];

export function NotificationPreferencesPanel() {
  const [prefs, setPrefs] = useState<NotificationPreferences>(() => loadPrefs());
  const [digest, setDigest] = useState<DigestItem[]>(() => loadDigestQueue());
  const [showOverrides, setShowOverrides] = useState(false);

  useEffect(() => onPrefsChange(() => setPrefs(loadPrefs())), []);
  useEffect(() => onDigestChange(() => setDigest(loadDigestQueue())), []);

  const updateDefault = (channel: NotifChannel, patch: Partial<DocTypePref["email"]>) => {
    const next: NotificationPreferences = {
      ...prefs,
      perDocType: {
        ...prefs.perDocType,
        __default__: {
          ...prefs.perDocType.__default__,
          [channel]: { ...prefs.perDocType.__default__[channel], ...patch },
        },
      },
      updatedAt: prefs.updatedAt,
    };
    setPrefs(next); savePrefs(next);
  };

  const updateOverride = (
    docId: string, channel: NotifChannel, patch: Partial<DocTypePref["email"]>,
  ) => {
    const existing = prefs.perDocType[docId] ?? {
      email: { ...prefs.perDocType.__default__.email },
      inApp: { ...prefs.perDocType.__default__.inApp },
    };
    const next: NotificationPreferences = {
      ...prefs,
      perDocType: {
        ...prefs.perDocType,
        [docId]: {
          ...existing,
          [channel]: { ...existing[channel], ...patch },
        },
      },
      updatedAt: prefs.updatedAt,
    };
    setPrefs(next); savePrefs(next);
  };

  const removeOverride = (docId: string) => {
    const { [docId]: _drop, ...rest } = prefs.perDocType;
    const next = { ...prefs, perDocType: { ...rest, __default__: prefs.perDocType.__default__ } };
    setPrefs(next); savePrefs(next);
  };

  const setQuiet = (patch: Partial<Pick<NotificationPreferences, "quietHoursEnabled" | "quietFrom" | "quietTo">>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next); savePrefs(next);
  };

  const doReset = () => {
    setPrefs(resetPrefs());
    toast.info("Notification preferences reset to defaults");
  };

  const flush = (channel: NotifChannel) => {
    const items = flushDigestFor(channel);
    setDigest(loadDigestQueue());
    toast.success(`${channel === "email" ? "Email" : "In-app"} digest sent`, {
      description: `${items.length} pending update${items.length === 1 ? "" : "s"} bundled and delivered.`,
    });
  };

  const overrides = Object.keys(prefs.perDocType).filter(k => k !== "__default__");
  const emailDigest = digest.filter(d => d.channel === "email").length;
  const inAppDigest = digest.filter(d => d.channel === "inApp").length;

  const renderChannelRow = (
    label: string, IconEl: React.ComponentType<{ className?: string }>,
    pref: DocTypePref["email"], onChange: (patch: Partial<DocTypePref["email"]>) => void,
  ) => (
    <div className="flex flex-col md:flex-row md:items-center gap-3 py-3 border-b last:border-0">
      <div className="flex items-center gap-2 min-w-[140px]">
        <IconEl className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Frequency</Label>
        <Select value={pref.frequency} onValueChange={(v: NotifFrequency) => onChange({ frequency: v })}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {FREQS.map(f => <SelectItem key={f} value={f}>{FREQ_LABEL[f]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {KINDS.map(k => (
          <label key={k.key} className="flex items-center gap-1.5 text-xs">
            <Checkbox
              checked={pref.kinds[k.key]}
              onCheckedChange={(v) => onChange({
                kinds: { ...pref.kinds, [k.key]: !!v },
              })}
            />
            {k.label}
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="h-5 w-5 text-primary" /> Notification preferences
              </CardTitle>
              <CardDescription>
                Choose how you're notified when a reviewer acts on your documents.
                Rules apply to all doc types unless you add an override below.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={doReset}>
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
              </Button>
              <Badge variant="outline" className="text-[10px]">
                <Save className="h-3 w-3 mr-1" /> Auto-saved
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-3 bg-muted/30">
            <h4 className="text-sm font-semibold mb-1">Default (all documents)</h4>
            {renderChannelRow("Email",  Mail, prefs.perDocType.__default__.email,
              (patch) => updateDefault("email", patch))}
            {renderChannelRow("In-app", Bell, prefs.perDocType.__default__.inApp,
              (patch) => updateDefault("inApp", patch))}
          </div>

          {/* Quiet hours */}
          <div className="rounded-lg border p-3 flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Moon className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Quiet hours</p>
                <p className="text-[11px] text-muted-foreground">
                  Instant messages inside this window are batched and delivered later.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={prefs.quietHoursEnabled} onCheckedChange={(v) => setQuiet({ quietHoursEnabled: v })} />
              <Label className="text-xs text-muted-foreground">From</Label>
              <Select value={String(prefs.quietFrom)} onValueChange={(v) => setQuiet({ quietFrom: Number(v) })}>
                <SelectTrigger className="w-[90px] h-8 text-xs" disabled={!prefs.quietHoursEnabled}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => <SelectItem key={i} value={String(i)}>{i.toString().padStart(2, "0")}:00</SelectItem>)}
                </SelectContent>
              </Select>
              <Label className="text-xs text-muted-foreground">To</Label>
              <Select value={String(prefs.quietTo)} onValueChange={(v) => setQuiet({ quietTo: Number(v) })}>
                <SelectTrigger className="w-[90px] h-8 text-xs" disabled={!prefs.quietHoursEnabled}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => <SelectItem key={i} value={String(i)}>{i.toString().padStart(2, "0")}:00</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Per doc type overrides */}
          <div className="rounded-lg border">
            <div className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-semibold">Per document type overrides</p>
                <p className="text-[11px] text-muted-foreground">
                  {overrides.length} custom rule{overrides.length === 1 ? "" : "s"} · applies only to selected doc types.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowOverrides(v => !v)}>
                {showOverrides ? "Hide" : "Manage"}
              </Button>
            </div>
            {showOverrides && (
              <div className="border-t p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Add override for</Label>
                  <Select
                    onValueChange={(id) => {
                      if (prefs.perDocType[id]) return;
                      updateOverride(id, "email", { frequency: prefs.perDocType.__default__.email.frequency });
                    }}
                  >
                    <SelectTrigger className="w-[240px] h-8 text-xs"><SelectValue placeholder="Choose document type…" /></SelectTrigger>
                    <SelectContent>
                      {DOC_TYPE_OPTIONS.filter(d => !prefs.perDocType[d.id]).map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {overrides.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No overrides — default rules apply to everything.</p>
                ) : (
                  <div className="space-y-3">
                    {overrides.map(id => {
                      const doc = DOC_TYPE_OPTIONS.find(d => d.id === id);
                      const p = prefs.perDocType[id];
                      return (
                        <div key={id} className="rounded-md border p-3 bg-card">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium">{doc?.name ?? id}</p>
                            <Button size="sm" variant="ghost" onClick={() => removeOverride(id)}>Remove</Button>
                          </div>
                          {renderChannelRow("Email",  Mail, p.email, (patch) => updateOverride(id, "email", patch))}
                          {renderChannelRow("In-app", Bell, p.inApp, (patch) => updateOverride(id, "inApp", patch))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Digest queue */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Inbox className="h-4 w-4 text-primary" /> Pending digest ({digest.length})
          </CardTitle>
          <CardDescription>
            Non-instant messages and quiet-hours deferrals accumulate here until the next digest window.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => flush("email")} disabled={emailDigest === 0}>
              <Send className="h-3.5 w-3.5 mr-1" /> Send email digest ({emailDigest})
            </Button>
            <Button size="sm" variant="outline" onClick={() => flush("inApp")} disabled={inAppDigest === 0}>
              <Send className="h-3.5 w-3.5 mr-1" /> Send in-app digest ({inAppDigest})
            </Button>
          </div>
          {digest.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Nothing queued — you're up to date.</p>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Channel</TableHead>
                    <TableHead className="text-xs">Document</TableHead>
                    <TableHead className="text-xs">Decision</TableHead>
                    <TableHead className="text-xs">Frequency</TableHead>
                    <TableHead className="text-xs">Queued</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {digest.slice(0, 20).map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-[10px]">
                          {d.channel === "email" ? <Mail className="h-3 w-3 mr-1" /> : <Bell className="h-3 w-3 mr-1" />}
                          {d.channel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{d.documentName}</TableCell>
                      <TableCell className="text-xs capitalize">{d.decision.replace("_", " ")}</TableCell>
                      <TableCell className="text-xs">{FREQ_LABEL[d.frequency]}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(d.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
