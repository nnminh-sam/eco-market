import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  MapPin,
  Eye,
  Calendar,
  MessageCircle,
  ArrowLeft,
  User,
  Phone,
  Share2,
  Heart,
  ShoppingCart,
  CheckCircle,
  Pencil,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useMessages } from "../context/MessageContext";
import { useWishlist } from "../context/WishlistContext";
import { toast } from "sonner";
import { Product } from "../types/product";
import {
  getProductById,
  markProductAsSold,
  updateProductListing,
  uploadProductImage,
} from "../services/marketApi";
import { AUTH_SESSION_TOKEN_STORAGE_KEY } from "../context/AuthContext";
import { productCategories } from "../constants/productCategories";

interface EditProductFormData {
  name: string;
  price: string;
  category: string;
  condition: "Like New" | "Very Good" | "Good" | "Fair" | "";
  size: string;
  brand: string;
  location: string;
  description: string;
  otherCategory: string;
}

const maxImages = 10;

function buildEditFormData(product: Product): EditProductFormData {
  const isKnownCategory = productCategories.includes(product.category);

  return {
    name: product.name,
    price: String(product.price),
    category: isKnownCategory ? product.category : "Khác",
    condition: product.condition,
    size: product.size ?? "",
    brand: product.brand ?? "",
    location: product.location,
    description: product.description,
    otherCategory: isKnownCategory ? "" : product.category,
  };
}

