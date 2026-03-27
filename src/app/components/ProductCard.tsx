import { Link, useNavigate } from "react-router-dom";
import { MapPin, Eye, Calendar, Heart, ShoppingCart } from "lucide-react";
import { Product } from "../types/product";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { MouseEvent, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { toast } from "sonner";
import { markProductAsSold } from "../services/marketApi";
import { AUTH_SESSION_TOKEN_STORAGE_KEY } from "../context/AuthContext";
import { CheckCircle } from "lucide-react";

interface ProductCardProps {
  product: Product;
  isOwnerView?: boolean;
  onStatusChange?: () => void;
}

export function ProductCard({ product, isOwnerView, onStatusChange }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCart, getItemQuantity } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN").format(price) + " ₫";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Hôm nay";
    if (diffDays === 1) return "Hôm qua";
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString("vi-VN");
  };

  const handleAddToCart = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (cartQuantity > 0) {
      toast.message("Sản phẩm đã có trong giỏ hàng");
      return;
    }

    addToCart(product, 1);
    toast.success("Đã thêm sản phẩm vào giỏ hàng 🛒");
  };

  const handleToggleWishlist = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập để thêm vào danh sách yêu thích");
      navigate("/login");
      return;
    }

    const added = toggleWishlist(product.id);
    toast.success(
      added
        ? "Đã thêm vào danh sách yêu thích ❤️"
        : "Đã xóa khỏi danh sách yêu thích"
    );
  };
  
  const handleMarkAsSold = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

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
      if (onStatusChange) {
        onStatusChange();
      }
    } else {
      toast.error(result.message ?? "Không thể thực hiện thao tác này.");
    }
  };

  const cartQuantity = getItemQuantity(product.id);
  const inWishlist = isInWishlist(product.id);

  return (
    <Link to={`/product/${product.id}`}>
      <Card 
        className="overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer h-full border-2 border-transparent hover:border-[#ff7b3d]/30 rounded-2xl group bg-white"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="aspect-square overflow-hidden bg-gradient-to-br from-[#f5f5dc] to-[#e8e8d0] relative">
          <img
            src={product.image}
            alt={product.name}
            className={`size-full object-cover transition-transform duration-500 ${
              isHovered ? "scale-110" : "scale-100"
            }`}
          />
          <Badge className="absolute top-3 right-3 bg-[#ff7b3d] text-white shadow-lg rounded-full px-3 py-1.5 font-semibold">
            {product.condition}
          </Badge>
          {product.status === "sold" && (
            <Badge className="absolute top-3 right-1/2 translate-x-1/2 bg-gray-600 text-white shadow-lg rounded-full px-4 py-2 font-bold text-lg z-10 border-2 border-white">
              SẢN PHẨM ĐÃ BÁN
            </Badge>
          )}
          <button
            type="button"
            onClick={handleToggleWishlist}
            className="absolute top-3 left-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all hover:scale-110"
          >
            <Heart
              className={`size-5 transition-colors ${
                inWishlist
                  ? "text-[#ff7b3d] fill-[#ff7b3d]"
                  : "text-[#2d6a6a]"
              }`}
            />
          </button>
        </div>
        <CardContent className="pt-5 pb-4 px-4">
          <h3 className="mb-3 line-clamp-2 min-h-[3rem] text-[#2f3e46] group-hover:text-[#2d6a6a] transition-colors">
            {product.name}
          </h3>
          <p className="text-3xl font-bold text-[#2d6a6a] mb-4">
            {formatPrice(product.price)}
          </p>
          <div className="space-y-2.5 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#2d6a6a]/10 rounded-lg">
                <MapPin className="size-4 text-[#2d6a6a]" />
              </div>
              <span className="truncate">{product.location}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-gray-400" />
                <span className="text-xs">{formatDate(product.postedDate)}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-[#f5f5dc] px-2.5 py-1 rounded-full">
                <Eye className="size-3.5 text-[#2d6a6a]" />
                <span className="text-xs font-medium text-[#2d6a6a]">{product.views}</span>
              </div>
            </div>
          </div>
          {isOwnerView ? (
            <Button
              type="button"
              onClick={handleMarkAsSold}
              disabled={product.status === "sold"}
              className={`w-full mt-4 rounded-xl font-semibold gap-2 ${
                product.status === "sold" 
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                  : "bg-[#2d6a6a] hover:bg-[#2d6a6a]/90 text-white shadow-md hover:shadow-lg transition-all"
              }`}
            >
              {product.status === "sold" ? (
                "Đã bán"
              ) : (
                <>
                  <CheckCircle className="size-4" />
                  Đánh dấu đã bán
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleAddToCart}
              disabled={product.status === "sold" || cartQuantity > 0}
              className={`w-full mt-4 rounded-xl ${
                product.status === "sold" || cartQuantity > 0
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                  : "bg-[#2d6a6a] hover:bg-[#2d6a6a]/90 text-white"
              }`}
            >
              {product.status === "sold" ? (
                "Hết hàng"
              ) : cartQuantity > 0 ? (
                "Đã thêm vào giỏ"
              ) : (
                <>
                  <ShoppingCart className="size-4" />
                  Thêm vào giỏ
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
