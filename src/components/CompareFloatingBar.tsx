import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getCompareList } from "@/lib/wishlist";
import { GitCompareArrows, X } from "lucide-react";

export function CompareFloatingBar() {
  const navigate = useNavigate();
  const [count, setCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const update = () => setCount(getCompareList().length);
    update();
    window.addEventListener("compare-change", update);
    return () => window.removeEventListener("compare-change", update);
  }, []);

  if (count === 0 || dismissed) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground rounded-xl shadow-2xl px-5 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-5">
      <GitCompareArrows className="h-5 w-5" />
      <span className="text-sm font-medium">{count} product{count > 1 ? "s" : ""} selected</span>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => navigate("/compare")}
      >
        Compare Now
      </Button>
      <button onClick={() => setDismissed(true)} className="text-primary-foreground/60 hover:text-primary-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
