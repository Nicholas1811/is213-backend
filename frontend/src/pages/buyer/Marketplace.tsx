import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, SlidersHorizontal, ShoppingBag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCartStore, type CartItem } from "@/store/cartStore";

// Mock data — will be replaced with TanStack Query hook
const MOCK_LISTINGS = [
  {
    id: "1",
    name: "Grilled Chicken Salad",
    description: "Fresh garden salad with grilled chicken breast",
    category: "Salads",
    originalPrice: 15.9,
    discountedPrice: 8.9,
    imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop",
    quantity: 5,
    status: "active" as const,
  },
  {
    id: "2",
    name: "Pasta Carbonara",
    description: "Creamy pasta with bacon and parmesan",
    category: "Pasta",
    originalPrice: 18.5,
    discountedPrice: 10.5,
    imageUrl: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop",
    quantity: 3,
    status: "active" as const,
  },
  {
    id: "3",
    name: "Sushi Platter",
    description: "Assorted sushi with salmon, tuna and prawn",
    category: "Japanese",
    originalPrice: 25.0,
    discountedPrice: 14.0,
    imageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&h=300&fit=crop",
    quantity: 2,
    status: "active" as const,
  },
  {
    id: "4",
    name: "Margherita Pizza",
    description: "Classic pizza with fresh mozzarella and basil",
    category: "Pizza",
    originalPrice: 22.0,
    discountedPrice: 12.0,
    imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop",
    quantity: 4,
    status: "active" as const,
  },
  {
    id: "5",
    name: "Açaí Bowl",
    description: "Blended açaí topped with granola, banana, and berries",
    category: "Bowls",
    originalPrice: 14.0,
    discountedPrice: 7.5,
    imageUrl: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400&h=300&fit=crop",
    quantity: 6,
    status: "active" as const,
  },
  {
    id: "6",
    name: "Thai Green Curry",
    description: "Aromatic green curry with chicken and vegetables",
    category: "Thai",
    originalPrice: 16.5,
    discountedPrice: 9.0,
    imageUrl: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400&h=300&fit=crop",
    quantity: 3,
    status: "active" as const,
  },
];

const CATEGORIES = ["All", "Salads", "Pasta", "Japanese", "Pizza", "Bowls", "Thai"];

export default function Marketplace() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("savings");
  const addItem = useCartStore((s) => s.addItem);

  const filteredListings = MOCK_LISTINGS.filter((listing) => {
    const matchesSearch =
      listing.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || listing.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    if (sortBy === "savings") {
      const savingsA = ((a.originalPrice - a.discountedPrice) / a.originalPrice) * 100;
      const savingsB = ((b.originalPrice - b.discountedPrice) / b.originalPrice) * 100;
      return savingsB - savingsA;
    }
    if (sortBy === "price-low") return a.discountedPrice - b.discountedPrice;
    if (sortBy === "price-high") return b.discountedPrice - a.discountedPrice;
    return 0;
  });

  function handleAddToCart(listing: typeof MOCK_LISTINGS[0]) {
    const item: CartItem = {
      listingId: listing.id,
      name: listing.name,
      imageUrl: listing.imageUrl,
      unitPrice: listing.discountedPrice,
      originalPrice: listing.originalPrice,
      quantity: 1,
      maxQuantity: listing.quantity,
    };
    addItem(item);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
        <p className="text-muted-foreground mt-1">
          Discover discounted meals near you
        </p>
      </div>

      {/* Search & Filters */}
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
        <div className="flex gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[140px]">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="savings">Best Savings</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filteredListings.length} meals found
      </p>

      {/* Product Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredListings.map((listing) => {
          const savingsPercent = Math.round(
            ((listing.originalPrice - listing.discountedPrice) / listing.originalPrice) * 100
          );

          return (
            <Card key={listing.id} className="overflow-hidden transition-all hover:shadow-md">
              <Link to={`/buyer/marketplace/${listing.id}`}>
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={listing.imageUrl}
                    alt={listing.name}
                    className="h-full w-full object-cover transition-transform hover:scale-105"
                  />
                  <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground">
                    {savingsPercent}% OFF
                  </Badge>
                </div>
              </Link>
              <CardContent className="pt-4">
                <Link to={`/buyer/marketplace/${listing.id}`}>
                  <h3 className="font-semibold text-lg hover:text-primary transition-colors">
                    {listing.name}
                  </h3>
                </Link>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {listing.description}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xl font-bold text-primary">
                    ${listing.discountedPrice.toFixed(2)}
                  </span>
                  <span className="text-sm text-muted-foreground line-through">
                    ${listing.originalPrice.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {listing.quantity} left
                </p>
              </CardContent>
              <CardFooter className="pt-0">
                <Button
                  className="w-full gap-2"
                  onClick={() => handleAddToCart(listing)}
                >
                  <ShoppingBag className="h-4 w-4" />
                  Add to Cart
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {filteredListings.length === 0 && (
        <div className="text-center py-12">
          <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No meals found</h3>
          <p className="text-muted-foreground mt-1">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}
    </div>
  );
}
