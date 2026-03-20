import { Link } from "react-router-dom";
import { ArrowLeft, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useCart } from "../context/CartContext";
import { toast } from "sonner";

export function Cart() {
  const { items, totalItems, totalAmount, updateQuantity, removeFromCart, clearCart } =
    useCart();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN").format(price) + " ₫";
  };

  const handleRemoveItem = (productId: string) => {
    removeFromCart(productId);
    toast.success("Đã xóa sản phẩm khỏi giỏ hàng");
  };

  const handleClearCart = () => {
    clearCart();
    toast.success("Đã xóa toàn bộ giỏ hàng");
  };

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

        <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-[#2d6a6a] to-[#2d6a6a]/90 rounded-2xl shadow-lg">
              <ShoppingCart className="size-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-[#2f3e46]">Giỏ hàng của bạn</h1>
              <p className="text-gray-600">{totalItems} sản phẩm trong giỏ</p>
            </div>
          </div>
          {items.length > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={handleClearCart}
              className="border-2 border-red-200 text-red-600 hover:bg-red-50 rounded-xl"
            >
              <Trash2 className="size-4" />
              Xóa tất cả
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <Card className="border-2 border-dashed border-[#2d6a6a]/30 rounded-3xl shadow-lg bg-white">
            <CardContent className="py-20 text-center">
              <div className="text-6xl mb-4">🛒</div>
              <p className="text-2xl font-semibold text-[#2f3e46] mb-2">Giỏ hàng đang trống</p>
              <p className="text-gray-500 mb-8">Thêm sản phẩm yêu thích để mua sắm nhé!</p>
              <Link to="/">
                <Button className="bg-[#2d6a6a] hover:bg-[#2d6a6a]/90 text-white rounded-full px-8 h-12">
                  Khám phá sản phẩm
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <Card key={item.product.id} className="border-2 border-[#2d6a6a]/10 rounded-2xl shadow-md">
                  <CardContent className="p-5">
                    <div className="flex gap-4">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="size-24 sm:size-28 rounded-xl object-cover bg-[#f5f5dc]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-lg font-semibold text-[#2f3e46] line-clamp-2">
                          {item.product.name}
                        </p>
                        <p className="text-2xl font-bold text-[#2d6a6a] mt-2">
                          {formatPrice(item.product.price)}
                        </p>
                        <div className="flex items-center justify-between mt-4 gap-3 flex-wrap">
                          <div className="inline-flex items-center gap-2 bg-[#f5f5dc] rounded-xl p-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                updateQuantity(item.product.id, item.quantity - 1)
                              }
                              className="size-8 rounded-lg"
                            >
                              <Minus className="size-4" />
                            </Button>
                            <span className="min-w-8 text-center font-semibold text-[#2f3e46]">
                              {item.quantity}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                updateQuantity(item.product.id, item.quantity + 1)
                              }
                              className="size-8 rounded-lg"
                            >
                              <Plus className="size-4" />
                            </Button>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => handleRemoveItem(item.product.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl"
                          >
                            <Trash2 className="size-4" />
                            Xóa
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="lg:col-span-1">
              <Card className="border-2 border-[#2d6a6a]/20 rounded-3xl shadow-lg sticky top-24">
                <CardContent className="p-6 space-y-4">
                  <h2 className="text-2xl font-bold text-[#2f3e46]">Tóm tắt đơn hàng</h2>
                  <div className="flex justify-between text-gray-600">
                    <span>Tạm tính ({totalItems} sản phẩm)</span>
                    <span>{formatPrice(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Phí vận chuyển</span>
                    <span>Miễn phí</span>
                  </div>
                  <div className="border-t pt-4 flex justify-between items-center">
                    <span className="text-lg font-semibold text-[#2f3e46]">Tổng cộng</span>
                    <span className="text-2xl font-bold text-[#2d6a6a]">
                      {formatPrice(totalAmount)}
                    </span>
                  </div>
                  <Button
                    type="button"
                    className="w-full h-12 bg-[#ff7b3d] hover:bg-[#ff7b3d]/90 text-white rounded-xl font-semibold"
                    onClick={() => toast.success("Chức năng thanh toán sẽ sớm ra mắt!")}
                  >
                    Thanh toán
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
