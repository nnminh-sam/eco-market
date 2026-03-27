import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User } from "../types/product";

interface AuthResult {
  success: boolean;
  message?: string;
  expiresInSeconds?: number;
}

interface AuthApiResponse {
  success?: boolean;
  message?: string;
  token?: string;
  user?: User;
  expiresInSeconds?: number;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (email: string, password: string) => Promise<AuthResult>;
  verifySignupCode: (email: string, code: string) => Promise<AuthResult>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AUTH_SESSION_TOKEN_STORAGE_KEY = "marketeo-auth-session-token";
const rawApiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
const apiBaseUrl = rawApiBaseUrl.replace(/\/$/, "");

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function requestAuthApi(path: string, init?: RequestInit) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  let data: AuthApiResponse = {};

  try {
    data = (await response.json()) as AuthApiResponse;
  } catch {
    data = {};
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let isMounted = true;

    const restoreSession = async () => {
      const token = window.localStorage.getItem(AUTH_SESSION_TOKEN_STORAGE_KEY);
      if (!token) {
        return;
      }

      try {
        const response = await requestAuthApi("/api/auth/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!isMounted) {
          return;
        }

        if (response.ok && response.data.success && response.data.user) {
          setUser(response.data.user);
          return;
        }
      } catch {
        if (!isMounted) {
          return;
        }
      }

      window.localStorage.removeItem(AUTH_SESSION_TOKEN_STORAGE_KEY);
      setUser(null);
    };

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const response = await requestAuthApi("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: normalizeEmail(email),
          password,
        }),
      });

      if (!response.ok || !response.data.success) {
        return {
          success: false,
          message: response.data.message ?? "Sai email hoặc mật khẩu.",
        };
      }

      if (!response.data.user || !response.data.token) {
        return {
          success: false,
          message: "Phản hồi đăng nhập không hợp lệ.",
        };
      }

      setUser(response.data.user);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(AUTH_SESSION_TOKEN_STORAGE_KEY, response.data.token);
      }

      return {
        success: true,
        message: response.data.message ?? "Đăng nhập thành công!",
      };
    } catch {
      return {
        success: false,
        message: "Không thể kết nối đến máy chủ đăng nhập.",
      };
    }
  };

  const signup = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const response = await requestAuthApi("/api/auth/sign-up", {
        method: "POST",
        body: JSON.stringify({
          email: normalizeEmail(email),
          password,
        }),
      });

      if (!response.ok || !response.data.success) {
        return {
          success: false,
          message: response.data.message ?? "Đăng ký thất bại.",
        };
      }

      return {
        success: true,
        message: response.data.message ?? "Đã gửi mã xác thực.",
        expiresInSeconds: response.data.expiresInSeconds,
      };
    } catch {
      return {
        success: false,
        message: "Không thể kết nối đến máy chủ đăng ký.",
      };
    }
  };

  const verifySignupCode = async (
    email: string,
    code: string,
  ): Promise<AuthResult> => {
    try {
      const response = await requestAuthApi("/api/auth/sign-up/verify", {
        method: "POST",
        body: JSON.stringify({
          email: normalizeEmail(email),
          code: code.trim(),
        }),
      });

      if (!response.ok || !response.data.success) {
        return {
          success: false,
          message: response.data.message ?? "Xác thực đăng ký thất bại.",
        };
      }

      if (!response.data.user || !response.data.token) {
        return {
          success: false,
          message: "Phản hồi xác thực đăng ký không hợp lệ.",
        };
      }

      setUser(response.data.user);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          AUTH_SESSION_TOKEN_STORAGE_KEY,
          response.data.token,
        );
      }

      return {
        success: true,
        message: response.data.message ?? "Tạo tài khoản thành công!",
      };
    } catch {
      return {
        success: false,
        message: "Không thể kết nối đến máy chủ xác thực đăng ký.",
      };
    }
  };

  const logout = () => {
    const token =
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(AUTH_SESSION_TOKEN_STORAGE_KEY);

    setUser(null);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(AUTH_SESSION_TOKEN_STORAGE_KEY);
    }

    if (token) {
      void requestAuthApi("/api/auth/sign-out", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        verifySignupCode,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
