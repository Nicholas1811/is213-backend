import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Package, Clock, CheckCircle2, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// Mock data
const MOCK_ORDER = {
  id: "order-1",
  buyerId: "buyer-1",
  items: [
    {
      listingId: "1",
      listingName: "Grilled Chicken Salad",
      quantity: 2,
      unitPrice: 8.9,
      imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=150&fit=crop",
    },
  ],
  subtotal: 17.8,
  pointsRedeemed: 50,
  discount: 0.5,
  total: 17.3,
  status: "completed" as const,
  pointsEarned: 5,
  createdAt: "2025-03-04T14:30:00Z",
  updatedAt: "2025-03-04T15:00:00Z",
};

export default function OrderDetail() {
  const { id } = useParams();
  const order = { ...MOCK_ORDER, id: id || "order-1" };

  const statusSteps = [
    { key: "pending", label: "Order Placed", icon: Package },
    { key: "confirmed", label: "Confirmed", icon: Clock },
    { key: "completed", label: "Completed", icon: CheckCircle2 },
  ];

  const currentStepIndex = statusSteps.findIndex((s) => s.key === order.status);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link to="/buyer/orders">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Button>
      </Link>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Order Details</h1>
        <p className="text-muted-foreground mt-1">Order #{order.id}</p>
      </div>

      {/* Status Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Order Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {statusSteps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index <= currentStepIndex;
              return (
                <div key={step.key} className="flex flex-col items-center gap-2">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <StepIcon className="h-5 w-5" />
                  </div>
                  <span className={`text-xs ${isActive ? "text-primary font-medium" : "text-muted-foreground"}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {order.items.map((item) => (
            <div key={item.listingId} className="flex items-center gap-4">
              <img
                src={item.imageUrl}
                alt={item.listingName}
                className="h-16 w-16 rounded-md object-cover"
              />
              <div className="flex-1">
                <p className="font-medium">{item.listingName}</p>
                <p className="text-sm text-muted-foreground">
                  Qty: {item.quantity} x ${item.unitPrice.toFixed(2)}
                </p>
              </div>
              <p className="font-medium">
                ${(item.quantity * item.unitPrice).toFixed(2)}
              </p>
            </div>
          ))}

          <Separator />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${order.subtotal.toFixed(2)}</span>
            </div>
            {order.pointsRedeemed > 0 && (
              <div className="flex justify-between text-primary">
                <span>Points Discount (-{order.pointsRedeemed} pts)</span>
                <span>-${order.discount.toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>${order.total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Points Earned */}
      {order.pointsEarned > 0 && (
        <Card className="border-primary/30">
          <CardContent className="py-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Coins className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">
                You earned{" "}
                <span className="text-primary">+{order.pointsEarned} points</span>{" "}
                from this order
              </p>
              <p className="text-xs text-muted-foreground">
                Points are awarded when orders are completed
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order info */}
      <div className="text-xs text-muted-foreground text-center">
        Placed on {new Date(order.createdAt).toLocaleString()}
      </div>
    </div>
  );
}
