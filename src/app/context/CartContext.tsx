import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { Product } from "../types/product";

interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  totalItems: number;
  totalAmount: number;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getItemQuantity: (productId: string) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "marketeo-cart-items";
const MAX_ITEM_QUANTITY = 1;

function getInitialItems(): CartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  const storedValue = window.localStorage.getItem(CART_STORAGE_KEY);
  if (!storedValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(storedValue) as CartItem[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.reduce<CartItem[]>((normalizedItems, item) => {
      if (
        typeof item !== "object" ||
        item === null ||
        typeof item.quantity !== "number" ||
        item.quantity <= 0 ||
        typeof item.product !== "object" ||
        item.product === null ||
        typeof item.product.id !== "string"
      ) {
        return normalizedItems;
      }

      const existingItemIndex = normalizedItems.findIndex(
        (currentItem) => currentItem.product.id === item.product.id
      );

      const normalizedItem: CartItem = {
        product: item.product,
        quantity: MAX_ITEM_QUANTITY,
      };

      if (existingItemIndex >= 0) {
        normalizedItems[existingItemIndex] = normalizedItem;
        return normalizedItems;
      }

      normalizedItems.push(normalizedItem);
      return normalizedItems;
    }, []);
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(getInitialItems);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addToCart = (product: Product, quantity: number = 1) => {
    setItems((prevItems) => {
      if (quantity <= 0) {
        return prevItems;
      }

      const existingItem = prevItems.find((item) => item.product.id === product.id);

      if (existingItem) {
        return prevItems;
      }

      return [...prevItems, { product, quantity: MAX_ITEM_QUANTITY }];
    });
  };

  const removeFromCart = (productId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setItems((prevItems) =>
      prevItems.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: MAX_ITEM_QUANTITY }
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const getItemQuantity = (productId: string) => {
    const item = items.find((currentItem) => currentItem.product.id === productId);
    return item?.quantity ?? 0;
  };

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        totalAmount,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getItemQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
