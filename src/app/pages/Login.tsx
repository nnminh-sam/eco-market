import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
} from "../components/ui/card";
import { Recycle, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const allowedSignUpEmailDomain = "@st.ueh.edu.vn";
const invalidSignUpEmailMessage = "Bạn phải sử dụng email phù hợp để đăng kí";

function hasAllowedSignUpEmail(email: string) {
  return email.trim().toLowerCase().endsWith(allowedSignUpEmailDomain);
}

export function Login() {
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (isSignUpMode && !hasAllowedSignUpEmail(email)) {
      toast.error(invalidSignUpEmailMessage);
      return;
    }

    if (isSignUpMode && password !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp.");
      return;
    }

    setIsSubmitting(true);
    const result = isSignUpMode
      ? await signup(email, password)
      : await login(email, password);
    setIsSubmitting(false);

    if (result.success) {
      toast.success(result.message ?? "Thành công!");
      navigate("/");
    } else {
      toast.error(result.message ?? "Đăng nhập thất bại.");
    }
  };

  const toggleMode = () => {
    setIsSignUpMode((prev) => !prev);
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f5dc] via-white to-[#e8e8d0] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#2d6a6a]/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#ff7b3d]/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

      <Card className="w-full max-w-md border-2 border-[#2d6a6a]/20 shadow-2xl rounded-3xl relative bg-white/95 backdrop-blur-sm">
        <CardHeader className="text-center pt-8 pb-6">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#2d6a6a] to-[#ff7b3d] rounded-3xl blur-lg animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-[#2d6a6a] to-[#2d6a6a]/80 p-5 rounded-3xl shadow-2xl">
                <Recycle className="size-16 text-white" />
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#2d6a6a] via-[#2d6a6a] to-[#ff7b3d] bg-clip-text text-transparent mb-3">
            EcoMarket
          </h1>
          <div className="flex items-center justify-center gap-2 text-[#2d6a6a]/70 mb-4">
            <Sparkles className="size-4" />
            <span className="text-sm font-medium">Chợ Đồ Cũ Xanh</span>
          </div>
          <CardDescription className="text-base">
            {isSignUpMode
              ? "Tạo tài khoản bằng email và mật khẩu"
              : "Đăng nhập để đăng tin và nhắn tin với người bán"}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#2f3e46]">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="nguyenvana@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 rounded-xl border-2 border-[#2d6a6a]/20 focus:border-[#2d6a6a] transition-all"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#2f3e46]">
                Mật khẩu
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 rounded-xl border-2 border-[#2d6a6a]/20 focus:border-[#2d6a6a] transition-all"
              />
            </div>
            {isSignUpMode && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-[#2f3e46]">
                  Xác nhận mật khẩu
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-12 rounded-xl border-2 border-[#2d6a6a]/20 focus:border-[#2d6a6a] transition-all"
                />
              </div>
            )}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-gradient-to-r from-[#2d6a6a] to-[#2d6a6a]/90 hover:from-[#2d6a6a]/90 hover:to-[#2d6a6a]/80 text-white shadow-lg hover:shadow-xl rounded-xl font-semibold transition-all transform hover:-translate-y-0.5 group"
            >
              <span>
                {isSubmitting
                  ? "Đang xử lý..."
                  : isSignUpMode
                    ? "Tạo tài khoản"
                    : "Đăng nhập"}
              </span>
              <ArrowRight className="size-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-[#2d6a6a] hover:text-[#ff7b3d] font-medium transition-colors"
            >
              {isSignUpMode
                ? "Đã có tài khoản? Đăng nhập"
                : "Chưa có tài khoản? Đăng ký"}
            </button>
          </div>

          <div className="mt-6 text-center">
            <Link
              to="/"
              className="text-[#2d6a6a] hover:text-[#ff7b3d] font-medium transition-colors inline-flex items-center gap-1 group"
            >
              ← Quay lại trang chủ
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
