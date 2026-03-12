import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

export default function BuyerLayout() {
  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </>
  );
}
