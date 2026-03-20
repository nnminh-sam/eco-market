import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { Header } from "./components/Header";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { MessageProvider } from "./context/MessageContext";
import { WishlistProvider } from "./context/WishlistContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" forcedTheme="light" enableSystem={false}>
      <AuthProvider>
        <WishlistProvider>
          <CartProvider>
            <MessageProvider>
              <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1">{children}</main>
                <Toaster />
              </div>
            </MessageProvider>
          </CartProvider>
        </WishlistProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
