import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Banknote, Smartphone, CreditCard as CreditCardIcon, ShieldCheck, Plus,
  Play, RefreshCw, X, CheckCircle2, XCircle, Clock, Loader2, Zap, AlertTriangle, Trash2, Star,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  listPaymentMethods, addPaymentMethod, activateMandate, setDefaultMethod, removePaymentMethod, setMandateStatus,
  getAutoPayConfig, setAutoPayConfig, isLineEnrolled, setLineEnrolled,
  projectUpcomingDebits, runDebit, listAttempts, retryAttempt, cancelAttempt,
  KIND_LABEL, PROVIDER_LABEL,
  type PaymentMethod, type PaymentMethodKind, type AutoDebitAttempt, type AutoDebitStatus,
} from "@/lib/payment-gateway";
import type { CreditLine, ScheduleInstallment } from "@/lib/bnpl";

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const KIND_ICON: Record<PaymentMethodKind, React.ReactNode> = {
  upi_autopay: <Smartphone className="w-4 h-4" />,
  enach: <Banknote className="w-4 h-4" />,
  card: <CreditCardIcon className="w-4 h-4" />,
};

const STATUS_BADGE: Record<AutoDebitStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  success:        { label: "Debited",          cls: "bg-success/15 text-success border-success/30",         icon: <CheckCircle2 className="w-3 h-3" /> },
  processing:     { label: "Processing",       cls: "bg-primary/15 text-primary border-primary/30",         icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  scheduled:      { label: "Scheduled",        cls: "bg-muted text-muted-foreground border-border",         icon: <Clock className="w-3 h-3" /> },
  retry_scheduled:{ label: "Retry queued",     cls: "bg-warning/15 text-warning border-warning/30",         icon: <RefreshCw className="w-3 h-3" /> },
  failed:         { label: "Failed",           cls: "bg-destructive/15 text-destructive border-destructive/30", icon: <XCircle className="w-3 h-3" /> },
  cancelled:      { label: "Cancelled",        cls: "bg-muted text-muted-foreground border-border",         icon: <X className="w-3 h-3" /> },
};

interface Props {
  lines: CreditLine[];
  schedules: Record<string, ScheduleInstallment[]>;
}