export function ProductDetail() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const id = params?.id;
  const { isAuthenticated, user } = useAuth();
  const { addToCart, getItemQuantity } = useCart();
  const { startConversationWithSeller } = useMessages();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [selectedImageUrl, setSelectedImageUrl] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isUploadingEditImages, setIsUploadingEditImages] = useState(false);
  const [editFormData, setEditFormData] = useState<EditProductFormData>({
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
  const [editImageUrls, setEditImageUrls] = useState<string[]>([]);

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
      setSelectedImageUrl(response.data.images?.[0] ?? response.data.image);
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

  const productImages =
    product.images && product.images.length > 0 ? product.images : [product.image];
  const canManageListing =
    isAuthenticated && user?.id === product.seller.id && product.status === "available";

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN").format(price) + " ₫";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  const handleContactSeller = async () => {
    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập để liên hệ người bán");
      navigate("/login");
      return;
    }

    if (user?.id === product.seller.id) {
      toast.error("Bạn không thể nhắn tin cho chính mình");
      return;
    }

    const conversationId = await startConversationWithSeller(product.seller);

    if (!conversationId) {
      toast.error("Không thể mở cuộc trò chuyện lúc này");
      return;
    }

    navigate(`/messages?conversation=${encodeURIComponent(conversationId)}`, {
      state: {
        initialDraft: `Mã sản phẩm: ${product.id} `,
      },
    });
    toast.success("Đã chuyển đến trang tin nhắn 💬");
  };

  const handleShare = async () => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Đã copy link sản phẩm! 📋");
    } catch {
      toast.error("Không thể copy link sản phẩm.");
    }
  };

  const handleAddToCart = () => {
    if (cartQuantity > 0) {
      toast.message("Sản phẩm đã có trong giỏ hàng");
      return;
    }

    addToCart(product, 1);
    toast.success("Đã thêm sản phẩm vào giỏ hàng 🛒");
  };

  const handleToggleWishlist = () => {
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
      setIsEditMode(false);
    } else {
      toast.error(result.message ?? "Không thể thực hiện thao tác này.");
    }
  };

  const handleStartEdit = () => {
    setEditFormData(buildEditFormData(product));
    setEditImageUrls(productImages);
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setIsUploadingEditImages(false);
    setIsSubmittingEdit(false);
  };

  const handleEditChange = (field: keyof EditProductFormData, value: string) => {
    setEditFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);

    if (selectedFiles.length === 0) {
      return;
    }

    const remainingSlots = maxImages - editImageUrls.length;

    if (remainingSlots <= 0) {
      toast.error("Bạn chỉ có thể tải tối đa 10 ảnh.");
      event.target.value = "";
      return;
    }

    const filesToUpload = selectedFiles.slice(0, remainingSlots);

    if (filesToUpload.length < selectedFiles.length) {
      toast.message("Chỉ tải số ảnh vừa đủ với giới hạn 10 ảnh.");
    }

    setIsUploadingEditImages(true);
    let uploadedCount = 0;

    for (const file of filesToUpload) {
      try {
        const uploadedUrl = await uploadProductImage(file);
        setEditImageUrls((prev) => [...prev, uploadedUrl]);
        uploadedCount += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Tải ảnh thất bại.";
        toast.error(`${file.name}: ${message}`);
      }
    }

    if (uploadedCount > 0) {
      toast.success(`Đã tải lên ${uploadedCount} ảnh.`);
    }

    setIsUploadingEditImages(false);
    event.target.value = "";
  };

  const handleRemoveEditImage = (removeIndex: number) => {
    setEditImageUrls((prev) => prev.filter((_, index) => index !== removeIndex));
  };

  const handleSubmitEdit = async (event: FormEvent) => {
    event.preventDefault();

    if (!canManageListing) {
      toast.error("Bạn không có quyền chỉnh sửa tin đăng này.");
      return;
    }

    if (isUploadingEditImages) {
      toast.message("Vui lòng đợi tải ảnh lên hoàn tất.");
      return;
    }

    if (editImageUrls.length === 0) {
      toast.error("Tin đăng cần tối thiểu 1 hình ảnh.");
      return;
    }

    if (!editFormData.category || !editFormData.condition) {
      toast.error("Vui lòng chọn danh mục và tình trạng sản phẩm.");
      return;
    }

    const normalizedCategory =
      editFormData.category === "Khác"
        ? editFormData.otherCategory.trim()
        : editFormData.category;

    if (!normalizedCategory) {
      toast.error("Vui lòng nhập tên danh mục khác.");
      return;
    }

    const numericPrice = Number(editFormData.price);

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

    setIsSubmittingEdit(true);

    const result = await updateProductListing(
      product.id,
      {
        name: editFormData.name,
        price: numericPrice,
        category: normalizedCategory,
        condition: editFormData.condition,
        size: editFormData.size,
        brand: editFormData.brand,
        location: editFormData.location,
        description: editFormData.description,
        imageUrls: editImageUrls,
      },
      sessionToken
    );

    setIsSubmittingEdit(false);

    if (!result.success) {
      toast.error(result.message ?? "Không thể cập nhật tin đăng.");
      return;
    }

    if (result.data) {
      setProduct(result.data);
      setSelectedImageUrl(result.data.images?.[0] ?? result.data.image);
    } else {
      const refreshed = await getProductById(product.id);
      if (refreshed.success && refreshed.data) {
        setProduct(refreshed.data);
        setSelectedImageUrl(refreshed.data.images?.[0] ?? refreshed.data.image);
      }
    }

    setIsEditMode(false);
    toast.success("Cập nhật tin đăng thành công! ✨");
  };

  const cartQuantity = getItemQuantity(product.id);
  const inWishlist = isInWishlist(product.id);

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
                    src={selectedImageUrl || productImages[0]}
                    alt={product.name}
                    className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="absolute top-4 right-4 flex gap-2">
                  <button 
                    onClick={() => {
                      void handleShare();
                    }}
                    className="p-3 bg-white/95 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all hover:scale-110"
                  >
                    <Share2 className="size-5 text-[#2d6a6a]" />
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleWishlist}
                    className="p-3 bg-white/95 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all hover:scale-110"
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
              </CardContent>
              {productImages.length > 1 ? (
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2 p-4 border-t border-[#2d6a6a]/10">
                  {productImages.map((imageUrl, index) => {
                    const isSelected = (selectedImageUrl || productImages[0]) === imageUrl;

                    return (
                      <button
                        key={`${imageUrl}-${index}`}
                        type="button"
                        onClick={() => setSelectedImageUrl(imageUrl)}
                        className={`overflow-hidden rounded-lg border-2 transition-all ${
                          isSelected
                            ? "border-[#ff7b3d]"
                            : "border-transparent hover:border-[#2d6a6a]/40"
                        }`}
                      >
                        <img
                          src={imageUrl}
                          alt={`Ảnh sản phẩm ${index + 1}`}
                          className="h-16 w-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </Card>

            {isEditMode ? (
              <Card className="border-2 border-[#2d6a6a]/20 shadow-lg rounded-3xl">
                <CardContent className="p-8">
                  <form onSubmit={handleSubmitEdit} className="space-y-6">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-3xl font-bold text-[#2f3e46]">Chỉnh sửa tin đăng</h2>
                      <Badge className="bg-[#2d6a6a] text-white">Tin chưa bán</Badge>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-lg text-[#2f3e46]">Hình ảnh sản phẩm *</Label>
                      <label
                        htmlFor="edit-product-images"
                        className="block border-2 border-dashed border-[#2d6a6a]/30 rounded-2xl p-8 text-center hover:border-[#ff7b3d] hover:bg-[#ff7b3d]/5 transition-all cursor-pointer"
                      >
                        <div className="inline-flex p-4 bg-gradient-to-r from-[#2d6a6a]/10 to-[#ff7b3d]/10 rounded-2xl mb-3">
                          {isUploadingEditImages ? (
                            <Loader2 className="size-8 text-[#2d6a6a] animate-spin" />
                          ) : (
                            <Upload className="size-8 text-[#2d6a6a]" />
                          )}
                        </div>
                        <p className="font-medium text-gray-700">
                          {isUploadingEditImages ? "Đang tải ảnh lên..." : "Nhấn để thêm ảnh"}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Tối đa 10 ảnh (JPG, PNG, WEBP) • Đã tải {editImageUrls.length}/{maxImages}
                        </p>
                        <Input
                          id="edit-product-images"
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleEditImageChange}
                          disabled={isUploadingEditImages || editImageUrls.length >= maxImages}
                          className="hidden"
                        />
                      </label>

                      {editImageUrls.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          {editImageUrls.map((imageUrl, index) => (
                            <div
                              key={`${imageUrl}-${index}`}
                              className="relative overflow-hidden rounded-xl border border-[#2d6a6a]/20"
                            >
                              <img
                                src={imageUrl}
                                alt={`Ảnh sản phẩm ${index + 1}`}
                                className="h-24 w-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveEditImage(index)}
                                className="absolute top-2 right-2 size-6 inline-flex items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/85"
                              >
                                <X className="size-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="grid md:grid-cols-2 gap-5">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="edit-name">Tiêu đề tin đăng *</Label>
                        <Input
                          id="edit-name"
                          value={editFormData.name}
                          onChange={(event) => handleEditChange("name", event.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Danh mục *</Label>
                        <Select
                          value={editFormData.category}
                          onValueChange={(value) => handleEditChange("category", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn danh mục" />
                          </SelectTrigger>
                          <SelectContent>
                            {productCategories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {editFormData.category === "Khác" ? (
                        <div className="space-y-2">
                          <Label htmlFor="edit-other-category">Tên danh mục khác *</Label>
                          <Input
                            id="edit-other-category"
                            value={editFormData.otherCategory}
                            onChange={(event) =>
                              handleEditChange("otherCategory", event.target.value)
                            }
                            required
                          />
                        </div>
                      ) : null}

                      <div className="space-y-2">
                        <Label>Tình trạng *</Label>
                        <Select
                          value={editFormData.condition}
                          onValueChange={(value) => handleEditChange("condition", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn tình trạng" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Like New">Like New - Như mới</SelectItem>
                            <SelectItem value="Very Good">Very Good - Rất tốt</SelectItem>
                            <SelectItem value="Good">Good - Tốt</SelectItem>
                            <SelectItem value="Fair">Fair - Khá</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-price">Giá bán (VNĐ) *</Label>
                        <Input
                          id="edit-price"
                          type="number"
                          value={editFormData.price}
                          onChange={(event) => handleEditChange("price", event.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-location">Địa điểm *</Label>
                        <Input
                          id="edit-location"
                          value={editFormData.location}
                          onChange={(event) => handleEditChange("location", event.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-brand">Thương hiệu</Label>
                        <Input
                          id="edit-brand"
                          value={editFormData.brand}
                          onChange={(event) => handleEditChange("brand", event.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-size">Size</Label>
                        <Input
                          id="edit-size"
                          value={editFormData.size}
                          onChange={(event) => handleEditChange("size", event.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-description">Mô tả chi tiết *</Label>
                      <Textarea
                        id="edit-description"
                        rows={7}
                        value={editFormData.description}
                        onChange={(event) => handleEditChange("description", event.target.value)}
                        required
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button
                        type="submit"
                        disabled={isSubmittingEdit || isUploadingEditImages}
                        className="flex-1 gap-2 bg-[#ff7b3d] hover:bg-[#ff7b3d]/90 text-white"
                      >
                        {isSubmittingEdit ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Đang lưu thay đổi...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="size-4" />
                            Lưu thay đổi
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancelEdit}
                        disabled={isSubmittingEdit}
                      >
                        Hủy
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-2 border-[#2d6a6a]/10 shadow-lg rounded-3xl">
                <CardContent className="p-8">
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                      <Badge className="mb-4 bg-[#ff7b3d] text-white shadow-md rounded-full px-4 py-1.5 text-sm font-semibold">
                        {product.condition}
                      </Badge>
                      {product.status === "sold" ? (
                        <Badge className="ml-2 mb-4 bg-gray-500 text-white shadow-md rounded-full px-4 py-1.5 text-sm font-semibold">
                          Đã bán
                        </Badge>
                      ) : null}
                      <h1 className="text-4xl mb-4 text-[#2f3e46]">{product.name}</h1>
                      <p className="text-5xl font-bold text-[#2d6a6a]">{formatPrice(product.price)}</p>
                    </div>

                    {canManageListing ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleStartEdit}
                        className="gap-2"
                      >
                        <Pencil className="size-4" />
                        Chỉnh sửa
                      </Button>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-6 py-8 border-y-2 border-[#2d6a6a]/10 my-8">
                    {product.brand ? (
                      <div className="bg-gradient-to-r from-[#2d6a6a]/5 to-transparent p-4 rounded-xl">
                        <p className="text-sm text-gray-600 mb-1">Thương hiệu</p>
                        <p className="font-semibold text-lg text-[#2f3e46]">{product.brand}</p>
                      </div>
                    ) : null}
                    {product.size ? (
                      <div className="bg-gradient-to-r from-[#ff7b3d]/5 to-transparent p-4 rounded-xl">
                        <p className="text-sm text-gray-600 mb-1">Size</p>
                        <p className="font-semibold text-lg text-[#2f3e46]">{product.size}</p>
                      </div>
                    ) : null}
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
            )}
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
                        disabled={cartQuantity > 0}
                        className="w-full gap-3 h-14 border-2 border-[#2d6a6a] text-[#2d6a6a] hover:bg-[#2d6a6a] hover:text-white rounded-2xl font-semibold text-lg mb-3 disabled:border-gray-300 disabled:text-gray-500 disabled:hover:bg-transparent"
                      >
                        <ShoppingCart className="size-5" />
                        {cartQuantity > 0
                          ? "Đã thêm vào giỏ"
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
                  
                  {canManageListing ? (
                    <Button
                      onClick={handleMarkAsSold}
                      disabled={isSubmittingEdit || isUploadingEditImages}
                      className="w-full gap-3 h-14 bg-[#2d6a6a] hover:bg-[#2d6a6a]/90 text-white shadow-lg hover:shadow-xl rounded-2xl font-semibold text-lg mt-3 transition-all transform hover:-translate-y-0.5"
                    >
                      <CheckCircle className="size-5" />
                      Đánh dấu đã bán
                    </Button>
                  ) : null}
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
