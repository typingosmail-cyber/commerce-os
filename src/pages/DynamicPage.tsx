import { Link, useParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { getPage, pageRegistry } from "@/lib/page-registry";
import { PageRenderer } from "@/components/page-templates/PageTemplates";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

export default function DynamicPage() {
  const { slug = "" } = useParams();
  const page = getPage(slug);

  if (!page) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="container py-16 flex-1">
          <h1 className="font-display text-3xl font-bold">Page not found</h1>
          <p className="text-muted-foreground mt-2">No painkiller registered for "{slug}".</p>
          <Button asChild className="mt-6"><Link to="/solutions">Browse all solutions</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  // Related: same category, exclude self, max 4
  const related = pageRegistry.filter((p) => p.category === page.category && p.slug !== page.slug).slice(0, 4);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <PageRenderer p={page} />
        {related.length > 0 && (
          <section className="container pb-16">
            <h2 className="font-display text-xl font-bold mb-4">More in {page.category}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {related.map((r) => (
                <Link key={r.slug} to={`/p/${r.slug}`}>
                  <Card className="h-full hover:shadow-md hover:border-primary/40 transition">
                    <CardContent className="p-4">
                      <p className="font-semibold text-sm">{r.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.tagline}</p>
                      <p className="text-xs text-primary mt-2 inline-flex items-center gap-1">Open <ArrowRight className="h-3 w-3" /></p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
