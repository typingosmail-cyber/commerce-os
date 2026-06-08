import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText, Activity, ShieldAlert, TrendingUp, Network, UserCheck,
  ArrowUpRight, ArrowDownRight, Minus, ExternalLink, History, Filter,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from "recharts";
import { RISK_COLOR, type SupplierRiskProfile } from "@/lib/fraud-detection";
import { buildRiskTimeline, buildScoreSeries, type RiskTimelineEvent, type TimelineEventKind } from "@/lib/risk-timeline";
import { toast } from "sonner";

const KIND_ICON: Record<TimelineEventKind, any> = {
  document: FileText,
  gst: ShieldAlert,
  transaction: Activity,
  behavior: TrendingUp,
  network: Network,
  review: UserCheck,
  score: History,
};

const KIND_LABEL: Record<TimelineEventKind, string> = {
  document: "Documents",
  gst: "GST / Compliance",
  transaction: "Transactions",
  behavior: "Behavior",
  network: "Network / Device",
  review: "Reviewer",
  score: "Score Update",
};

interface Props {
  profile: SupplierRiskProfile;
}

export default function RiskTimelineAudit({ profile }: Props) {
  const events = useMemo(() => buildRiskTimeline(profile), [profile]);
  const series = useMemo(() => buildScoreSeries(events), [events]);
  const [filter, setFilter] = useState<TimelineEventKind | "all">("all");

  const filtered = filter === "all" ? events : events.filter(e => e.category === filter);

  const peak = Math.max(...series.map(s => s.score), 0);

  const openEvidence = (label: string) => {
    toast.info("Opening source record", {
      description: `${label} — in production this links to the underlying document or order page.`,
    });
  };

  return (
    <div className="space-y-4">
      {/* Score evolution chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                Risk Score Evolution
              </CardTitle>
              <CardDescription>
                How {profile.supplierName}'s composite score moved over time, with each rise tied to a specific event.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="text-right">
                <div className="text-muted-foreground text-[10px]">Current</div>
                <div className="font-bold text-lg">{profile.riskScore}<span className="text-xs text-muted-foreground">/100</span></div>
              </div>
              <div className="text-right">
                <div className="text-muted-foreground text-[10px]">Peak</div>
                <div className="font-semibold">{peak}</div>
              </div>
              <Badge variant="outline" className={`${RISK_COLOR[profile.riskLevel]} text-[10px] capitalize`}>
                {profile.riskLevel}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {series.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={series} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ fontSize: 11 }}
                  formatter={(v: number, _n, ctx: any) => [`${v}/100`, ctx?.payload?.label ?? "Score"]}
                />
                <ReferenceLine y={75} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label={{ value: "Critical", fontSize: 9, fill: "hsl(var(--destructive))" }} />
                <ReferenceLine y={55} stroke="hsl(24 95% 53%)" strokeDasharray="3 3" label={{ value: "High", fontSize: 9, fill: "hsl(24 95% 53%)" }} />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No score history yet for this supplier.</p>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base">Audit Trail</CardTitle>
              <CardDescription>{events.length} events · linked to source documents & transactions</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filter} onValueChange={v => setFilter(v as TimelineEventKind | "all")}>
                <SelectTrigger className="h-8 w-48 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All event types</SelectItem>
                  {(Object.keys(KIND_LABEL) as TimelineEventKind[]).map(k => (
                    <SelectItem key={k} value={k}>{KIND_LABEL[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[420px] pr-3">
            <div className="relative pl-6">
              <div className="absolute left-2 top-1 bottom-1 w-px bg-border" />
              <div className="space-y-4">
                {filtered.map(e => <EventRow key={e.id} event={e} onOpenEvidence={openEvidence} />)}
                {filtered.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No events match this filter.</p>
                )}
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function EventRow({ event, onOpenEvidence }: { event: RiskTimelineEvent; onOpenEvidence: (label: string) => void }) {
  const Icon = KIND_ICON[event.category];
  const delta = event.scoreAfter - event.scoreBefore;
  const DirIcon = event.direction === "up" ? ArrowUpRight : event.direction === "down" ? ArrowDownRight : Minus;
  const dirColor = event.direction === "up" ? "text-destructive" : event.direction === "down" ? "text-success" : "text-muted-foreground";

  return (
    <div className="relative">
      <div className="absolute -left-[18px] top-1 h-4 w-4 rounded-full border-2 border-background bg-primary" />
      <div className="rounded-lg border p-3 bg-card hover:bg-muted/30 transition-colors">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium">{event.title}</p>
                <Badge variant="outline" className={`${RISK_COLOR[event.severity]} text-[9px] capitalize`}>{event.severity}</Badge>
                <Badge variant="secondary" className="text-[9px]">{KIND_LABEL[event.category]}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {new Date(event.date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className={`flex items-center justify-end gap-1 text-xs font-semibold ${dirColor}`}>
              <DirIcon className="h-3.5 w-3.5" />
              {delta > 0 ? `+${delta}` : delta}
            </div>
            <div className="text-[10px] text-muted-foreground">{event.scoreBefore} → {event.scoreAfter}</div>
          </div>
        </div>

        {event.evidence.length > 0 && (
          <div className="mt-3 pl-11 space-y-1">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Linked evidence</p>
            <div className="flex flex-wrap gap-1.5">
              {event.evidence.map(ev => (
                <Button
                  key={ev.id}
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] gap-1"
                  onClick={() => onOpenEvidence(ev.label)}
                  title={ev.detail}
                >
                  <ExternalLink className="h-3 w-3" />
                  <span className="font-mono">{ev.id}</span>
                  <span className="text-muted-foreground">· {ev.label}</span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
