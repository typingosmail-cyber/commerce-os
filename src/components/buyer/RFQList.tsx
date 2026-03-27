import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RFQ } from "@/lib/types";
import { FileText, Clock, CheckCircle2, Send, MessageSquare, Award, Shield, ChevronRight } from "lucide-react";

interface Props {
  rfqs: RFQ[];
  onSelect: (rfq: RFQ) => void;
  onAward: (rfqId: string, responseId: string) => void;
}

const STATUS_MAP: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground", icon: FileText },
  sent: { label: "Sent", className: "bg-primary/10 text-primary border-primary/20", icon: Send },
  responses: { label: "Responses", className: "bg-secondary/10 text-secondary border-secondary/20", icon: MessageSquare },
  awarded: { label: "Awarded", className: "bg-success/10 text-success border-success/20", icon: Award },
  closed: { label: "Closed", className: "bg-muted text-muted-foreground", icon: CheckCircle2 },
};

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 800 ? "text-success" : score >= 600 ? "text-secondary" : "text-warning";
  return <span className={`font-semibold ${color}`}>{score}</span>;
}

export function RFQList({ rfqs, onSelect, onAward }: Props) {
  if (rfqs.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-10 text-center">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-display font-semibold text-foreground">No RFQs Yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Search products and request quotes to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {rfqs.map((rfq) => {
        const status = STATUS_MAP[rfq.status];
        return (
          <Card key={rfq.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-display font-semibold text-foreground">{rfq.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <Badge variant="outline" className="text-xs">{rfq.category}</Badge>
                    <span>{rfq.quantity} {rfq.unit}</span>
                    {rfq.budget > 0 && <span>Budget: ₹{rfq.budget.toLocaleString()}</span>}
                  </div>
                </div>
                <Badge className={status.className}>{status.label}</Badge>
              </div>

              <p className="text-sm text-muted-foreground line-clamp-2">{rfq.description}</p>

              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Due: {rfq.deliveryDate}</span>
                <span>📍 {rfq.deliveryLocation}</span>
              </div>

              {/* Responses */}
              {rfq.responses.length > 0 && (
                <div className="mt-4 pt-4 border-t space-y-2">
                  <p className="text-sm font-medium text-foreground">{rfq.responses.length} Supplier Response{rfq.responses.length !== 1 ? "s" : ""}</p>
                  {rfq.responses.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium text-foreground">{r.supplierName}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <Shield className="h-3 w-3" />
                            <ScoreBadge score={r.supplierScore} />
                            <span>• {r.leadTimeDays}d delivery</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-semibold text-foreground">₹{r.pricePerUnit}/{rfq.unit}</p>
                          <p className="text-xs text-muted-foreground">Total: ₹{r.totalPrice.toLocaleString()}</p>
                        </div>
                        {rfq.status === "responses" && (
                          <Button size="sm" variant="outline" onClick={() => onAward(rfq.id, r.id)}>
                            <Award className="h-3.5 w-3.5 mr-1" /> Award
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
