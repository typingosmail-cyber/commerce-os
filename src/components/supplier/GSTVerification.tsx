import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { MOCK_GST_DATA } from "@/lib/mock-data";
import { GSTInfo } from "@/lib/types";
import { Search, CheckCircle2, AlertCircle, Building2, Loader2 } from "lucide-react";

interface Props {
  onVerified: (info: GSTInfo) => void;
  initialData: GSTInfo | null;
}

export function GSTVerification({ onVerified, initialData }: Props) {
  const [gstin, setGstin] = useState(initialData?.gstin || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GSTInfo | null>(initialData);
  const [error, setError] = useState("");

  const handleVerify = async () => {
    if (gstin.length !== 15) {
      setError("GSTIN must be exactly 15 characters");
      return;
    }
    setError("");
    setLoading(true);

    // Simulate API call
    await new Promise((r) => setTimeout(r, 1500));

    const data = MOCK_GST_DATA[gstin.toUpperCase()];
    if (data) {
      setResult(data);
      setError("");
    } else {
      // Generate mock data for any valid-format GSTIN
      const mockResult: GSTInfo = {
        gstin: gstin.toUpperCase(),
        legalName: "DEMO ENTERPRISE PVT LTD",
        tradeName: "Demo Enterprise",
        address: "123, Industrial Area, Phase 2",
        state: "Maharashtra",
        status: "Active",
        registrationDate: "2019-04-15",
        businessType: "Private Limited Company",
      };
      setResult(mockResult);
      setError("");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">GST Verification</h2>
        <p className="text-muted-foreground mt-1">
          Verify your business identity to build trust on the platform
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="h-5 w-5 text-secondary" />
            Enter GSTIN
          </CardTitle>
          <CardDescription>
            We'll verify your GST registration with government records.
            Try: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">27AABCU9603R1ZM</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="gstin">GSTIN Number</Label>
              <Input
                id="gstin"
                placeholder="e.g. 27AABCU9603R1ZM"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                maxLength={15}
                className="mt-1.5 font-mono tracking-wider"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleVerify} disabled={loading || gstin.length < 15}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
              </Button>
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card className="border-success/30 bg-success/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle2 className="h-5 w-5 text-success" />
                Verified Business
              </CardTitle>
              <Badge className="bg-success text-success-foreground">{result.status}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow label="Legal Name" value={result.legalName} />
              <InfoRow label="Trade Name" value={result.tradeName} />
              <InfoRow label="GSTIN" value={result.gstin} mono />
              <InfoRow label="Business Type" value={result.businessType} />
              <InfoRow label="State" value={result.state} />
              <InfoRow label="Registered Since" value={result.registrationDate} />
              <div className="md:col-span-2">
                <InfoRow label="Address" value={result.address} />
              </div>
            </div>

            <Button onClick={() => onVerified(result)} className="mt-6 w-full" size="lg">
              <Building2 className="h-4 w-4 mr-2" />
              Continue with this Business
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-medium text-foreground mt-0.5 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
