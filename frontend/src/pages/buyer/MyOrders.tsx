import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, Eye, Clock, CheckCircle2, XCircle } from "lucide-react";
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
import type { Order } from "@/api/types/order";

const statusConfig = {
  pending: { label: "Pending", icon: Clock, variant: "secondary" as const },
  confirmed: { label: "Confirmed", icon: Package, variant: "default" as const },
  completed: { label: "Completed", icon: CheckCircle2, variant: "default" as const },
  cancelled: { label: "Cancelled", icon: XCircle, variant: "destructive" as const },
};

export default function MyOrders() {
  const { keycloak, initialized } = useKeycloak();
  const [orders, setOrders] = useState<Order[]>([]);
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
                  <TableHead>Order</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const config = statusConfig[order.status];
                  const StatusIcon = config.icon;

                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.id.slice(0, 10)}...
                      </TableCell>
                      <TableCell>
                        {order.items.map((item) => (
                          <div key={`${item.listingId}-${item.quantity}`} className="text-sm">
                            {item.listingName} x{item.quantity}
                          </div>
                        ))}
                      </TableCell>
                      <TableCell>${order.total.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={config.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {order.pointsEarned > 0 ? (
                          <span className="text-primary font-medium">
                            +{order.pointsEarned}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(order.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link to={`/buyer/orders/${order.id}`}>
                          <Button variant="ghost" size="sm" className="gap-1">
                            <Eye className="h-3 w-3" />
                            View
                          </Button>
                        </Link>
                      </TableCell>
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
