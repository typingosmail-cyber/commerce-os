import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Package, Receipt, Banknote, Scale, UserCheck, FileCheck2, ShieldCheck, FileText, ExternalLink, Link2,
} from "lucide-react";
import { ARTIFACT_META, type AuditArtifact } from "@/lib/bnpl";

const ICONS: Record<string, typeof Package> = {
  Package, Receipt, Banknote, Scale, UserCheck, FileCheck2, ShieldCheck, FileText,
};

const fmtINR = (n: number) =>
  `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export function AuditArtifactLinks({ artifacts }: { artifacts?: AuditArtifact[] }) {
  const [active, setActive] = useState<AuditArtifact | null>(null);
  if (!artifacts || artifacts.length === 0) return null;

  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        <Link2 className="h-3 w-3" /> Traceable evidence
      </p>
      <div className="flex flex-wrap gap-1.5">
        {artifacts.map((a) => {
          const meta = ARTIFACT_META[a.kind];
          const Icon = ICONS[meta.icon] ?? FileText;
          return (
            <Button
              key={a.id}
              variant="outline"
              size="sm"
              className="h-7 text-[11px] gap-1"
              onClick={() => setActive(a)}
              title={a.summary}
            >
              <Icon className="h-3 w-3" />
              <span className="font-mono">{a.id}</span>
              <span className="text-muted-foreground hidden sm:inline">· {meta.label}</span>
            </Button>
          );
        })}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-lg">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  {(() => {
                    const Icon = ICONS[ARTIFACT_META[active.kind].icon] ?? FileText;
                    return <Icon className="h-4 w-4 text-primary" />;
                  })()}
                  {active.label}
                </DialogTitle>
                <DialogDescription>{active.summary}</DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="font-mono text-[10px]">{active.id}</Badge>
                  <Badge variant="outline" className="text-[10px]">{ARTIFACT_META[active.kind].label}</Badge>
                  {active.status && <Badge variant="outline" className="text-[10px]">{active.status}</Badge>}
                </div>

                <dl className="grid grid-cols-2 gap-3 text-xs">
                  {active.issuedOn && (
                    <div>
                      <dt className="text-muted-foreground">Dated</dt>
                      <dd className="font-medium">{active.issuedOn}</dd>
                    </div>
                  )}
                  {active.amount !== undefined && (
                    <div>
                      <dt className="text-muted-foreground">Value</dt>
                      <dd className="font-medium">{fmtINR(active.amount)}</dd>
                    </div>
                  )}
                  {active.issuer && (
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">Source</dt>
                      <dd className="font-medium">{active.issuer}</dd>
                    </div>
                  )}
                  {active.fields?.map((f) => (
                    <div key={f.label} className="col-span-2 sm:col-span-1">
                      <dt className="text-muted-foreground">{f.label}</dt>
                      <dd className="font-medium">{f.value}</dd>
                    </div>
                  ))}
                </dl>

                <p className="text-[11px] text-muted-foreground flex items-center gap-1 pt-1 border-t">
                  <ExternalLink className="h-3 w-3" />
                  This record is the source of the limit change shown in the audit entry.
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
