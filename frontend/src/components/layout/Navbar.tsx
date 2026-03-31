import { Link, useLocation } from "react-router-dom";
import { ShoppingCart, Leaf, User, LogOut, Coins, Package, Home, Bell } from "lucide-react";
import { useEffect, useState } from "react";
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
import { usePointsStore } from "@/store/pointsStore";
import { useNotificationStore } from "@/store/notificationStore";
import { APP_SHORT_NAME, UserRole } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { registerNotificationToken } from "@/services/notificationService";
import { useKeycloak } from "@react-keycloak/web";
import { useAuthStore } from "@/store/authStore";
import { isKeycloakConfigured } from "@/lib/keycloak";
import { resolveNotificationUserId } from "@/lib/notificationUser";

export default function Navbar() {
  const location = useLocation();

  const { keycloak, initialized } = useKeycloak();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  // Authenticated state from Keycloak
  const userId = resolveNotificationUserId(keycloak.subject);
  const userName = (keycloak.tokenParsed as any)?.name || (keycloak.tokenParsed as any)?.preferred_username || "Guest";
  // Determine role from Keycloak realm roles
  const isKeycloakBuyer = keycloak.hasRealmRole("buyer");
  const isKeycloakSeller = keycloak.hasRealmRole("seller");
  const role = isKeycloakBuyer
    ? UserRole.BUYER 
    : isKeycloakSeller 
      ? UserRole.SELLER 
      : "unknown";
  console.log(role)
  console.log(role)
  console.log(userId);


  const itemCount = useCartStore((s) => s.getItemCount());
  const balance = usePointsStore((s) => s.balance);
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const hydrateFromApi = useNotificationStore((s) => s.hydrateFromApi);

  const [isNotificationLoading, setIsNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const handleEnableNotifications = async () => {
    if (!userId) {
      setNotificationError("User not authenticated");
      return;
    }

    setIsNotificationLoading(true);
    setNotificationError(null);

    try {
      let regValue = await registerNotificationToken(userId);
      console.log(regValue);
      setNotificationError(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to enable notifications";
      setNotificationError(errorMessage);
      console.error(errorMessage);
    } finally {
      setIsNotificationLoading(false);
    }
  };

  const handleLogout = () => {
    if (isKeycloakConfigured) {
      void keycloak.logout({ redirectUri: window.location.origin });
    }
    clearAuth();
  };

  const formatReceivedAt = (isoString: string) => {
    const date = new Date(isoString);
    const now = Date.now();
    const diffMinutes = Math.floor((now - date.getTime()) / 60000);

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleString();
  };

  const isBuyer = role === UserRole.BUYER;
  const isSeller = !isBuyer;

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

  useEffect(() => {
    if (isKeycloakConfigured && !initialized) {
      return;
    }

    void hydrateFromApi(userId);
  }, [hydrateFromApi, initialized, userId]);

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
          {/* 🔔 Notification button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleEnableNotifications}
            disabled={isNotificationLoading}
            title={notificationError || "Enable notifications"}
            className={notificationError ? "text-destructive" : ""}
          >
            <Bell className="h-5 w-5" />
          </Button>

          {/* Notification history dropdown */}
          <DropdownMenu
            onOpenChange={(open) => {
              if (open) {
                markAllAsRead();
                void hydrateFromApi(userId);
              }
            }}
          >
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="h-5 min-w-5 px-1 text-[10px]">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-2">
              <div className="px-2 py-1 text-sm font-medium">Past Notifications</div>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="px-2 py-3 text-sm text-muted-foreground">No notifications yet.</div>
              ) : (
                <div className="max-h-80 space-y-1 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="rounded-md border p-2">
                      <p className="text-sm font-medium leading-tight">{notification.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{notification.body}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{formatReceivedAt(notification.receivedAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Points badge (buyer only) */}
          {isBuyer && (
            <Link to="/buyer/points">
              <Badge
                variant="secondary"
                className="gap-1 bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer"
              >
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{userName}</p>
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

              {isSeller && (
                <DropdownMenuItem asChild>
                  <Link to="/seller/listings" className="cursor-pointer">
                    <Package className="mr-2 h-4 w-4" />
                    My Listings
                  </Link>
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              {/* Real logout */}
              <DropdownMenuItem
                className="cursor-pointer text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}