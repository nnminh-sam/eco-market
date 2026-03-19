import { createContext, useContext, useState, ReactNode } from "react";
import { Message, Conversation } from "../types/product";
import { products } from "../data/products";

interface MessageContextType {
  conversations: Conversation[];
  messages: Message[];
  sendMessage: (productId: string, receiverId: string, content: string) => void;
  getConversationMessages: (conversationId: string) => Message[];
  markAsRead: (conversationId: string) => void;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export function MessageProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      senderId: "2",
      receiverId: "1",
      productId: "1",
      content: "Xin chào, sản phẩm còn không ạ?",
      timestamp: "2026-03-18T10:30:00",
      read: true
    },
    {
      id: "2",
      senderId: "1",
      receiverId: "2",
      productId: "1",
      content: "Dạ còn ạ! Bạn có muốn xem thêm ảnh không?",
      timestamp: "2026-03-18T10:35:00",
      read: true
    }
  ]);

  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: "conv-1",
      productId: "1",
      product: products[0],
      otherUser: {
        id: "2",
        name: "Trần Thị B",
        email: "tranthib@example.com",
        joinedDate: "2024-02-20"
      },
      lastMessage: {
        id: "2",
        senderId: "1",
        receiverId: "2",
        productId: "1",
        content: "Dạ còn ạ! Bạn có muốn xem thêm ảnh không?",
        timestamp: "2026-03-18T10:35:00",
        read: true
      },
      unreadCount: 0
    }
  ]);

  const sendMessage = (productId: string, receiverId: string, content: string) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      senderId: "1", // Mock current user
      receiverId,
      productId,
      content,
      timestamp: new Date().toISOString(),
      read: false
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const getConversationMessages = (conversationId: string): Message[] => {
    const conv = conversations.find((c) => c.id === conversationId);
    if (!conv) return [];
    return messages.filter((m) => m.productId === conv.productId);
  };

  const markAsRead = (conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
    );
  };

  return (
    <MessageContext.Provider
      value={{
        conversations,
        messages,
        sendMessage,
        getConversationMessages,
        markAsRead,
      }}
    >
      {children}
    </MessageContext.Provider>
  );
}

export function useMessages() {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error("useMessages must be used within a MessageProvider");
  }
  return context;
}
