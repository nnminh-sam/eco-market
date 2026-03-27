import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { Conversation, Message, User } from "../types/product";
import { useAuth } from "./AuthContext";
import {
  ensureConversationRecord,
  fetchConversationMessages,
  fetchConversationRecord,
  fetchUserConversationIds,
  isRealtimeChatConfigured,
  markMessageAsRead,
  sendConversationMessage,
  subscribeRealtimePath,
} from "../services/firebaseRealtimeChat";

interface MessageConversationRecord {
  id: string;
  userAId?: string;
  userBId?: string;
  userAName?: string;
  userBName?: string;
  buyerId?: string;
  sellerId?: string;
  buyerName?: string;
  sellerName?: string;
  createdAt: string;
  updatedAt: string;
}

interface MessageContextType {
  conversations: Conversation[];
  messages: Message[];
  sendMessage: (conversationId: string, content: string) => Promise<boolean>;
  startConversationWithSeller: (seller: User) => Promise<string | null>;
  getConversationMessages: (conversationId: string) => Message[];
  markAsRead: (conversationId: string) => Promise<void>;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export function MessageProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [conversationRecords, setConversationRecords] = useState<
    Record<string, MessageConversationRecord>
  >({});
  const [messagesByConversation, setMessagesByConversation] = useState<
    Record<string, Message[]>
  >({});

  const currentUserId = user?.id ?? "";

  const refreshConversations = useCallback(async () => {
    if (!isAuthenticated || !currentUserId) {
      setConversationRecords({});
      setMessagesByConversation({});
      return;
    }

    if (!isRealtimeChatConfigured()) {
      setConversationRecords({});
      setMessagesByConversation({});
      return;
    }

    try {
      const conversationIds = await fetchUserConversationIds(currentUserId);
      const records = await Promise.all(
        conversationIds.map(async (conversationId) => {
          const record = await fetchConversationRecord(conversationId);
          return record;
        }),
      );

      const nextRecords = records.reduce<Record<string, MessageConversationRecord>>(
        (accumulator, record) => {
          if (!record) {
            return accumulator;
          }

          accumulator[record.id] = record;
          return accumulator;
        },
        {},
      );

      setConversationRecords(nextRecords);
      setMessagesByConversation((previous) => {
        const keptMessages: Record<string, Message[]> = {};

        Object.keys(nextRecords).forEach((conversationId) => {
          keptMessages[conversationId] = previous[conversationId] ?? [];
        });

        return keptMessages;
      });
    } catch (error) {
      console.error("[messages] Could not refresh conversations:", error);
    }
  }, [currentUserId, isAuthenticated]);

  const refreshConversationMessages = useCallback(
    async (conversationId: string) => {
      if (!isAuthenticated || !currentUserId || !conversationRecords[conversationId]) {
        return;
      }

      try {
        const fetchedMessages = await fetchConversationMessages(conversationId);
        setMessagesByConversation((previous) => ({
          ...previous,
          [conversationId]: fetchedMessages,
        }));
      } catch (error) {
        console.error("[messages] Could not refresh messages:", error);
      }
    },
    [conversationRecords, currentUserId, isAuthenticated],
  );

  useEffect(() => {
    void refreshConversations();

    if (!isAuthenticated || !currentUserId || !isRealtimeChatConfigured()) {
      return;
    }

    const unsubscribeFromConversationIndex = subscribeRealtimePath(
      `user_conversations/${currentUserId}`,
      () => {
        void refreshConversations();
      },
    );

    return () => {
      unsubscribeFromConversationIndex();
    };
  }, [currentUserId, isAuthenticated, refreshConversations]);

  const conversationIds = useMemo(
    () => Object.keys(conversationRecords),
    [conversationRecords],
  );

  useEffect(() => {
    if (!isAuthenticated || !currentUserId || conversationIds.length === 0) {
      return;
    }

    conversationIds.forEach((conversationId) => {
      void refreshConversationMessages(conversationId);
    });

    const unsubscribeFromConversationMessages = conversationIds.map(
      (conversationId) =>
        subscribeRealtimePath(`messages/${conversationId}`, () => {
          void refreshConversationMessages(conversationId);
        }),
    );

    const unsubscribeFromConversationMetadata = conversationIds.map(
      (conversationId) =>
        subscribeRealtimePath(`conversations/${conversationId}`, () => {
          void refreshConversations();
        }),
    );

    return () => {
      unsubscribeFromConversationMessages.forEach((unsubscribe) => unsubscribe());
      unsubscribeFromConversationMetadata.forEach((unsubscribe) => unsubscribe());
    };
  }, [
    conversationIds,
    currentUserId,
    isAuthenticated,
    refreshConversationMessages,
    refreshConversations,
  ]);

