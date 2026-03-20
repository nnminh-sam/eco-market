import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthContext";

interface WishlistStore {
  [userId: string]: string[];
}

interface WishlistContextType {
  wishlistProductIds: string[];
  addToWishlist: (productId: string) => boolean;
  removeFromWishlist: (productId: string) => void;
  toggleWishlist: (productId: string) => boolean;
  isInWishlist: (productId: string) => boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const WISHLIST_STORAGE_KEY = "marketeo-wishlist";

function getInitialWishlistStore(): WishlistStore {
  if (typeof window === "undefined") {
    return {};
  }

  const storedValue = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
  if (!storedValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(storedValue) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }

    return Object.entries(parsed as Record<string, unknown>).reduce<WishlistStore>(
      (accumulator, [key, value]) => {
        if (!Array.isArray(value)) {
          return accumulator;
        }

        const validIds = value.filter((item): item is string => typeof item === "string");
        accumulator[key] = Array.from(new Set(validIds));
        return accumulator;
      },
      {}
    );
  } catch {
    return {};
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [wishlistStore, setWishlistStore] = useState<WishlistStore>(
    getInitialWishlistStore
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistStore));
  }, [wishlistStore]);

  const currentUserId = user?.id;

  const wishlistProductIds = useMemo(() => {
    if (!currentUserId) {
      return [];
    }

    return wishlistStore[currentUserId] ?? [];
  }, [currentUserId, wishlistStore]);

  const isInWishlist = (productId: string) => {
    return wishlistProductIds.includes(productId);
  };

  const addToWishlist = (productId: string) => {
    if (!currentUserId) {
      return false;
    }

    const currentList = wishlistStore[currentUserId] ?? [];
    if (currentList.includes(productId)) {
      return false;
    }

    setWishlistStore((previous) => ({
      ...previous,
      [currentUserId]: [...(previous[currentUserId] ?? []), productId],
    }));

    return true;
  };

  const removeFromWishlist = (productId: string) => {
    if (!currentUserId) {
      return;
    }

    setWishlistStore((previous) => ({
      ...previous,
      [currentUserId]: (previous[currentUserId] ?? []).filter((id) => id !== productId),
    }));
  };

  const toggleWishlist = (productId: string) => {
    const alreadyInWishlist = isInWishlist(productId);

    if (alreadyInWishlist) {
      removeFromWishlist(productId);
      return false;
    }

    const added = addToWishlist(productId);
    return added;
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlistProductIds,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        isInWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