export function AutoRepaymentPanel({ lines, schedules }: Props) {
  const [, force] = useState(0);
  const refresh = () => force((n) => n + 1);

  const methods = listPaymentMethods();
  const cfg = getAutoPayConfig();
  const upcoming = useMemo(() => projectUpcomingDebits(lines, schedules), [lines, schedules]);
  const attempts = listAttempts();

  const successCount = attempts.filter((a) => a.status === "success").length;
  const failedCount = attempts.filter((a) => a.status === "failed").length;
  const collectedInr = attempts.filter((a) => a.status === "success").reduce((a, b) => a + b.amount, 0);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard icon={<Zap className="w-4 h-4" />} label="AutoPay" value={cfg.enabled ? "Enabled" : "Disabled"} tone={cfg.enabled ? "success" : "muted"} />
        <StatCard icon={<ShieldCheck className="w-4 h-4" />} label="Active mandates" value={String(methods.filter(m => m.mandateStatus === "active").length)} tone="info" />
        <StatCard icon={<CheckCircle2 className="w-4 h-4" />} label="Collected (lifetime)" value={fmt(collectedInr)} tone="success" />
        <StatCard icon={<AlertTriangle className="w-4 h-4" />} label="Failed debits" value={String(failedCount)} tone={failedCount ? "destructive" : "muted"} />
      </div>

      {/* Global config */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> AutoPay configuration</CardTitle>
          <CardDescription>Funds are pulled from your default payment method T-{cfg.debitOffsetDays} day(s) before each due date.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center justify-between md:col-span-1 rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">Auto-debit on due dates</div>
              <div className="text-xs text-muted-foreground">Master switch</div>
            </div>
            <Switch checked={cfg.enabled} onCheckedChange={(v) => { setAutoPayConfig({ enabled: v }); refresh(); }} />
          </div>
          <ConfigField label="Debit offset (days before due)">
            <div className="flex items-center gap-2">
              <Slider value={[cfg.debitOffsetDays]} min={0} max={5} step={1}
                onValueChange={(v) => { setAutoPayConfig({ debitOffsetDays: v[0] }); refresh(); }} />
              <span className="text-sm font-medium w-10 text-right">T-{cfg.debitOffsetDays}</span>
            </div>
          </ConfigField>
          <ConfigField label="Max retries on failure">
            <div className="flex items-center gap-2">
              <Slider value={[cfg.maxRetries]} min={0} max={5} step={1}
                onValueChange={(v) => { setAutoPayConfig({ maxRetries: v[0] }); refresh(); }} />
              <span className="text-sm font-medium w-6 text-right">{cfg.maxRetries}</span>
            </div>
          </ConfigField>
          <ConfigField label="Retry gap (hours)">
            <div className="flex items-center gap-2">
              <Slider value={[cfg.retryGapHours]} min={1} max={72} step={1}
                onValueChange={(v) => { setAutoPayConfig({ retryGapHours: v[0] }); refresh(); }} />
              <span className="text-sm font-medium w-10 text-right">{cfg.retryGapHours}h</span>
            </div>
          </ConfigField>
        </CardContent>
      </Card>

      <Tabs defaultValue="methods">
        <TabsList>
          <TabsTrigger value="methods">Payment methods</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming debits ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="lines">Per-line autopay</TabsTrigger>
          <TabsTrigger value="ledger">Debit ledger ({attempts.length})</TabsTrigger>
        </TabsList>

        {/* Methods */}
        <TabsContent value="methods" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Linked payment methods</div>
              <div className="text-xs text-muted-foreground">UPI AutoPay, e-NACH and card mandates power scheduled repayments.</div>
            </div>
            <AddMethodDialog onAdded={refresh} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {methods.map((m) => (
              <MethodCard key={m.id} method={m} onChange={refresh} />
            ))}
            {methods.length === 0 && (
              <Card className="border-dashed"><CardContent className="py-8 text-center text-sm text-muted-foreground">No payment methods linked yet.</CardContent></Card>
            )}
          </div>
        </TabsContent>

        {/* Upcoming */}
        <TabsContent value="upcoming" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Inst.</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Auto-debit on</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcoming.map((u) => (
                    <TableRow key={`${u.creditLineId}-${u.installmentNo}`}>
                      <TableCell>
                        <div className="font-medium text-sm">{u.orderRef}</div>
                        <div className="text-xs text-muted-foreground">{u.supplierName}</div>
                      </TableCell>
                      <TableCell>#{u.installmentNo}</TableCell>
                      <TableCell className="text-sm">{u.dueDate}</TableCell>
                      <TableCell className="text-sm">{u.scheduledFor}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(u.amount)}</TableCell>
                      <TableCell>
                        {u.enrolled && cfg.enabled
                          ? <Badge variant="outline" className="bg-success/10 text-success border-success/30">AutoPay on</Badge>
                          : <Badge variant="outline">Manual</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => {
                          const a = runDebit({
                            creditLineId: u.creditLineId,
                            installmentNo: u.installmentNo,
                            amount: u.amount,
                            scheduledFor: u.scheduledFor,
                          });
                          toast({
                            title: a.status === "success" ? "Debit successful" : a.status === "retry_scheduled" ? "Debit failed — retry queued" : "Debit failed",
                            description: a.status === "success"
                              ? `${fmt(a.amount)} collected via ${a.provider} (${a.gatewayRef})`
                              : a.failureReason ?? "Unknown error",
                            variant: a.status === "success" ? "default" : "destructive",
                          });
                          refresh();
                        }}>
                          <Play className="w-3 h-3 mr-1" /> Run now
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {upcoming.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">No upcoming debits — all installments are paid.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Per-line */}
        <TabsContent value="lines" className="mt-4 space-y-3">
          {lines.filter((l) => l.status === "active").map((l) => (
            <Card key={l.id}>
              <CardContent className="py-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{l.orderRef} · {l.supplierName}</div>
                  <div className="text-xs text-muted-foreground">Outstanding {fmt(l.outstanding)} · due {l.dueDate}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Label htmlFor={`enr-${l.id}`} className="text-sm">Auto-debit</Label>
                  <Switch
                    id={`enr-${l.id}`}
                    checked={isLineEnrolled(l.id)}
                    onCheckedChange={(v) => { setLineEnrolled(l.id, v); refresh(); }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
          {lines.filter(l => l.status === "active").length === 0 && (
            <Card className="border-dashed"><CardContent className="py-8 text-center text-sm text-muted-foreground">No active credit lines.</CardContent></Card>
          )}
        </TabsContent>

        {/* Ledger */}
        <TabsContent value="ledger" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Attempt</TableHead>
                    <TableHead>Line</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attempts.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="text-xs font-mono">{a.gatewayRef}</div>
                        <div className="text-xs text-muted-foreground">{a.attemptedAt ? new Date(a.attemptedAt).toLocaleString() : "—"}</div>
                      </TableCell>
                      <TableCell className="text-sm">{a.creditLineId} · #{a.installmentNo}{a.retryNo > 0 && <span className="ml-1 text-xs text-muted-foreground">(retry {a.retryNo})</span>}</TableCell>
                      <TableCell className="text-sm">{a.provider}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(a.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`gap-1 ${STATUS_BADGE[a.status].cls}`}>
                          {STATUS_BADGE[a.status].icon}{STATUS_BADGE[a.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                        {a.failureCode ? <span><span className="font-mono">{a.failureCode}</span> · {a.failureReason}</span> : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {(a.status === "failed" || a.status === "retry_scheduled") && (
                          <Button size="sm" variant="ghost" onClick={() => { retryAttempt(a.id); refresh(); }}>
                            <RefreshCw className="w-3 h-3 mr-1" /> Retry
                          </Button>
                        )}
                        {a.status === "retry_scheduled" && (
                          <Button size="sm" variant="ghost" onClick={() => { cancelAttempt(a.id); refresh(); }}>
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {attempts.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">No debit attempts yet. Use "Run now" on an upcoming debit to simulate.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ConfigField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "success" | "muted" | "info" | "destructive" }) {
  const cls = {
    success: "text-success", muted: "text-muted-foreground", info: "text-primary", destructive: "text-destructive",
  }[tone];
  return (
    <Card>
      <CardContent className="py-4">
        <div className={`flex items-center gap-2 text-xs ${cls}`}>{icon}<span>{label}</span></div>
        <div className="text-xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function MethodCard({ method, onChange }: { method: PaymentMethod; onChange: () => void }) {
  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-muted rounded-md">{KIND_ICON[method.kind]}</div>
            <div>
              <div className="font-medium text-sm flex items-center gap-2">
                {method.label}
                {method.isDefault && <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-1"><Star className="w-3 h-3" /> Default</Badge>}
              </div>
              <div className="text-xs text-muted-foreground">{KIND_LABEL[method.kind]} · {PROVIDER_LABEL[method.provider]}</div>
            </div>
          </div>
          <MandateBadge status={method.mandateStatus} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div><span className="text-foreground">Mandate:</span> <span className="font-mono">{method.mandateId}</span></div>
          <div><span className="text-foreground">Cap/debit:</span> ₹{method.maxDebitInr.toLocaleString("en-IN")}</div>
          <div className="col-span-2"><span className="text-foreground">Valid until:</span> {new Date(method.validUntil).toLocaleDateString()}</div>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {method.mandateStatus === "pending" && (
            <Button size="sm" onClick={() => { activateMandate(method.id); toast({ title: "Mandate activated", description: "Bank confirmation received." }); onChange(); }}>
              Confirm with bank
            </Button>
          )}
          {method.mandateStatus === "active" && !method.isDefault && (
            <Button size="sm" variant="outline" onClick={() => { setDefaultMethod(method.id); onChange(); }}>Set default</Button>
          )}
          {method.mandateStatus === "active" && (
            <Button size="sm" variant="outline" onClick={() => { setMandateStatus(method.id, "paused"); onChange(); }}>Pause</Button>
          )}
          {method.mandateStatus === "paused" && (
            <Button size="sm" variant="outline" onClick={() => { setMandateStatus(method.id, "active"); onChange(); }}>Resume</Button>
          )}
          <Button size="sm" variant="ghost" className="text-destructive ml-auto" onClick={() => {
            removePaymentMethod(method.id); onChange();
            toast({ title: "Method removed" });
          }}>
            <Trash2 className="w-3 h-3 mr-1" /> Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MandateBadge({ status }: { status: PaymentMethod["mandateStatus"] }) {
  const map: Record<PaymentMethod["mandateStatus"], { label: string; cls: string }> = {
    active:  { label: "Active",   cls: "bg-success/15 text-success border-success/30" },
    pending: { label: "Pending",  cls: "bg-warning/15 text-warning border-warning/30" },
    paused:  { label: "Paused",   cls: "bg-muted text-muted-foreground border-border" },
    revoked: { label: "Revoked",  cls: "bg-destructive/15 text-destructive border-destructive/30" },
    failed:  { label: "Failed",   cls: "bg-destructive/15 text-destructive border-destructive/30" },
  };
  const m = map[status];
  return <Badge variant="outline" className={m.cls}>{m.label}</Badge>;
}

function AddMethodDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<PaymentMethodKind>("upi_autopay");
  const [bank, setBank] = useState("HDFC Bank");
  const [ref, setRef] = useState("");
  const [cap, setCap] = useState(500_000);

  const submit = () => {
    if (!ref) {
      toast({ title: "Enter account / VPA / card", variant: "destructive" });
      return;
    }
    const label =
      kind === "upi_autopay" ? ref :
      kind === "card" ? `${bank} •• ${ref.slice(-4)}` :
      `${bank} •• ${ref.slice(-4)}`;
    addPaymentMethod({
      kind,
      label,
      bankOrIssuer: bank,
      maskedRef: kind === "upi_autopay" ? ref : `XXXXXX${ref.slice(-4)}`,
      maxDebitInr: cap,
    });
    toast({
      title: "Mandate request sent",
      description: "Approve the mandate in your bank/UPI app to activate AutoPay.",
    });
    setOpen(false);
    setRef("");
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add payment method</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link a payment method for AutoPay</DialogTitle>
          <DialogDescription>Mandates are processed via NPCI (UPI / e-NACH) through a licensed payment gateway.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Method type</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as PaymentMethodKind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="upi_autopay">UPI AutoPay (NPCI)</SelectItem>
                <SelectItem value="enach">Bank account · e-NACH</SelectItem>
                <SelectItem value="card">Card on File</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{kind === "upi_autopay" ? "UPI handle (VPA)" : kind === "card" ? "Card number" : "Bank account number"}</Label>
            <Input value={ref} onChange={(e) => setRef(e.target.value)}
              placeholder={kind === "upi_autopay" ? "yourname@okhdfc" : kind === "card" ? "4111 1111 1111 1111" : "123456789012"} />
          </div>
          {kind !== "upi_autopay" && (
            <div className="space-y-2">
              <Label>Bank / Issuer</Label>
              <Input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="HDFC Bank" />
            </div>
          )}
          <div className="space-y-2">
            <Label>Per-debit cap (₹)</Label>
            <div className="flex items-center gap-3">
              <Slider value={[cap]} min={50_000} max={2_000_000} step={50_000} onValueChange={(v) => setCap(v[0])} />
              <span className="text-sm font-medium w-24 text-right">{fmt(cap)}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>Send mandate request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
