import { Message, User } from "../types/product";

interface ConversationRecord {
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

interface EnsureConversationPayload {
  currentUser: User;
  otherUser: User;
}

interface SendMessagePayload {
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
}

const rawDatabaseUrl =
  (import.meta.env.VITE_FIREBASE_DATABASE_URL as string | undefined) ?? "";
const firebaseDatabaseUrl = rawDatabaseUrl.trim().replace(/\/+$/g, "");
const firebaseDatabaseAuthToken =
  (import.meta.env.VITE_FIREBASE_DATABASE_AUTH as string | undefined) ?? "";

export function isRealtimeChatConfigured() {
  return Boolean(firebaseDatabaseUrl);
}

function sanitizeRealtimeKey(rawValue: string) {
  return String(rawValue).trim().replace(/[.#$\[\]/]/g, "_");
}

function buildFirebasePath(path: string) {
  const normalizedPath = path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  const query = firebaseDatabaseAuthToken
    ? `?auth=${encodeURIComponent(firebaseDatabaseAuthToken)}`
    : "";

  return `${firebaseDatabaseUrl}/${normalizedPath}.json${query}`;
}

async function requestFirebaseJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  if (!isRealtimeChatConfigured()) {
    return null;
  }

  const response = await fetch(buildFirebasePath(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Firebase request failed: ${response.status}`);
  }

  const text = await response.text();
  if (!text || text === "null") {
    return null;
  }

  return JSON.parse(text) as T;
}

function createMessageId() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function buildConversationId(buyerId: string, sellerId: string) {
  const normalizedBuyerId = sanitizeRealtimeKey(buyerId);
  const normalizedSellerId = sanitizeRealtimeKey(sellerId);
  const [firstParticipantId, secondParticipantId] = [
    normalizedBuyerId,
    normalizedSellerId,
  ].sort((firstId, secondId) => firstId.localeCompare(secondId));

  return `${firstParticipantId}_${secondParticipantId}`;
}

export async function fetchUserConversationIds(userId: string) {
  const normalizedUserId = sanitizeRealtimeKey(userId);
  const payload = await requestFirebaseJson<Record<string, boolean>>(
    `user_conversations/${normalizedUserId}`,
  );

  if (!payload) {
    return [];
  }

  return Object.entries(payload)
    .filter(([, isMember]) => Boolean(isMember))
    .map(([conversationId]) => conversationId);
}

export async function fetchConversationRecord(conversationId: string) {
  return requestFirebaseJson<ConversationRecord>(`conversations/${conversationId}`);
}

export async function ensureConversationRecord({
  currentUser,
  otherUser,
}: EnsureConversationPayload) {
  if (!isRealtimeChatConfigured()) {
    throw new Error("Missing VITE_FIREBASE_DATABASE_URL.");
  }

  const conversationId = buildConversationId(currentUser.id, otherUser.id);
  const existingConversation = await fetchConversationRecord(conversationId);
  const timestamp = new Date().toISOString();
  const [firstParticipant, secondParticipant] = [currentUser, otherUser].sort(
    (firstUser, secondUser) =>
      sanitizeRealtimeKey(firstUser.id).localeCompare(
        sanitizeRealtimeKey(secondUser.id),
      ),
  );

  const conversationRecord: ConversationRecord = {
    id: conversationId,
    userAId: firstParticipant.id,
    userBId: secondParticipant.id,
    userAName: firstParticipant.name,
    userBName: secondParticipant.name,
    createdAt: existingConversation?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  await requestFirebaseJson(`conversations/${conversationId}`, {
    method: "PUT",
    body: JSON.stringify(conversationRecord),
  });

  await requestFirebaseJson(`user_conversations/${sanitizeRealtimeKey(currentUser.id)}/${conversationId}`, {
    method: "PUT",
    body: JSON.stringify(true),
  });

  await requestFirebaseJson(`user_conversations/${sanitizeRealtimeKey(otherUser.id)}/${conversationId}`, {
    method: "PUT",
    body: JSON.stringify(true),
  });

  return conversationId;
}

export async function fetchConversationMessages(conversationId: string) {
  const payload = await requestFirebaseJson<Record<string, Message>>(
    `messages/${conversationId}`,
  );

  if (!payload) {
    return [];
  }

  return Object.values(payload)
    .map((message) => ({
      id: message.id,
      senderId: message.senderId,
      receiverId: message.receiverId,
      productId: message.productId,
      content: message.content,
      timestamp: message.timestamp,
      read: Boolean(message.read),
    }))
    .sort(
      (firstMessage, secondMessage) =>
        new Date(firstMessage.timestamp).getTime() -
        new Date(secondMessage.timestamp).getTime(),
    );
}

export async function sendConversationMessage({
  conversationId,
  senderId,
  receiverId,
  content,
}: SendMessagePayload) {
  if (!isRealtimeChatConfigured()) {
    throw new Error("Missing VITE_FIREBASE_DATABASE_URL.");
  }

  const messageId = createMessageId();
  const timestamp = new Date().toISOString();
  const normalizedContent = content.trim();

  const message: Message = {
    id: messageId,
    senderId,
    receiverId,
    content: normalizedContent,
    timestamp,
    read: false,
  };

  await requestFirebaseJson(`messages/${conversationId}/${messageId}`, {
    method: "PUT",
    body: JSON.stringify(message),
  });

  try {
    await requestFirebaseJson(`conversations/${conversationId}`, {
      method: "PATCH",
      body: JSON.stringify({
        updatedAt: timestamp,
      }),
    });
  } catch (error) {
    console.warn("[messages] Could not update conversation metadata:", error);
  }

  return message;
}

export async function markMessageAsRead(conversationId: string, messageId: string) {
  if (!isRealtimeChatConfigured()) {
    throw new Error("Missing VITE_FIREBASE_DATABASE_URL.");
  }

  await requestFirebaseJson(`messages/${conversationId}/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify({
      read: true,
    }),
  });
}

export function subscribeRealtimePath(path: string, onChange: () => void) {
  if (typeof window === "undefined" || !isRealtimeChatConfigured()) {
    return () => {
      return;
    };
  }

  const eventSource = new EventSource(buildFirebasePath(path));
  let pollingIntervalId: number | null = null;

  const stopPolling = () => {
    if (pollingIntervalId === null) {
      return;
    }

    window.clearInterval(pollingIntervalId);
    pollingIntervalId = null;
  };

  const startPolling = () => {
    if (pollingIntervalId !== null) {
      return;
    }

    pollingIntervalId = window.setInterval(() => {
      onChange();
    }, 3000);
  };

  const handler = () => {
    onChange();
  };

  const handleOpen = () => {
    stopPolling();
  };

  const handleError = () => {
    startPolling();
  };

  const typedHandler = handler as EventListener;
  eventSource.addEventListener("put", typedHandler);
  eventSource.addEventListener("patch", typedHandler);
  eventSource.addEventListener("open", handleOpen as EventListener);
  eventSource.addEventListener("error", handleError as EventListener);

  onChange();

  return () => {
    eventSource.removeEventListener("put", typedHandler);
    eventSource.removeEventListener("patch", typedHandler);
    eventSource.removeEventListener("open", handleOpen as EventListener);
    eventSource.removeEventListener("error", handleError as EventListener);
    eventSource.close();
    stopPolling();
  };
}
