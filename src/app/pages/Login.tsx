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
import { Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import logoUrl from "../../assets/logo.png";

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
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerificationStep, setIsVerificationStep] = useState(false);
  const [verificationExpiresInSeconds, setVerificationExpiresInSeconds] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, signup, verifySignupCode } = useAuth();
  const navigate = useNavigate();

  const verificationLifetimeMinutes = Math.max(
    1,
    Math.ceil((verificationExpiresInSeconds ?? 300) / 60)
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const fullEmail = `${email}@st.ueh.edu.vn`;

    if (isSignUpMode && !hasAllowedSignUpEmail(fullEmail)) {
      toast.error(invalidSignUpEmailMessage);
      return;
    }

    if (isSignUpMode && !isVerificationStep && password !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp.");
      return;
    }

    if (isSignUpMode && isVerificationStep) {
      const normalizedCode = verificationCode.trim();
      if (!normalizedCode) {
        toast.error("Vui lòng nhập mã xác thực.");
        return;
      }

      setIsSubmitting(true);
      const result = await verifySignupCode(fullEmail, normalizedCode);
      setIsSubmitting(false);

      if (result.success) {
        toast.success(result.message ?? "Thành công!");
        navigate("/");
      } else {
        toast.error(result.message ?? "Xác thực đăng ký thất bại.");
      }

      return;
    }

    setIsSubmitting(true);
    const result = isSignUpMode
      ? await signup(fullEmail, password)
      : await login(fullEmail, password);
    setIsSubmitting(false);

    if (result.success) {
      toast.success(result.message ?? "Thành công!");
      if (isSignUpMode) {
        setIsVerificationStep(true);
        setVerificationExpiresInSeconds(result.expiresInSeconds ?? 300);
        setVerificationCode("");
      } else {
        navigate("/");
      }
    } else {
      toast.error(result.message ?? "Đăng nhập thất bại.");
    }
  };

  const handleResendVerificationCode = async () => {
    const fullEmail = `${email}@st.ueh.edu.vn`;

    if (!hasAllowedSignUpEmail(fullEmail)) {
      toast.error(invalidSignUpEmailMessage);
      return;
    }

    if (password.length < 6) {
      toast.error("Mật khẩu cần ít nhất 6 ký tự.");
      return;
    }

    setIsSubmitting(true);
    const result = await signup(fullEmail, password);
    setIsSubmitting(false);

    if (result.success) {
      toast.success(result.message ?? "Đã gửi lại mã xác thực.");
      setVerificationExpiresInSeconds(result.expiresInSeconds ?? 300);
    } else {
      toast.error(result.message ?? "Không thể gửi lại mã xác thực.");
    }
  };

  const toggleMode = () => {
    setIsSignUpMode((prev) => !prev);
    setPassword("");
    setConfirmPassword("");
    setVerificationCode("");
    setIsVerificationStep(false);
    setVerificationExpiresInSeconds(null);
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
              <div className="absolute inset-0 bg-gradient-to-r from-[#2d6a6a] to-[#ff7b3d] rounded-3xl blur-lg animate-pulse opacity-40"></div>
              <div className="relative bg-white/20  rounded-3xl shadow-xl backdrop-blur-md border border-white/10 group hover:scale-105 transition-transform duration-500">
                <img 
                  src={logoUrl} 
                  alt="EcoMarket Logo" 
                  className="size-28 object-contain drop-shadow-2xl brightness-110"
                />
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
              ? isVerificationStep
                ? "Nhập mã xác thực đã gửi qua email để hoàn tất đăng ký"
                : "Tạo tài khoản bằng email và mật khẩu"
              : "Đăng nhập để đăng tin và nhắn tin với người bán"}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#2f3e46]">
                Email
              </Label>
              <div className="flex items-center h-12 border-2 border-[#2d6a6a]/20 rounded-xl focus-within:border-[#2d6a6a] focus-within:ring-4 focus-within:ring-[#2d6a6a]/10 transition-all bg-white/50 backdrop-blur-sm overflow-hidden group">
                <Input
                  id="email"
                  type="text"
                  placeholder="example"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.replace(/@.*$/, ""))}
                  disabled={isSignUpMode && isVerificationStep}
                  required
                  className="h-full border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent flex-1 px-4 text-base placeholder:text-gray-400"
                />
                <div className="h-full px-4 flex items-center bg-gray-50/80 border-l border-[#2d6a6a]/10 text-[#2d6a6a]/60 font-semibold text-sm sm:text-base whitespace-nowrap select-none">
                  @st.ueh.edu.vn
                </div>
              </div>
            </div>
            {(!isSignUpMode || !isVerificationStep) && (
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#2f3e46]">
                  Mật khẩu
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 rounded-xl border-2 border-[#2d6a6a]/20 focus:border-[#2d6a6a] focus-visible:ring-4 focus-visible:ring-[#2d6a6a]/10 transition-all"
                />
              </div>
            )}
            {isSignUpMode && !isVerificationStep && (
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
            {isSignUpMode && isVerificationStep && (
              <div className="space-y-2">
                <Label htmlFor="verificationCode" className="text-[#2f3e46]">
                  Mã xác thực
                </Label>
                <Input
                  id="verificationCode"
                  type="text"
                  inputMode="numeric"
                  placeholder="Nhập mã 6 chữ số"
                  value={verificationCode}
                  onChange={(e) =>
                    setVerificationCode(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  required
                  maxLength={6}
                  className="h-12 rounded-xl border-2 border-[#2d6a6a]/20 focus:border-[#2d6a6a] focus-visible:ring-4 focus-visible:ring-[#2d6a6a]/10 transition-all text-center tracking-[0.35em] text-lg"
                />
                <p className="text-sm text-[#2d6a6a]/75">
                  Mã xác thực có hiệu lực trong {verificationLifetimeMinutes} phút.
                </p>
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
                    ? isVerificationStep
                      ? "Xác minh mã"
                      : "Gửi mã xác thực"
                    : "Đăng nhập"}
              </span>
              <ArrowRight className="size-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </form>

          {isSignUpMode && isVerificationStep && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setIsVerificationStep(false);
                  setVerificationCode("");
                }}
                className="text-sm text-[#2d6a6a] hover:text-[#ff7b3d] font-medium transition-colors disabled:opacity-60"
              >
                Sửa email / mật khẩu
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  void handleResendVerificationCode();
                }}
                className="text-sm text-[#2d6a6a] hover:text-[#ff7b3d] font-semibold transition-colors disabled:opacity-60"
              >
                Gửi lại mã
              </button>
            </div>
          )}

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
