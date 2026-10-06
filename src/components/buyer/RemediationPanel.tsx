import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle, ArrowRight, CheckCircle2, Clock3, FileText, RotateCcw,
  Scale, ShieldCheck, Upload, XCircle,
} from "lucide-react";
import {
  DRAWDOWN_STATUS_META, KIND_META, STATUS_META,
  type DrawdownAttempt, type RemediationEvidence, type RemediationTask,
} from "@/lib/remediation";
import type { BuyerRiskAssessment } from "@/lib/bnpl";

const money = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

interface Props {
  tasks: RemediationTask[];
  attempts: DrawdownAttempt[];
  risk: BuyerRiskAssessment;
  availableCredit: number;
  onSubmit: (taskId: string, evidence: RemediationEvidence[], note?: string) => void;
  onReview: (taskId: string) => void;
  onRetry: (attemptId: string) => void;
  onReopen: (taskId: string) => void;
}

export function RemediationPanel({ tasks, attempts, risk, availableCredit, onSubmit, onReview, onRetry, onReopen }: Props) {
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [references, setReferences] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, RemediationEvidence[]>>({});

  const addFiles = (taskId: string, fileList: FileList | null) => {
    if (!fileList) return;
    const picked = Array.from(fileList).map((file) => ({
      name: file.name,
      kind: "file" as const,
      detail: `${(file.size / 1024).toFixed(0)} KB · ${file.type || "document"}`,
    }));
    setFiles((current) => ({ ...current, [taskId]: [...(current[taskId] ?? []), ...picked] }));
  };

  const submit = (task: RemediationTask) => {
    const ref = references[task.id]?.trim();
    const evidence = [
      ...(files[task.id] ?? []),
      ...(ref ? [{ name: ref, kind: "reference" as const, detail: "Buyer-provided reference" }] : []),
    ];
    if (!evidence.length) return;
    onSubmit(task.id, evidence, notes[task.id]?.trim() || undefined);
    setActiveTask(null);
  };

  const pending = tasks.filter((task) => task.status === "open" || task.status === "rejected").length;
  const underReview = tasks.filter((task) => task.status === "in_review").length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg"><ShieldCheck className="h-5 w-5 text-primary" />Resolve credit holds</CardTitle>
              <CardDescription className="mt-1">Send verification records or dispute incorrect charges. Accepted evidence recalculates your risk and limit.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{pending} action needed</Badge>
              <Badge variant="outline">{underReview} in review</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {tasks.length === 0 ? (
            <div className="rounded-md border border-success/30 bg-success/5 p-6 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-7 w-7 text-success" />
              <p className="font-semibold text-foreground">No open remediation requests</p>
              <p className="mt-1 text-sm text-muted-foreground">There are no current risk signals that need documents or a charge dispute.</p>
            </div>
          ) : tasks.slice().reverse().map((task) => {
            const isEditing = activeTask === task.id;
            const meta = STATUS_META[task.status];
            return (
              <div key={task.id} className="rounded-md border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 rounded-md bg-muted p-2 text-muted-foreground">
                      {task.kind === "dispute" ? <Scale className="h-4 w-4" /> : task.kind === "document" ? <FileText className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{task.title}</p>
                        <Badge variant="outline" className={`text-[10px] ${meta.tone}`}>{meta.label}</Badge>
                        <Badge variant="secondary" className="font-mono text-[10px]">{task.ruleId}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{task.requirement}</p>
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />Risk desk target: {task.slaHours}h after submission</p>
                    </div>
                  </div>
                  {(task.status === "open" || task.status === "rejected") && (
                    <Button size="sm" variant={isEditing ? "outline" : "default"} onClick={() => setActiveTask(isEditing ? null : task.id)}>
                      {isEditing ? "Close" : task.status === "rejected" ? "Resubmit" : "Submit evidence"}
                    </Button>
                  )}
                  {task.status === "in_review" && (
                    <Button size="sm" variant="outline" onClick={() => onReview(task.id)} title="Prototype review decision">
                      <ShieldCheck className="mr-1.5 h-4 w-4" />Simulate desk review
                    </Button>
                  )}
                  {task.status === "approved" && <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />}
                </div>

                {task.status === "rejected" && task.deskNote && (
                  <div className="mt-3 flex items-start gap-2 rounded-md bg-destructive/5 p-3 text-sm text-destructive"><XCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{task.deskNote}</span></div>
                )}
                {task.status === "approved" && task.deskNote && (
                  <div className="mt-3 flex items-start gap-2 rounded-md bg-success/5 p-3 text-sm text-success"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><span>{task.deskNote}</span></div>
                )}
                {task.evidence.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {task.evidence.map((item, index) => <Badge key={`${item.name}-${index}`} variant="outline" className="gap-1"><FileText className="h-3 w-3" />{item.name}</Badge>)}
                  </div>
                )}
                {task.buyerNote && <p className="mt-2 text-xs text-muted-foreground">Your note: {task.buyerNote}</p>}

                {isEditing && (
                  <div className="mt-4 space-y-4 border-t pt-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`evidence-${task.id}`}>Attach verification document</Label>
                        <Input id={`evidence-${task.id}`} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.xlsx" onChange={(event) => addFiles(task.id, event.target.files)} />
                        <p className="text-xs text-muted-foreground">PDF, image or spreadsheet. Multiple files allowed.</p>
                        {(files[task.id] ?? []).map((file) => <p key={`${file.name}-${file.detail}`} className="text-xs text-muted-foreground">{file.name} · {file.detail}</p>)}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`reference-${task.id}`}>Payment, case or verification reference</Label>
                        <Input id={`reference-${task.id}`} value={references[task.id] ?? ""} onChange={(event) => setReferences((current) => ({ ...current, [task.id]: event.target.value }))} placeholder="UTR, dispute ID, ARN…" />
                        <Label htmlFor={`note-${task.id}`}>Note for the risk desk</Label>
                        <Textarea id={`note-${task.id}`} value={notes[task.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [task.id]: event.target.value }))} placeholder="Explain why the record should be updated" className="min-h-20" />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">A document or reference is required to submit this request.</p>
                      <Button size="sm" onClick={() => submit(task)} disabled={!(files[task.id]?.length || references[task.id]?.trim())}>
                        <Upload className="mr-1.5 h-4 w-4" />Submit for review
                      </Button>
                    </div>
                  </div>
                )}

                {task.status === "in_review" && task.submittedAt && (
                  <p className="mt-3 text-xs text-muted-foreground">Submitted {new Date(task.submittedAt).toLocaleString("en-IN")}. Your risk holds remain until evidence is accepted.</p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><RotateCcw className="h-5 w-5" />Blocked drawdown requests</CardTitle>
          <CardDescription>Previously stopped requests stay here. After evidence is accepted, retry the same order against the updated limit.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {attempts.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No blocked drawdowns to retry.</p>
          ) : attempts.map((attempt) => {
            const meta = DRAWDOWN_STATUS_META[attempt.status];
            return (
              <div key={attempt.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground">{money(attempt.amount)}</span>
                    <Badge variant="outline" className={`text-[10px] ${meta.tone}`}>{meta.label}</Badge>
                    <Badge variant="secondary" className="font-mono text-[10px]">{attempt.orderRef}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{attempt.supplierName} · {attempt.tenureDays} days · {new Date(attempt.requestedAt).toLocaleDateString("en-IN")}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5" />{attempt.decisionNote ?? attempt.reason}</p>
                  {attempt.status === "blocked" && <p className="mt-1 text-xs text-muted-foreground">Blocked by {attempt.blockingSignalIds.length} active risk signal(s).</p>}
                </div>
                {(attempt.status === "blocked" || attempt.status === "awaiting_remediation") && (
                  <Button size="sm" variant="outline" onClick={() => onRetry(attempt.id)}>
                    Retry drawdown <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                )}
                {attempt.status === "approved" && <Badge variant="outline" className="border-success/30 text-success"><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Ready for execution</Badge>}
              </div>
            );
          })}
          {attempts.some((attempt) => attempt.status === "blocked" || attempt.status === "awaiting_remediation") && (
            <p className="flex items-start gap-2 rounded-md bg-muted p-3 text-xs text-muted-foreground"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />A retry is re-evaluated against current risk holds and remaining available credit. Approval here is a prototype decision, not a funds transfer.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="text-sm font-semibold text-foreground">After remediation</p>
            <p className="text-sm text-muted-foreground">{risk.signals.length} active signal(s) · {money(availableCredit)} available after holds</p>
          </div>
          <Badge variant="outline">Risk status: {risk.action.replace("_", " ")}</Badge>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">Prototype: this preview keeps document names and review decisions in this browser only; it does not upload or transmit files.</p>
    </div>
  );
}