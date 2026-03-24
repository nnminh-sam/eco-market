import { Product } from "../types/product";

const rawApiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
const apiBaseUrl = rawApiBaseUrl.replace(/\/$/, "");

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

interface ApiResponse<TData> {
  success?: boolean;
  message?: string;
  data?: TData;
}

interface CreateUploadUrlData {
  key: string;
  uploadUrl: string;
  fileUrl: string;
  expiresInSeconds: number;
}

export interface CreateListingPayload {
  name: string;
  price: number;
  category: string;
  condition: "Like New" | "Very Good" | "Good" | "Fair";
  size: string;
  brand: string;
  location: string;
  description: string;
  imageUrls: string[];
}

async function requestJson<TData>(path: string, init?: RequestInit) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  let data: ApiResponse<TData> = {};

  try {
    data = (await response.json()) as ApiResponse<TData>;
  } catch {
    data = {};
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

function readErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
}

export async function uploadProductImage(file: File) {
  const mimeType = String(file.type ?? "").toLowerCase();

  if (!allowedImageTypes.has(mimeType)) {
    throw new Error("Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.");
  }

  const uploadUrlResponse = await requestJson<CreateUploadUrlData>("/api/uploads", {
    method: "POST",
    body: JSON.stringify({
      fileName: file.name,
      fileType: mimeType,
    }),
  });

  if (!uploadUrlResponse.ok || !uploadUrlResponse.data.success || !uploadUrlResponse.data.data) {
    throw new Error(uploadUrlResponse.data.message ?? "Không thể tạo URL upload ảnh.");
  }

  const { uploadUrl, fileUrl } = uploadUrlResponse.data.data;
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": mimeType,
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error("Tải ảnh lên S3 thất bại.");
  }

  return fileUrl;
}

export async function createProductListing(payload: CreateListingPayload, sessionToken: string) {
  try {
    const response = await requestJson<{ id: string; createdAt: string }>("/api/products", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok || !response.data.success) {
      return {
        success: false,
        message: response.data.message ?? "Không thể đăng tin lúc này.",
      };
    }

    return {
      success: true,
      message: response.data.message ?? "Đăng tin thành công.",
      data: response.data.data,
    };
  } catch (error) {
    return {
      success: false,
      message: readErrorMessage(error, "Không thể kết nối đến máy chủ."),
    };
  }
}

export async function getProducts() {
  try {
    const response = await requestJson<Product[]>("/api/products", {
      method: "GET",
    });

    if (!response.ok || !response.data.success || !response.data.data) {
      return {
        success: false,
        message: response.data.message ?? "Không thể tải danh sách sản phẩm.",
        data: [] as Product[],
      };
    }

    return {
      success: true,
      data: response.data.data,
    };
  } catch (error) {
    return {
      success: false,
      message: readErrorMessage(error, "Không thể kết nối đến máy chủ."),
      data: [] as Product[],
    };
  }
}

export async function getProductById(productId: string) {
  try {
    const response = await requestJson<Product>(`/api/products/${productId}`, {
      method: "GET",
    });

    if (!response.ok || !response.data.success || !response.data.data) {
      return {
        success: false,
        message: response.data.message ?? "Không tìm thấy sản phẩm.",
      };
    }

    return {
      success: true,
      data: response.data.data,
    };
  } catch (error) {
    return {
      success: false,
      message: readErrorMessage(error, "Không thể kết nối đến máy chủ."),
    };
  }
}

export async function getMyProducts(sessionToken: string) {
  try {
    const response = await requestJson<Product[]>("/api/products/mine", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    });

    if (!response.ok || !response.data.success || !response.data.data) {
      return {
        success: false,
        message: response.data.message ?? "Không thể tải tin đăng của bạn.",
        data: [] as Product[],
      };
    }

    return {
      success: true,
      data: response.data.data,
    };
  } catch (error) {
    return {
      success: false,
      message: readErrorMessage(error, "Không thể kết nối đến máy chủ."),
      data: [] as Product[],
    };
  }
}
