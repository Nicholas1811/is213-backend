import { createBrowserRouter } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import BuyerLayout from "@/components/layout/BuyerLayout";
import SellerLayout from "@/components/layout/SellerLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import HomePage from "@/pages/HomePage";
import BuyerHome from "@/pages/buyer/BuyerHome";
import Marketplace from "@/pages/buyer/Marketplace";
import ListingDetail from "@/pages/buyer/ListingDetail";
import EarnPoints from "@/pages/buyer/EarnPoints";
import MyOrders from "@/pages/buyer/MyOrders";
import OrderDetail from "@/pages/buyer/OrderDetail";
import PointsHistory from "@/pages/buyer/PointsHistory";
import SellerHome from "@/pages/seller/SellerHome";
import CreateListing from "@/pages/seller/CreateListing";
import ManualListingForm from "@/pages/seller/ManualListingForm";
import AIListingFlow from "@/pages/seller/AIListingFlow";
import MyListings from "@/pages/seller/MyListings";
import { UserRole } from "@/lib/constants";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      // Buyer routes
      {
        path: "buyer",
        element: (
          <ProtectedRoute requiredRole={UserRole.BUYER}>
            <BuyerLayout />
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: <BuyerHome />,
          },
          {
            path: "marketplace",
            element: <Marketplace />,
          },
          {
            path: "marketplace/:id",
            element: <ListingDetail />,
          },
          {
            path: "earn-points",
            element: <EarnPoints />,
          },
          {
            path: "orders",
            element: <MyOrders />,
          },
          {
            path: "orders/:id",
            element: <OrderDetail />,
          },
          {
            path: "points",
            element: <PointsHistory />,
          },
        ],
      },
      // Seller routes
      {
        path: "seller",
        element: (
          <ProtectedRoute requiredRole={UserRole.SELLER}>
            <SellerLayout />
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: <SellerHome />,
          },
          {
            path: "create",
            element: <CreateListing />,
          },
          {
            path: "create/manual",
            element: <ManualListingForm />,
          },
          {
            path: "create/ai",
            element: <AIListingFlow />,
          },
          {
            path: "listings",
            element: <MyListings />,
          },
        ],
      },
    ],
  },
]);
