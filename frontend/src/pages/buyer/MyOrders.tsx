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

// Mock data
const MOCK_ORDERS = [
  {
    id: "order-1",
    items: [{ listingName: "Grilled Chicken Salad", quantity: 2 }],
    total: 17.8,
    status: "completed" as const,
    pointsEarned: 5,
    createdAt: "2025-03-04T14:30:00Z",
  },
  {
    id: "order-2",
    items: [
      { listingName: "Pasta Carbonara", quantity: 1 },
      { listingName: "Açaí Bowl", quantity: 1 },
    ],
    total: 18.0,
    status: "confirmed" as const,
    pointsEarned: 0,
    createdAt: "2025-03-05T09:15:00Z",
  },
  {
    id: "order-3",
    items: [{ listingName: "Sushi Platter", quantity: 1 }],
    total: 14.0,
    status: "pending" as const,
    pointsEarned: 0,
    createdAt: "2025-03-05T11:00:00Z",
  },
];

const statusConfig = {
  pending: { label: "Pending", icon: Clock, variant: "secondary" as const },
  confirmed: { label: "Confirmed", icon: Package, variant: "default" as const },
  completed: { label: "Completed", icon: CheckCircle2, variant: "default" as const },
  cancelled: { label: "Cancelled", icon: XCircle, variant: "destructive" as const },
};

export default function MyOrders() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
        <p className="text-muted-foreground mt-1">Track your meal purchases</p>
      </div>

      {MOCK_ORDERS.length === 0 ? (
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
                {MOCK_ORDERS.map((order) => {
                  const config = statusConfig[order.status];
                  const StatusIcon = config.icon;

                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.id.slice(0, 10)}...
                      </TableCell>
                      <TableCell>
                        {order.items.map((item) => (
                          <div key={item.listingName} className="text-sm">
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
                        {new Date(order.createdAt).toLocaleDateString()}
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
