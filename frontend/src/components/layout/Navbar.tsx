import { Link, useLocation } from "react-router-dom";
import { ShoppingCart, Leaf, User, LogOut, Coins, Package, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { usePointsStore } from "@/store/pointsStore";
import { APP_SHORT_NAME, UserRole } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const location = useLocation();
  const role = useAuthStore((s) => s.selectedRole);
  const userName = useAuthStore((s) => s.userName);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const itemCount = useCartStore((s) => s.getItemCount());
  const balance = usePointsStore((s) => s.balance);

  const isBuyer = role === UserRole.BUYER;
  const isSeller = role === UserRole.SELLER;

  const buyerLinks = [
    { to: "/buyer", label: "Home", icon: Home },
    { to: "/buyer/marketplace", label: "Marketplace", icon: Package },
    { to: "/buyer/earn-points", label: "Earn Points", icon: Coins },
    { to: "/buyer/orders", label: "My Orders", icon: Package },
    { to: "/buyer/points", label: "Points", icon: Coins },
  ];

  const sellerLinks = [
    { to: "/seller", label: "Dashboard", icon: Home },
    { to: "/seller/create", label: "Create Listing", icon: Package },
    { to: "/seller/listings", label: "My Listings", icon: Package },
  ];

  const navLinks = isBuyer ? buyerLinks : isSeller ? sellerLinks : [];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <Leaf className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold text-primary">{APP_SHORT_NAME}</span>
        </Link>

        {/* Nav Links */}
        {navLinks.length > 0 && (
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to}>
                <Button
                  variant={location.pathname === link.to ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "gap-2",
                    location.pathname === link.to && "bg-primary/10 text-primary"
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Button>
              </Link>
            ))}
          </nav>
        )}

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Points badge (buyer only) */}
          {isBuyer && (
            <Link to="/buyer/points">
              <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer">
                <Coins className="h-3 w-3" />
                {balance} pts
              </Badge>
            </Link>
          )}

          {/* Cart (buyer only) */}
          {isBuyer && (
            <Link to="/buyer/cart" className="relative">
              <Button variant="ghost" size="icon">
                <ShoppingCart className="h-5 w-5" />
              </Button>
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  {itemCount}
                </span>
              )}
            </Link>
          )}

          {/* User menu */}
          {role && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{userName || "User"}</p>
                  <p className="text-xs text-muted-foreground capitalize">{role}</p>
                </div>
                <DropdownMenuSeparator />
                {isBuyer && (
                  <DropdownMenuItem asChild>
                    <Link to="/buyer/orders" className="cursor-pointer">
                      <Package className="mr-2 h-4 w-4" />
                      My Orders
                    </Link>
                  </DropdownMenuItem>
                )}
                {isBuyer && (
                  <DropdownMenuItem asChild>
                    <Link to="/buyer/points" className="cursor-pointer">
                      <Coins className="mr-2 h-4 w-4" />
                      Points History
                    </Link>
                  </DropdownMenuItem>
                )}
                {isSeller && (
                  <DropdownMenuItem asChild>
                    <Link to="/seller/listings" className="cursor-pointer">
                      <Package className="mr-2 h-4 w-4" />
                      My Listings
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-destructive"
                  onClick={() => {
                    clearAuth();
                    // Keycloak logout will be handled here
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
