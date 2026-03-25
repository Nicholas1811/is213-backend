import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, ShoppingBag, ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCartStore, type CartItem } from "@/store/cartStore";
import apiClient from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { fetchImageUrl } from "@/api/s3";

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

export default function Marketplace() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [listings, setListings] = useState<ApiListing[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    setIsLoading(true);
    apiClient
      .get<ApiListing[]>(ENDPOINTS.LISTINGS, { params: { status: "active" } })
      .then(async (res) => {
        const data = res.data;
        setListings(data);

        const urlMap: Record<number, string> = {};
        await Promise.all(
          data
            .filter((l) => l.imageUrl)
            .map(async (l) => {
              try {
                urlMap[l.id] = await fetchImageUrl(l.imageUrl!);
              } catch {
                // ignore failed image fetches
              }
            })
        );
        setImageUrls(urlMap);
      })
      .catch((err) => console.error("Failed to load marketplace", err))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredListings = listings
    .filter((l) => {
      const q = searchQuery.toLowerCase();
      return (
        (l.name ?? "").toLowerCase().includes(q) ||
        (l.description ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === "price-low") return (a.unitPriceCents ?? 0) - (b.unitPriceCents ?? 0);
      if (sortBy === "price-high") return (b.unitPriceCents ?? 0) - (a.unitPriceCents ?? 0);
      // newest: default API order (createdAt desc)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  function handleAddToCart(listing: ApiListing) {
    const unitPrice = (listing.unitPriceCents ?? 0) / 100;
    const item: CartItem = {
      listingId: String(listing.id),
      name: listing.name ?? "Untitled",
      imageUrl: imageUrls[listing.id] ?? "",
      unitPrice,
      originalPrice: unitPrice,
      quantity: 1,
      maxQuantity: listing.qty,
    };
    addItem(item);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
        <p className="text-muted-foreground mt-1">Discover discounted meals near you</p>
      </div>

      {/* Search & Sort */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search meals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="price-low">Price: Low to High</SelectItem>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {isLoading ? "Loading..." : `${filteredListings.length} meal${filteredListings.length !== 1 ? "s" : ""} available`}
      </p>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-[4/3] w-full" />
              <CardContent className="pt-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
              <CardFooter className="pt-0">
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : filteredListings.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredListings.map((listing) => (
            <Card key={listing.id} className="overflow-hidden transition-all hover:shadow-md">
              <Link to={`/buyer/marketplace/${listing.id}`}>
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  {imageUrls[listing.id] ? (
                    <img
                      src={imageUrls[listing.id]}
                      alt={listing.name ?? "Listing"}
                      className="h-full w-full object-cover transition-transform hover:scale-105"
                    />
                  ) : listing.imageUrl ? (
                    <Skeleton className="h-full w-full" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                    </div>
                  )}
                  {listing.bestBefore && (
                    <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-xs text-white">
                      Best before {new Date(listing.bestBefore).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </Link>

              <CardContent className="pt-4">
                <Link to={`/buyer/marketplace/${listing.id}`}>
                  <h3 className="font-semibold text-lg hover:text-primary transition-colors leading-tight">
                    {listing.name ?? <span className="italic text-muted-foreground">Untitled</span>}
                  </h3>
                </Link>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {listing.description ?? ""}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-lg font-bold text-primary">
                    {listing.unitPriceCents != null
                      ? `$${(listing.unitPriceCents / 100).toFixed(2)}`
                      : "—"}
                  </span>
                  <span className="text-xs text-muted-foreground">{listing.qty} left</span>
                </div>
              </CardContent>

              <CardFooter className="pt-0">
                <Button
                  className="w-full gap-2"
                  disabled={listing.qty === 0}
                  onClick={() => handleAddToCart(listing)}
                >
                  <ShoppingBag className="h-4 w-4" />
                  {listing.qty === 0 ? "Sold Out" : "Add to Cart"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No meals found</h3>
          <p className="text-muted-foreground mt-1">
            {searchQuery ? "Try adjusting your search" : "Check back soon for available meals"}
          </p>
        </div>
      )}
    </div>
  );
}
