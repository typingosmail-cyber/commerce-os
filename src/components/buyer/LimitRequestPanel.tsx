import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowUpRight, CheckCircle2, XCircle, Clock, FileUp, Trash2, Sparkles, ShieldCheck, AlertTriangle, Plus, Send,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  evaluateMilestones, submitLimitRequest, loadLimitRequests, deleteLimitRequest, decideLimitRequest,
  LIMIT_REQUEST_STATUS_META, aprFor,
  type BuyerCreditProfile, type LimitRequest, type LimitRequestType,
} from "@/lib/bnpl";

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function LimitRequestPanel({ profile }: { profile: BuyerCreditProfile }) {
  const [type, setType] = useState<LimitRequestType>("limit_increase");
  const [requests, setRequests] = useState<LimitRequest[]>([]);
  const [open, setOpen] = useState(false);

  const evaluation = useMemo(() => evaluateMilestones(profile, type), [profile, type]);

  const refresh = () => setRequests(loadLimitRequests(profile.buyerId));
  useEffect(() => { refresh(); }, [profile.buyerId]);

  const pendingForType = requests.find(
    (r) => r.type === type && (r.status === "submitted" || r.status === "under_review" || r.status === "more_info"),
  );

  return (
    <div className="space-y-4">
      {/* Type switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex rounded-md border overflow-hidden">
          {([
            { v: "limit_increase", label: "Limit Increase" },
            { v: "new_credit_line", label: "New Credit Line" },
          ] as const).map((t) => (
            <button
              key={t.v}
              onClick={() => setType(t.v)}
              className={`px-4 py-2 text-sm transition-colors ${
                type === t.v ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={!evaluation.eligible || !!pendingForType}>
              <Plus className="h-4 w-4 mr-1.5" />
              {pendingForType ? "Pending request" : "Start Request"}
            </Button>
          </DialogTrigger>
          <RequestDialog
            profile={profile}
            type={type}
            evaluation={evaluation}
            onSubmitted={() => { refresh(); setOpen(false); }}
          />
        </Dialog>
      </div>

      {/* Eligibility summary */}
      <Card className={evaluation.eligible ? "border-success/40 bg-success/5" : ""}>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {evaluation.eligible
                  ? <CheckCircle2 className="h-5 w-5 text-success" />
                  : <Clock className="h-5 w-5 text-muted-foreground" />}
                Milestone Check
              </CardTitle>
              <CardDescription>
                {evaluation.eligible
                  ? `You qualify to request a ${type === "limit_increase" ? "limit increase" : "new credit line"} up to ${fmt(evaluation.maxRequestable)}.`
                  : `Complete the remaining ${evaluation.totalCount - evaluation.passedCount} milestone(s) below to unlock a request.`}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {evaluation.passedCount}/{evaluation.totalCount} milestones
            </Badge>
          </div>
          <Progress value={(evaluation.passedCount / evaluation.totalCount) * 100} className="h-2 mt-2" />
        </CardHeader>
        <CardContent className="space-y-2">
          {evaluation.milestones.map((m) => (
            <div key={m.id} className="flex items-start gap-3 p-2.5 rounded-md border bg-background">
              {m.passed
                ? <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                : <XCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground">{m.label}</span>
                  <span className="text-xs text-muted-foreground">
                    Required {String(m.required)} · Current{" "}
                    <span className={m.passed ? "text-success font-semibold" : "text-foreground font-semibold"}>
                      {String(m.current)}
                    </span>
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Requests history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Requests</CardTitle>
          <CardDescription>Track approvals, rejections, and reviewer notes.</CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              No requests yet. Once you meet the milestones above, submit your first request.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ref</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => {
                  const meta = LIMIT_REQUEST_STATUS_META[r.status];
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.id}</TableCell>
                      <TableCell className="text-xs capitalize">{r.type.replace("_", " ")}</TableCell>
                      <TableCell className="font-semibold">{fmt(r.requestedAmount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${meta.tone} text-[10px]`}>{meta.label}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(r.submittedAt).toLocaleDateString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          {(r.status === "under_review" || r.status === "submitted") && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-success border-success/30 hover:bg-success/10"
                                onClick={() => {
                                  decideLimitRequest(r.id, "approved", "Auto-approved (mock underwriter).");
                                  toast({ title: "Request approved", description: `${fmt(r.requestedAmount)} unlocked.` });
                                  refresh();
                                }}
                              >
                                Simulate Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  decideLimitRequest(r.id, "more_info", "Please share latest 3 months bank statement.");
                                  toast({ title: "More info requested" });
                                  refresh();
                                }}
                              >
                                Need Info
                              </Button>
                            </>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              deleteLimitRequest(r.id);
                              toast({ title: "Request removed" });
                              refresh();
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        {r.reviewerNote && (
                          <p className="text-[10px] text-muted-foreground mt-1 italic">"{r.reviewerNote}"</p>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RequestDialog({
  profile, type, evaluation, onSubmitted,
}: {
  profile: BuyerCreditProfile;
  type: LimitRequestType;
  evaluation: ReturnType<typeof evaluateMilestones>;
  onSubmitted: () => void;
}) {
  const defaultAmount = type === "limit_increase"
    ? Math.min(evaluation.maxRequestable, Math.round(profile.approvedLimit * 1.5 / 5000) * 5000)
    : Math.round(profile.approvedLimit * 0.4 / 5000) * 5000;
  const [amount, setAmount] = useState(defaultAmount);
  const [reason, setReason] = useState("");
  const [docs, setDocs] = useState<string[]>(["GST returns (last 3 months)"]);
  const [docInput, setDocInput] = useState("");

  const projectedApr = aprFor(Math.min(1000, profile.trustScore + 30));

  const submit = () => {
    if (amount <= 0) return;
    if (reason.trim().length < 10) {
      toast({ title: "Add a reason", description: "Please describe why you need this credit (min 10 chars).", variant: "destructive" });
      return;
    }
    const req = submitLimitRequest({
      buyerId: profile.buyerId,
      type,
      requestedAmount: amount,
      currentLimit: profile.approvedLimit,
      reason: reason.trim(),
      supportingDocs: docs,
      evaluation,
      trustScore: profile.trustScore,
    });
    toast({
      title: "Request submitted ✓",
      description: `${req.id} is now ${req.status === "under_review" ? "under review" : "saved as draft"}.`,
    });
    onSubmitted();
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <ArrowUpRight className="h-5 w-5 text-primary" />
          {type === "limit_increase" ? "Request Limit Increase" : "Request New Credit Line"}
        </DialogTitle>
        <DialogDescription>
          Current limit {fmt(profile.approvedLimit)} · Eligible up to {fmt(evaluation.maxRequestable)}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <Label className="text-xs">{type === "limit_increase" ? "New total limit" : "New credit line amount"}</Label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value) || 0)}
            className="mt-1"
          />
          <Slider
            value={[amount]}
            min={25_000}
            max={evaluation.maxRequestable}
            step={5000}
            onValueChange={(v) => setAmount(v[0])}
            className="mt-3"
          />
          <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
            <span>{fmt(25_000)}</span>
            <span>Max {fmt(evaluation.maxRequestable)}</span>
          </div>
        </div>

        <div className="rounded-lg border p-3 bg-muted/40 text-xs space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">Current APR</span><span className="font-semibold">{profile.apr}%</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Projected APR after approval</span><span className="font-semibold text-success">{projectedApr}%</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Estimated review time</span><span className="font-semibold">24–48 hours</span></div>
        </div>

        <div>
          <Label className="text-xs">Reason for request</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Scaling fastener procurement for Q2 OEM contract — need higher per-order capacity."
            className="mt-1 min-h-20"
          />
        </div>

        <div>
          <Label className="text-xs">Supporting documents</Label>
          <div className="flex gap-2 mt-1">
            <Input
              value={docInput}
              onChange={(e) => setDocInput(e.target.value)}
              placeholder="e.g. Bank statement Q1 FY26"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => {
                if (docInput.trim()) {
                  setDocs((d) => [...d, docInput.trim()]);
                  setDocInput("");
                }
              }}
            >
              <FileUp className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {docs.map((d, i) => (
              <Badge key={i} variant="secondary" className="text-[10px] gap-1">
                {d}
                <button
                  onClick={() => setDocs((all) => all.filter((_, j) => j !== i))}
                  className="hover:text-destructive"
                >×</button>
              </Badge>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs flex gap-2">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <span className="text-foreground">
            All {evaluation.totalCount} milestones met. Underwriter will review your request and supporting docs.
          </span>
        </div>
      </div>

      <DialogFooter>
        <Button onClick={submit} className="w-full">
          <Send className="h-4 w-4 mr-1.5" /> Submit Request
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
