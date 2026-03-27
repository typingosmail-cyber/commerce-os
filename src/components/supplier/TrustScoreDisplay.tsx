import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrustScore } from "@/lib/types";
import { Shield, Truck, Star, Zap, FileCheck, History } from "lucide-react";

interface Props {
  score: TrustScore;
}

const SCORE_TIERS = [
  { max: 300, label: "Starter", color: "text-destructive", bg: "bg-destructive/10" },
  { max: 500, label: "Verified", color: "text-warning", bg: "bg-warning/10" },
  { max: 700, label: "Trusted", color: "text-secondary", bg: "bg-secondary/10" },
  { max: 850, label: "Premium", color: "text-success", bg: "bg-success/10" },
  { max: 1000, label: "Elite", color: "text-primary", bg: "bg-primary/10" },
];

function getTier(score: number) {
  return SCORE_TIERS.find((t) => score <= t.max) || SCORE_TIERS[SCORE_TIERS.length - 1];
}

function ScoreRing({ score, maxScore = 1000 }: { score: number; maxScore?: number }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / maxScore) * circumference;
  const tier = getTier(score);

  return (
    <div className="relative flex items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle cx="70" cy="70" r={radius} stroke="hsl(var(--muted))" strokeWidth="8" fill="none" />
        <circle
          cx="70" cy="70" r={radius}
          stroke="hsl(var(--secondary))"
          strokeWidth="8" fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ "--score-offset": offset } as React.CSSProperties}
          className="animate-score-fill"
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-3xl font-display font-bold text-foreground">{score}</p>
        <p className={`text-xs font-semibold uppercase tracking-wider ${tier.color}`}>{tier.label}</p>
      </div>
    </div>
  );
}

function MetricBar({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-foreground">{label}</span>
        </div>
        <span className="text-sm font-semibold text-foreground">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-secondary transition-all duration-1000 ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function TrustScoreDisplay({ score }: Props) {
  const tier = getTier(score.overall);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-secondary" />
          Vyapar Trust Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-8">
          <ScoreRing score={score.overall} />
          <div className="flex-1 w-full space-y-3">
            <MetricBar label="Delivery Performance" value={score.delivery} icon={Truck} />
            <MetricBar label="Product Quality" value={score.quality} icon={Star} />
            <MetricBar label="Response Time" value={score.responseTime} icon={Zap} />
            <MetricBar label="Compliance" value={score.compliance} icon={FileCheck} />
            <MetricBar label="Transaction History" value={score.transactionHistory} icon={History} />
          </div>
        </div>
        <div className={`mt-6 p-3 rounded-lg ${tier.bg} text-center`}>
          <p className={`text-sm font-medium ${tier.color}`}>
            Your score qualifies you for <strong>{tier.label}</strong> tier benefits
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
