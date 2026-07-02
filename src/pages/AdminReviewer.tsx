import { useMemo, useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  ShieldCheck, FileText, CheckCircle2, XCircle, AlertCircle, Clock, Search,
  History, Filter, Send, ArrowUpRight, FileWarning, Inbox, RotateCcw, Eye,
  ChevronRight, User, Building2, Download, Lock as LockIcon, LogOut,
} from "lucide-react";
import {
  loadQueue, saveQueue, loadAudit, appendAudit, computeStats, resetQueue,
  REASON_CODES, DECISION_STYLE, PRIORITY_STYLE, decisionToStatus,
  timeAgo, timeUntil, auditForSupplier,
  type QueueDoc, type AuditEntry, type ReviewDecision,
} from "@/lib/reviewer";
import { ReviewerLoginGate } from "@/components/admin/ReviewerLoginGate";
import { useReviewerAuth, ROLE_LABELS, type ReviewerPermission } from "@/lib/reviewer-auth";
import { sendMockEmail, loadOutbox, onOutboxChange, supplierContactFor, type MockEmail } from "@/lib/email-outbox";
import { useNotifications } from "@/lib/notifications";
import { loadPrefs, decideDispatch, enqueueDigest, getPrefForDoc } from "@/lib/notification-preferences";
import { Mail, MailCheck, MailX, AlarmClock } from "lucide-react";
import { SlaRemindersPanel } from "@/components/admin/SlaRemindersPanel";
import { slaSummary, loadSlaConfig } from "@/lib/sla-reminders";

const DECISION_LABEL: Record<ReviewDecision, string> = {
  approved: "Approve",
  rejected: "Reject",
  needs_info: "Request Info",
  escalated: "Escalate",
};

const DECISION_ICON: Record<ReviewDecision, typeof CheckCircle2> = {
  approved: CheckCircle2,
  rejected: XCircle,
  needs_info: AlertCircle,
  escalated: ArrowUpRight,
};

export default function AdminReviewer() {
  return (
    <ReviewerLoginGate>
      <AdminReviewerInner />
    </ReviewerLoginGate>
  );
}

