import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { CATEGORY_GROUPS } from "@/lib/mock-data";
import {
  Building2, Cog, Zap, FlaskConical, Package, Shield,
  LayoutDashboard, MessageSquare, ShoppingCart, Store, TrendingUp, Home,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  building: Building2, cog: Cog, zap: Zap, flask: FlaskConical, package: Package, shield: Shield,
};

const NAV_ITEMS = [
  { title: "Home", url: "/", icon: Home },
  { title: "Trending Products", url: "/categories?view=trending", icon: TrendingUp },
  { title: "Buyer Dashboard", url: "/buyer/dashboard", icon: ShoppingCart },
  { title: "Supplier Dashboard", url: "/supplier/dashboard", icon: Store },
  { title: "Messages", url: "/messages", icon: MessageSquare },
  { title: "Become a Supplier", url: "/supplier/onboarding", icon: LayoutDashboard },
];

export function CategorySidebar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedGroup = searchParams.get("group");

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="p-4">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate("/")}
        >
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-sm">V</span>
          </div>
          <span className="font-bold text-foreground text-lg truncate">Vyapar OS</span>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {/* Quick links */}
        <SidebarGroup>
          <SidebarGroupLabel>Quick Links</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    onClick={() => navigate(item.url)}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Category groups with collapsible sub-categories */}
        <SidebarGroup>
          <SidebarGroupLabel>All Categories</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {CATEGORY_GROUPS.map((group) => {
                const Icon = ICON_MAP[group.icon] || Package;
                const isActive = selectedGroup === group.name;

                return (
                  <Collapsible key={group.name} defaultOpen={isActive}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={group.name}
                          isActive={isActive}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="flex-1 truncate">{group.name}</span>
                          <ChevronRight className="h-3 w-3 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="ml-6 mt-1 space-y-0.5 border-l border-border pl-3">
                          {group.categories.map((cat) => (
                            <button
                              key={cat.name}
                              onClick={() =>
                                navigate(`/categories?group=${group.name}&sub=${cat.name}`)
                              }
                              className="w-full text-left text-xs py-1.5 px-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors truncate"
                            >
                              {cat.name}
                            </button>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
