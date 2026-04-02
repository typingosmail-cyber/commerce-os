import { useNavigate } from "react-router-dom";
import { Building2, Mail, Phone, MapPin } from "lucide-react";

const FOOTER_LINKS = {
  "Buy on Vyapar OS": [
    { label: "Browse Categories", path: "/categories" },
    { label: "Post Requirements", path: "/buyer/dashboard" },
    { label: "Find Suppliers", path: "/categories" },
    { label: "Request Quotes", path: "/buyer/dashboard" },
  ],
  "Sell on Vyapar OS": [
    { label: "Register as Supplier", path: "/supplier/onboarding" },
    { label: "Supplier Dashboard", path: "/supplier/dashboard" },
    { label: "Pricing & Plans", path: "#" },
    { label: "Success Stories", path: "#" },
  ],
  "Company": [
    { label: "About Us", path: "#" },
    { label: "Careers", path: "#" },
    { label: "Blog", path: "#" },
    { label: "Contact Us", path: "#" },
  ],
  "Support": [
    { label: "Help Center", path: "#" },
    { label: "Trust & Safety", path: "#" },
    { label: "Terms of Service", path: "#" },
    { label: "Privacy Policy", path: "#" },
  ],
};

export function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                <span className="text-secondary-foreground font-bold text-sm">V</span>
              </div>
              <span className="font-bold text-lg">Vyapar OS</span>
            </div>
            <p className="text-primary-foreground/70 text-sm leading-relaxed mb-4">
              India's trusted B2B commerce platform connecting manufacturers, suppliers, and buyers.
            </p>
            <div className="space-y-2 text-sm text-primary-foreground/60">
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3" /> 1800-XXX-XXXX
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3" /> support@vyaparos.com
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3" /> Mumbai, India
              </div>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-semibold text-sm mb-3">{title}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={() => link.path !== "#" && navigate(link.path)}
                      className="text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-primary-foreground/10 mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-primary-foreground/50">
            © 2026 Vyapar OS. All rights reserved. | GST: 27AABCV1234F1Z5
          </p>
          <div className="flex items-center gap-4 text-xs text-primary-foreground/50">
            <span>🔒 256-bit SSL Secured</span>
            <span>•</span>
            <span>ISO 27001 Certified</span>
            <span>•</span>
            <span>DPIIT Recognised Startup</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