function AdminReviewerInner() {
  const { user: reviewer, logout, can } = useReviewerAuth();
  const REVIEWER = { id: reviewer!.id, name: reviewer!.name };
  const [queue, setQueue] = useState<QueueDoc[]>(() => loadQueue());
  const [audit, setAudit] = useState<AuditEntry[]>(() => loadAudit());
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"all" | QueueDoc["priority"]>("all");
  const [statusFilter, setStatusFilter] = useState<"pending" | "all">("pending");
  const [activeDoc, setActiveDoc] = useState<QueueDoc | null>(null);
  const [decision, setDecision] = useState<ReviewDecision>("approved");
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [supplierDrillDown, setSupplierDrillDown] = useState<string | null>(null);
  const [outbox, setOutbox] = useState<MockEmail[]>(() => loadOutbox());
  const { addNotification } = useNotifications();

  // ---- Bulk selection state ----
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDecision, setBulkDecision] = useState<ReviewDecision>("approved");
  const [bulkReasons, setBulkReasons] = useState<string[]>([]);
  const [bulkNote, setBulkNote] = useState("");
  const [bulkRunning, setBulkRunning] = useState(false);

  useEffect(() => onOutboxChange(() => setOutbox(loadOutbox())), []);

  const stats = useMemo(() => computeStats(queue, audit), [queue, audit]);

  const filteredQueue = useMemo(() => queue.filter(d => {
    const matchSearch = !search ||
      d.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      d.supplierId.toLowerCase().includes(search.toLowerCase()) ||
      d.name.toLowerCase().includes(search.toLowerCase());
    const matchPriority = priorityFilter === "all" || d.priority === priorityFilter;
    const matchStatus = statusFilter === "all" || d.status === "uploaded";
    return matchSearch && matchPriority && matchStatus;
  }).sort((a, b) => {
    // overdue/high first, then submission time
    const aOverdue = new Date(a.slaDueAt).getTime() < Date.now() ? 0 : 1;
    const bOverdue = new Date(b.slaDueAt).getTime() < Date.now() ? 0 : 1;
    if (aOverdue !== bOverdue) return aOverdue - bOverdue;
    const order = { high: 0, normal: 1, low: 2 };
    if (order[a.priority] !== order[b.priority]) return order[a.priority] - order[b.priority];
    return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
  }), [queue, search, priorityFilter, statusFilter]);

  // Close dialog if doc no longer exists in queue
  useEffect(() => {
    if (activeDoc && !queue.find(q => q.id === activeDoc.id)) setActiveDoc(null);
  }, [queue, activeDoc]);

  const openReview = (doc: QueueDoc) => {
    if (!can("review.approve") && !can("review.reject")) {
      toast.error("Read-only access", { description: "Your role cannot take review actions." });
      return;
    }
    setActiveDoc(doc);
    setDecision("approved");
    setSelectedReasons([]);
    setNote("");
  };

  const DECISION_PERMS: Record<ReviewDecision, ReviewerPermission> = {
    approved: "review.approve",
    rejected: "review.reject",
    needs_info: "review.needs_info",
    escalated: "review.escalate",
  };

  const availableReasons = REASON_CODES.filter(r => r.appliesTo.includes(decision));

  /**
   * Process a decision for a single document. Mutates the given queue array,
   * appends to audit, dispatches notifications (respecting prefs) and returns
   * a compact per-document result the caller can summarise.
   */
  const processDocDecision = (
    doc: QueueDoc,
    dec: ReviewDecision,
    reasons: string[],
    noteText: string,
    workingQueue: QueueDoc[],
    workingAudit: AuditEntry[],
  ): { ok: boolean; parts: string[]; reason?: string } => {
    const newStatus = decisionToStatus(dec, doc.status);
    const entry = appendAudit({
      reviewerId: REVIEWER.id,
      reviewerName: REVIEWER.name,
      supplierId: doc.supplierId,
      documentId: doc.id,
      documentName: doc.name,
      decision: dec,
      reasonCodes: reasons,
      note: noteText.trim(),
      previousStatus: doc.status,
      newStatus,
    });
    const idx = workingQueue.findIndex(q => q.id === doc.id);
    if (idx >= 0) workingQueue[idx] = { ...workingQueue[idx], status: newStatus, reviewerNote: noteText.trim() };
    workingAudit.unshift(entry);

    const notifyKinds: ReviewDecision[] = ["approved", "rejected", "needs_info"];
    if (!notifyKinds.includes(dec)) {
      return { ok: true, parts: ["escalated — submitter not notified"] };
    }

    const contact = supplierContactFor(doc.supplierId, doc.supplierName);
    const reasonLabels = reasons.map(c => REASON_CODES.find(r => r.code === c)?.label || c);
    const kind = dec as "approved" | "rejected" | "needs_info";
    const docTypeId = doc.id.split("-")[0];
    const prefs = loadPrefs();
    const dispatch = decideDispatch(prefs, docTypeId, kind);
    const docTypePref = getPrefForDoc(prefs, docTypeId);

    const titleMap = {
      approved: "Document Approved",
      rejected: "Document Rejected",
      needs_info: "More Information Requested",
    } as const;

    let email: MockEmail | null = null;
    let emailQueued = false;
    let inAppSent = false;
    let inAppQueued = false;

    if (dispatch.email === "send") {
      email = sendMockEmail({
        kind, to: contact.email, toName: contact.name,
        supplierId: doc.supplierId, documentName: doc.name,
        reasonCodes: reasons, reasonLabels, note: noteText.trim(),
        reviewerName: REVIEWER.name,
      });
    } else if (dispatch.email === "digest") {
      enqueueDigest({
        channel: "email", supplierId: doc.supplierId, supplierName: doc.supplierName,
        submitterEmail: contact.email, documentTypeId: docTypeId, documentName: doc.name,
        decision: kind, reasonLabels, note: noteText.trim(), reviewerName: REVIEWER.name,
        frequency: docTypePref.email.frequency,
      });
      emailQueued = true;
    }

    if (dispatch.inApp === "send") {
      addNotification({
        type: dec === "approved" ? "trust" : "system",
        title: titleMap[kind],
        message: `${doc.name} for ${doc.supplierName} — ${reasonLabels[0] || dec}.`,
        actionUrl: "/supplier/verification",
        metadata: { supplierId: doc.supplierId, documentId: doc.id, emailId: email?.id },
      });
      inAppSent = true;
    } else if (dispatch.inApp === "digest") {
      enqueueDigest({
        channel: "inApp", supplierId: doc.supplierId, supplierName: doc.supplierName,
        submitterEmail: contact.email, documentTypeId: docTypeId, documentName: doc.name,
        decision: kind, reasonLabels, note: noteText.trim(), reviewerName: REVIEWER.name,
        frequency: docTypePref.inApp.frequency,
      });
      inAppQueued = true;
    }

    const parts: string[] = [];
    if (email) parts.push(email.status === "sent" ? `email → ${contact.email}` : `email failed → ${contact.email}`);
    if (emailQueued) parts.push(`email queued (${docTypePref.email.frequency})`);
    if (inAppSent) parts.push("in-app delivered");
    if (inAppQueued) parts.push(`in-app queued (${docTypePref.inApp.frequency})`);
    if (dispatch.email === "off" && dispatch.inApp === "off") parts.push("submitter opted out for this doc type");

    return { ok: true, parts, reason: dispatch.reason };
  };

  const submitDecision = () => {
    if (!activeDoc) return;
    if (!can(DECISION_PERMS[decision])) {
      toast.error("Permission denied", { description: `Your role (${ROLE_LABELS[reviewer!.role]}) cannot ${decision.replace("_", " ")} documents.` });
      return;
    }
    if (selectedReasons.length === 0) { toast.error("Select at least one reason code"); return; }
    if ((decision === "rejected" || decision === "escalated") && note.trim().length < 10) {
      toast.error("Reviewer note required (≥ 10 chars) for rejections / escalations"); return;
    }

    const workingQueue = [...queue];
    const workingAudit = [...audit];
    const res = processDocDecision(activeDoc, decision, selectedReasons, note, workingQueue, workingAudit);
    setQueue(workingQueue); saveQueue(workingQueue);
    setAudit(workingAudit);

    toast.success(`Document ${decision.replace("_", " ")}`, {
      description: res.parts.join(" · ") || res.reason || "Done",
    });
    setActiveDoc(null);
  };

  // ============ BULK ACTIONS ============
  const availableBulkReasons = REASON_CODES.filter(r => r.appliesTo.includes(bulkDecision));

  const selectedDocs = queue.filter(q => selectedIds.includes(q.id));
  const bulkTargetDocs = selectedDocs.filter(d => d.status === "pending" || d.status === "in_review");

  const openBulkDialog = () => {
    if (bulkTargetDocs.length === 0) { toast.error("No pending / in-review docs selected"); return; }
    setBulkDecision("approved"); setBulkReasons([]); setBulkNote("");
    setBulkOpen(true);
  };

  const submitBulk = async () => {
    if (!can(DECISION_PERMS[bulkDecision])) {
      toast.error("Permission denied", { description: `Your role (${ROLE_LABELS[reviewer!.role]}) cannot ${bulkDecision.replace("_", " ")} documents.` });
      return;
    }
    if (bulkReasons.length === 0) { toast.error("Select at least one reason code"); return; }
    if ((bulkDecision === "rejected" || bulkDecision === "escalated") && bulkNote.trim().length < 10) {
      toast.error("Reviewer note required (≥ 10 chars) for rejections / escalations"); return;
    }

    setBulkRunning(true);
    const workingQueue = [...queue];
    const workingAudit = [...audit];
    let success = 0;
    for (const doc of bulkTargetDocs) {
      processDocDecision(doc, bulkDecision, bulkReasons, bulkNote, workingQueue, workingAudit);
      success++;
    }
    setQueue(workingQueue); saveQueue(workingQueue);
    setAudit(workingAudit);
    setBulkRunning(false);
    setBulkOpen(false);
    setSelectedIds([]);

    toast.success(`Bulk ${bulkDecision.replace("_", " ")} · ${success} document${success === 1 ? "" : "s"}`, {
      description: `Reasons: ${bulkReasons.map(c => REASON_CODES.find(r => r.code === c)?.label || c).join(", ")}`,
    });
  };


  const handleResetQueue = () => {
    setQueue(resetQueue());
    toast.info("Queue reset to fresh submissions");
  };

  const exportAudit = () => {
    const headers = ["Timestamp", "Reviewer", "Supplier ID", "Document", "Decision", "Reasons", "Note"];
    const rows = audit.map(a => [
      new Date(a.timestamp).toISOString(),
      a.reviewerName,
      a.supplierId,
      a.documentName,
      a.decision,
      a.reasonCodes.join("|"),
      `"${a.note.replace(/"/g, '""')}"`,
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `audit-trail-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Audit trail exported");
  };

  const supplierAudit = supplierDrillDown ? auditForSupplier(supplierDrillDown) : [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <h1 className="text-2xl md:text-3xl font-bold">Reviewer Console</h1>
              <Badge variant="outline" className="text-[10px]">
                <User className="h-3 w-3 mr-1" /> {REVIEWER.name} · {REVIEWER.id}
              </Badge>
              <Badge className="text-[10px]">{ROLE_LABELS[reviewer!.role]}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Approve, reject, or escalate supplier KYC documents. All decisions are audit-logged.
            </p>
          </div>
          <div className="flex gap-2">
            {can("audit.export") && (
              <Button variant="outline" size="sm" onClick={exportAudit}><Download className="h-4 w-4 mr-1" /> Export Audit</Button>
            )}
            {can("queue.reset") && (
              <Button variant="outline" size="sm" onClick={handleResetQueue}><RotateCcw className="h-4 w-4 mr-1" /> Reset Queue</Button>
            )}
            <Button variant="ghost" size="sm" onClick={logout}><LogOut className="h-4 w-4 mr-1" /> Sign out</Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Pending Review" value={stats.pending} icon={Inbox} tone="primary" />
          <StatCard label="Reviewed Today" value={stats.reviewedToday} icon={History} tone="muted" />
          <StatCard label="Approved Today" value={stats.approvedToday} icon={CheckCircle2} tone="success" />
          <StatCard label="Rejected Today" value={stats.rejectedToday} icon={XCircle} tone="destructive" />
          <StatCard label="SLA Breaches" value={stats.slaBreaches} icon={AlertCircle} tone={stats.slaBreaches > 0 ? "destructive" : "muted"} />
        </div>

        <Tabs defaultValue="queue" className="space-y-4">
          <TabsList>
            <TabsTrigger value="queue">Review Queue</TabsTrigger>
            <TabsTrigger value="audit">Audit Trail</TabsTrigger>
            <TabsTrigger value="codes">Reason Codes</TabsTrigger>
            <TabsTrigger value="sla" className="gap-1">
              <AlarmClock className="h-3 w-3" /> SLA Reminders
              {(() => { const s = slaSummary(queue, loadSlaConfig().warnHours); const n = s.overdue + s.unacked; return n > 0 ? <Badge variant="destructive" className="ml-1 h-4 text-[10px] px-1">{n}</Badge> : null; })()}
            </TabsTrigger>
            <TabsTrigger value="outbox" className="gap-1">
              <Mail className="h-3 w-3" /> Email Outbox
              {outbox.length > 0 && <Badge variant="secondary" className="ml-1 h-4 text-[10px] px-1">{outbox.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* QUEUE */}
          <TabsContent value="queue" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Document Queue</CardTitle>
                    <CardDescription>Sorted by SLA breach, then priority</CardDescription>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Supplier or document..." className="pl-8 h-9 w-56" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <Select value={priorityFilter} onValueChange={v => setPriorityFilter(v as typeof priorityFilter)}>
                      <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All priority</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={v => setStatusFilter(v as typeof statusFilter)}>
                      <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending only</SelectItem>
                        <SelectItem value="all">Show reviewed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Priority</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Document</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>SLA</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQueue.map(d => {
                      const overdue = new Date(d.slaDueAt).getTime() < Date.now();
                      return (
                        <TableRow key={d.id} className={overdue && d.status === "uploaded" ? "bg-destructive/5" : ""}>
                          <TableCell>
                            <Badge variant="outline" className={`${PRIORITY_STYLE[d.priority]} text-[10px] capitalize`}>{d.priority}</Badge>
                          </TableCell>
                          <TableCell>
                            <button onClick={() => setSupplierDrillDown(d.supplierId)} className="text-sm font-medium hover:underline text-left">
                              {d.supplierName}
                            </button>
                            <div className="text-[11px] text-muted-foreground">{d.supplierId} · {d.supplierCity}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="text-sm">{d.name}</div>
                                <div className="text-[11px] text-muted-foreground font-mono">{d.fileName}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{timeAgo(d.submittedAt)}</TableCell>
                          <TableCell>
                            <span className={`text-xs font-medium ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
                              <Clock className="h-3 w-3 inline mr-1" />
                              {timeUntil(d.slaDueAt)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] capitalize ${
                              d.status === "verified" ? "bg-success/15 text-success border-success/30" :
                              d.status === "rejected" ? "bg-destructive/15 text-destructive border-destructive/30" :
                              "bg-muted text-muted-foreground"
                            }`}>{d.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {d.status === "uploaded" ? (
                              can("review.approve") || can("review.reject") ? (
                                <Button size="sm" className="h-7 text-xs" onClick={() => openReview(d)}>
                                  <Eye className="h-3 w-3 mr-1" /> Review
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" disabled className="h-7 text-xs">
                                  <LockIcon className="h-3 w-3 mr-1" /> Read-only
                                </Button>
                              )
                            ) : (
                              <span className="text-[11px] text-muted-foreground">Done</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredQueue.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Queue is clear 🎉</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AUDIT TRAIL */}
          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" /> Audit Trail</CardTitle>
                <CardDescription>Immutable log of every reviewer decision ({audit.length} entries)</CardDescription>
              </CardHeader>
              <CardContent>
                {audit.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No decisions logged yet — review documents from the queue tab.</p>
                ) : (
                  <ScrollArea className="h-[500px] pr-3">
                    <div className="space-y-2">
                      {audit.map(a => {
                        const Icon = DECISION_ICON[a.decision];
                        return (
                          <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg border">
                            <div className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${DECISION_STYLE[a.decision]}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium">{a.documentName}</span>
                                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                <button onClick={() => setSupplierDrillDown(a.supplierId)} className="text-sm hover:underline">
                                  {a.supplierId}
                                </button>
                                <Badge variant="outline" className={`${DECISION_STYLE[a.decision]} text-[10px] capitalize`}>{a.decision.replace("_", " ")}</Badge>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {a.reasonCodes.map(c => (
                                  <Badge key={c} variant="secondary" className="text-[10px] font-mono">{c}</Badge>
                                ))}
                              </div>
                              {a.note && <p className="text-xs text-muted-foreground mt-1.5 italic">"{a.note}"</p>}
                              <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1.5">
                                <span><User className="h-3 w-3 inline mr-1" />{a.reviewerName}</span>
                                <span>·</span>
                                <span>{new Date(a.timestamp).toLocaleString()}</span>
                                <span>·</span>
                                <span className="font-mono">{a.id}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* REASON CODES REFERENCE */}
          <TabsContent value="codes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reason Code Reference</CardTitle>
                <CardDescription>Standardized codes ensure consistent reviews & appeal handling</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Applies To</TableHead>
                      <TableHead>Severity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {REASON_CODES.map(r => (
                      <TableRow key={r.code}>
                        <TableCell className="font-mono text-xs">{r.code}</TableCell>
                        <TableCell className="text-sm">{r.label}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {r.appliesTo.map(d => (
                              <Badge key={d} variant="outline" className={`${DECISION_STYLE[d]} text-[10px] capitalize`}>{d.replace("_", " ")}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] capitalize ${
                            r.severity === "critical" ? "bg-destructive/15 text-destructive border-destructive/30" :
                            r.severity === "warning" ? "bg-yellow-500/15 text-yellow-700 border-yellow-500/30" :
                            "bg-muted text-muted-foreground"
                          }`}>{r.severity}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* EMAIL OUTBOX */}
          <TabsContent value="outbox" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Email Outbox
                </CardTitle>
                <CardDescription>
                  Notifications sent to submitters when decisions are made ({outbox.length} sent).
                  <span className="block text-[11px] mt-1">Prototype: emails are simulated and stored locally.</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {outbox.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No emails sent yet. Approve, reject, or request info on a document to notify the supplier.</p>
                ) : (
                  <ScrollArea className="h-[500px] pr-3">
                    <div className="space-y-2">
                      {outbox.map(e => (
                        <div key={e.id} className="rounded-lg border p-3">
                          <div className="flex items-start justify-between gap-3 mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${
                                e.status === "sent" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                              }`}>
                                {e.status === "sent" ? <MailCheck className="h-4 w-4" /> : <MailX className="h-4 w-4" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{e.subject}</p>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  To: {e.toName} &lt;{e.to}&gt; · {e.supplierId}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <Badge variant="outline" className={`text-[10px] capitalize ${
                                e.kind === "approved" ? "bg-success/15 text-success border-success/30" :
                                e.kind === "rejected" ? "bg-destructive/15 text-destructive border-destructive/30" :
                                "bg-yellow-500/15 text-yellow-700 border-yellow-500/30"
                              }`}>{e.kind.replace("_", " ")}</Badge>
                              <span className="text-[10px] text-muted-foreground">{timeAgo(e.sentAt)}</span>
                            </div>
                          </div>
                          <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap font-sans bg-muted/30 rounded p-2 border max-h-32 overflow-y-auto">{e.body}</pre>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          {/* SLA REMINDERS */}
          <TabsContent value="sla" className="space-y-4">
            <SlaRemindersPanel queue={queue} reviewerName={REVIEWER.name} onReviewDoc={openReview} />
          </TabsContent>
        </Tabs>
      </div>




      {/* Review Dialog */}
      <Dialog open={!!activeDoc} onOpenChange={o => !o && setActiveDoc(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {activeDoc && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" /> {activeDoc.name}
                </DialogTitle>
                <DialogDescription>
                  {activeDoc.supplierName} · {activeDoc.supplierId} · Submitted {timeAgo(activeDoc.submittedAt)}
                </DialogDescription>
              </DialogHeader>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Document preview placeholder */}
                <div className="border rounded-lg bg-muted/30 aspect-[3/4] flex flex-col items-center justify-center p-4 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-sm font-mono">{activeDoc.fileName}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Document preview</p>
                  <Badge variant="outline" className="mt-3 text-[10px]">Mock viewer</Badge>
                </div>

                {/* Metadata + reviewer note */}
                <div className="space-y-3">
                  <div className="rounded-lg border p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Doc Type</span><span className="font-medium">{activeDoc.name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Required</span><span>{activeDoc.required ? "Yes" : "Optional"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Score Weight</span><span>+{activeDoc.weight}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Priority</span><Badge variant="outline" className={`${PRIORITY_STYLE[activeDoc.priority]} text-[10px] capitalize`}>{activeDoc.priority}</Badge></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">SLA</span><span className={new Date(activeDoc.slaDueAt) < new Date() ? "text-destructive font-medium" : ""}>{timeUntil(activeDoc.slaDueAt)}</span></div>
                  </div>

                  <div>
                    <Label className="text-xs">Decision</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1.5">
                      {(["approved", "rejected", "needs_info", "escalated"] as ReviewDecision[]).map(d => {
                        const Icon = DECISION_ICON[d];
                        const allowed = can(DECISION_PERMS[d]);
                        return (
                          <Button
                            key={d}
                            type="button"
                            variant={decision === d ? "default" : "outline"}
                            size="sm"
                            className="text-xs justify-start h-8"
                            disabled={!allowed}
                            title={allowed ? undefined : `Requires higher role`}
                            onClick={() => { setDecision(d); setSelectedReasons([]); }}
                          >
                            {allowed ? <Icon className="h-3 w-3 mr-1.5" /> : <LockIcon className="h-3 w-3 mr-1.5" />}
                            {DECISION_LABEL[d]}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Reason codes */}
              <div>
                <Label className="text-xs flex items-center gap-1">
                  <FileWarning className="h-3 w-3" /> Reason codes (select 1+)
                </Label>
                <div className="mt-2 grid sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto border rounded-lg p-3">
                  {availableReasons.map(r => (
                    <label key={r.code} className="flex items-start gap-2 text-xs cursor-pointer hover:bg-muted/50 rounded p-1.5">
                      <Checkbox
                        checked={selectedReasons.includes(r.code)}
                        onCheckedChange={(checked) => {
                          setSelectedReasons(prev => checked ? [...prev, r.code] : prev.filter(c => c !== r.code));
                        }}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-muted-foreground">{r.code}</span>
                          {r.severity === "critical" && <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30 text-[9px] h-4">critical</Badge>}
                        </div>
                        <span>{r.label}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <Label className="text-xs">
                  Reviewer note {(decision === "rejected" || decision === "escalated") && <span className="text-destructive">*</span>}
                </Label>
                <Textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder={decision === "approved" ? "Optional note for audit trail..." : "Required: explain decision for the supplier and audit trail..."}
                  className="mt-1.5 text-sm h-20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="ghost" size="sm" onClick={() => setActiveDoc(null)}>Cancel</Button>
                <Button size="sm" onClick={submitDecision} disabled={!can(DECISION_PERMS[decision])} className="gap-1">
                  <Send className="h-4 w-4" /> Submit Decision
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Supplier audit drilldown */}
      <Dialog open={!!supplierDrillDown} onOpenChange={o => !o && setSupplierDrillDown(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Supplier Audit History</DialogTitle>
            <DialogDescription>Every decision recorded for {supplierDrillDown}</DialogDescription>
          </DialogHeader>
          {supplierAudit.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No prior decisions for this supplier.</p>
          ) : (
            <div className="space-y-2">
              {supplierAudit.map(a => {
                const Icon = DECISION_ICON[a.decision];
                return (
                  <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 ${DECISION_STYLE[a.decision]}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{a.documentName}</span>
                        <Badge variant="outline" className={`${DECISION_STYLE[a.decision]} text-[10px] capitalize`}>{a.decision.replace("_", " ")}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {a.reasonCodes.map(c => <Badge key={c} variant="secondary" className="text-[10px] font-mono">{c}</Badge>)}
                      </div>
                      {a.note && <p className="text-xs text-muted-foreground italic mt-1">"{a.note}"</p>}
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {a.reviewerName} · {new Date(a.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Inbox; tone: "primary" | "success" | "destructive" | "muted" }) {
  const toneClass = {
    primary: "text-primary",
    success: "text-success",
    destructive: "text-destructive",
    muted: "text-muted-foreground",
  }[tone];
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <Icon className={`h-4 w-4 ${toneClass}`} />
        </div>
        <p className={`text-2xl font-bold ${tone === "destructive" && value > 0 ? "text-destructive" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
