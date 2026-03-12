import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, ArrowLeft, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useCartStore } from "@/store/cartStore";
import { usePointsStore } from "@/store/pointsStore";
import { POINTS_TO_DOLLAR_RATIO } from "@/lib/constants";

export default function Cart() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const pointsToRedeem = useCartStore((s) => s.pointsToRedeem);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const setPointsToRedeem = useCartStore((s) => s.setPointsToRedeem);
  const subtotal = useCartStore((s) => s.getSubtotal());
  const discount = useCartStore((s) => s.getDiscount());
  const total = useCartStore((s) => s.getTotal());
  const balance = usePointsStore((s) => s.balance);

  // Calculate max redeemable points (capped by balance and subtotal)
  const maxRedeemablePoints = Math.min(
    balance,
    Math.floor(subtotal * POINTS_TO_DOLLAR_RATIO)
  );

  const isRedeemingPoints = pointsToRedeem > 0;

  function handleTogglePoints(checked: boolean) {
    if (checked) {
      setPointsToRedeem(maxRedeemablePoints);
    } else {
      setPointsToRedeem(0);
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShoppingBag className="h-16 w-16 text-muted-foreground/50" />
        <h2 className="mt-6 text-2xl font-semibold">Your cart is empty</h2>
        <p className="mt-2 text-muted-foreground">
          Browse the marketplace to find discounted meals
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Cart</h1>
          <p className="text-muted-foreground mt-1">
            {items.length} {items.length === 1 ? "item" : "items"} in your cart
          </p>
        </div>
        <Link to="/buyer/marketplace">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Continue Shopping
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <Card key={item.listingId} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Image */}
                  <Link to={`/buyer/marketplace/${item.listingId}`} className="shrink-0">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                  </Link>

                  {/* Details */}
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <Link
                        to={`/buyer/marketplace/${item.listingId}`}
                        className="font-semibold text-lg hover:text-primary transition-colors"
                      >
                        {item.name}
                      </Link>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-lg font-bold text-primary">
                          ${item.unitPrice.toFixed(2)}
                        </span>
                        <span className="text-sm text-muted-foreground line-through">
                          ${item.originalPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Quantity & Remove */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            updateQuantity(item.listingId, item.quantity - 1)
                          }
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            updateQuantity(item.listingId, item.quantity + 1)
                          }
                          disabled={item.quantity >= item.maxQuantity}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <span className="text-xs text-muted-foreground ml-1">
                          (max {item.maxQuantity})
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                        onClick={() => removeItem(item.listingId)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </div>

                  {/* Line Total */}
                  <div className="text-right shrink-0">
                    <p className="font-bold text-lg">
                      ${(item.unitPrice * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order Summary */}
        <div>
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>

              {/* Points Redemption */}
              {balance > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-primary" />
                        <Label htmlFor="use-points" className="text-sm font-medium">
                          Use Points
                        </Label>
                      </div>
                      <Switch
                        id="use-points"
                        checked={isRedeemingPoints}
                        onCheckedChange={handleTogglePoints}
                        disabled={maxRedeemablePoints === 0}
                      />
                    </div>
                    {isRedeemingPoints && (
                      <div className="rounded-lg bg-primary/5 p-3">
                        <p className="text-sm text-muted-foreground">
                          Redeeming <span className="font-semibold text-primary">{pointsToRedeem} points</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Available: {balance.toLocaleString()} points
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-primary">Points Discount</span>
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
            </CardContent>
            <CardFooter className="flex-col gap-2">
              <Button
                className="w-full gap-2"
                size="lg"
                onClick={() => navigate("/buyer/checkout")}
              >
                Proceed to Checkout
                <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Items are subject to availability at checkout
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
