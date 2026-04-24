"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, CheckCircle, Menu, X, MessageSquare } from "lucide-react";
import { getSocket } from "@/lib/socket";
import { api } from "@/lib/api";
import { Conversation, Message } from "@/lib/types";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function initials(id: string) {
  return id.slice(0, 2).toUpperCase();
}

export function AgentPanel() {
  const qc = useQueryClient();
  const socket = getSocket();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [customerTyping, setCustomerTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeIdRef = useRef<string | null>(null);

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations"],
    queryFn: api.getConversations,
    refetchInterval: 10000,
  });

  useEffect(() => {
    socket.on("connect", () => {
      socket.emit("agent_online");
    });
    socket.connect();
    return () => {
      socket.off("connect");
      socket.disconnect();
    };
  }, []);


  useEffect(() => {
    activeIdRef.current = activeId;
    socket.on("new_message", (message: Message) => {
      if (message.conversationId === activeIdRef.current) {
        setMessages((prev) => [...prev, message]);
      }
      qc.invalidateQueries({ queryKey: ["conversations"] });
    });
    socket.on("conversation_updated", () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    });
    socket.on("typing_start", ({ role }: { role: string }) => {
      if (role === "CUSTOMER") setCustomerTyping(true);
    });
    socket.on("typing_stop", ({ role }: { role: string }) => {
      if (role === "CUSTOMER") setCustomerTyping(false);
    });
    return () => {
      socket.off("new_message");
      socket.off("conversation_updated");
      socket.off("typing_start");
      socket.off("typing_stop");
    };
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, customerTyping]);

  async function openConversation(conv: Conversation) {
    setActiveId(conv.id);
    setMessages([]);
    setCustomerTyping(false);
    setSidebarOpen(false);
    socket.emit("join_conversation", conv.id);
    const full = await api.getConversation(conv.id);
    setMessages(full.messages ?? []);
  }

  function sendMessage() {
    if (!input.trim() || !activeId) return;
    socket.emit("send_message", { conversationId: activeId, content: input.trim(), role: "AGENT" });
    socket.emit("typing_stop", { conversationId: activeId, role: "AGENT" });
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleTyping() {
    if (!activeId) return;
    socket.emit("typing_start", { conversationId: activeId, role: "AGENT" });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("typing_stop", { conversationId: activeId, role: "AGENT" });
    }, 1500);
  }

  async function resolveConversation() {
    if (!activeId) return;
    await api.resolveConversation(activeId);
    qc.invalidateQueries({ queryKey: ["conversations"] });
    setActiveId(null);
    setMessages([]);
  }

  const activeConv = conversations.find((c) => c.id === activeId);
  const isResolved = activeConv?.status === "RESOLVED";
  const openCount = conversations.filter(c => c.status === "OPEN").length;

  return (
    <div className="h-screen bg-white flex flex-col relative overflow-hidden">

      {sidebarOpen && (
        <div
          className="absolute inset-0 bg-black/20 z-10"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <div className={`absolute top-0 left-0 h-full w-80 bg-white border-r border-zinc-100 z-20 flex flex-col transition-transform duration-300 ease-in-out ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="px-5 py-4 flex items-center justify-between border-b border-zinc-100">
          <div>
            <p className="text-sm font-semibold text-zinc-800">Conversations</p>
            <p className="text-xs text-zinc-400">{openCount} open</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 transition-colors text-zinc-400"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {conversations.length === 0 ? (
            <p className="text-xs text-zinc-400 text-center py-8">No conversations yet</p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => openConversation(conv)}
                className={`w-full text-left px-5 py-3.5 flex items-start gap-3 transition-colors border-b border-zinc-50 ${
                  conv.id === activeId ? "bg-zinc-50" : "hover:bg-zinc-50"
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-semibold text-zinc-500 flex-shrink-0">
                  {initials(conv.id)}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-xs font-mono font-semibold text-zinc-600">
                      #{shortId(conv.id)}
                    </span>
                    <span className={`text-[10px] font-medium ${
                      conv.status === "OPEN" ? "text-blue-500" : "text-emerald-500"
                    }`}>
                      {conv.status === "OPEN" ? "open" : "resolved"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 truncate">
                    {conv.messages?.[0]?.content ?? "No messages yet"}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="px-4 py-3.5 border-b border-zinc-100 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => setSidebarOpen(true)}
          className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-zinc-100 transition-colors text-zinc-500"
        >
          <Menu size={18} />
          {openCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500" />
          )}
        </button>

        {activeId ? (
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-semibold text-zinc-500 flex-shrink-0">
              {initials(activeId)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-800 truncate">
                #{shortId(activeId)}
              </p>
              <p className="text-xs text-zinc-400">{messages.length} messages</p>
            </div>
          </div>
        ) : (
          <p className="text-sm font-semibold text-zinc-800 flex-1">Agent Panel</p>
        )}

        {activeId && !isResolved && (
          <button
            onClick={resolveConversation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-200 flex-shrink-0"
          >
            <CheckCircle size={13} />
            Resolve
          </button>
        )}
      </div>

      {/* Main content */}
      {!activeId ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center">
            <MessageSquare size={24} className="text-zinc-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-600">No conversation open</p>
            <p className="text-xs text-zinc-400 mt-1">
              Tap the menu to see {openCount} open {openCount === 1 ? "conversation" : "conversations"}
            </p>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="px-4 py-2 text-xs font-medium text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
          >
            Open inbox
          </button>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-3 bg-zinc-50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === "AGENT" ? "flex-row-reverse" : "flex-row"}`}
              >
                {msg.role === "CUSTOMER" && (
                  <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-semibold text-zinc-500 flex-shrink-0 mt-0.5">
                    C
                  </div>
                )}
                <div className={`flex flex-col max-w-[72%] ${msg.role === "AGENT" ? "items-end" : "items-start"}`}>
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                    msg.role === "AGENT"
                      ? "bg-zinc-800 text-white rounded-tr-sm"
                      : "bg-white text-zinc-800 border border-zinc-200 rounded-tl-sm"
                  }`}>
                    {msg.content}
                  </div>
                  <span className="text-[11px] text-zinc-400 mt-1 px-1">
                    {msg.role === "AGENT" ? "You" : "Customer"} · {formatTime(msg.createdAt)}
                  </span>
                </div>
              </div>
            ))}

            {customerTyping && (
              <div className="flex gap-2 items-end">
                <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-semibold text-zinc-500 flex-shrink-0">
                  C
                </div>
                <div className="flex items-center gap-1.5 px-4 py-3 bg-white border border-zinc-200 rounded-2xl rounded-tl-sm">
                  {[0, 0.15, 0.3].map((delay, i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce"
                      style={{ animationDelay: `${delay}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {isResolved ? (
            <div className="px-4 py-3 bg-emerald-50 border-t border-emerald-100 text-center text-sm text-emerald-600 font-medium">
              Conversation resolved ✓
            </div>
          ) : (
            <div className="px-4 py-3 bg-white border-t border-zinc-100">
              <div className="flex gap-2 items-end bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-2.5 focus-within:border-zinc-400 transition-colors">
                <textarea
                  className="flex-1 bg-transparent text-sm resize-none outline-none placeholder-zinc-400 min-h-[24px] max-h-[120px] text-zinc-800"
                  placeholder="Reply to customer..."
                  value={input}
                  onChange={(e) => { setInput(e.target.value); handleTyping(); }}
                  onKeyDown={handleKeyDown}
                  rows={1}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  className="w-8 h-8 flex items-center justify-center bg-zinc-800 text-white rounded-xl hover:bg-zinc-700 transition-colors disabled:opacity-30 flex-shrink-0"
                >
                  <Send size={13} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}