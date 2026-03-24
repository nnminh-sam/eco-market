import { createContext, useContext, useState, ReactNode } from "react";
import { Message, Conversation } from "../types/product";

interface MessageContextType {
  conversations: Conversation[];
  messages: Message[];
  sendMessage: (productId: string, receiverId: string, content: string) => void;
  getConversationMessages: (conversationId: string) => Message[];
  markAsRead: (conversationId: string) => void;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export function MessageProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);

  const [conversations, setConversations] = useState<Conversation[]>([]);

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
