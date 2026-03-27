import { Link } from "react-router-dom";
import {
  MessageCircle,
  User,
  LogOut,
  Plus,
  ShoppingCart,
  Sparkles,
  Facebook,
  Phone,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useMessages } from "../context/MessageContext";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import logoUrl from "../../assets/logo.png";

export function Header() {
  const { logout, isAuthenticated } = useAuth();
  const { totalItems } = useCart();
  const { conversations } = useMessages();
  const unreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <header className="border-b-2 border-[#2d6a6a]/20 sticky top-0 bg-white z-50 shadow-md backdrop-blur-sm bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative transform group-hover:scale-105 transition-transform flex items-center justify-center">
              <img 
                src={logoUrl} 
                alt="EcoMarket Logo" 
                className="h-12 w-auto object-contain drop-shadow-md"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-bold bg-gradient-to-r from-[#2d6a6a] via-[#2d6a6a] to-[#ff7b3d] bg-clip-text text-transparent">
                EcoMarket
              </span>
              <span className="text-xs text-[#2d6a6a]/70 -mt-1 flex items-center gap-1">
                <Sparkles className="size-3" />
                Chợ Đồ Cũ Xanh
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link
                  to="/cart"
                  className="relative flex items-center gap-2 px-4 py-3 hover:bg-[#2d6a6a]/10 rounded-full transition-all group"
                >
                  <ShoppingCart className="size-6 text-[#2d6a6a] group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-[#2d6a6a] hidden sm:inline">Giỏ hàng</span>
                  {totalItems > 0 && (
                    <Badge className="absolute -top-1 -right-1 size-6 flex items-center justify-center p-0 text-xs bg-[#ff7b3d] border-2 border-white">
                      {totalItems > 99 ? "99+" : totalItems}
                    </Badge>
                  )}
                </Link>
                <Link
                  to="/messages"
                  className="relative flex items-center gap-2 px-4 py-3 hover:bg-[#2d6a6a]/10 rounded-full transition-all group"
                >
                  <MessageCircle className="size-6 text-[#2d6a6a] group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-[#2d6a6a] hidden sm:inline">Tin nhắn</span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex size-3.5">
                      <span
                        className="absolute inline-flex size-full rounded-full bg-[#ff7b3d]/50 animate-ping"
                        style={{ animationDuration: "1.8s" }}
                      />
                      <span className="relative inline-flex size-3.5 rounded-full bg-[#ff7b3d] border-2 border-white" />
                    </span>
                  )}
                </Link>
                <Link to="/post-ad">
                  <Button className="gap-2 bg-[#ff7b3d] hover:bg-[#ff7b3d]/90 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all rounded-full px-6 h-12">
                    <Plus className="size-5" />
                    <span className="font-semibold">Đăng tin</span>
                  </Button>
                </Link>
                <Link to="/profile" aria-label="Hồ sơ cá nhân">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full size-12 bg-gradient-to-br from-[#2d6a6a] to-[#2d6a6a]/80 hover:from-[#2d6a6a]/90 hover:to-[#2d6a6a]/70 shadow-md hover:shadow-lg transition-all"
                  >
                    <User className="size-6 text-white" />
                  </Button>
                </Link>
                <Button
                  type="button"
                  variant="outline"
                  onClick={logout}
                  className="gap-2 border-2 border-[#2d6a6a]/30 text-[#2d6a6a] hover:bg-[#2d6a6a] hover:text-white rounded-full px-4 h-12"
                >
                  <LogOut className="size-4" />
                  <span className="hidden sm:inline font-semibold">Đăng xuất</span>
                </Button>
              </>
            ) : (
              <>
                <Link
                  to="/cart"
                  className="relative flex items-center gap-2 px-4 py-3 hover:bg-[#2d6a6a]/10 rounded-full transition-all group"
                >
                  <ShoppingCart className="size-6 text-[#2d6a6a] group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-[#2d6a6a] hidden sm:inline">Giỏ hàng</span>
                  {totalItems > 0 && (
                    <Badge className="absolute -top-1 -right-1 size-6 flex items-center justify-center p-0 text-xs bg-[#ff7b3d] border-2 border-white">
                      {totalItems > 99 ? "99+" : totalItems}
                    </Badge>
                  )}
                </Link>
                <Link to="/login">
                  <Button
                    variant="outline"
                    className="border-2 border-[#2d6a6a] text-[#2d6a6a] hover:bg-[#2d6a6a] hover:text-white rounded-full px-6 h-12 shadow-md hover:shadow-lg transition-all"
                  >
                    <span className="font-semibold">Đăng nhập</span>
                  </Button>
                </Link>
                <Link to="/login">
                  <Button className="gap-2 bg-[#ff7b3d] hover:bg-[#ff7b3d]/90 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all rounded-full px-6 h-12">
                    <Plus className="size-5" />
                    <span className="font-semibold">Đăng tin</span>
                  </Button>
                </Link>
              </>
            )}
            <a
              href="https://www.facebook.com/profile.php?id=61576850488205"
              target="_blank"
              rel="noopener noreferrer"
              className="relative flex items-center gap-2 px-4 py-2 border border-[#2d6a6a]/30 hover:bg-[#2d6a6a]/10 rounded-full transition-all group"
            >
              <Phone className="size-5 text-[#2d6a6a] group-hover:scale-110 transition-transform" />
              <span className="font-semibold text-[#2d6a6a] hidden sm:inline">Liên hệ</span>
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
