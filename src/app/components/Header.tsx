import { Link } from "react-router-dom";
import {
  MessageCircle,
  User,
  LogOut,
  Plus,
  Recycle,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useMessages } from "../context/MessageContext";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export function Header() {
  const { user, logout, isAuthenticated } = useAuth();
  const { totalItems } = useCart();
  const { conversations } = useMessages();
  const unreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <header className="border-b-2 border-[#2d6a6a]/20 sticky top-0 bg-white z-50 shadow-md backdrop-blur-sm bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#2d6a6a] to-[#ff7b3d] rounded-2xl blur-sm group-hover:blur-md transition-all"></div>
              <div className="relative bg-gradient-to-br from-[#2d6a6a] to-[#2d6a6a]/80 p-3 rounded-2xl shadow-lg transform group-hover:scale-110 transition-transform">
                <Recycle className="size-7 text-white" />
              </div>
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
            <Link
              to="/cart"
              className="relative p-3 hover:bg-[#2d6a6a]/10 rounded-full transition-all group"
            >
              <ShoppingCart className="size-6 text-[#2d6a6a] group-hover:scale-110 transition-transform" />
              {totalItems > 0 && (
                <Badge className="absolute -top-1 -right-1 size-6 flex items-center justify-center p-0 text-xs bg-[#ff7b3d] border-2 border-white">
                  {totalItems > 99 ? "99+" : totalItems}
                </Badge>
              )}
            </Link>
            {isAuthenticated ? (
              <>
                <Link to="/post-ad">
                  <Button className="gap-2 bg-[#ff7b3d] hover:bg-[#ff7b3d]/90 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all rounded-full px-6">
                    <Plus className="size-5" />
                    <span className="font-semibold">Đăng tin</span>
                  </Button>
                </Link>
                <Link
                  to="/messages"
                  className="relative p-3 hover:bg-[#2d6a6a]/10 rounded-full transition-all group"
                >
                  <MessageCircle className="size-6 text-[#2d6a6a] group-hover:scale-110 transition-transform" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 size-6 flex items-center justify-center p-0 text-xs bg-[#ff7b3d] border-2 border-white animate-bounce">
                      {unreadCount}
                    </Badge>
                  )}
                </Link>
                <Button
                  type="button"
                  variant="outline"
                  onClick={logout}
                  className="gap-2 border-2 border-[#2d6a6a]/30 text-[#2d6a6a] hover:bg-[#2d6a6a] hover:text-white rounded-full px-4"
                >
                  <LogOut className="size-4" />
                  <span className="hidden sm:inline">Đăng xuất</span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full size-12 bg-gradient-to-br from-[#2d6a6a] to-[#2d6a6a]/80 hover:from-[#2d6a6a]/90 hover:to-[#2d6a6a]/70 shadow-md hover:shadow-lg transition-all"
                    >
                      <User className="size-6 text-white" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 rounded-2xl shadow-xl border-2 border-[#2d6a6a]/10"
                  >
                    <div className="px-3 py-3 bg-gradient-to-r from-[#2d6a6a]/5 to-[#ff7b3d]/5 rounded-t-xl">
                      <p className="font-semibold text-[#2d6a6a]">
                        {user?.name}
                      </p>
                      <p className="text-xs text-gray-600">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link
                        to="/my-listings"
                        className="cursor-pointer py-2.5 rounded-lg"
                      >
                        📦 Tin đăng của tôi
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link to="/login">
                <Button
                  variant="outline"
                  className="border-2 border-[#2d6a6a] text-[#2d6a6a] hover:bg-[#2d6a6a] hover:text-white rounded-full px-6 shadow-md hover:shadow-lg transition-all"
                >
                  <span className="font-semibold">Đăng nhập</span>
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
