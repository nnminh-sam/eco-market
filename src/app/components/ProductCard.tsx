import { Link } from "react-router-dom";
import { MapPin, Eye, Calendar, Heart } from "lucide-react";
import { Product } from "../types/product";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { useState } from "react";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
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
          <button className="absolute top-3 left-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all hover:scale-110">
            <Heart className="size-5 text-[#2d6a6a]" />
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
        </CardContent>
      </Card>
    </Link>
  );
}
