import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { ArrowLeft, Upload, Sparkles, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { categories } from "../data/products";

export function PostAd() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "",
    condition: "",
    size: "",
    brand: "",
    location: "",
    description: "",
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    toast.success("Tin đăng của bạn đã được đăng thành công! 🎉");
    navigate("/");
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f5f5dc]/30 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/" className="inline-flex items-center gap-2 mb-8 text-[#2d6a6a] hover:text-[#ff7b3d] font-medium transition-colors group">
          <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
          Quay lại
        </Link>

        <Card className="border-2 border-[#2d6a6a]/20 shadow-xl rounded-3xl">
          <CardHeader className="bg-gradient-to-r from-[#2d6a6a]/5 to-[#ff7b3d]/5 pb-8 pt-8 rounded-t-3xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-[#ff7b3d] rounded-2xl shadow-lg">
                <Sparkles className="size-6 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-[#2f3e46]">Đăng tin rao bán</h1>
            </div>
            <p className="text-gray-600 text-lg">Điền thông tin sản phẩm của bạn để bắt đầu bán hàng</p>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Images */}
              <div className="space-y-3">
                <Label className="text-lg text-[#2f3e46]">Hình ảnh sản phẩm *</Label>
                <div className="border-3 border-dashed border-[#2d6a6a]/30 rounded-2xl p-12 text-center hover:border-[#ff7b3d] hover:bg-[#ff7b3d]/5 transition-all cursor-pointer group">
                  <div className="inline-flex p-5 bg-gradient-to-r from-[#2d6a6a]/10 to-[#ff7b3d]/10 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="size-12 text-[#2d6a6a]" />
                  </div>
                  <p className="text-lg font-medium text-gray-700">Nhấn để tải ảnh lên</p>
                  <p className="text-sm text-gray-500 mt-2">Tối đa 10 ảnh (JPG, PNG)</p>
                </div>
              </div>

              {/* Product Info */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3 md:col-span-2">
                  <Label htmlFor="name" className="text-lg text-[#2f3e46]">
                    Tiêu đề tin đăng *
                  </Label>
                  <Input
                    id="name"
                    placeholder="VD: Áo khoác jean Levi's size M"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    required
                    className="h-14 rounded-xl border-2 border-[#2d6a6a]/20 focus:border-[#2d6a6a] text-lg"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="category" className="text-lg text-[#2f3e46]">Danh mục *</Label>
                  <Select value={formData.category} onValueChange={(value) => handleChange("category", value)}>
                    <SelectTrigger className="h-14 rounded-xl border-2 border-[#2d6a6a]/20 text-lg">
                      <SelectValue placeholder="Chọn danh mục" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {categories.filter(c => c !== "Tất cả").map((cat) => (
                        <SelectItem key={cat} value={cat} className="text-lg">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="condition" className="text-lg text-[#2f3e46]">Tình trạng *</Label>
                  <Select value={formData.condition} onValueChange={(value) => handleChange("condition", value)}>
                    <SelectTrigger className="h-14 rounded-xl border-2 border-[#2d6a6a]/20 text-lg">
                      <SelectValue placeholder="Chọn tình trạng" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Like New" className="text-lg">✨ Like New - Như mới</SelectItem>
                      <SelectItem value="Very Good" className="text-lg">⭐ Very Good - Rất tốt</SelectItem>
                      <SelectItem value="Good" className="text-lg">👍 Good - Tốt</SelectItem>
                      <SelectItem value="Fair" className="text-lg">👌 Fair - Khá</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="price" className="text-lg text-[#2f3e46]">Giá bán (VNĐ) *</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="500000"
                    value={formData.price}
                    onChange={(e) => handleChange("price", e.target.value)}
                    required
                    className="h-14 rounded-xl border-2 border-[#2d6a6a]/20 focus:border-[#2d6a6a] text-lg"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="location" className="text-lg text-[#2f3e46]">Địa điểm *</Label>
                  <Input
                    id="location"
                    placeholder="VD: Quận 1, TP.HCM"
                    value={formData.location}
                    onChange={(e) => handleChange("location", e.target.value)}
                    required
                    className="h-14 rounded-xl border-2 border-[#2d6a6a]/20 focus:border-[#2d6a6a] text-lg"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="brand" className="text-lg text-[#2f3e46]">Thương hiệu</Label>
                  <Input
                    id="brand"
                    placeholder="VD: Nike, Zara, H&M..."
                    value={formData.brand}
                    onChange={(e) => handleChange("brand", e.target.value)}
                    className="h-14 rounded-xl border-2 border-[#2d6a6a]/20 focus:border-[#2d6a6a] text-lg"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="size" className="text-lg text-[#2f3e46]">Size</Label>
                  <Input
                    id="size"
                    placeholder="VD: M, L, 42..."
                    value={formData.size}
                    onChange={(e) => handleChange("size", e.target.value)}
                    className="h-14 rounded-xl border-2 border-[#2d6a6a]/20 focus:border-[#2d6a6a] text-lg"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-3">
                <Label htmlFor="description" className="text-lg text-[#2f3e46]">
                  Mô tả chi tiết *
                </Label>
                <Textarea
                  id="description"
                  placeholder="Mô tả chi tiết về sản phẩm: tình trạng, màu sắc, chất liệu, lý do bán..."
                  rows={8}
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  required
                  className="rounded-xl border-2 border-[#2d6a6a]/20 focus:border-[#2d6a6a] text-lg"
                />
              </div>

              {/* Submit */}
              <div className="flex gap-4 pt-6">
                <Button
                  type="submit"
                  className="flex-1 h-14 bg-[#ff7b3d] hover:bg-[#ff7b3d]/90 text-white shadow-lg hover:shadow-xl rounded-xl font-semibold text-lg transition-all transform hover:-translate-y-0.5 gap-2"
                >
                  <CheckCircle className="size-5" />
                  Đăng tin ngay
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/")}
                  className="h-14 px-8 border-2 border-[#2d6a6a]/30 hover:border-[#2d6a6a] rounded-xl font-semibold text-lg"
                >
                  Hủy
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
