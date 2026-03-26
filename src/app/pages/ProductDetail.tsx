import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MapPin, Eye, Calendar, MessageCircle, ArrowLeft, User, Phone, Share2, Heart, ShoppingCart, CheckCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { toast } from "sonner";
import { Product } from "../types/product";
import { getProductById, markProductAsSold } from "../services/marketApi";
import { AUTH_SESSION_TOKEN_STORAGE_KEY } from "../context/AuthContext";

export function ProductDetail() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const id = params?.id;
  const { isAuthenticated, user } = useAuth();
  const { addToCart, getItemQuantity } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);

  useEffect(() => {
    if (!id) {
      setIsLoadingProduct(false);
      return;
    }

    let isMounted = true;

    const fetchProduct = async () => {
      setIsLoadingProduct(true);
      const response = await getProductById(id);

      if (!isMounted) {
        return;
      }

      if (!response.success || !response.data) {
        setProduct(null);
        setIsLoadingProduct(false);
        return;
      }

      setProduct(response.data);
      setIsLoadingProduct(false);
    };

    void fetchProduct();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoadingProduct) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-xl text-gray-600">Đang tải thông tin sản phẩm...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="text-6xl mb-4">😕</div>
        <h1 className="text-3xl mb-4">Không tìm thấy sản phẩm</h1>
        <Link to="/">
          <Button className="bg-[#2d6a6a] hover:bg-[#2d6a6a]/90">Quay lại trang chủ</Button>
        </Link>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN").format(price) + " ₫";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  const handleContactSeller = () => {
    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập để liên hệ người bán");
      navigate("/login");
      return;
    }
    navigate("/messages");
    toast.success("Đã chuyển đến trang tin nhắn 💬");
  };

  const handleShare = () => {
    toast.success("Đã copy link sản phẩm! 📋");
  };

  const handleAddToCart = () => {
    addToCart(product, 1);
    toast.success("Đã thêm sản phẩm vào giỏ hàng 🛒");
  };
  
  const handleMarkAsSold = async () => {
    const sessionToken = window.localStorage.getItem(AUTH_SESSION_TOKEN_STORAGE_KEY);
    if (!sessionToken) {
      toast.error("Vui lòng đăng nhập lại.");
      navigate("/login");
      return;
    }

    const confirmed = window.confirm("Bạn có chắc chắn muốn đánh dấu sản phẩm này là đã bán? Thao tác này sẽ gỡ sản phẩm khỏi danh sách công khai.");
    if (!confirmed) return;

    const result = await markProductAsSold(product.id, sessionToken);

    if (result.success) {
      toast.success("Chúc mừng bạn đã bán được hàng! 🎉");
      setProduct({ ...product, status: "sold" });
    } else {
      toast.error(result.message ?? "Không thể thực hiện thao tác này.");
    }
  };

  const cartQuantity = getItemQuantity(product.id);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f5f5dc]/30 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/" className="inline-flex items-center gap-2 mb-8 text-[#2d6a6a] hover:text-[#ff7b3d] font-medium transition-colors group">
          <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
          Quay lại danh sách
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image */}
            <Card className="border-2 border-[#2d6a6a]/10 shadow-lg rounded-3xl overflow-hidden">
              <CardContent className="p-0 relative group">
                <div className="aspect-square overflow-hidden bg-gradient-to-br from-[#f5f5dc] to-[#e8e8d0]">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="absolute top-4 right-4 flex gap-2">
                  <button 
                    onClick={handleShare}
                    className="p-3 bg-white/95 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all hover:scale-110"
                  >
                    <Share2 className="size-5 text-[#2d6a6a]" />
                  </button>
                  <button className="p-3 bg-white/95 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all hover:scale-110">
                    <Heart className="size-5 text-[#ff7b3d]" />
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Details */}
            <Card className="border-2 border-[#2d6a6a]/10 shadow-lg rounded-3xl">
              <CardContent className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <Badge className="mb-4 bg-[#ff7b3d] text-white shadow-md rounded-full px-4 py-1.5 text-sm font-semibold">
                      {product.condition}
                    </Badge>
                    {product.status === "sold" && (
                      <Badge className="ml-2 mb-4 bg-gray-500 text-white shadow-md rounded-full px-4 py-1.5 text-sm font-semibold">
                        Đã bán
                      </Badge>
                    )}
                    <h1 className="text-4xl mb-4 text-[#2f3e46]">{product.name}</h1>
                    <p className="text-5xl font-bold text-[#2d6a6a]">{formatPrice(product.price)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 py-8 border-y-2 border-[#2d6a6a]/10 my-8">
                  {product.brand && (
                    <div className="bg-gradient-to-r from-[#2d6a6a]/5 to-transparent p-4 rounded-xl">
                      <p className="text-sm text-gray-600 mb-1">Thương hiệu</p>
                      <p className="font-semibold text-lg text-[#2f3e46]">{product.brand}</p>
                    </div>
                  )}
                  {product.size && (
                    <div className="bg-gradient-to-r from-[#ff7b3d]/5 to-transparent p-4 rounded-xl">
                      <p className="text-sm text-gray-600 mb-1">Size</p>
                      <p className="font-semibold text-lg text-[#2f3e46]">{product.size}</p>
                    </div>
                  )}
                  <div className="bg-gradient-to-r from-[#2d6a6a]/5 to-transparent p-4 rounded-xl">
                    <p className="text-sm text-gray-600 mb-1">Tình trạng</p>
                    <p className="font-semibold text-lg text-[#2f3e46]">{product.condition}</p>
                  </div>
                  <div className="bg-gradient-to-r from-[#ff7b3d]/5 to-transparent p-4 rounded-xl">
                    <p className="text-sm text-gray-600 mb-1">Danh mục</p>
                    <p className="font-semibold text-lg text-[#2f3e46]">{product.category}</p>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl mb-4 text-[#2f3e46] font-bold">Mô tả chi tiết</h2>
                  <p className="text-gray-700 leading-relaxed text-lg whitespace-pre-line">
                    {product.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-5">
              {/* Seller Info */}
              <Card className="border-2 border-[#2d6a6a]/20 shadow-lg rounded-3xl overflow-hidden">
                <div className="bg-gradient-to-r from-[#2d6a6a] to-[#2d6a6a]/90 p-6 text-white">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    👤 Thông tin người bán
                  </h3>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="size-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                      <User className="size-8 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-xl">{product.seller.name}</p>
                      <p className="text-sm text-white/80">
                        Tham gia {formatDate(product.seller.joinedDate)}
                      </p>
                    </div>
                  </div>
                  {product.seller.phone && (
                    <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm px-4 py-3 rounded-xl">
                      <Phone className="size-5" />
                      <span className="font-medium">{product.seller.phone}</span>
                    </div>
                  )}
                </div>
                <CardContent className="p-6">
                  {product.status !== "sold" && (
                    <>
                      <Button
                        onClick={handleAddToCart}
                        variant="outline"
                        className="w-full gap-3 h-14 border-2 border-[#2d6a6a] text-[#2d6a6a] hover:bg-[#2d6a6a] hover:text-white rounded-2xl font-semibold text-lg mb-3"
                      >
                        <ShoppingCart className="size-5" />
                        {cartQuantity > 0
                          ? `Đã có ${cartQuantity} trong giỏ`
                          : "Thêm vào giỏ hàng"}
                      </Button>
                      <Button
                        onClick={handleContactSeller}
                        className="w-full gap-3 h-14 bg-[#ff7b3d] hover:bg-[#ff7b3d]/90 text-white shadow-lg hover:shadow-xl rounded-2xl font-semibold text-lg transition-all transform hover:-translate-y-0.5"
                      >
                        <MessageCircle className="size-5" />
                        Nhắn tin cho người bán
                      </Button>
                    </>
                  )}
                  
                  {isAuthenticated && user?.id === product.seller.id && product.status === "available" && (
                    <Button
                      onClick={handleMarkAsSold}
                      className="w-full gap-3 h-14 bg-[#2d6a6a] hover:bg-[#2d6a6a]/90 text-white shadow-lg hover:shadow-xl rounded-2xl font-semibold text-lg mt-3 transition-all transform hover:-translate-y-0.5"
                    >
                      <CheckCircle className="size-5" />
                      Đánh dấu đã bán
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Location & Stats */}
              <Card className="border-2 border-[#2d6a6a]/10 shadow-lg rounded-3xl">
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-[#2d6a6a]/5 to-transparent rounded-xl">
                    <div className="p-2 bg-[#2d6a6a] rounded-xl">
                      <MapPin className="size-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Địa điểm</p>
                      <p className="font-semibold text-[#2f3e46]">{product.location}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-[#ff7b3d]/5 to-transparent rounded-xl">
                    <div className="p-2 bg-[#ff7b3d] rounded-xl">
                      <Calendar className="size-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Ngày đăng</p>
                      <p className="font-semibold text-[#2f3e46]">{formatDate(product.postedDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-[#2d6a6a]/5 to-transparent rounded-xl">
                    <div className="p-2 bg-[#2d6a6a] rounded-xl">
                      <Eye className="size-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Lượt xem</p>
                      <p className="font-semibold text-[#2f3e46]">{product.views} lượt</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
