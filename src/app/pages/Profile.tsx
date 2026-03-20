import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Calendar, Package, ShoppingCart, User, Heart } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import { products } from "../data/products";
import { ProductCard } from "../components/ProductCard";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";

export function Profile() {
  const { isAuthenticated, user } = useAuth();
  const { wishlistProductIds } = useWishlist();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated || !user) {
    return null;
  }

  const joinedDate = new Date(user.joinedDate);
  const formattedJoinedDate = Number.isNaN(joinedDate.getTime())
    ? user.joinedDate
    : joinedDate.toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });

  const wishlistProducts = wishlistProductIds
    .map((productId) => products.find((product) => product.id === productId))
    .filter((product): product is (typeof products)[number] => Boolean(product));

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f5f5dc]/30 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 mb-8 text-[#2d6a6a] hover:text-[#ff7b3d] font-medium transition-colors group"
        >
          <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
          Quay lại trang chủ
        </Link>

        <Card className="border-2 border-[#2d6a6a]/15 rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-[#2d6a6a] to-[#2d6a6a]/90 p-8 text-white">
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-2xl bg-white/20 flex items-center justify-center">
                <User className="size-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{user.name}</h1>
                <p className="text-white/85">Hồ sơ cá nhân</p>
              </div>
            </div>
          </div>

          <CardContent className="p-8 space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#2d6a6a]/5 border border-[#2d6a6a]/10">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <Mail className="size-4 text-[#2d6a6a]" />
                  Email
                </div>
                <p className="font-semibold text-[#2f3e46]">{user.email}</p>
              </div>

              <div className="p-4 rounded-xl bg-[#ff7b3d]/5 border border-[#ff7b3d]/20">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <Calendar className="size-4 text-[#ff7b3d]" />
                  Ngày tham gia
                </div>
                <p className="font-semibold text-[#2f3e46]">{formattedJoinedDate}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link to="/my-listings">
                <Button className="gap-2 bg-[#2d6a6a] hover:bg-[#2d6a6a]/90 text-white rounded-full px-5">
                  <Package className="size-4" />
                  Tin đăng của tôi
                </Button>
              </Link>
              <Link to="/cart">
                <Button
                  variant="outline"
                  className="gap-2 border-2 border-[#2d6a6a]/30 text-[#2d6a6a] hover:bg-[#2d6a6a]/10 rounded-full px-5"
                >
                  <ShoppingCart className="size-4" />
                  Giỏ hàng
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="mt-10 bg-white/85 border-2 border-[#ff7b3d]/15 rounded-3xl p-6 sm:p-8 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-gradient-to-r from-[#ff7b3d] to-[#ff7b3d]/90 rounded-2xl shadow-lg">
              <Heart className="size-6 text-white fill-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-[#2f3e46]">Danh sách yêu thích</h2>
              <p className="text-gray-600">{wishlistProducts.length} sản phẩm đã lưu</p>
            </div>
          </div>

          {wishlistProducts.length === 0 ? (
            <div className="text-center py-14 bg-white rounded-3xl border-2 border-dashed border-[#ff7b3d]/30 shadow-lg">
              <div className="text-5xl mb-4">💝</div>
              <p className="text-xl text-gray-700 mb-2 font-semibold">
                Bạn chưa có sản phẩm yêu thích nào
              </p>
              <p className="text-gray-500 mb-6">
                Nhấn vào biểu tượng trái tim ở sản phẩm để lưu lại.
              </p>
              <Link to="/">
                <Button className="bg-[#ff7b3d] hover:bg-[#ff7b3d]/90 text-white rounded-full px-8 h-12 font-semibold">
                  Xem sản phẩm
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {wishlistProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
