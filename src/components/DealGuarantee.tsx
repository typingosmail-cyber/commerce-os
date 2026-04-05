import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Shield, CheckCircle2, Lock, Zap, ArrowRight, IndianRupee } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DealGuaranteeBadgeProps {
  size?: "sm" | "md" | "lg";
  riskScore?: number;
}

export function DealGuaranteeBadge({ size = "md", riskScore }: DealGuaranteeBadgeProps) {
  const sizeClasses = {
    sm: "text-[9px] px-1.5 py-0.5 gap-0.5",
    md: "text-[10px] px-2 py-1 gap-1",
    lg: "text-xs px-3 py-1.5 gap-1.5",
  };
  const iconSize = { sm: "h-2.5 w-2.5", md: "h-3 w-3", lg: "h-3.5 w-3.5" };

  return (
    <Badge className={`bg-success text-success-foreground ${sizeClasses[size]} font-semibold`}>
      <Shield className={iconSize[size]} />
      Vyapar Guarantee™
      {riskScore !== undefined && (
        <span className="opacity-80 ml-0.5">· {riskScore}% safe</span>
      )}
    </Badge>
  );
}

interface SmartDealCardProps {
  dealValue: number;
  supplierName: string;
  productName: string;
  riskScore: number;
  trustScore: number;
}

export function SmartDealCard({ dealValue, supplierName, productName, riskScore, trustScore }: SmartDealCardProps) {
  const navigate = useNavigate();
  const protectionLevel = riskScore >= 85 ? "Full" : riskScore >= 60 ? "Standard" : "Basic";
  const escrowFee = dealValue * (riskScore >= 85 ? 0.015 : riskScore >= 60 ? 0.025 : 0.04);

  return (
    <Card className="border-success/30 bg-success/5 overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-success via-primary to-success" />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <DealGuaranteeBadge riskScore={riskScore} />
          <Badge variant="outline" className="text-[9px]">{protectionLevel} Protection</Badge>
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">{productName}</p>
          <p className="text-xs text-muted-foreground">from {supplierName}</p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-card p-2">
            <p className="text-[10px] text-muted-foreground">Deal Value</p>
            <p className="text-sm font-bold text-foreground">₹{dealValue.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-card p-2">
            <p className="text-[10px] text-muted-foreground">Trust Score</p>
            <p className="text-sm font-bold text-foreground">{trustScore}/1000</p>
          </div>
          <div className="rounded-lg bg-card p-2">
            <p className="text-[10px] text-muted-foreground">Protection Fee</p>
            <p className="text-sm font-bold text-success">₹{Math.round(escrowFee).toLocaleString()}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">Safety Score</span>
            <span className="font-semibold text-foreground">{riskScore}%</span>
          </div>
          <Progress value={riskScore} className="h-1.5" />
        </div>

        <div className="space-y-1">
          {[
            { icon: Lock, text: "Escrow-protected payment" },
            { icon: CheckCircle2, text: "Milestone-based release" },
            { icon: Zap, text: "AI dispute resolution" },
          ].map(item => (
            <div key={item.text} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <item.icon className="h-3 w-3 text-success" />
              {item.text}
            </div>
          ))}
        </div>

        <Button size="sm" className="w-full text-xs" onClick={() => navigate("/escrow")}>
          <Shield className="h-3.5 w-3.5 mr-1" /> Proceed with Guarantee
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}

export function GuaranteeExplainer() {
  const navigate = useNavigate();
  return (
    <Card className="overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-success via-primary to-secondary" />
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-success" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Vyapar Guarantee™</h3>
            <p className="text-xs text-muted-foreground">If your deal fails, you don't lose money.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { step: "1", title: "Risk Scored", desc: "AI analyzes supplier, product & deal risk", icon: Zap },
            { step: "2", title: "Escrow Locked", desc: "Payment held in milestone-based escrow", icon: Lock },
            { step: "3", title: "Guaranteed", desc: "Full refund if deal fails verification", icon: CheckCircle2 },
          ].map(item => (
            <div key={item.step} className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
              <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-primary-foreground">{item.step}</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">{item.title}</p>
                <p className="text-[10px] text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button size="sm" className="text-xs" onClick={() => navigate("/escrow")}>
            <Shield className="h-3.5 w-3.5 mr-1" /> Start Protected Deal
          </Button>
          <Button size="sm" variant="outline" className="text-xs" onClick={() => navigate("/pricing")}>
            <IndianRupee className="h-3.5 w-3.5 mr-1" /> View Pricing
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
