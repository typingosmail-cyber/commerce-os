import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Order } from "@/lib/types";
import { Package, Truck, CheckCircle2, Clock, XCircle, Shield, MapPin } from "lucide-react";

interface Props {
  orders: Order[];
}

const STATUS_MAP: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  confirmed: { label: "Confirmed", className: "bg-primary/10 text-primary border-primary/20", icon: CheckCircle2 },
  processing: { label: "Processing", className: "bg-secondary/10 text-secondary border-secondary/20", icon: Clock },
  shipped: { label: "Shipped", className: "bg-warning/10 text-warning border-warning/20", icon: Truck },
  delivered: { label: "Delivered", className: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
};

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 800 ? "text-success" : score >= 600 ? "text-secondary" : "text-warning";
  return <span className={`text-xs font-semibold ${color}`}>{score}</span>;
}

export function OrderList({ orders }: Props) {
  if (orders.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-10 text-center">
          <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-display font-semibold text-foreground">No Orders Yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Award an RFQ to create your first order</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const status = STATUS_MAP[order.status];
        const StatusIcon = status.icon;
        return (
          <Card key={order.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-display font-semibold text-foreground">{order.productName}</h3>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <Package className="h-3.5 w-3.5" />
                    <span className="font-medium text-foreground">{order.supplierName}</span>
                    <Shield className="h-3 w-3 ml-1" />
                    <ScoreBadge score={order.supplierScore} />
                  </div>
                </div>
                <Badge className={status.className}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {status.label}
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Quantity</p>
                  <p className="font-medium text-foreground">{order.quantity} {order.unit}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Unit Price</p>
                  <p className="font-medium text-foreground">₹{order.pricePerUnit}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-semibold text-foreground">₹{order.totalAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expected</p>
                  <p className="font-medium text-foreground">{order.expectedDelivery}</p>
                </div>
              </div>

              {order.trackingId && (
                <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm">
                  <Truck className="h-4 w-4 text-warning" />
                  <span className="text-muted-foreground">Tracking:</span>
                  <span className="font-mono text-foreground font-medium">{order.trackingId}</span>
                </div>
              )}

              {/* Progress bar for shipped orders */}
              {(order.status === "shipped" || order.status === "processing") && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Ordered {order.orderDate}</span>
                    <span>Est. {order.expectedDelivery}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-secondary transition-all"
                      style={{ width: order.status === "shipped" ? "65%" : "30%" }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
