import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import type { CreditLine } from "@/lib/bnpl";
import {
  ACCOUNT_LABEL, EXCEPTION_LABEL, SOURCE_LABEL,
  accountTotals, listBatches, listEntries, portfolioBalances,
  postUnpostedDebits, reconcile,
  type PostingBatch, type ReconException,
} from "@/lib/repayment-ledger";
import { RefreshCw, FileCheck2, AlertTriangle, CheckCircle2, Scale } from "lucide-react";

const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export function RepaymentLedgerPanel({
  lines, refreshKey = 0, onPosted,
}: {
  lines: CreditLine[];
  refreshKey?: number;
  onPosted?: () => void;
}) {
  const [tick, setTick] = useState(0);
  const [openBatch, setOpenBatch] = useState<string | null>(null);

  const balances = useMemo(() => portfolioBalances(lines), [lines, tick, refreshKey]);
  const batches = useMemo(() => listBatches(), [tick, refreshKey]);
  const entries = useMemo(() => listEntries(), [tick, refreshKey]);
  const totals = useMemo(() => accountTotals(), [tick, refreshKey]);
  const recon = useMemo(() => reconcile(lines), [lines, tick, refreshKey]);

  const bump = () => { setTick((n) => n + 1); onPosted?.(); };

  const runAutoPost = () => {
    const posted = postUnpostedDebits(lines);
    bump();
    toast({
      title: posted.length ? `Posted ${posted.length} collected debit${posted.length === 1 ? "" : "s"}` : "Nothing to post",
      description: posted.length
        ? `${fmt(posted.reduce((s, b) => s + b.amount, 0))} moved from clearing into the ledger.`
        : "Every successful gateway debit already has a ledger posting.",
    });
  };

  const portfolio = balances.reduce(
    (acc, b) => ({
      billed: acc.billed + b.billed,
      posted: acc.posted + b.postedTotal,
      outstanding: acc.outstanding + b.scheduleOutstanding,
      principal: acc.principal + b.principalRecovered,
      interest: acc.interest + b.interestRecovered,
      fee: acc.fee + b.feeRecovered,
    }),
    { billed: 0, posted: 0, outstanding: 0, principal: 0, interest: 0, fee: 0 },
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" /> Repayment Posting & Reconciliation
            </CardTitle>
            <CardDescription>
              Every paid installment posts balanced ledger entries (fee → interest → principal) and reduces the BNPL outstanding.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={bump}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Re-run
            </Button>
            <Button size="sm" onClick={runAutoPost}>
              <FileCheck2 className="h-3.5 w-3.5 mr-1.5" /> Post collected debits
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="Billed" value={fmt(portfolio.billed)} />
          <Stat label="Posted" value={fmt(portfolio.posted)} />
          <Stat label="Outstanding" value={fmt(portfolio.outstanding)} />
          <Stat label="Unposted collections" value={fmt(recon.unpostedAmount)} tone={recon.unpostedAmount > 0 ? "warn" : undefined} />
          <Stat
            label="Ledger balance"
            value={recon.balanced ? "Balanced" : "Out of balance"}
            tone={recon.balanced ? "ok" : "warn"}
          />
        </CardContent>
      </Card>

      <Tabs defaultValue="balances">
        <TabsList>
          <TabsTrigger value="balances">Balances</TabsTrigger>
          <TabsTrigger value="postings">Postings ({batches.length})</TabsTrigger>
          <TabsTrigger value="ledger">Ledger ({entries.length})</TabsTrigger>
          <TabsTrigger value="recon">
            Reconciliation
            {recon.exceptions.length > 0 && (
              <Badge variant="destructive" className="ml-1.5 h-4 px-1 text-[10px]">{recon.exceptions.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Balances */}
        <TabsContent value="balances" className="mt-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <Th>Credit line</Th><Th right>Billed</Th><Th right>Posted</Th>
                    <Th right>Principal</Th><Th right>Interest</Th><Th right>Fees</Th>
                    <Th right>Outstanding</Th><Th right>Variance</Th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((b) => (
                    <tr key={b.creditLineId} className="border-t">
                      <td className="p-3">
                        <p className="font-medium">{b.orderRef}</p>
                        <p className="text-xs text-muted-foreground">{b.supplierName}</p>
                      </td>
                      <Td right>{fmt(b.billed)}</Td>
                      <Td right>{fmt(b.postedTotal)}</Td>
                      <Td right>{fmt(b.principalRecovered)}</Td>
                      <Td right>{fmt(b.interestRecovered)}</Td>
                      <Td right>{fmt(b.feeRecovered)}</Td>
                      <Td right><span className="font-semibold">{fmt(b.scheduleOutstanding)}</span></Td>
                      <td className="p-3 text-right">
                        {Math.abs(b.variance) <= 2 ? (
                          <Badge variant="outline" className="text-[10px]">matched</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">{fmt(b.variance)}</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                  {balances.length === 0 && (
                    <tr><td className="p-6 text-center text-muted-foreground" colSpan={8}>No active credit lines.</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader><CardTitle className="text-sm">Account totals</CardTitle></CardHeader>
            <CardContent className="grid gap-2">
              {totals.length === 0 && <p className="text-sm text-muted-foreground">No ledger activity yet.</p>}
              {totals.map((t) => (
                <div key={t.account} className="flex items-center justify-between text-sm border-b last:border-0 pb-1.5">
                  <span>{ACCOUNT_LABEL[t.account]}</span>
                  <span className="tabular-nums text-muted-foreground">
                    Dr {fmt(t.debit)} · Cr {fmt(t.credit)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Postings */}
        <TabsContent value="postings" className="mt-4 space-y-3">
          {batches.length === 0 && (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
              No repayments posted yet. Make a repayment or post collected auto-debits.
            </CardContent></Card>
          )}
          {batches.map((b) => (
            <BatchCard
              key={b.id}
              batch={b}
              open={openBatch === b.id}
              onToggle={() => setOpenBatch(openBatch === b.id ? null : b.id)}
            />
          ))}
        </TabsContent>

        {/* Ledger */}
        <TabsContent value="ledger" className="mt-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <Th>Date</Th><Th>Line / EMI</Th><Th>Account</Th><Th>Narration</Th>
                    <Th right>Debit</Th><Th right>Credit</Th>
                  </tr>
                </thead>
                <tbody>
                  {entries.slice(0, 200).map((e) => (
                    <tr key={e.id} className="border-t">
                      <Td>{e.valueDate}</Td>
                      <Td>{e.orderRef}{e.installmentNo ? ` · EMI ${e.installmentNo}` : ""}</Td>
                      <Td>{ACCOUNT_LABEL[e.account]}</Td>
                      <Td><span className="text-muted-foreground">{e.narration}</span></Td>
                      <Td right>{e.debit ? fmt(e.debit) : "—"}</Td>
                      <Td right>{e.credit ? fmt(e.credit) : "—"}</Td>
                    </tr>
                  ))}
                  {entries.length === 0 && (
                    <tr><td className="p-6 text-center text-muted-foreground" colSpan={6}>Ledger is empty.</td></tr>
                  )}
                </tbody>
                {entries.length > 0 && (
                  <tfoot className="border-t bg-muted/30 font-semibold">
                    <tr>
                      <td className="p-3" colSpan={4}>Totals</td>
                      <td className="p-3 text-right">{fmt(recon.totalDebits)}</td>
                      <td className="p-3 text-right">{fmt(recon.totalCredits)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reconciliation */}
        <TabsContent value="recon" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Gateway ↔ ledger reconciliation</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Gateway collected" value={fmt(recon.gatewayCollected)} />
              <Stat label="Ledger posted" value={fmt(recon.ledgerPosted)} />
              <Stat label="Matched debits" value={String(recon.matchedCount)} />
              <Stat label="Exceptions" value={String(recon.exceptions.length)} tone={recon.exceptions.length ? "warn" : "ok"} />
            </CardContent>
          </Card>

          {recon.exceptions.length === 0 ? (
            <Card><CardContent className="p-6 flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary" /> Fully reconciled — no open exceptions.
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {recon.exceptions.map((ex) => (
                <ExceptionRow key={ex.id} ex={ex} onFix={ex.kind === "unposted_debit" ? runAutoPost : undefined} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BatchCard({ batch, open, onToggle }: { batch: PostingBatch; open: boolean; onToggle: () => void }) {
  const entries = useMemo(() => (open ? listEntries({ batchId: batch.id }) : []), [open, batch.id]);
  return (
    <Card>
      <CardContent className="p-4">
        <button className="w-full text-left" onClick={onToggle}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{batch.orderRef} · {fmt(batch.amount)}</p>
              <p className="text-xs text-muted-foreground">
                {SOURCE_LABEL[batch.source]} · {batch.reference} · {new Date(batch.postedAt).toLocaleString("en-IN")}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="outline">P {fmt(batch.totals.principal)}</Badge>
              <Badge variant="outline">I {fmt(batch.totals.interest)}</Badge>
              <Badge variant="outline">F {fmt(batch.totals.fee)}</Badge>
              <Badge variant={batch.balanced ? "secondary" : "destructive"}>
                {batch.balanced ? "balanced" : "unbalanced"}
              </Badge>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Outstanding {fmt(batch.outstandingBefore)} → <span className="font-semibold text-foreground">{fmt(batch.outstandingAfter)}</span>
            {" · "}{batch.allocations.length} installment{batch.allocations.length === 1 ? "" : "s"} touched
          </p>
        </button>

        {open && (
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs uppercase text-muted-foreground mb-1">Allocation</p>
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr><Th>EMI</Th><Th>Due</Th><Th right>Fee</Th><Th right>Interest</Th><Th right>Principal</Th><Th right>Total</Th><Th>Status</Th></tr>
                </thead>
                <tbody>
                  {batch.allocations.map((a) => (
                    <tr key={a.installmentNo} className="border-t">
                      <Td>{a.installmentNo}</Td>
                      <Td>{a.dueDate}</Td>
                      <Td right>{fmt(a.fee)}</Td>
                      <Td right>{fmt(a.interest)}</Td>
                      <Td right>{fmt(a.principal)}</Td>
                      <Td right>{fmt(a.total)}</Td>
                      <Td><Badge variant={a.closesInstallment ? "secondary" : "outline"} className="text-[10px]">
                        {a.closesInstallment ? "settled" : "partial"}
                      </Badge></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground mb-1">Journal entries</p>
              <table className="w-full text-sm">
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-t">
                      <Td>{ACCOUNT_LABEL[e.account]}</Td>
                      <Td><span className="text-muted-foreground text-xs">{e.narration}</span></Td>
                      <Td right>{e.debit ? `Dr ${fmt(e.debit)}` : ""}</Td>
                      <Td right>{e.credit ? `Cr ${fmt(e.credit)}` : ""}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ExceptionRow({ ex, onFix }: { ex: ReconException; onFix?: () => void }) {
  return (
    <Card>
      <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className={`h-4 w-4 mt-0.5 ${ex.severity === "high" ? "text-destructive" : "text-muted-foreground"}`} />
          <div>
            <p className="text-sm font-medium">
              {EXCEPTION_LABEL[ex.kind]} · {ex.orderRef}
              {ex.installmentNo ? ` · EMI ${ex.installmentNo}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">{ex.detail}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={ex.severity === "high" ? "destructive" : "outline"} className="text-[10px]">{ex.severity}</Badge>
          {onFix && <Button size="sm" variant="outline" onClick={onFix}>Post now</Button>}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className={`text-lg font-display font-bold ${tone === "warn" ? "text-destructive" : tone === "ok" ? "text-primary" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`p-3 font-medium ${right ? "text-right" : "text-left"}`}>{children}</th>;
}
function Td({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <td className={`p-3 ${right ? "text-right tabular-nums" : ""}`}>{children}</td>;
}
