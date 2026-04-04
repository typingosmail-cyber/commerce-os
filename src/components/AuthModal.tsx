import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { LogIn, UserPlus, Building2, Mail, Lock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AuthModal({ open, onClose }: Props) {
  const { login, signup } = useAuth();
  const { toast } = useToast();
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({ name: "", email: "", company: "", password: "" });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(loginForm.email, loginForm.password);
    toast({ title: "Welcome back!", description: "You've been signed in successfully." });
    onClose();
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    signup(signupForm.name, signupForm.email, signupForm.company);
    toast({ title: "Account created!", description: "Welcome to Vyapar OS. You now have Buyer, Seller & Creator access." });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">V</span>
            </div>
            Vyapar OS
          </DialogTitle>
          <DialogDescription>Sign in to access your Buyer, Seller & Creator dashboards</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="login" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login"><LogIn className="h-3 w-3 mr-1" /> Sign In</TabsTrigger>
            <TabsTrigger value="signup"><UserPlus className="h-3 w-3 mr-1" /> Create Account</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4 mt-4">
              <div>
                <Label>Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="you@company.com" className="pl-9" value={loginForm.email} onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))} required type="email" />
                </div>
              </div>
              <div>
                <Label>Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="••••••••" className="pl-9" type="password" value={loginForm.password} onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} required />
                </div>
              </div>
              <Button type="submit" className="w-full"><LogIn className="h-4 w-4 mr-2" /> Sign In</Button>
              <p className="text-xs text-center text-muted-foreground">Demo: use any email & password</p>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-3 mt-4">
              <div>
                <Label>Full Name</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Vikram Patel" className="pl-9" value={signupForm.name} onChange={e => setSignupForm(p => ({ ...p, name: e.target.value }))} required />
                </div>
              </div>
              <div>
                <Label>Business Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="you@company.com" className="pl-9" type="email" value={signupForm.email} onChange={e => setSignupForm(p => ({ ...p, email: e.target.value }))} required />
                </div>
              </div>
              <div>
                <Label>Company Name</Label>
                <div className="relative mt-1">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="ABC Industries Pvt Ltd" className="pl-9" value={signupForm.company} onChange={e => setSignupForm(p => ({ ...p, company: e.target.value }))} required />
                </div>
              </div>
              <div>
                <Label>Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Min 8 characters" className="pl-9" type="password" value={signupForm.password} onChange={e => setSignupForm(p => ({ ...p, password: e.target.value }))} required />
                </div>
              </div>
              <Button type="submit" className="w-full"><UserPlus className="h-4 w-4 mr-2" /> Create Free Account</Button>
              <p className="text-xs text-center text-muted-foreground">Get access to all 3 roles: Buyer • Seller • Creator</p>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
