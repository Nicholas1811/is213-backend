import { useNavigate } from "react-router-dom";
import { Leaf, ShoppingBag, Store } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/authStore";
import { APP_NAME, UserRole } from "@/lib/constants";
import { useKeycloak } from "@react-keycloak/web";
import { isKeycloakConfigured } from "@/lib/keycloak";
import { startKeycloakLogin } from "@/lib/keycloakLogin";

export default function HomePage() {
  const navigate = useNavigate();
  const { keycloak } = useKeycloak();
  const setRole = useAuthStore((s) => s.setRole);

  function handleRoleSelect(role: UserRole) {
    const targetPath = role === UserRole.BUYER ? "/buyer" : "/seller";

    // If already authenticated, respect the actual Keycloak role
    if (keycloak.authenticated) {
      const isBuyer = keycloak.hasRealmRole("buyer");
      const isSeller = keycloak.hasRealmRole("seller");

      if (isBuyer) {
        setRole(UserRole.BUYER);
        navigate("/buyer");
        return;
      } else if (isSeller) {
        setRole(UserRole.SELLER);
        navigate("/seller");
        return;
      }
    }

    // Otherwise (unauthenticated or no specific role), proceed with selection
    setRole(role);

    if (isKeycloakConfigured) {
      void startKeycloakLogin(keycloak, {
        redirectUri: `${window.location.origin}${targetPath}`,
      }).catch((error) => {
        console.error("Failed to start Keycloak login", error);
      });
      return;
    }

    navigate(targetPath);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      {/* Hero */}
      <div className="mb-12 text-center">
        <div className="mb-6 flex items-center justify-center gap-3">
          <Leaf className="h-12 w-12 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">
            {APP_NAME}
          </h1>
        </div>
        <p className="mx-auto max-w-md text-lg text-muted-foreground">
          Save money on meals, reduce food waste, and earn points for sustainable eating habits.
        </p>
      </div>

      {/* Role Selection Cards */}
      <div className="grid w-full max-w-2xl gap-6 sm:grid-cols-2">
        {/* Buyer Card */}
        <Card
          className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 hover:-translate-y-1"
          onClick={() => handleRoleSelect(UserRole.BUYER)}
        >
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <ShoppingBag className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">I want to Buy</CardTitle>
            <CardDescription>
              Browse discounted meals and earn points
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Browse discounted meal listings</li>
              <li>Earn points by photographing meals</li>
              <li>Redeem points for discounts</li>
            </ul>
          </CardContent>
        </Card>

        {/* Seller Card */}
        <Card
          className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 hover:-translate-y-1"
          onClick={() => handleRoleSelect(UserRole.SELLER)}
        >
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Store className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">I want to Sell</CardTitle>
            <CardDescription>
              List surplus meals and reduce food waste
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Create listings manually or with AI</li>
              <li>Manage your product inventory</li>
              <li>Reach eco-conscious buyers</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Footer tagline */}
      <p className="mt-12 text-sm text-muted-foreground">
        Together, we save meals and the planet.
      </p>
    </div>
  );
}
