import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "../components/ProductCard";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Search, TrendingUp, Zap } from "lucide-react";
import { getProducts } from "../services/marketApi";
import { productCategoryFilters } from "../constants/productCategories";
import { Product } from "../types/product";

export function Home() {
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [loadingError, setLoadingError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchProducts = async () => {
      setIsLoadingProducts(true);
      const response = await getProducts();

      if (!isMounted) {
        return;
      }

      if (!response.success) {
        setLoadingError(response.message ?? "Không thể tải danh sách sản phẩm.");
        setProducts([]);
        setIsLoadingProducts(false);
        return;
      }

      setProducts(response.data ?? []);
      setLoadingError("");
      setIsLoadingProducts(false);
    };

    void fetchProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    const allCategories = new Set(productCategoryFilters);

    products.forEach((product) => {
      if (product.category) {
        allCategories.add(product.category);
      }
    });

    return Array.from(allCategories);
  }, [products]);

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const matchesCategory =
          selectedCategory === "Tất cả" || product.category === selectedCategory;
        const matchesSearch =
          searchTerm === "" ||
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.description.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
      }),
    [products, selectedCategory, searchTerm]
  );

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#2d6a6a]/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#ff7b3d]/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

        <div className="relative bg-gradient-to-br from-[#2d6a6a] via-[#2d6a6a]/95 to-[#2f3e46] text-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-[#ff7b3d] text-white px-4 py-2 rounded-full mb-6 shadow-lg animate-bounce">
                <Zap className="size-4" />
                <span className="text-sm font-semibold">
                  Chợ Đồ Cũ Thân Thiện Môi Trường
                </span>
              </div>
              <h1 className="text-6xl mb-5 font-bold">EcoMarket 🌿</h1>
              <p className="text-2xl opacity-95 max-w-2xl mx-auto leading-relaxed">
                Sàn giao dịch quần áo, phụ kiện second-hand uy tín
              </p>
              <p className="text-lg opacity-80 mt-3">
                Mua bán dễ dàng - Giá cả hợp lý - Thân thiện môi trường
              </p>
            </div>

            <div className="max-w-3xl mx-auto relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 size-6 text-[#2d6a6a]" />
              <Input
                placeholder="Tìm kiếm quần áo, giày dép, phụ kiện..."
                className="pl-16 pr-6 h-16 text-lg bg-white border-0 shadow-2xl rounded-2xl focus:ring-4 focus:ring-[#ff7b3d]/30"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button className="absolute right-2 top-1/2 -translate-y-1/2 h-12 px-8 bg-[#ff7b3d] hover:bg-[#ff7b3d]/90 text-white shadow-lg rounded-xl">
                Tìm kiếm
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto mt-12">
              <div className="text-center p-4 bg-white/10 backdrop-blur-sm rounded-2xl">
                <p className="text-3xl font-bold">1000+</p>
                <p className="text-sm opacity-90">Sản phẩm</p>
              </div>
              <div className="text-center p-4 bg-white/10 backdrop-blur-sm rounded-2xl">
                <p className="text-3xl font-bold">500+</p>
                <p className="text-sm opacity-90">Người dùng</p>
              </div>
              <div className="text-center p-4 bg-white/10 backdrop-blur-sm rounded-2xl">
                <p className="text-3xl font-bold">98%</p>
                <p className="text-sm opacity-90">Hài lòng</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Categories */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="size-6 text-[#2d6a6a]" />
            <h2 className="text-2xl font-bold text-[#2f3e46]">
              Danh mục sản phẩm
            </h2>
          </div>
          <div className="flex gap-3 flex-wrap">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
                className={`rounded-full px-6 py-2.5 transition-all shadow-md hover:shadow-lg ${
                  selectedCategory === category
                    ? "bg-[#2d6a6a] text-white hover:bg-[#2d6a6a]/90 border-0 scale-105"
                    : "border-2 border-[#2d6a6a]/30 hover:border-[#2d6a6a] hover:text-[#2d6a6a] bg-white"
                }`}
              >
                <span className="font-semibold">{category}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Products Count */}
        <div className="mb-6 bg-gradient-to-r from-[#2d6a6a]/10 to-[#ff7b3d]/10 p-4 rounded-2xl border-2 border-[#2d6a6a]/20">
          <p className="text-lg">
            Tìm thấy{" "}
            <span className="font-bold text-[#2d6a6a] text-2xl">
              {filteredProducts.length}
            </span>{" "}
            sản phẩm 🎉
          </p>
        </div>

        {/* Products Grid */}
        {isLoadingProducts ? (
          <div className="text-center py-16 bg-white rounded-3xl shadow-lg border-2 border-dashed border-[#2d6a6a]/30">
            <p className="text-xl text-gray-600">Đang tải sản phẩm...</p>
          </div>
        ) : loadingError ? (
          <div className="text-center py-16 bg-white rounded-3xl shadow-lg border-2 border-dashed border-red-200">
            <p className="text-xl text-red-600 mb-2">Không thể tải sản phẩm</p>
            <p className="text-gray-500">{loadingError}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {!isLoadingProducts && !loadingError && filteredProducts.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl shadow-lg border-2 border-dashed border-[#2d6a6a]/30">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-2xl text-gray-500 mb-2">
              Không tìm thấy sản phẩm nào
            </p>
            <p className="text-gray-400">Thử tìm kiếm với từ khóa khác nhé!</p>
          </div>
        )}
      </div>
    </div>
  );
}
