import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INDUSTRIES } from "@/lib/mock-data";
import { BusinessProfile, GSTInfo } from "@/lib/types";
import { Building, Globe, User, MapPin, ArrowRight } from "lucide-react";

interface Props {
  gstInfo: GSTInfo;
  onComplete: (profile: BusinessProfile) => void;
  initialData: BusinessProfile | null;
}

export function BusinessProfileForm({ gstInfo, onComplete, initialData }: Props) {
  const [form, setForm] = useState<BusinessProfile>(
    initialData || {
      companyName: gstInfo.tradeName || gstInfo.legalName,
      industry: "",
      subIndustry: "",
      yearEstablished: "",
      employeeCount: "",
      annualRevenue: "",
      description: "",
      website: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      address: gstInfo.address,
      city: "",
      state: gstInfo.state,
      pincode: "",
    }
  );

  const update = (field: keyof BusinessProfile, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">Business Profile</h2>
        <p className="text-muted-foreground mt-1">Tell buyers about your business capabilities</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building className="h-5 w-5 text-secondary" />
            Company Details
          </CardTitle>
          <CardDescription>Core information about your business</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="companyName">Company Name *</Label>
            <Input id="companyName" value={form.companyName} onChange={(e) => update("companyName", e.target.value)} required className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="industry">Industry *</Label>
            <Select value={form.industry} onValueChange={(v) => update("industry", v)}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select industry" /></SelectTrigger>
              <SelectContent>{INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="yearEstablished">Year Established</Label>
            <Input id="yearEstablished" type="number" placeholder="e.g. 2010" value={form.yearEstablished} onChange={(e) => update("yearEstablished", e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="employeeCount">Employee Count</Label>
            <Select value={form.employeeCount} onValueChange={(v) => update("employeeCount", v)}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select range" /></SelectTrigger>
              <SelectContent>
                {["1-10", "11-50", "51-200", "201-500", "500+"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="annualRevenue">Annual Revenue (₹)</Label>
            <Select value={form.annualRevenue} onValueChange={(v) => update("annualRevenue", v)}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select range" /></SelectTrigger>
              <SelectContent>
                {["Under ₹10L", "₹10L - ₹50L", "₹50L - ₹2Cr", "₹2Cr - ₹10Cr", "₹10Cr+"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="description">Business Description *</Label>
            <Textarea id="description" rows={3} placeholder="Describe your products, capabilities, and specializations..." value={form.description} onChange={(e) => update("description", e.target.value)} required className="mt-1.5" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-secondary" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="contactName">Contact Person *</Label>
            <Input id="contactName" value={form.contactName} onChange={(e) => update("contactName", e.target.value)} required className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="contactEmail">Email *</Label>
            <Input id="contactEmail" type="email" value={form.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} required className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="contactPhone">Phone *</Label>
            <Input id="contactPhone" type="tel" value={form.contactPhone} onChange={(e) => update("contactPhone", e.target.value)} required className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="website">Website</Label>
            <div className="relative mt-1.5">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="website" className="pl-9" placeholder="https://" value={form.website} onChange={(e) => update("website", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-secondary" />
            Address
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="address">Address *</Label>
            <Input id="address" value={form.address} onChange={(e) => update("address", e.target.value)} required className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="city">City *</Label>
            <Input id="city" value={form.city} onChange={(e) => update("city", e.target.value)} required className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="state">State</Label>
            <Input id="state" value={form.state} onChange={(e) => update("state", e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="pincode">Pincode *</Label>
            <Input id="pincode" value={form.pincode} onChange={(e) => update("pincode", e.target.value)} required className="mt-1.5" />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" size="lg" className="w-full">
        Save & Continue <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </form>
  );
}
