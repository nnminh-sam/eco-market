export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  joinedDate: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  images?: string[];
  category: string;
  description: string;
  condition: "Like New" | "Very Good" | "Good" | "Fair";
  size?: string;
  brand?: string;
  location: string;
  seller: User;
  postedDate: string;
  views: number;
  status: "available" | "sold";
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  productId: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  productId: string;
  product: Product;
  otherUser: User;
  lastMessage: Message;
  unreadCount: number;
}
