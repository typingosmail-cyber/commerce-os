import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2, ShieldCheck, Plus, Trash2, FileText, Link as LinkIcon,
  Phone, Camera, Mail, Ticket, MapPin, ArrowDown, AlertTriangle, History,
} from "lucide-react";
import { toast } from "sonner";
import {
  FP_REASONS, EVIDENCE_LABEL, REASON_LABEL,
  previewRecalibration, markFalsePositive, getFalsePositiveHistory, revertFalsePositive,
  type FPReasonCode, type EvidenceType, type Evidence,
} from "@/lib/false-positive";
import { RISK_COLOR, type SupplierRiskProfile } from "@/lib/fraud-detection";

const EVIDENCE_ICON: Record<EvidenceType, React.ComponentType<{ className?: string }>> = {
  document: FileText,
  screenshot: Camera,
  external_letter: Mail,
  url_reference: LinkIcon,
  internal_ticket: Ticket,
  phone_verification: Phone,
  site_visit_report: MapPin,
};

interface Props {
  profile: SupplierRiskProfile;
  reviewer: string;
  reviewerRole?: string;
  caseId?: string;
  trigger?: React.ReactNode;
  onDone?: () => void;
}

type EvidenceDraft = Omit<Evidence, "id" | "collectedAt">;

export default function FalsePositiveDialog({
  profile, reviewer, reviewerRole = "Compliance Reviewer", caseId, trigger, onDone,
}: Props) {
  const [open, setOpen] = useState(false);
  const [reasons, setReasons] = useState<FPReasonCode[]>([]);
  const [reasonNote, setReasonNote] = useState("");
  const [suppressedIds, setSuppressedIds] = useState<string[]>(profile.signals.map((s) => s.id));
  const [evidence, setEvidence] = useState<EvidenceDraft[]>([]);
  const [confirmAck, setConfirmAck] = useState(false);

  const history = useMemo(() => getFalsePositiveHistory(profile.supplierId), [profile.supplierId, open]);

  const recal = useMemo(
    () => previewRecalibration(profile, suppressedIds, reasons),
    [profile, suppressedIds, reasons],
  );

  const toggleReason = (code: FPReasonCode) => {
    setReasons((cur) => cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code]);
  };

  const toggleSignal = (id: string) => {
    setSuppressedIds((cur) => cur.includes(id) ? cur.filter((c) => c !== id) : [...cur, id]);
  };

  const submit = () => {
    if (reasons.length === 0) { toast.error("Pick at least one reason"); return; }
    if (!reasonNote.trim() || reasonNote.trim().length < 12) {
      toast.error("Add a justification note (≥12 characters) for the audit log"); return;
    }
    if (suppressedIds.length === 0) { toast.error("Select at least one signal to suppress"); return; }
    if (evidence.length === 0) { toast.error("Attach at least one piece of evidence"); return; }
    if (!confirmAck) { toast.error("Confirm you take responsibility for this override"); return; }

    const rec = markFalsePositive(profile, {
      reasons, reasonNote, evidence,
      suppressedSignalIds: suppressedIds.length === profile.signals.length ? [] : suppressedIds,
      reviewer, reviewerRole, caseId,
    });

    toast.success(
      `False positive recorded — score ${rec.recalibration.scoreBefore} → ${rec.recalibration.scoreAfter}`,
      { description: `Suppressed ${rec.recalibration.suppressedSignalIds.length} signal(s) · ${REASON_LABEL[reasons[0]]}` },
    );

    setOpen(false);
    setReasons([]); setReasonNote(""); setEvidence([]); setConfirmAck(true);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <CheckCircle2 className="h-4 w-4 mr-1" /> Mark False Positive
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-success" />
            Mark finding as false positive — {profile.supplierName}
          </DialogTitle>
          <DialogDescription>
            Provide reasons + evidence. Suppressed signals are removed and the composite risk score
            is recalibrated. The override is permanently recorded for audit.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="review" className="mt-2">
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="review">Review signals</TabsTrigger>
            <TabsTrigger value="reasons">Reasons</TabsTrigger>
            <TabsTrigger value="evidence">Evidence ({evidence.length})</TabsTrigger>
            <TabsTrigger value="history">History ({history.length})</TabsTrigger>
          </TabsList>

          {/* SIGNALS TO SUPPRESS */}
          <TabsContent value="review" className="space-y-2 mt-3">
            <p className="text-xs text-muted-foreground">
              Select which signals are incorrect. By default, all signals are suppressed (full clearance).
            </p>
            {profile.signals.length === 0 && (
              <Card><CardContent className="py-6 text-sm text-center text-muted-foreground">
                No active signals to suppress on this supplier.
              </CardContent></Card>
            )}
            {profile.signals.map((s) => {
              const checked = suppressedIds.includes(s.id);
              return (
                <Card key={s.id} className={checked ? "border-success/40 bg-success/5" : ""}>
                  <CardContent className="py-3 flex items-start gap-3">
                    <Checkbox checked={checked} onCheckedChange={() => toggleSignal(s.id)} className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{s.label}</span>
                        <Badge variant="outline" className={`${RISK_COLOR[s.severity]} text-[9px] capitalize`}>{s.severity}</Badge>
                        <Badge variant="secondary" className="text-[9px]">+{s.weight} pts</Badge>
                        <Badge variant="outline" className="text-[9px] capitalize">{s.category}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{s.detail}</div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setSuppressedIds(profile.signals.map((s) => s.id))}>Select all</Button>
              <Button size="sm" variant="ghost" onClick={() => setSuppressedIds([])}>Clear</Button>
            </div>
          </TabsContent>

          {/* REASONS */}
          <TabsContent value="reasons" className="space-y-2 mt-3">
            <div className="grid sm:grid-cols-2 gap-2">
              {FP_REASONS.map((r) => {
                const checked = reasons.includes(r.code);
                return (
                  <Card key={r.code} className={checked ? "border-primary/40 bg-primary/5 cursor-pointer" : "cursor-pointer hover:border-primary/30"}
                    onClick={() => toggleReason(r.code)}>
                    <CardContent className="py-3 flex items-start gap-3">
                      <Checkbox checked={checked} className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{r.label}</span>
                          <Badge variant="outline" className="text-[9px]">conf {Math.round(r.confidence * 100)}%</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{r.description}</div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <div className="space-y-1 mt-3">
              <Label>Justification note (audit log)</Label>
              <Textarea rows={3} value={reasonNote} onChange={(e) => setReasonNote(e.target.value)}
                placeholder="Explain why this finding is incorrect — facts verified, sources, what changed…" />
              <p className="text-[10px] text-muted-foreground">Min 12 characters · {reasonNote.length} typed</p>
            </div>
          </TabsContent>

          {/* EVIDENCE */}
          <TabsContent value="evidence" className="space-y-2 mt-3">
            <EvidenceForm
              reviewer={reviewer}
              onAdd={(e) => setEvidence((cur) => [e, ...cur])}
            />
            {evidence.length === 0 && (
              <Card><CardContent className="py-6 text-sm text-center text-muted-foreground">
                No evidence attached yet. Add at least one document, ticket, screenshot or external letter.
              </CardContent></Card>
            )}
            {evidence.map((e, i) => {
              const Icon = EVIDENCE_ICON[e.type];
              return (
                <Card key={i}>
                  <CardContent className="py-3 flex items-start gap-3">
                    <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{e.label}</div>
                      <div className="text-xs text-muted-foreground">{EVIDENCE_LABEL[e.type]} · {e.reference} · by {e.collectedBy}</div>
                      {e.note && <div className="text-xs italic mt-1">"{e.note}"</div>}
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7"
                      onClick={() => setEvidence((cur) => cur.filter((_, j) => j !== i))}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* HISTORY */}
          <TabsContent value="history" className="space-y-2 mt-3">
            {history.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-6">
                No prior false-positive overrides for this supplier.
              </div>
            )}
            {history.map((h) => (
              <Card key={h.id} className={h.status === "reverted" ? "opacity-60" : ""}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-success" />
                      Score {h.recalibration.scoreBefore} → {h.recalibration.scoreAfter}
                      <Badge variant="outline" className="text-[10px] capitalize">{h.recalibration.levelBefore} → {h.recalibration.levelAfter}</Badge>
                      {h.status === "reverted" && <Badge variant="destructive" className="text-[10px]">Reverted</Badge>}
                    </div>
                    {h.status === "active" && (
                      <Button size="sm" variant="outline" onClick={() => {
                        const r = window.prompt("Reason to revert this override?");
                        if (r && r.trim()) {
                          revertFalsePositive(h.id, r.trim());
                          toast.info("Override reverted — signals will reappear on next refresh");
                          onDone?.();
                        }
                      }}>
                        <History className="h-3 w-3 mr-1" /> Revert
                      </Button>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(h.createdAt).toLocaleString()} · {h.reviewer} ({h.reviewerRole})
                  </div>
                  <div className="text-xs mt-1">
                    Reasons: {h.reasons.map((r) => REASON_LABEL[r]).join(", ")}
                  </div>
                  <div className="text-xs italic mt-1">"{h.reasonNote}"</div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {h.evidence.length} evidence · {h.suppressedSignalIds.length || "all"} signal(s) suppressed
                    {h.caseId && ` · linked to case ${h.caseId}`}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Live recalibration preview */}
        <Card className="mt-3 border-primary/30">
          <CardContent className="py-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium flex items-center gap-2">
                <ArrowDown className="h-4 w-4 text-success" />
                Recalibration preview
              </div>
              <Badge variant="outline" className="text-[10px]">
                {recal.suppressedSignalIds.length} of {profile.signals.length} signals suppressed
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2 rounded border">
                <div className="text-[10px] text-muted-foreground">Before</div>
                <div className="text-2xl font-bold">{recal.scoreBefore}</div>
                <Badge variant="outline" className={`${RISK_COLOR[recal.levelBefore]} text-[9px] capitalize mt-1`}>{recal.levelBefore}</Badge>
              </div>
              <div className="p-2 rounded border bg-muted/30 flex flex-col items-center justify-center">
                <ArrowDown className="h-5 w-5 text-success" />
                <div className="text-xs font-medium">−{Math.abs(recal.delta)} pts</div>
                <div className="text-[10px] text-muted-foreground">conf-weighted</div>
              </div>
              <div className="p-2 rounded border">
                <div className="text-[10px] text-muted-foreground">After</div>
                <div className="text-2xl font-bold text-success">{recal.scoreAfter}</div>
                <Badge variant="outline" className={`${RISK_COLOR[recal.levelAfter]} text-[9px] capitalize mt-1`}>{recal.levelAfter}</Badge>
              </div>
            </div>
            <Progress value={recal.scoreAfter} className="h-2" />
            {recal.levelBefore !== recal.levelAfter && (
              <div className="text-xs text-success flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Risk tier downgraded — recommended action will be re-evaluated automatically.
              </div>
            )}
            {recal.delta === 0 && (
              <div className="text-xs text-yellow-700 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> No score change — suppressed signals carry zero weight or no signals selected.
              </div>
            )}
          </CardContent>
        </Card>

        <label className="flex items-start gap-2 text-xs mt-2">
          <Checkbox checked={confirmAck} onCheckedChange={(v) => setConfirmAck(!!v)} />
          <span className="text-muted-foreground">
            I confirm the evidence is genuine and accept that this override is logged under <b>{reviewer}</b> ({reviewerRole}).
            Reverting requires a separate justification.
          </span>
        </label>

        <DialogFooter className="mt-3">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} className="bg-success hover:bg-success/90 text-success-foreground">
            <ShieldCheck className="h-4 w-4 mr-1" /> Confirm false positive & recalibrate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EvidenceForm({ reviewer, onAdd }: { reviewer: string; onAdd: (e: Omit<Evidence, "id" | "collectedAt">) => void }) {
  const [type, setType] = useState<EvidenceType>("document");
  const [label, setLabel] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  const submit = () => {
    if (!label.trim() || !reference.trim()) { toast.error("Label and reference are required"); return; }
    onAdd({ type, label: label.trim(), reference: reference.trim(), collectedBy: reviewer, note: note.trim() || undefined });
    setLabel(""); setReference(""); setNote("");
  };

  return (
    <Card>
      <CardContent className="py-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Evidence type</Label>
            <Select value={type} onValueChange={(v) => setType(v as EvidenceType)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(EVIDENCE_LABEL) as EvidenceType[]).map((t) => (
                  <SelectItem key={t} value={t}>{EVIDENCE_LABEL[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Short label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Bank confirmation letter" />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Reference (file name, URL, ticket id)</Label>
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. gst_cert_signed.pdf or COMP-2417" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Note (optional)</Label>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Additional context for auditors…" />
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={submit}><Plus className="h-3 w-3 mr-1" /> Attach evidence</Button>
        </div>
      </CardContent>
    </Card>
  );
}
