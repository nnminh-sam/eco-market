import { FirebaseOptions, getApp, getApps, initializeApp } from "firebase/app";
import { Database, get, getDatabase, onValue, ref, set, update } from "firebase/database";
import { Message, User } from "../types/product";

export interface ConversationRecord {
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
const firebaseApiKey =
  (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined) ?? "";
const firebaseAuthDomain =
  (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined) ?? "";
const firebaseProjectId =
  (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined) ?? "";
const firebaseStorageBucket =
  (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined) ?? "";
const firebaseMessagingSenderId =
  (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined) ?? "";
const firebaseAppId =
  (import.meta.env.VITE_FIREBASE_APP_ID as string | undefined) ?? "";

let realtimeDatabaseInstance: Database | null = null;

function buildFirebaseOptions(): FirebaseOptions {
  const options: FirebaseOptions = {
    databaseURL: firebaseDatabaseUrl,
  };

  if (firebaseApiKey) {
    options.apiKey = firebaseApiKey;
  }

  if (firebaseAuthDomain) {
    options.authDomain = firebaseAuthDomain;
  }

  if (firebaseProjectId) {
    options.projectId = firebaseProjectId;
  }

  if (firebaseStorageBucket) {
    options.storageBucket = firebaseStorageBucket;
  }

  if (firebaseMessagingSenderId) {
    options.messagingSenderId = firebaseMessagingSenderId;
  }

  if (firebaseAppId) {
    options.appId = firebaseAppId;
  }

  return options;
}

function getRealtimeDatabaseClient() {
  if (!isRealtimeChatConfigured()) {
    return null;
  }

  if (realtimeDatabaseInstance) {
    return realtimeDatabaseInstance;
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(buildFirebaseOptions());
  realtimeDatabaseInstance = getDatabase(app, firebaseDatabaseUrl);

  return realtimeDatabaseInstance;
}

export function isRealtimeChatConfigured() {
  return Boolean(firebaseDatabaseUrl);
}

function sanitizeRealtimeKey(rawValue: string) {
  return String(rawValue).trim().replace(/[.#$\[\]/]/g, "_");
}

function normalizeConversationRecord(
  rawRecord: ConversationRecord | null,
): ConversationRecord | null {
  if (!rawRecord || !rawRecord.id || !rawRecord.createdAt || !rawRecord.updatedAt) {
    return null;
  }

  return {
    id: rawRecord.id,
    userAId: rawRecord.userAId,
    userBId: rawRecord.userBId,
    userAName: rawRecord.userAName,
    userBName: rawRecord.userBName,
    buyerId: rawRecord.buyerId,
    sellerId: rawRecord.sellerId,
    buyerName: rawRecord.buyerName,
    sellerName: rawRecord.sellerName,
    createdAt: rawRecord.createdAt,
    updatedAt: rawRecord.updatedAt,
  };
}

function normalizeMessageRecord(rawMessage: Message, fallbackId: string): Message {
  return {
    id: rawMessage.id ?? fallbackId,
    senderId: rawMessage.senderId,
    receiverId: rawMessage.receiverId,
    productId: rawMessage.productId,
    content: rawMessage.content,
    timestamp: rawMessage.timestamp,
    read: Boolean(rawMessage.read),
  };
}

function normalizeMessageCollection(rawMessages: Record<string, Message> | null) {
  if (!rawMessages) {
    return [];
  }

  return Object.entries(rawMessages)
    .map(([messageId, rawMessage]) => normalizeMessageRecord(rawMessage, messageId))
    .sort(
      (firstMessage, secondMessage) =>
        new Date(firstMessage.timestamp).getTime() -
        new Date(secondMessage.timestamp).getTime(),
    );
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
  const database = getRealtimeDatabaseClient();
  if (!database) {
    return [];
  }

  const normalizedUserId = sanitizeRealtimeKey(userId);
  const snapshot = await get(
    ref(database, `user_conversations/${normalizedUserId}`),
  );
  const payload = snapshot.val() as Record<string, boolean> | null;

  if (!payload) {
    return [];
  }

  return Object.entries(payload)
    .filter(([, isMember]) => Boolean(isMember))
    .map(([conversationId]) => conversationId);
}

export async function fetchConversationRecord(conversationId: string) {
  const database = getRealtimeDatabaseClient();
  if (!database) {
    return null;
  }

  const snapshot = await get(ref(database, `conversations/${conversationId}`));
  const record = snapshot.val() as ConversationRecord | null;

  return normalizeConversationRecord(record);
}

export async function ensureConversationRecord({
  currentUser,
  otherUser,
}: EnsureConversationPayload) {
  const database = getRealtimeDatabaseClient();
  if (!database) {
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

  await set(ref(database, `conversations/${conversationId}`), conversationRecord);

  await Promise.all([
    set(
      ref(
        database,
        `user_conversations/${sanitizeRealtimeKey(currentUser.id)}/${conversationId}`,
      ),
      true,
    ),
    set(
      ref(
        database,
        `user_conversations/${sanitizeRealtimeKey(otherUser.id)}/${conversationId}`,
      ),
      true,
    ),
  ]);

  return conversationId;
}

export async function fetchConversationMessages(conversationId: string) {
  const database = getRealtimeDatabaseClient();
  if (!database) {
    return [];
  }

  const snapshot = await get(ref(database, `messages/${conversationId}`));
  const payload = snapshot.val() as Record<string, Message> | null;

  return normalizeMessageCollection(payload);
}

export async function sendConversationMessage({
  conversationId,
  senderId,
  receiverId,
  content,
}: SendMessagePayload) {
  const database = getRealtimeDatabaseClient();
  if (!database) {
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

  await set(ref(database, `messages/${conversationId}/${messageId}`), message);

  try {
    await update(ref(database, `conversations/${conversationId}`), {
      updatedAt: timestamp,
    });
  } catch (error) {
    console.warn("[messages] Could not update conversation metadata:", error);
  }

  return message;
}

export async function markMessageAsRead(conversationId: string, messageId: string) {
  const database = getRealtimeDatabaseClient();
  if (!database) {
    throw new Error("Missing VITE_FIREBASE_DATABASE_URL.");
  }

  await update(ref(database, `messages/${conversationId}/${messageId}`), {
    read: true,
  });
}

export function subscribeRealtimePath(
  path: string,
  onChange: (snapshotValue: unknown) => void,
) {
  if (typeof window === "undefined") {
    return () => {
      return;
    };
  }

  const database = getRealtimeDatabaseClient();
  if (!database) {
    return () => {
      return;
    };
  }

  const pathRef = ref(database, path);
  return onValue(
    pathRef,
    (snapshot) => {
      onChange(snapshot.val());
    },
    (error) => {
      console.error(`[messages] Realtime subscription error at "${path}":`, error);
    },
  );
}

export function subscribeConversationRecord(
  conversationId: string,
  onRecordChange: (record: ConversationRecord | null) => void,
) {
  return subscribeRealtimePath(`conversations/${conversationId}`, (snapshotValue) => {
    const record = normalizeConversationRecord(
      snapshotValue as ConversationRecord | null,
    );
    onRecordChange(record);
  });
}

export function subscribeConversationMessages(
  conversationId: string,
  onMessagesChange: (messages: Message[]) => void,
) {
  return subscribeRealtimePath(`messages/${conversationId}`, (snapshotValue) => {
    const messages = normalizeMessageCollection(
      snapshotValue as Record<string, Message> | null,
    );
    onMessagesChange(messages);
  });
}
