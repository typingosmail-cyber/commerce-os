import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Search, UserCog, FileText, Plus, MessageSquare, AlertOctagon, CheckCircle2,
  Clock, Pin, RotateCcw, FileWarning, FileCheck2, XCircle, ArrowUpRight, ShieldAlert, Activity,
} from "lucide-react";
import { toast } from "sonner";
import {
  listCases, assignCase, addNote, deleteNote, requestDoc, setDocStatus,
  escalateCase, resolveCase, reopenCase, currentActor, setCurrentActor,
  REVIEWERS, ESCALATION_TARGETS, COMMON_DOCS, RESOLUTION_LABEL,
  STATUS_LABEL, STATUS_STYLE_V2, PRIORITY_STYLE,
  type CaseRecord, type CaseStatus, type Resolution, type DocStatus,
} from "@/lib/fraud-cases";
import FalsePositiveDialog from "./FalsePositiveDialog";
import { applyFalsePositiveOverlay } from "@/lib/false-positive";
import { getMockRiskProfiles } from "@/lib/fraud-detection";

export default function FraudCaseWorkflow() {
  const [, force] = useState(0);
  const refresh = () => force((n) => n + 1);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CaseStatus | "all">("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actor, setActorState] = useState(currentActor());

  const cases = listCases();
  const filtered = useMemo(() => cases.filter((c) => {
    const s = search.toLowerCase();
    const matchSearch = !s || c.id.toLowerCase().includes(s) || c.supplierName.toLowerCase().includes(s) || c.primarySignal.toLowerCase().includes(s);
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const matchAssignee = assigneeFilter === "all" || c.assignee === assigneeFilter;
    return matchSearch && matchStatus && matchAssignee;
  }), [cases, search, statusFilter, assigneeFilter]);

  const counts = useMemo(() => {
    const c = { open: 0, investigating: 0, awaiting_docs: 0, escalated: 0, resolved: 0 } as Record<CaseStatus, number>;
    cases.forEach((x) => { c[x.status]++; });
    return c;
  }, [cases]);

  const selected = selectedId ? cases.find((c) => c.id === selectedId) : null;

  return (
    <div className="space-y-4">
      {/* Status overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(Object.keys(STATUS_LABEL) as CaseStatus[]).map((s) => (
          <Card key={s} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setStatusFilter(s === statusFilter ? "all" : s)}>
            <CardContent className="py-4">
              <div className="text-xs text-muted-foreground">{STATUS_LABEL[s]}</div>
              <div className="text-2xl font-bold mt-1">{counts[s]}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search cases by ID, supplier or signal…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as CaseStatus | "all")}>
            <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {(Object.keys(STATUS_LABEL) as CaseStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger><SelectValue placeholder="All assignees" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assignees</SelectItem>
              {REVIEWERS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Reviewer identity */}
      <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
        <UserCog className="h-3.5 w-3.5" /> Acting as
        <Select value={actor} onValueChange={(v) => { setCurrentActor(v); setActorState(v); refresh(); }}>
          <SelectTrigger className="h-7 w-[220px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {REVIEWERS.filter(r => r !== "Unassigned").map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Cases table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-primary" /> Fraud Cases</CardTitle>
          <CardDescription>Click any row to open the investigation workspace</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Primary Signal</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => setSelectedId(c.id)}>
                  <TableCell className="font-mono text-xs">{c.id}</TableCell>
                  <TableCell className="text-sm font-medium">{c.supplierName}</TableCell>
                  <TableCell className="text-xs max-w-[220px] truncate">{c.primarySignal}</TableCell>
                  <TableCell><Badge variant="outline" className={`${PRIORITY_STYLE[c.priority]} text-[10px] capitalize`}>{c.priority}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={`${STATUS_STYLE_V2[c.status]} text-[10px]`}>{STATUS_LABEL[c.status]}</Badge></TableCell>
                  <TableCell className="text-xs">{c.assignee}</TableCell>
                  <TableCell className="text-xs text-muted-foreground"><Clock className="h-3 w-3 inline mr-1" />{new Date(c.updatedAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{c.notesList.length}</span>
                      <span className="flex items-center gap-0.5"><FileText className="h-3 w-3" />{c.docs.length}</span>
                      <span className="flex items-center gap-0.5"><Activity className="h-3 w-3" />{c.events.length}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-sm text-muted-foreground">No cases match your filters.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CaseDrawer caseId={selected?.id ?? null} onClose={() => setSelectedId(null)} onChanged={refresh} />
    </div>
  );
}

function CaseDrawer({ caseId, onClose, onChanged }: { caseId: string | null; onClose: () => void; onChanged: () => void }) {
  const c = caseId ? listCases().find((x) => x.id === caseId) : null;
  if (!c) return null;

  const after = (msg: string, label?: string) => { onChanged(); if (msg) toast.success(msg, label ? { description: label } : undefined); };

  return (
    <Sheet open={!!caseId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg flex items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">{c.id}</span>
              {c.supplierName}
            </SheetTitle>
            <Badge variant="outline" className={STATUS_STYLE_V2[c.status]}>{STATUS_LABEL[c.status]}</Badge>
          </div>
          <SheetDescription>
            {c.primarySignal} · opened {new Date(c.openedAt).toLocaleString()}
          </SheetDescription>
        </SheetHeader>

        {/* Header strip */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground mb-1">Assigned to</div>
            <Select value={c.assignee} onValueChange={(v) => { assignCase(c.id, v); after(`Reassigned to ${v}`); }}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REVIEWERS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground mb-1">Priority</div>
            <Badge variant="outline" className={`${PRIORITY_STYLE[c.priority]} capitalize`}>{c.priority}</Badge>
          </div>
        </div>

        {c.status === "resolved" && (
          <Card className="mt-4 border-success/30 bg-success/5">
            <CardContent className="py-3 text-sm">
              <div className="flex items-center gap-2 text-success font-medium"><CheckCircle2 className="h-4 w-4" /> Resolved — {c.resolution && RESOLUTION_LABEL[c.resolution]}</div>
              {c.resolutionNote && <div className="text-xs text-muted-foreground mt-1">{c.resolutionNote}</div>}
              <Button size="sm" variant="outline" className="mt-2" onClick={() => { reopenCase(c.id, "Reopened by reviewer"); after("Case reopened"); }}>
                <RotateCcw className="h-3 w-3 mr-1" /> Reopen case
              </Button>
            </CardContent>
          </Card>
        )}

        {c.status === "escalated" && (
          <Card className="mt-4 border-orange-500/30 bg-orange-500/5">
            <CardContent className="py-3 text-sm">
              <div className="flex items-center gap-2 text-orange-700 font-medium"><AlertOctagon className="h-4 w-4" /> Escalated to {c.escalatedTo}</div>
              {c.escalationReason && <div className="text-xs text-muted-foreground mt-1">{c.escalationReason}</div>}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="notes" className="mt-4">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="notes">Notes ({c.notesList.length})</TabsTrigger>
            <TabsTrigger value="docs">Documents ({c.docs.length})</TabsTrigger>
            <TabsTrigger value="timeline">Timeline ({c.events.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="space-y-3 mt-3">
            <NoteForm caseId={c.id} onAdded={() => after("Note added")} />
            <div className="space-y-2">
              {c.notesList.map((n) => (
                <Card key={n.id} className={n.pinned ? "border-primary/40" : ""}>
                  <CardContent className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          {n.pinned && <Pin className="h-3 w-3 text-primary" />}
                          <span className="font-medium text-foreground">{n.author}</span> · {new Date(n.createdAt).toLocaleString()}
                        </div>
                        <div className="text-sm mt-1 whitespace-pre-wrap">{n.text}</div>
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { deleteNote(c.id, n.id); after("Note removed"); }}>
                        <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {c.notesList.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">No notes yet.</div>}
            </div>
          </TabsContent>

          <TabsContent value="docs" className="space-y-3 mt-3">
            <DocRequestForm caseId={c.id} onAdded={() => after("Document requested", "Supplier notified by SMS + email")} />
            <div className="space-y-2">
              {c.docs.map((d) => (
                <Card key={d.id}>
                  <CardContent className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />{d.docType}
                          <DocBadge status={d.status} />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{d.reason}</div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          Requested by {d.requestedBy} · due {new Date(d.dueDate).toLocaleDateString()}
                          {d.receivedAt && ` · received ${new Date(d.receivedAt).toLocaleDateString()}`}
                        </div>
                        {d.reviewerNote && <div className="text-xs mt-1 italic">"{d.reviewerNote}"</div>}
                      </div>
                      <DocActions caseId={c.id} docId={d.id} status={d.status} onChange={() => after("Document updated")} />
                    </div>
                  </CardContent>
                </Card>
              ))}
              {c.docs.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">No documents requested.</div>}
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="mt-3">
            <div className="space-y-2">
              {c.events.map((e) => (
                <div key={e.id} className="flex gap-3 text-sm border-l-2 border-border pl-3 py-1">
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground">{new Date(e.at).toLocaleString()} · {e.actor}</div>
                    <div>{e.detail}</div>
                  </div>
                  <Badge variant="outline" className="text-[10px] h-5">{e.type.replace(/_/g, " ")}</Badge>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Action footer */}
        {c.status !== "resolved" && (
          <div className="flex flex-col sm:flex-row gap-2 mt-6 pt-4 border-t">
            <ResolveDialog caseId={c.id} onDone={() => after("Case resolved")} />
            <CaseFalsePositive caseRec={c} onDone={() => after("False positive recorded — risk recalibrated")} />
            <EscalateDialog caseId={c.id} onDone={() => after("Case escalated")} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function CaseFalsePositive({ caseRec, onDone }: { caseRec: CaseRecord; onDone: () => void }) {
  const profile = applyFalsePositiveOverlay(getMockRiskProfiles()).find((p) => p.supplierId === caseRec.supplierId)
    ?? getMockRiskProfiles().find((p) => p.supplierId === caseRec.supplierId);
  if (!profile) return null;
  return (
    <FalsePositiveDialog
      profile={profile}
      reviewer={currentActor()}
      reviewerRole="Case Reviewer"
      caseId={caseRec.id}
      onDone={() => {
        // Auto-resolve case as false_positive when override is recorded
        resolveCase(caseRec.id, "false_positive", "Marked false positive via recalibration workflow");
        onDone();
      }}
      trigger={
        <Button variant="outline" className="flex-1">
          <ShieldAlert className="h-4 w-4 mr-1" /> False Positive & Recalibrate
        </Button>
      }
    />
  );
}

function NoteForm({ caseId, onAdded }: { caseId: string; onAdded: () => void }) {
  const [text, setText] = useState("");
  const [pinned, setPinned] = useState(false);
  return (
    <Card>
      <CardContent className="py-3 space-y-2">
        <Textarea placeholder="Add an investigation note (visible only to compliance team)…" value={text} onChange={(e) => setText(e.target.value)} rows={3} />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Pin this note
          </label>
          <Button size="sm" disabled={!text.trim()} onClick={() => { addNote(caseId, text, { pinned }); setText(""); setPinned(false); onAdded(); }}>
            <Plus className="h-3 w-3 mr-1" /> Add note
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DocRequestForm({ caseId, onAdded }: { caseId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [docType, setDocType] = useState(COMMON_DOCS[0]);
  const [custom, setCustom] = useState("");
  const [reason, setReason] = useState("");
  const [days, setDays] = useState(5);

  const submit = () => {
    const finalType = docType === "__custom__" ? custom.trim() : docType;
    if (!finalType) { toast.error("Specify a document type"); return; }
    if (!reason.trim()) { toast.error("Add a reason for this request"); return; }
    requestDoc(caseId, { docType: finalType, reason: reason.trim(), dueInDays: days });
    setOpen(false); setReason(""); setCustom(""); setDocType(COMMON_DOCS[0]); setDays(5);
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus className="h-3 w-3 mr-1" /> Request document</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request document from supplier</DialogTitle>
          <DialogDescription>Supplier will be notified via email & SMS with the upload link.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Document type</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COMMON_DOCS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                <SelectItem value="__custom__">Other (custom)…</SelectItem>
              </SelectContent>
            </Select>
            {docType === "__custom__" && (
              <Input className="mt-2" placeholder="Custom document name" value={custom} onChange={(e) => setCustom(e.target.value)} />
            )}
          </div>
          <div className="space-y-1">
            <Label>Reason for request</Label>
            <Textarea placeholder="Explain why this document is needed…" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </div>
          <div className="space-y-1">
            <Label>Due in (days)</Label>
            <Input type="number" min={1} max={30} value={days} onChange={(e) => setDays(Math.max(1, Math.min(30, Number(e.target.value) || 5)))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>Send request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DocActions({ caseId, docId, status, onChange }: { caseId: string; docId: string; status: DocStatus; onChange: () => void }) {
  const next = (s: DocStatus, note?: string) => { setDocStatus(caseId, docId, s, note); onChange(); };
  return (
    <TooltipProvider>
      <div className="flex flex-col gap-1">
        {status === "pending" && (
          <Tooltip><TooltipTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => next("received")}>
              <FileCheck2 className="h-3 w-3 mr-1" /> Mark received
            </Button>
          </TooltipTrigger><TooltipContent>Supplier has uploaded the document</TooltipContent></Tooltip>
        )}
        {status === "received" && (
          <>
            <Button size="sm" variant="outline" className="h-7 text-xs text-success" onClick={() => next("approved", "Verified OK")}>
              <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => next("rejected", "Document insufficient")}>
              <XCircle className="h-3 w-3 mr-1" /> Reject
            </Button>
          </>
        )}
        {(status === "approved" || status === "rejected") && (
          <Badge variant="outline" className="text-[10px]">Closed</Badge>
        )}
      </div>
    </TooltipProvider>
  );
}

function DocBadge({ status }: { status: DocStatus }) {
  const map: Record<DocStatus, string> = {
    pending:  "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
    received: "bg-blue-500/15 text-blue-700 border-blue-500/30",
    approved: "bg-success/15 text-success border-success/30",
    rejected: "bg-destructive/15 text-destructive border-destructive/30",
  };
  return <Badge variant="outline" className={`${map[status]} text-[10px] capitalize`}>{status}</Badge>;
}

function ResolveDialog({ caseId, onDone }: { caseId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [resolution, setResolution] = useState<Resolution>("false_positive");
  const [note, setNote] = useState("");
  const submit = () => {
    if (!note.trim()) { toast.error("Add a resolution note for the audit log"); return; }
    resolveCase(caseId, resolution, note.trim());
    setOpen(false); setNote(""); onDone();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex-1"><CheckCircle2 className="h-4 w-4 mr-1" /> Resolve case</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve fraud case</DialogTitle>
          <DialogDescription>Choose the outcome — this is permanently recorded in the audit log.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Resolution</Label>
            <Select value={resolution} onValueChange={(v) => setResolution(v as Resolution)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(RESOLUTION_LABEL) as Resolution[]).map((r) => (
                  <SelectItem key={r} value={r}>{RESOLUTION_LABEL[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Reviewer note</Label>
            <Textarea rows={3} placeholder="Summarize findings & justification…" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>Confirm resolution</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EscalateDialog({ caseId, onDone }: { caseId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(ESCALATION_TARGETS[0]);
  const [reason, setReason] = useState("");
  const submit = () => {
    if (!reason.trim()) { toast.error("Add an escalation reason"); return; }
    escalateCase(caseId, target, reason.trim());
    setOpen(false); setReason(""); onDone();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex-1"><ArrowUpRight className="h-4 w-4 mr-1" /> Escalate</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Escalate case</DialogTitle>
          <DialogDescription>Hand off the investigation to a specialized team.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Escalate to</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ESCALATION_TARGETS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Reason</Label>
            <Textarea rows={3} placeholder="Why are you escalating?" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}><AlertOctagon className="h-4 w-4 mr-1" /> Escalate</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
