import { useNavigate } from "react-router-dom";
import { useNotifications, type NotificationType } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bell, ShoppingCart, Shield, Award, TrendingUp, Settings,
  CheckCheck, X, Clock, Zap, Handshake, ShieldAlert,
} from "lucide-react";
import { useState } from "react";

const TYPE_CONFIG: Record<NotificationType, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  lead: { icon: ShoppingCart, color: "text-primary", bg: "bg-primary/10", label: "Lead" },
  escrow: { icon: Shield, color: "text-success", bg: "bg-success/10", label: "Escrow" },
  commission: { icon: Award, color: "text-secondary", bg: "bg-secondary/10", label: "Commission" },
  trust: { icon: TrendingUp, color: "text-warning", bg: "bg-warning/10", label: "Trust" },
  deal: { icon: Handshake, color: "text-primary", bg: "bg-primary/10", label: "Deal" },
  fraud: { icon: ShieldAlert, color: "text-destructive", bg: "bg-destructive/10", label: "Fraud Alert" },
  system: { icon: Settings, color: "text-muted-foreground", bg: "bg-muted", label: "System" },
};

function timeAgo(timestamp: string) {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

type FilterType = "all" | NotificationType;

export function NotificationCenter() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification } = useNotifications();
  const [filter, setFilter] = useState<FilterType>("all");
  const [open, setOpen] = useState(false);

  const filtered = filter === "all" ? notifications : notifications.filter(n => n.type === filter);

  const FILTERS: { value: FilterType; label: string }[] = [
    { value: "all", label: "All" },
    { value: "lead", label: "Leads" },
    { value: "escrow", label: "Escrow" },
    { value: "commission", label: "Earnings" },
    { value: "trust", label: "Trust" },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[9px] flex items-center justify-center font-bold animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[400px] p-0" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-[9px] px-1.5 py-0">{unreadCount} new</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-[10px] text-muted-foreground" onClick={markAllAsRead}>
                <CheckCheck className="h-3 w-3 mr-1" /> Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-1 px-3 py-2 border-b overflow-x-auto">
          {FILTERS.map(f => (
            <Button
              key={f.value}
              variant={filter === f.value ? "default" : "ghost"}
              size="sm"
              className="h-6 text-[10px] px-2 shrink-0"
              onClick={() => setFilter(f.value)}
            >
              {f.label}
              {f.value !== "all" && (
                <span className="ml-1 text-[9px] opacity-60">
                  {notifications.filter(n => f.value === "all" || n.type === f.value).filter(n => !n.read).length}
                </span>
              )}
            </Button>
          ))}
        </div>

        {/* Notification list */}
        <ScrollArea className="h-[360px]">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map(notif => {
                const cfg = TYPE_CONFIG[notif.type];
                const Icon = cfg.icon;
                return (
                  <div
                    key={notif.id}
                    className={`flex gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer group ${!notif.read ? "bg-primary/5" : ""}`}
                    onClick={() => {
                      markAsRead(notif.id);
                      if (notif.actionUrl) {
                        navigate(notif.actionUrl);
                        setOpen(false);
                      }
                    }}
                  >
                    <div className={`h-8 w-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon className={`h-4 w-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs font-medium leading-tight ${!notif.read ? "text-foreground" : "text-muted-foreground"}`}>
                          {notif.title}
                        </p>
                        <Button
                          variant="ghost" size="icon"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0"
                          onClick={(e) => { e.stopPropagation(); clearNotification(notif.id); }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={`text-[8px] px-1 py-0 ${cfg.color}`}>{cfg.label}</Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" /> {timeAgo(notif.timestamp)}
                        </span>
                        {!notif.read && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t p-2 flex items-center justify-between">
          <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => { navigate("/messages"); setOpen(false); }}>
            <Zap className="h-3 w-3 mr-1" /> View All Activity
          </Button>
          <p className="text-[9px] text-muted-foreground">{notifications.length} total</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
