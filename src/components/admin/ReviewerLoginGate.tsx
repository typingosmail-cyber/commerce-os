import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ShieldCheck, LogIn, KeyRound, Mail, Lock, UserCog } from "lucide-react";
import {
  useReviewerAuth, DEMO_REVIEWERS, ROLE_LABELS, ROLE_DESCRIPTIONS,
  type ReviewerRole,
} from "@/lib/reviewer-auth";
import { toast } from "sonner";

export function ReviewerLoginGate({ children }: { children: React.ReactNode }) {
  const { user, login, loginAs } = useReviewerAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (user) return <>{children}</>;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = login(email, password);
    if (!res.ok) { setError(res.error || "Login failed"); return; }
    toast.success("Signed in to Reviewer Console");
  };

  const quickLogin = (role: ReviewerRole) => {
    loginAs(role);
    toast.success(`Signed in as ${ROLE_LABELS[role]}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 container py-10 max-w-5xl">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 rounded-xl bg-primary/10 items-center justify-center mb-3">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">Reviewer Console Sign-In</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Role-based access required to view & action supplier KYC documents.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Login form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="h-4 w-4" /> Sign in
              </CardTitle>
              <CardDescription>Use your reviewer credentials</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-3">
                <div>
                  <Label className="text-xs">Email</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9" placeholder="reviewer@vyapar.in" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                  </div>
                </div>
                {error && (
                  <p className="text-xs text-destructive border border-destructive/30 bg-destructive/5 rounded p-2">{error}</p>
                )}
                <Button type="submit" className="w-full"><LogIn className="h-4 w-4 mr-2" /> Sign in</Button>
                <p className="text-[11px] text-muted-foreground text-center">
                  All decisions are audit-logged against your reviewer ID.
                </p>
              </form>
            </CardContent>
          </Card>

          {/* Demo accounts / quick role switch */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserCog className="h-4 w-4" /> Demo accounts
              </CardTitle>
              <CardDescription>One-click sign-in to test each role's permissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {DEMO_REVIEWERS.map(d => (
                <button
                  key={d.role}
                  onClick={() => quickLogin(d.role)}
                  className="w-full text-left rounded-lg border p-3 hover:bg-muted/50 transition group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-mono">{d.id}</Badge>
                      <span className="text-sm font-medium">{d.name}</span>
                    </div>
                    <Badge className="text-[10px] capitalize">{ROLE_LABELS[d.role]}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{ROLE_DESCRIPTIONS[d.role]}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 font-mono">{d.email} · pwd: demo</p>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
