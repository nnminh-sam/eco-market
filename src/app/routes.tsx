import { Navigate, Route, Routes } from "react-router-dom";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { ProductDetail } from "./pages/ProductDetail";
import { PostAd } from "./pages/PostAd";
import { Messages } from "./pages/Messages";
import { MyListings } from "./pages/MyListings";
import { Cart } from "./pages/Cart";

export const appRoutes = {
  home: "/",
  login: "/login",
  productDetail: "/product/:id",
  postAd: "/post-ad",
  messages: "/messages",
  myListings: "/my-listings",
  cart: "/cart",
};

export function AppRoutes() {
  return (
    <Routes>
      <Route path={appRoutes.home} element={<Home />} />
      <Route path={appRoutes.login} element={<Login />} />
      <Route path={appRoutes.productDetail} element={<ProductDetail />} />
      <Route path={appRoutes.postAd} element={<PostAd />} />
      <Route path={appRoutes.messages} element={<Messages />} />
      <Route path={appRoutes.myListings} element={<MyListings />} />
      <Route path={appRoutes.cart} element={<Cart />} />
      <Route path="*" element={<Navigate to={appRoutes.home} replace />} />
    </Routes>
  );
}
