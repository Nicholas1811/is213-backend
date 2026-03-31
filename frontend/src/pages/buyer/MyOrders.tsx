import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useKeycloak } from "@react-keycloak/web";
import { getOrdersByUser } from "@/api/orderEndpoints";
import type { ApiUserOrderItem } from "@/api/types/order";

const statusConfig = {
  pending: { label: "Pending", icon: Clock, variant: "secondary" as const },
  confirmed: { label: "Confirmed", icon: Package, variant: "default" as const },
  completed: { label: "Completed", icon: CheckCircle2, variant: "default" as const },
  cancelled: { label: "Cancelled", icon: XCircle, variant: "destructive" as const },
};

function normalizeOrderStatus(status: string): keyof typeof statusConfig {
  const normalized = status.toLowerCase();

  if (normalized === "confirmed" || normalized === "paid") return "confirmed";
  if (normalized === "completed" || normalized === "delivered") return "completed";
  if (normalized === "cancelled" || normalized === "canceled" || normalized === "failed") {
    return "cancelled";
  }
  return "pending";
}

function toMoney(value: number): string {
  return Number.isFinite(value) ? `$${value.toFixed(2)}` : "$0.00";
}

export default function MyOrders() {
  const { keycloak, initialized } = useKeycloak();
  const [orders, setOrders] = useState<ApiUserOrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    if (!initialized) {
      return () => {
        mounted = false;
      };
    }

    async function loadOrders() {
      setIsLoading(true);
      setError(null);

      try {
        const userId = keycloak.subject || "temp-user-id";
        const data = await getOrdersByUser(userId);
        if (mounted) {
          setOrders(data);
        }
      } catch (loadError) {
        console.error("Failed to load orders", loadError);
        if (mounted) {
          setError("Failed to load order history.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadOrders();

    return () => {
      mounted = false;
    };
  }, [initialized, keycloak.subject]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
          <p className="text-muted-foreground mt-1">Track your meal purchases</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading orders...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
          <p className="text-muted-foreground mt-1">Track your meal purchases</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center text-destructive">
            {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
        <p className="text-muted-foreground mt-1">Track your meal purchases</p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No orders yet</h3>
            <p className="text-muted-foreground mt-1">
              Start browsing the marketplace to place your first order!
            </p>
            <Link to="/buyer/marketplace">
              <Button className="mt-4">Browse Marketplace</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Order History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Listing ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Paid</TableHead>
                  <TableHead>Point ID</TableHead>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const normalized = normalizeOrderStatus(order.status || "pending");
                  const config = statusConfig[normalized];
                  const StatusIcon = config.icon;
                  console.log(order)
                  return (
                    <TableRow key={String(order.id)}>
                      <TableCell>{String(order.id)}</TableCell>
                      <TableCell>{String(order.listingId)}</TableCell>
                      <TableCell>
                        <Badge variant={config.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {order.status || config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{toMoney(Number(order.totalPaid/ 100))}</TableCell>
                      <TableCell>{order.pointId == null ? "-" : String(order.pointId)}</TableCell>
                      <TableCell>{order.paymentId == null ? "-" : String(order.paymentId)}</TableCell>
                      <TableCell>{Number(order.qty) || 0}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
