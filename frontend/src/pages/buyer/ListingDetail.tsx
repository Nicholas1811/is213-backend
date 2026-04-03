import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowLeft, ShoppingBag, Minus, Plus, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/store/authStore";
//import { usePointsStore } from "@/store/pointsStore";
import apiClient from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { fetchImageUrl } from "@/api/s3";
import { purchaseNow } from "@/api/purchaseEndpoints";
import {useKeycloak} from "@react-keycloak/web";
import { getUserPointBalance  } from "@/api/pointsEndpoints.ts";

interface ApiListing {
  id: number;
  imageUrl: string | null;
  name: string | null;
  description: string | null;
  qty: number;
  unitPriceCents: number | null;
  status: "created" | "processed" | "active" | "sold_out" | "cancelled";
  bestBefore: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ListingDetail() {
  const { id } = useParams();
  const [quantity, setQuantity] = useState(1);
  const [listing, setListing] = useState<ApiListing | null>(null);
  const [resolvedImageUrl, setResolvedImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const userId = useAuthStore((s) => s.userId);
  const { keycloak, initialized } = useKeycloak();
  //const pointsBalance = usePointsStore((s) => s.balance);

  useEffect(() => {
    if (!id) return;
    apiClient
      .get<ApiListing>(`${ENDPOINTS.LISTINGS}/${id}`)
      .then(async (res) => {
        const data = res.data;
        setListing(data);
        if (data.imageUrl) {
          try {
            setResolvedImageUrl(await fetchImageUrl(data.imageUrl));
          } catch {
            // ignore
          }
        }
      })
      .catch((err) => {
        if (err.response?.status === 404) setNotFound(true);
        else console.error("Failed to load listing", err);
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  async function handlePurchaseNow() {
    if (!listing) return;
    const effectiveUserId = keycloak.subject
    const result = await getUserPointBalance(effectiveUserId).catch(() => null);

    const balance = result?.balance ?? 0;
    const pointToUse = Math.max(0, balance);

    console.log(balance, " balance");
    console.log(pointToUse, " Point to use");

    setIsPurchasing(true);
    try {
      const response = await purchaseNow({
        listing_id: listing.id, //DONE
        user_id: effectiveUserId,
        quantity,
        points: pointToUse,
      });

      if ("checkout_url" in response && response.checkout_url) {
        window.location.assign(response.checkout_url);
        return;
      }

      if ("status" in response) {
        toast.success("Purchase successful", {
          description: response.status,
        });
        return;
      }
    } catch (error) {
      console.error("Failed to purchase listing", error);
      toast.error("Purchase failed. Please try again.");
    } finally {
      setIsPurchasing(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-[4/3] w-full rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !listing) {
    return (
      <div className="space-y-6">
        <Link to="/buyer/marketplace">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Marketplace
          </Button>
        </Link>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium">Listing not found</h3>
          <p className="text-muted-foreground mt-1">This meal may no longer be available.</p>
        </div>
      </div>
    );
  }

  const unitPrice = (listing.unitPriceCents ?? 0) / 100;
  const isSoldOut = listing.qty === 0 || listing.status === "sold_out";

  return (
    <div className="space-y-6">
      <Link to="/buyer/marketplace">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Marketplace
        </Button>
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Image */}
        <div className="relative overflow-hidden rounded-lg bg-muted aspect-[4/3]">
          {resolvedImageUrl ? (
            <img
              src={resolvedImageUrl}
              alt={listing.name ?? "Listing"}
              className="w-full h-full object-cover"
            />
          ) : listing.imageUrl ? (
            <Skeleton className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">
              {listing.name ?? <span className="italic text-muted-foreground">Untitled</span>}
            </h1>
            {listing.description && (
              <p className="text-muted-foreground mt-2">{listing.description}</p>
            )}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-primary">
              {listing.unitPriceCents != null ? `$${unitPrice.toFixed(2)}` : "—"}
            </span>
          </div>

          <Separator />

          {/* Meta */}
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">{listing.qty}</span> remaining
            </p>
            {listing.bestBefore && (
              <p>
                Best before{" "}
                <span className="font-medium text-foreground">
                  {new Date(listing.bestBefore).toLocaleDateString()}
                </span>
              </p>
            )}
          </div>

          {/* Quantity selector */}
          {!isSoldOut && (
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
                  onClick={() => setQuantity(Math.min(listing.qty, quantity + 1))}
                  disabled={quantity >= listing.qty}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Actions */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              {!isSoldOut && (
                <div className="flex items-center justify-between text-sm">
                  <span>Subtotal ({quantity} item{quantity > 1 ? "s" : ""})</span>
                  <span className="font-semibold">${(unitPrice * quantity).toFixed(2)}</span>
                </div>
              )}
              <Button
                className="w-full gap-2"
                size="lg"
                disabled={isSoldOut || isPurchasing}
                onClick={handlePurchaseNow}
              >
                <ShoppingBag className="h-5 w-5" />
                {isPurchasing ? "Processing..." : "Purchase Now"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
