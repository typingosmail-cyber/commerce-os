import { useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Upload, FileCheck2, CheckCircle2, XCircle, AlertCircle, Shield, ShieldCheck,
  Award, Crown, ShieldOff, Search, Loader2, Sparkles, TrendingUp, Lock, FileText,
} from "lucide-react";
import {
  BADGE_TIERS, DEFAULT_DOCS, computeScore, getTier, getNextTier,
  mockGSTCrossCheck, type VerificationDoc, type GSTCrossCheck, type BadgeTier,
} from "@/lib/verification";

const ICONS: Record<string, React.ElementType> = {
  ShieldOff, Shield, ShieldCheck, Award, Crown,
};

export default function SupplierVerification() {
  const [docs, setDocs] = useState<VerificationDoc[]>(DEFAULT_DOCS);
  const [gstin, setGstin] = useState("27AABCU9603R1ZM");
  const [gstCheck, setGstCheck] = useState<GSTCrossCheck | null>(null);
  const [checking, setChecking] = useState(false);

  const score = useMemo(() => computeScore(docs, gstCheck), [docs, gstCheck]);
  const tier = getTier(score);
  const nextTier = getNextTier(score);
  const TierIcon = ICONS[tier.icon] ?? Shield;

  const handleUpload = (id: string) => {
    const fileName = `${id}_${Date.now()}.pdf`;
    setDocs(prev => prev.map(d => d.id === id ? {
      ...d, status: "uploaded", fileName, uploadedAt: new Date().toISOString(),
    } : d));
    toast.success("Document uploaded — under review");
    // simulate auto-review
    setTimeout(() => {
      setDocs(prev => prev.map(d => {
        if (d.id !== id) return d;
        const ok = Math.random() > 0.15;
        return { ...d, status: ok ? "verified" : "rejected", reviewerNote: ok ? "Auto-verified by AI document parser" : "Image unclear — please re-upload" };
      }));
    }, 1500);
  };

  const runGSTCheck = async () => {
    if (gstin.length !== 15) { toast.error("GSTIN must be 15 characters"); return; }
    setChecking(true);
    await new Promise(r => setTimeout(r, 1200));
    setGstCheck(mockGSTCrossCheck(gstin.toUpperCase()));
    setChecking(false);
    toast.success("Cross-check complete");
  };

  const verifiedCount = docs.filter(d => d.status === "verified").length;
  const requiredVerified = docs.filter(d => d.required && d.status === "verified").length;
  const totalRequired = docs.filter(d => d.required).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="container max-w-7xl py-8 flex-1">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold">Supplier Verification & Certification</h1>
            <p className="text-muted-foreground mt-1">
              Upload documents, cross-verify with GST records, and unlock trust badges
            </p>
          </div>
          <Badge className={`${tier.color} px-4 py-2 text-sm border`}>
            <TierIcon className="h-4 w-4 mr-2 inline" /> {tier.label}
          </Badge>
        </div>

        {/* Score Overview */}
        <Card className="mb-6 overflow-hidden">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Verification Score</p>
                <p className="text-4xl font-bold mt-1">{score}<span className="text-xl text-muted-foreground">/100</span></p>
                <Progress value={score} className="mt-3" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Documents Verified</p>
                <p className="text-4xl font-bold mt-1">{verifiedCount}<span className="text-xl text-muted-foreground">/{docs.length}</span></p>
                <p className="text-xs text-muted-foreground mt-3">
                  {requiredVerified}/{totalRequired} required complete
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Next Milestone</p>
                {nextTier ? (
                  <>
                    <p className="text-2xl font-bold mt-1">{nextTier.label}</p>
                    <p className="text-xs text-muted-foreground mt-3">
                      {nextTier.minScore - score} points to unlock
                    </p>
                  </>
                ) : (
                  <p className="text-2xl font-bold mt-1 text-success">Top Tier Achieved 🎉</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="documents" className="space-y-6">
          <TabsList>
            <TabsTrigger value="documents"><FileText className="h-4 w-4 mr-2" />Documents</TabsTrigger>
            <TabsTrigger value="gst"><Search className="h-4 w-4 mr-2" />GST Cross-Check</TabsTrigger>
            <TabsTrigger value="badges"><Award className="h-4 w-4 mr-2" />Badge System</TabsTrigger>
          </TabsList>

          {/* Documents */}
          <TabsContent value="documents" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {docs.map(doc => (
                <Card key={doc.id} className={doc.status === "verified" ? "border-success/40" : doc.status === "rejected" ? "border-destructive/40" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {doc.name}
                          {doc.required && <Badge variant="outline" className="text-[10px]">Required</Badge>}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">{doc.description}</CardDescription>
                      </div>
                      <StatusIcon status={doc.status} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {doc.status === "verified" || doc.status === "uploaded" ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <FileCheck2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-xs truncate">{doc.fileName}</span>
                        </div>
                        {doc.reviewerNote && (
                          <p className={`text-xs ${doc.status === "verified" ? "text-success" : "text-muted-foreground"}`}>
                            {doc.reviewerNote}
                          </p>
                        )}
                        <Button size="sm" variant="outline" onClick={() => handleUpload(doc.id)}>
                          <Upload className="h-3 w-3 mr-1" /> Replace
                        </Button>
                      </div>
                    ) : doc.status === "rejected" ? (
                      <div className="space-y-2">
                        <p className="text-xs text-destructive">{doc.reviewerNote}</p>
                        <Button size="sm" onClick={() => handleUpload(doc.id)}>
                          <Upload className="h-3 w-3 mr-1" /> Re-upload
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => handleUpload(doc.id)} className="w-full">
                        <Upload className="h-4 w-4 mr-2" /> Upload Document
                      </Button>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-2">+{doc.weight} score points when verified</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* GST */}
          <TabsContent value="gst" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" /> Government GST Cross-Verification
                </CardTitle>
                <CardDescription>
                  Live cross-check against GSTN, MCA, and PAN databases
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Label htmlFor="gstin">GSTIN</Label>
                    <Input id="gstin" value={gstin} onChange={e => setGstin(e.target.value.toUpperCase())} maxLength={15} className="font-mono mt-1.5" />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={runGSTCheck} disabled={checking}>
                      {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4 mr-2" />Run Cross-Check</>}
                    </Button>
                  </div>
                </div>

                {gstCheck && (
                  <div className="space-y-3 pt-4 border-t">
                    <CrossCheckRow label="GSTIN exists in GSTN registry" pass={gstCheck.gstinMatches} />
                    <CrossCheckRow label="Legal name matches PAN records" pass={gstCheck.legalNameMatches} />
                    <CrossCheckRow label="Registered address verified" pass={gstCheck.addressMatches} />
                    <CrossCheckRow label="PAN linked & active" pass={gstCheck.panLinked} />
                    <CrossCheckRow label="GST filings up to date" pass={gstCheck.filingsUpToDate} />
                    {gstCheck.riskFlags.length > 0 && (
                      <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3">
                        <p className="text-sm font-medium text-destructive flex items-center gap-2 mb-2">
                          <AlertCircle className="h-4 w-4" /> Risk Flags
                        </p>
                        <ul className="text-xs space-y-1">
                          {gstCheck.riskFlags.map((f, i) => <li key={i}>• {f}</li>)}
                        </ul>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Last checked: {new Date(gstCheck.lastChecked).toLocaleString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Badges */}
          <TabsContent value="badges" className="space-y-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {BADGE_TIERS.map(b => {
                const Icon = ICONS[b.icon] ?? Shield;
                const earned = score >= b.minScore;
                const current = tier.tier === b.tier;
                return (
                  <Card key={b.tier} className={`relative ${current ? "ring-2 ring-primary" : ""} ${!earned ? "opacity-60" : ""}`}>
                    {current && (
                      <Badge className="absolute -top-2 right-3">Current</Badge>
                    )}
                    <CardHeader>
                      <div className={`inline-flex h-12 w-12 items-center justify-center rounded-lg border ${b.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="mt-3">{b.label}</CardTitle>
                      <CardDescription>Unlocks at {b.minScore}+ score</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        {b.perks.map((p, i) => (
                          <li key={i} className="flex items-start gap-2">
                            {earned ? <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" /> : <Lock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="bg-muted/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4" /> How badges affect your business
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                <p>• Higher tiers receive 3-8× more buyer inquiries on average</p>
                <p>• Platinum suppliers see 22% higher conversion on RFQs</p>
                <p>• Verified badges unlock escrow protection and BNPL credit access</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}

function StatusIcon({ status }: { status: VerificationDoc["status"] }) {
  if (status === "verified") return <CheckCircle2 className="h-5 w-5 text-success" />;
  if (status === "rejected") return <XCircle className="h-5 w-5 text-destructive" />;
  if (status === "uploaded") return <Loader2 className="h-5 w-5 text-secondary animate-spin" />;
  return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
}

function CrossCheckRow({ label, pass }: { label: string; pass: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span>{label}</span>
      {pass ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}
    </div>
  );
}
