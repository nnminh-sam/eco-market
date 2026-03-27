import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useMessages } from "../context/MessageContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { ArrowLeft, Send, User, Smile } from "lucide-react";
import { ScrollArea } from "../components/ui/scroll-area";
import { User as UserType } from "../types/product";
import { toast } from "sonner";

interface MessagesLocationState {
  seller?: UserType;
  initialDraft?: string;
}

export function Messages() {
  const { isAuthenticated, user } = useAuth();
  const {
    conversations,
    getConversationMessages,
    sendMessage,
    startConversationWithSeller,
    markAsRead,
  } = useMessages();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [selectedConversation, setSelectedConversation] = useState(conversations[0]?.id || null);
  const [messageInput, setMessageInput] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const messagePaneRef = useRef<HTMLDivElement | null>(null);
  const messageInputRef = useRef<HTMLInputElement | null>(null);
  const isSendingMessageRef = useRef(false);
  const lastAppliedInitialDraftRef = useRef<string | null>(null);
  const locationState = location.state as MessagesLocationState | null;
  const requestedConversationId = searchParams.get("conversation");

  const conversationIds = useMemo(
    () => conversations.map((conversation) => conversation.id),
    [conversations],
  );

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      return;
    }

    if (!locationState?.seller) {
      return;
    }

    const bootstrapConversation = async () => {
      const conversationId = await startConversationWithSeller(locationState.seller);

      if (conversationId) {
        navigate(`/messages?conversation=${encodeURIComponent(conversationId)}`, {
          replace: true,
          state: {
            initialDraft: locationState.initialDraft,
          },
        });
        setSelectedConversation(conversationId);
      }
    };

    void bootstrapConversation();
  }, [
    isAuthenticated,
    location.pathname,
    locationState,
    navigate,
    startConversationWithSeller,
    user?.id,
  ]);

  useEffect(() => {
    if (!locationState?.initialDraft) {
      return;
    }

    if (lastAppliedInitialDraftRef.current === locationState.initialDraft) {
      return;
    }

    setMessageInput((currentDraft) =>
      currentDraft.length > 0 ? currentDraft : locationState.initialDraft ?? "",
    );
    lastAppliedInitialDraftRef.current = locationState.initialDraft;

    window.requestAnimationFrame(() => {
      messageInputRef.current?.focus();
      const inputElement = messageInputRef.current;
      if (inputElement) {
        const caretPosition = inputElement.value.length;
        inputElement.setSelectionRange(caretPosition, caretPosition);
      }
    });
  }, [locationState?.initialDraft]);

  useEffect(() => {
    if (conversationIds.length === 0) {
      setSelectedConversation(null);
      return;
    }

    if (requestedConversationId && conversationIds.includes(requestedConversationId)) {
      setSelectedConversation(requestedConversationId);
      return;
    }

    setSelectedConversation((previous) => {
      if (previous && conversationIds.includes(previous)) {
        return previous;
      }

      return conversationIds[0];
    });
  }, [conversationIds, requestedConversationId]);

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversation(conversationId);
    navigate(`/messages?conversation=${encodeURIComponent(conversationId)}`, {
      replace: true,
    });
  };

  useEffect(() => {
    if (!selectedConversation) {
      return;
    }

    void markAsRead(selectedConversation);
  }, [markAsRead, selectedConversation]);

  if (!isAuthenticated) {
    return null;
  }

  const currentConversation = conversations.find((c) => c.id === selectedConversation);
  const messages = currentConversation ? getConversationMessages(currentConversation.id) : [];

  const scrollMessagesToBottom = useCallback(() => {
    const paneElement = messagePaneRef.current;
    if (!paneElement) {
      return;
    }

    const viewportElement = paneElement.querySelector<HTMLElement>(
      "[data-chat-scroll-area='messages'] [data-slot='scroll-area-viewport']",
    );

    if (!viewportElement) {
      return;
    }

    viewportElement.scrollTop = viewportElement.scrollHeight;
  }, []);

  useEffect(() => {
    if (!currentConversation) {
      return;
    }

    const animationFrameId = window.requestAnimationFrame(() => {
      scrollMessagesToBottom();
    });

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [currentConversation?.id, messages.length, scrollMessagesToBottom]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    const nextMessage = messageInput.trim();
    if (!nextMessage || !currentConversation || isSendingMessageRef.current) {
      return;
    }

    isSendingMessageRef.current = true;
    setIsSendingMessage(true);
    setMessageInput("");

    const sent = await sendMessage(currentConversation.id, nextMessage);

    if (sent) {
      isSendingMessageRef.current = false;
      setIsSendingMessage(false);
      window.requestAnimationFrame(() => {
        messageInputRef.current?.focus();
        const inputElement = messageInputRef.current;
        if (inputElement) {
          const caretPosition = inputElement.value.length;
          inputElement.setSelectionRange(caretPosition, caretPosition);
        }
      });
      return;
    }

    setMessageInput((currentValue) =>
      currentValue.length === 0 ? nextMessage : currentValue,
    );
    isSendingMessageRef.current = false;
    setIsSendingMessage(false);
    window.requestAnimationFrame(() => {
      messageInputRef.current?.focus();
      const inputElement = messageInputRef.current;
      if (inputElement) {
        const caretPosition = inputElement.value.length;
        inputElement.setSelectionRange(caretPosition, caretPosition);
      }
    });

    toast.error("Không thể gửi tin nhắn. Vui lòng thử lại.");
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f5f5dc]/30 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/" className="inline-flex items-center gap-2 mb-8 text-[#2d6a6a] hover:text-[#ff7b3d] font-medium transition-colors group">
          <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
          Quay lại
        </Link>

        <Card className="border-2 border-[#2d6a6a]/20 shadow-xl rounded-3xl overflow-hidden">
          <CardContent className="p-0">
            <div className="grid md:grid-cols-3 h-[650px]">
              {/* Conversations List */}
              <div className="border-r-2 border-[#2d6a6a]/10 bg-gradient-to-b from-[#f5f5dc]/30 to-white">
                <div className="p-6 border-b-2 border-[#2d6a6a]/10 bg-gradient-to-r from-[#2d6a6a]/5 to-transparent">
                  <h2 className="text-2xl font-bold text-[#2f3e46] flex items-center gap-2">
                    💬 Tin nhắn
                  </h2>
                </div>
                <ScrollArea className="h-[calc(650px-85px)]">
                  {conversations.length === 0 ? (
                    <div className="p-6 text-center">
                      <div className="text-5xl mb-3">📭</div>
                      <p className="text-gray-500">Chưa có tin nhắn nào</p>
                    </div>
                  ) : (
                    conversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv.id)}
                        className={`w-full p-5 border-b hover:bg-[#2d6a6a]/5 text-left transition-all ${
                          selectedConversation === conv.id 
                            ? "bg-gradient-to-r from-[#2d6a6a]/10 to-[#ff7b3d]/5 border-l-4 border-l-[#ff7b3d]" 
                            : "border-l-4 border-l-transparent"
                        }`}
                      >
                        <div className="flex gap-4">
                          <div className="size-14 bg-gradient-to-br from-[#2d6a6a] to-[#2d6a6a]/80 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md">
                            <User className="size-7 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate text-[#2f3e46] text-lg">
                              {conv.otherUser.name}
                            </p>
                            <p className="text-sm text-gray-500 truncate mt-1">
                              {conv.lastMessage?.content ?? "Chưa có tin nhắn"}
                            </p>
                          </div>
                          {conv.unreadCount > 0 && (
                            <div className="size-6 bg-[#ff7b3d] rounded-full flex items-center justify-center text-xs text-white font-bold shadow-md">
                              {conv.unreadCount}
                            </div>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </ScrollArea>
              </div>

              {/* Messages */}
              <div ref={messagePaneRef} className="md:col-span-2 flex min-h-0 flex-col bg-white">
                {currentConversation ? (
                  <>
                    {/* Header */}
                    <div className="shrink-0 p-6 border-b-2 border-[#2d6a6a]/10 bg-gradient-to-r from-[#2d6a6a]/5 to-transparent">
                      <div className="flex items-center gap-4">
                        <div className="size-16 bg-gradient-to-br from-[#2d6a6a] to-[#2d6a6a]/80 rounded-2xl flex items-center justify-center shadow-md">
                          <User className="size-8 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-lg text-[#2f3e46]">
                            {currentConversation.otherUser.name}
                          </p>
                          <p className="text-sm text-gray-600 line-clamp-1">
                            Trò chuyện trực tiếp
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Messages */}
                    <ScrollArea
                      data-chat-scroll-area="messages"
                      className="flex-1 min-h-0 bg-gradient-to-b from-[#f5f5dc]/10 to-white"
                    >
                      <div className="space-y-4 p-6">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${
                              message.senderId === user?.id
                                ? "justify-end"
                                : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[75%] rounded-2xl px-5 py-3 shadow-md ${
                                message.senderId === user?.id
                                  ? "bg-gradient-to-r from-[#2d6a6a] to-[#2d6a6a]/90 text-white"
                                  : "bg-white border-2 border-[#2d6a6a]/10 text-gray-800"
                              }`}
                            >
                              <p className="text-base leading-relaxed">{message.content}</p>
                              <p
                                className={`text-xs mt-2 ${
                                  message.senderId === user?.id
                                    ? "text-white/70"
                                    : "text-gray-500"
                                }`}
                              >
                                {formatTime(message.timestamp)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    {/* Input */}
                    <div className="shrink-0 p-6 border-t-2 border-[#2d6a6a]/10 bg-gradient-to-r from-[#f5f5dc]/20 to-white">
                      <form onSubmit={handleSendMessage} className="flex gap-3">
                        <button 
                          type="button"
                          className="p-3 hover:bg-[#2d6a6a]/10 rounded-xl transition-all"
                        >
                          <Smile className="size-6 text-[#2d6a6a]" />
                        </button>
                        <Input
                          ref={messageInputRef}
                          placeholder="Nhập tin nhắn..."
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          className="flex-1 h-12 rounded-xl border-2 border-[#2d6a6a]/20 focus:border-[#2d6a6a]"
                        />
                        <Button
                          type="submit"
                          disabled={isSendingMessage}
                          className="h-12 px-6 bg-[#ff7b3d] hover:bg-[#ff7b3d]/90 text-white shadow-lg hover:shadow-xl rounded-xl transition-all transform hover:-translate-y-0.5"
                        >
                          <Send className="size-5" />
                        </Button>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <div className="text-6xl mb-4">💬</div>
                    <p className="text-xl">Chọn một cuộc trò chuyện để bắt đầu</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
