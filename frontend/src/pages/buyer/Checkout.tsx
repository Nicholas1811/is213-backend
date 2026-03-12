import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, ShoppingBag, Coins, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCartStore } from "@/store/cartStore";
import { usePointsStore } from "@/store/pointsStore";
import { POINTS_PER_ORDER } from "@/lib/constants";

type CheckoutStep = "review" | "processing" | "success";

export default function Checkout() {
  const navigate = useNavigate();
  const [step, setStep] = useState<CheckoutStep>("review");
  const [orderId, setOrderId] = useState<string | null>(null);

  const items = useCartStore((s) => s.items);
  const pointsToRedeem = useCartStore((s) => s.pointsToRedeem);
  const subtotal = useCartStore((s) => s.getSubtotal());
  const discount = useCartStore((s) => s.getDiscount());
  const total = useCartStore((s) => s.getTotal());
  const clearCart = useCartStore((s) => s.clearCart);
  const addPoints = usePointsStore((s) => s.addPoints);

  async function handlePlaceOrder() {
    setStep("processing");

    // Simulate API call — will be replaced with TanStack mutation
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Mock order creation
    const mockOrderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
    setOrderId(mockOrderId);

    // Simulate earning points for completing an order
    addPoints(POINTS_PER_ORDER);

    // Clear the cart
    clearCart();

    setStep("success");
  }

  if (items.length === 0 && step !== "success") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShoppingBag className="h-16 w-16 text-muted-foreground/50" />
        <h2 className="mt-6 text-2xl font-semibold">Nothing to checkout</h2>
        <p className="mt-2 text-muted-foreground">
          Add items to your cart first
        </p>
        <Link to="/buyer/marketplace" className="mt-6">
          <Button className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            Browse Marketplace
          </Button>
        </Link>
      </div>
    );
  }

  // Success State
  if (step === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="h-10 w-10 text-primary" />
        </div>
        <h2 className="mt-6 text-2xl font-bold">Order Placed!</h2>
        <p className="mt-2 text-muted-foreground text-center max-w-md">
          Your order has been placed successfully. You earned{" "}
          <span className="font-semibold text-primary">{POINTS_PER_ORDER} points</span> for this purchase!
        </p>
        {orderId && (
          <p className="mt-1 text-sm text-muted-foreground">
            Order ID: <span className="font-mono font-medium">{orderId}</span>
          </p>
        )}
        <div className="mt-8 flex gap-3">
          <Button onClick={() => navigate("/buyer/orders")} className="gap-2">
            View My Orders
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/buyer/marketplace")}
            className="gap-2"
          >
            Continue Shopping
          </Button>
        </div>
      </div>
    );
  }

  // Processing State
  if (step === "processing") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <h2 className="mt-6 text-xl font-semibold">Processing your order...</h2>
        <p className="mt-2 text-muted-foreground">
          Please wait while we confirm your order
        </p>
      </div>
    );
  }

  // Review State
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/buyer/cart")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>
          <p className="text-muted-foreground mt-1">
            Review your order before placing it
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Order Items */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Order Items ({items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.listingId}
                  className="flex items-center gap-4"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ${item.unitPrice.toFixed(2)} x {item.quantity}
                    </p>
                  </div>
                  <p className="font-semibold shrink-0">
                    ${(item.unitPrice * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Payment Summary */}
        <div>
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1 text-primary">
                    <Coins className="h-3 w-3" />
                    Points Discount ({pointsToRedeem} pts)
                  </span>
                  <span className="font-medium text-primary">
                    -${discount.toFixed(2)}
                  </span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-lg font-bold text-primary">
                  ${total.toFixed(2)}
                </span>
              </div>

              <div className="rounded-lg bg-primary/5 p-3">
                <p className="text-xs text-muted-foreground">
                  You will earn{" "}
                  <span className="font-semibold text-primary">{POINTS_PER_ORDER} points</span>{" "}
                  for completing this order
                </p>
              </div>

              <Button
                className="w-full gap-2"
                size="lg"
                onClick={handlePlaceOrder}
              >
                Place Order
                <CheckCircle2 className="h-4 w-4" />
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                By placing your order, you agree to our terms of service
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
