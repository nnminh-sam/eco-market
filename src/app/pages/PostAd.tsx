import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AUTH_SESSION_TOKEN_STORAGE_KEY, useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { ArrowLeft, Upload, Sparkles, CheckCircle, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { productCategories } from "../constants/productCategories";
import { createProductListing, uploadProductImage } from "../services/marketApi";

export function PostAd() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const maxImages = 10;
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "",
    condition: "",
    size: "",
    brand: "",
    location: "",
    description: "",
    otherCategory: "",
  });
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (isUploadingImages) {
      toast.message("Vui lòng đợi tải ảnh lên hoàn tất.");
      return;
    }

    if (imageUrls.length === 0) {
      toast.error("Tin đăng cần tối thiểu 1 hình ảnh.");
      return;
    }

    if (!formData.category || !formData.condition) {
      toast.error("Vui lòng chọn danh mục và tình trạng sản phẩm.");
      return;
    }

    const numericPrice = Number(formData.price);

    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      toast.error("Vui lòng nhập giá bán hợp lệ.");
      return;
    }

    const sessionToken =
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(AUTH_SESSION_TOKEN_STORAGE_KEY);

    if (!sessionToken) {
      toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      navigate("/login");
      return;
    }

    setIsSubmitting(true);

    const result = await createProductListing(
      {
        ...formData,
        category: formData.category === "Khác" ? formData.otherCategory : formData.category,
        price: numericPrice,
        condition: formData.condition as "Like New" | "Very Good" | "Good" | "Fair",
        imageUrls,
      },
      sessionToken
    );

    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.message ?? "Không thể đăng tin.");
      return;
    }

    toast.success("Tin đăng của bạn đã được đăng thành công! 🎉");
    navigate("/");
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);

    if (selectedFiles.length === 0) {
      return;
    }

    const remainingSlots = maxImages - imageUrls.length;

    if (remainingSlots <= 0) {
      toast.error("Bạn chỉ có thể tải tối đa 10 ảnh.");
      event.target.value = "";
      return;
    }

    const filesToUpload = selectedFiles.slice(0, remainingSlots);

    if (filesToUpload.length < selectedFiles.length) {
      toast.message("Chỉ tải số ảnh vừa đủ với giới hạn 10 ảnh.");
    }

    setIsUploadingImages(true);
    let uploadedCount = 0;

    for (const file of filesToUpload) {
      try {
        const uploadedUrl = await uploadProductImage(file);
        setImageUrls((prev) => [...prev, uploadedUrl]);
        uploadedCount += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Tải ảnh thất bại.";
        toast.error(`${file.name}: ${message}`);
      }
    }

    if (uploadedCount > 0) {
      toast.success(`Đã tải lên ${uploadedCount} ảnh.`);
    }

    setIsUploadingImages(false);
    event.target.value = "";
  };

  const handleRemoveImage = (removeIndex: number) => {
    setImageUrls((prev) => prev.filter((_, index) => index !== removeIndex));
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
                <label
                  htmlFor="product-images"
                  className="block border-3 border-dashed border-[#2d6a6a]/30 rounded-2xl p-12 text-center hover:border-[#ff7b3d] hover:bg-[#ff7b3d]/5 transition-all cursor-pointer group"
                >
                  <div className="inline-flex p-5 bg-gradient-to-r from-[#2d6a6a]/10 to-[#ff7b3d]/10 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                    {isUploadingImages ? (
                      <Loader2 className="size-12 text-[#2d6a6a] animate-spin" />
                    ) : (
                      <Upload className="size-12 text-[#2d6a6a]" />
                    )}
                  </div>
                  <p className="text-lg font-medium text-gray-700">
                    {isUploadingImages ? "Đang tải ảnh lên..." : "Nhấn để tải ảnh lên"}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Tối đa 10 ảnh (JPG, PNG, WEBP) • Đã tải {imageUrls.length}/{maxImages}
                  </p>
                  <Input
                    id="product-images"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    disabled={isUploadingImages || imageUrls.length >= maxImages}
                    className="hidden"
                  />
                </label>
                {imageUrls.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {imageUrls.map((imageUrl, index) => (
                      <div
                        key={`${imageUrl}-${index}`}
                        className="relative overflow-hidden rounded-xl border border-[#2d6a6a]/20"
                      >
                        <img
                          src={imageUrl}
                          alt={`Ảnh sản phẩm ${index + 1}`}
                          className="h-28 w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-2 right-2 size-7 inline-flex items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/85"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
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
                      {productCategories.map((cat) => (
                        <SelectItem key={cat} value={cat} className="text-lg">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.category === "Khác" && (
                  <div className="space-y-3">
                    <Label htmlFor="otherCategory" className="text-lg text-[#2f3e46]">Tên danh mục khác *</Label>
                    <Input
                      id="otherCategory"
                      placeholder="VD: Đồ gia dụng, Sách..."
                      value={formData.otherCategory}
                      onChange={(e) => handleChange("otherCategory", e.target.value)}
                      required
                      className="h-14 rounded-xl border-2 border-[#2d6a6a]/20 focus:border-[#2d6a6a] text-lg"
                    />
                  </div>
                )}

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
                  disabled={isUploadingImages || isSubmitting}
                  className="flex-1 h-14 bg-[#ff7b3d] hover:bg-[#ff7b3d]/90 text-white shadow-lg hover:shadow-xl rounded-xl font-semibold text-lg transition-all transform hover:-translate-y-0.5 gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-5 animate-spin" />
                      Đang đăng tin...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="size-5" />
                      Đăng tin ngay
                    </>
                  )}
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
