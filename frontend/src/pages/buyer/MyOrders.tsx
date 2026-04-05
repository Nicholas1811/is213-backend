import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, Clock, CheckCircle2, XCircle, MoreHorizontal } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useKeycloak } from "@react-keycloak/web";
import { getOrdersByUser, cancelOrder, deleteOrder } from "@/api/orderEndpoints";
import type { ApiUserOrderItem } from "@/api/types/order";

const statusConfig = {
  pending: { label: "Pending", icon: Clock, variant: "secondary" as const },
  refunding: { label: "Refund Pending", icon: Clock, variant: "secondary" as const },
  refunded: { label: "Refunded", icon: CheckCircle2, variant: "default" as const },
  confirmed: { label: "Confirmed", icon: Package, variant: "default" as const },
  completed: { label: "Completed", icon: CheckCircle2, variant: "default" as const },
  cancelled: { label: "Cancelled", icon: XCircle, variant: "destructive" as const },
};

function normalizeOrderStatus(status: string): keyof typeof statusConfig {
  const normalized = status.toLowerCase();

  if (normalized === "refund_pending" || normalized === "refunding" || normalized === "refund_requested") {
    return "refunding";
  }
  if (normalized === "refunded") return "refunded";
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

  // Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<string | number | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | number | null>(null);

  useEffect(() => {
    let mounted = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let hasLoadedOnce = false;
    let isFetching = false;

    if (!initialized) {
      return () => {
        mounted = false;
      };
    }

    async function loadOrders({ background = false } = {}) {
      if (isFetching) return;

      const shouldShowLoadingState = !background && !hasLoadedOnce;
      isFetching = true;

      if (shouldShowLoadingState) {
        setIsLoading(true);
        setError(null);
      }

      try {
        const userId = keycloak.subject || "temp-user-id";
        const data = await getOrdersByUser(userId);
        if (mounted) {
          setOrders(data);
          setError(null);
        }
        hasLoadedOnce = true;
      } catch (loadError) {
        console.error("Failed to load orders", loadError);
        if (mounted && !hasLoadedOnce) {
          setError("Failed to load order history.");
        }
      } finally {
        if (mounted && shouldShowLoadingState) {
          setIsLoading(false);
        }
        isFetching = false;
      }
    }

    void loadOrders();
    intervalId = setInterval(() => {
      void loadOrders({ background: true });
    }, 10000);

    return () => {
      mounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [initialized, keycloak.subject]);

  // Triggered when clicking "Cancel Order" in the dropdown
  const handleCancelClick = (orderId: string | number) => {
    setOrderToCancel(orderId);
    setIsCancelModalOpen(true);
  };

  // Triggered when confirming inside the modal
  const confirmCancelOrder = async () => {
    if (!orderToCancel) return;
    
    try {
      await cancelOrder(String(orderToCancel));
      
      // Optimistic update while awaiting async refund completion event
      setOrders(prev => prev.map(order => 
        String(order.id) === String(orderToCancel) ? { ...order, status: "REFUNDED" } : order
      ));
    } catch (err) {
      console.error("Failed to cancel order:", err);
      // Optional: Add toast notification for error
    } finally {
      // Reset modal state
      setIsCancelModalOpen(false);
      setOrderToCancel(null);
    }
  };

  const handleDeleteClick = (orderId: string | number) => {
    setOrderToDelete(orderId);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    
    try {
      await deleteOrder(String(orderToDelete));
      
      // Optimistic update - remove the order from the list entirely
      setOrders(prev => prev.filter(order => String(order.id) !== String(orderToDelete)));
    } catch (err) {
      console.error("Failed to delete order:", err);
    } finally {
      setIsDeleteModalOpen(false);
      setOrderToDelete(null);
    }
  };

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
    <>
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
                    <TableHead className="w-12.5"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const rawStatus = (order.status || "").toLowerCase();
                    const isPaid = rawStatus === "paid";
                    const normalized = normalizeOrderStatus(order.status || "pending");
                    const config = statusConfig[normalized];
                    const StatusIcon = config.icon;
                    
                    return (
                      <TableRow key={String(order.id)}>
                        <TableCell>{String(order.id)}</TableCell>
                        <TableCell>{String(order.listingId)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={config.variant}
                            className={isPaid ? "gap-1 bg-green-100 text-green-700 hover:bg-green-100" : "gap-1"}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {order.status || config.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{toMoney(Number(order.totalPaid / 100))}</TableCell>
                        <TableCell>
                          {order.pointId == null 
                            ? "-" 
                            : normalized === "cancelled" || normalized === "refunded"
                              ? <span className="text-muted-foreground line-through">{String(order.pointId)}</span>
                              : String(order.pointId)}
                          {(normalized === "cancelled" || normalized === "refunded") && order.pointId != null && (
                            <span className="ml-1 text-xs text-destructive font-medium">(Used)</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {order.paymentId == null 
                            ? "-" 
                            : normalized === "cancelled" || normalized === "refunded"
                              ? <span className="text-muted-foreground line-through">{String(order.paymentId)}</span>
                              : String(order.paymentId)}
                          {(normalized === "cancelled" || normalized === "refunded") && order.paymentId != null && (
                            <span className="ml-1 text-xs text-destructive font-medium">(Used)</span>
                          )}
                        </TableCell>
                        <TableCell>{Number(order.qty) || 0}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                className="h-8 w-8 p-0"
                              >
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleCancelClick(order.id)}
                                disabled={normalized !== "pending" && normalized !== "confirmed"}
                                className={(normalized === "pending" || normalized === "confirmed") ? "text-destructive focus:text-destructive" : ""}
                              >
                                Cancel Order
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(order.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                Delete Order
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      <AlertDialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel order #{orderToCancel}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOrderToCancel(null)}>Go Back</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmCancelOrder}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Cancel Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Modal */}
      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order History?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete order #{orderToDelete} from your history? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOrderToDelete(null)}>Go Back</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteOrder}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Delete Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
