import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, ShoppingBag, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCartStore, type CartItem } from "@/store/cartStore";

// Mock data — replace with TanStack Query
const MOCK_LISTING = {
  id: "1",
  sellerId: "seller-1",
  name: "Grilled Chicken Salad",
  description:
    "Fresh garden salad with grilled chicken breast, cherry tomatoes, avocado, and a tangy vinaigrette dressing. Prepared fresh today with locally sourced ingredients.",
  category: "Salads",
  originalPrice: 15.9,
  discountedPrice: 8.9,
  imageUrl:
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop",
  quantity: 5,
  status: "active" as const,
  createdAt: "2025-03-01T10:00:00Z",
  updatedAt: "2025-03-01T10:00:00Z",
};

export default function ListingDetail() {
  const { id } = useParams();
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((s) => s.addItem);

  // TODO: Replace with useQuery hook
  const listing = { ...MOCK_LISTING, id: id || "1" };

  const savingsPercent = Math.round(
    ((listing.originalPrice - listing.discountedPrice) / listing.originalPrice) * 100
  );

  function handleAddToCart() {
    const item: CartItem = {
      listingId: listing.id,
      name: listing.name,
      imageUrl: listing.imageUrl,
      unitPrice: listing.discountedPrice,
      originalPrice: listing.originalPrice,
      quantity,
      maxQuantity: listing.quantity,
    };
    addItem(item);
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link to="/buyer/marketplace">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Marketplace
        </Button>
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Image */}
        <div className="relative overflow-hidden rounded-lg">
          <img
            src={listing.imageUrl}
            alt={listing.name}
            className="w-full aspect-[4/3] object-cover"
          />
          <Badge className="absolute top-4 right-4 text-sm px-3 py-1 bg-primary text-primary-foreground">
            {savingsPercent}% OFF
          </Badge>
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div>
            <Badge variant="secondary" className="mb-2">
              {listing.category}
            </Badge>
            <h1 className="text-3xl font-bold">{listing.name}</h1>
            <p className="text-muted-foreground mt-2">{listing.description}</p>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-primary">
              ${listing.discountedPrice.toFixed(2)}
            </span>
            <span className="text-lg text-muted-foreground line-through">
              ${listing.originalPrice.toFixed(2)}
            </span>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              Save ${(listing.originalPrice - listing.discountedPrice).toFixed(2)}
            </Badge>
          </div>

          <Separator />

          {/* Stock */}
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{listing.quantity}</span> remaining
          </p>

          {/* Quantity selector */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Quantity:</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-medium">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setQuantity(Math.min(listing.quantity, quantity + 1))}
                disabled={quantity >= listing.quantity}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Actions */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Subtotal ({quantity} item{quantity > 1 ? "s" : ""})</span>
                <span className="font-semibold">
                  ${(listing.discountedPrice * quantity).toFixed(2)}
                </span>
              </div>
              <Button className="w-full gap-2" size="lg" onClick={handleAddToCart}>
                <ShoppingBag className="h-5 w-5" />
                Add to Cart
              </Button>
              <Link to="/buyer/cart">
                <Button variant="outline" className="w-full" size="lg">
                  View Cart
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