  useEffect(() => {
    if (!isAuthenticated || !currentUserId || !isRealtimeChatConfigured()) {
      return;
    }

    const refreshAllMessageData = () => {
      void refreshConversations();

      conversationIds.forEach((conversationId) => {
        void refreshConversationMessages(conversationId);
      });
    };

    const pollingIntervalId = window.setInterval(() => {
      refreshAllMessageData();
    }, 3000);

    const handleWindowFocus = () => {
      refreshAllMessageData();
    };

    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.clearInterval(pollingIntervalId);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [
    conversationIds,
    currentUserId,
    isAuthenticated,
    refreshConversationMessages,
    refreshConversations,
  ]);

  const conversations = useMemo(() => {
    if (!currentUserId) {
      return [];
    }

    return Object.values(conversationRecords)
      .map((record) => {
        const participantAId = record.userAId ?? record.buyerId ?? "";
        const participantBId = record.userBId ?? record.sellerId ?? "";
        const participantAName = record.userAName ?? record.buyerName ?? "";
        const participantBName = record.userBName ?? record.sellerName ?? "";

        if (!participantAId || !participantBId) {
          return null;
        }

        const conversationMessages = messagesByConversation[record.id] ?? [];
        const lastMessage =
          conversationMessages.length > 0
            ? conversationMessages[conversationMessages.length - 1]
            : null;
        const unreadCount = conversationMessages.filter(
          (message) => message.receiverId === currentUserId && !message.read,
        ).length;
        const isCurrentUserParticipantA = currentUserId === participantAId;

        return {
          id: record.id,
          participantIds: [participantAId, participantBId],
          otherUser: {
            id: isCurrentUserParticipantA ? participantBId : participantAId,
            name: isCurrentUserParticipantA
              ? participantBName
              : participantAName,
            email: "",
            joinedDate: new Date().toISOString(),
          },
          lastMessage,
          unreadCount,
        } satisfies Conversation;
      })
      .filter((conversation): conversation is Conversation => Boolean(conversation))
      .sort((firstConversation, secondConversation) => {
        const firstTimestamp =
          firstConversation.lastMessage?.timestamp ??
          conversationRecords[firstConversation.id].updatedAt ??
          conversationRecords[firstConversation.id].createdAt ??
          new Date(0).toISOString();
        const secondTimestamp =
          secondConversation.lastMessage?.timestamp ??
          conversationRecords[secondConversation.id].updatedAt ??
          conversationRecords[secondConversation.id].createdAt ??
          new Date(0).toISOString();

        return (
          new Date(secondTimestamp).getTime() - new Date(firstTimestamp).getTime()
        );
      });
  }, [conversationRecords, currentUserId, messagesByConversation]);

  const messages = useMemo(
    () => Object.values(messagesByConversation).flat(),
    [messagesByConversation],
  );

  const sendMessage = useCallback(
    async (conversationId: string, content: string) => {
      if (!isAuthenticated || !currentUserId) {
        return false;
      }

      const normalizedContent = content.trim();
      if (!normalizedContent) {
        return false;
      }

      const record = conversationRecords[conversationId];
      if (!record) {
        return false;
      }

      const participantAId = record.userAId ?? record.buyerId ?? "";
      const participantBId = record.userBId ?? record.sellerId ?? "";
      if (!participantAId || !participantBId) {
        return false;
      }

      const receiverId =
        currentUserId === participantAId ? participantBId : participantAId;

      try {
        await sendConversationMessage({
          conversationId,
          senderId: currentUserId,
          receiverId,
          content: normalizedContent,
        });
        return true;
      } catch (error) {
        console.error("[messages] Could not send message:", error);
        return false;
      }
    },
    [conversationRecords, currentUserId, isAuthenticated],
  );

  const startConversationWithSeller = useCallback(
    async (seller: User) => {
      if (!isAuthenticated || !user?.id) {
        return null;
      }

      if (user.id === seller.id) {
        return null;
      }

      try {
        const conversationId = await ensureConversationRecord({
          currentUser: user,
          otherUser: seller,
        });

        await refreshConversations();
        return conversationId;
      } catch (error) {
        console.error("[messages] Could not start conversation:", error);
        return null;
      }
    },
    [isAuthenticated, refreshConversations, user],
  );

  const getConversationMessages = useCallback(
    (conversationId: string): Message[] => {
      return messagesByConversation[conversationId] ?? [];
    },
    [messagesByConversation],
  );

  const markAsRead = useCallback(
    async (conversationId: string) => {
      if (!currentUserId) {
        return;
      }

      const unreadMessages = (messagesByConversation[conversationId] ?? []).filter(
        (message) => message.receiverId === currentUserId && !message.read,
      );

      if (unreadMessages.length === 0) {
        return;
      }

      try {
        await Promise.all(
          unreadMessages.map((message) =>
            markMessageAsRead(conversationId, message.id),
          ),
        );
      } catch (error) {
        console.error("[messages] Could not mark messages as read:", error);
        return;
      }

      setMessagesByConversation((previous) => ({
        ...previous,
        [conversationId]: (previous[conversationId] ?? []).map((message) =>
          message.receiverId === currentUserId
            ? { ...message, read: true }
            : message,
        ),
      }));
    },
    [currentUserId, messagesByConversation],
  );

  return (
    <MessageContext.Provider
      value={{
        conversations,
        messages,
        sendMessage,
        startConversationWithSeller,
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
