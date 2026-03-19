import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { products } from "../data/products";
import { ProductCard } from "../components/ProductCard";
import { Button } from "../components/ui/button";
import { ArrowLeft, Plus, Package } from "lucide-react";

export function MyListings() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  const myProducts = products.filter((p) => p.seller.id === user?.id);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f5f5dc]/30 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-10">
          <Link to="/" className="inline-flex items-center gap-2 text-[#2d6a6a] hover:text-[#ff7b3d] font-medium transition-colors group">
            <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
            Quay lại
          </Link>
          <Link to="/post-ad">
            <Button className="gap-2 bg-[#ff7b3d] hover:bg-[#ff7b3d]/90 text-white shadow-lg hover:shadow-xl rounded-full px-6 h-12 font-semibold transition-all transform hover:-translate-y-0.5">
              <Plus className="size-5" />
              Đăng tin mới
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-gradient-to-r from-[#2d6a6a] to-[#2d6a6a]/90 rounded-2xl shadow-lg">
            <Package className="size-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-[#2f3e46]">Tin đăng của tôi</h1>
            <p className="text-gray-600">Quản lý các sản phẩm bạn đang bán</p>
          </div>
        </div>

        {myProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-[#2d6a6a]/30 shadow-lg">
            <div className="text-7xl mb-6">📦</div>
            <p className="text-2xl text-gray-700 mb-3 font-semibold">Bạn chưa có tin đăng nào</p>
            <p className="text-gray-500 mb-8">Bắt đầu bán đồ cũ của bạn ngay hôm nay!</p>
            <Link to="/post-ad">
              <Button className="bg-[#ff7b3d] hover:bg-[#ff7b3d]/90 text-white shadow-lg hover:shadow-xl rounded-full px-8 h-14 text-lg font-semibold gap-2 transition-all transform hover:-translate-y-0.5">
                <Plus className="size-5" />
                Đăng tin ngay
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-r from-[#2d6a6a]/10 to-[#ff7b3d]/10 p-5 rounded-2xl border-2 border-[#2d6a6a]/20 mb-8">
              <p className="text-lg">
                Bạn có{" "}
                <span className="font-bold text-[#2d6a6a] text-2xl">
                  {myProducts.length}
                </span>{" "}
                tin đăng đang hoạt động 🎯
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {myProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
