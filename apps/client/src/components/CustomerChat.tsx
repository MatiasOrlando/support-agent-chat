"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Send, MessageCircle, ArrowLeft } from "lucide-react";
import { getSocket } from "@/lib/socket";
import { api } from "@/lib/api";
import { Message } from "@/lib/types";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function CustomerChat() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [agentOnline, setAgentOnline] = useState(false);
  const [agentTyping, setAgentTyping] = useState(false);
  const [isResolved, setIsResolved] = useState(false);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socket = getSocket();

  useEffect(() => {
    socket.connect();
    socket.on("agent_status", ({ online }: { online: boolean }) => setAgentOnline(online));
    socket.on("new_message", (message: Message) => setMessages((prev) => [...prev, message]));
    socket.on("typing_start", ({ role }: { role: string }) => { if (role === "AGENT") setAgentTyping(true); });
    socket.on("typing_stop", ({ role }: { role: string }) => { if (role === "AGENT") setAgentTyping(false); });
    return () => {
      socket.off("agent_status");
      socket.off("new_message");
      socket.off("typing_start");
      socket.off("typing_stop");
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, agentTyping]);

  async function startChat() {
    setLoading(true);
    try {
      const conversation = await api.createConversation();
      setConversationId(conversation.id);
      socket.emit("join_conversation", conversation.id);
    } finally {
      setLoading(false);
    }
  }

  const handleTyping = useCallback(() => {
    if (!conversationId) return;
    socket.emit("typing_start", { conversationId, role: "CUSTOMER" });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("typing_stop", { conversationId, role: "CUSTOMER" });
    }, 1500);
  }, [conversationId]);

  function sendMessage() {
    if (!input.trim() || !conversationId || isResolved) return;
    socket.emit("send_message", { conversationId, content: input.trim(), role: "CUSTOMER" });
    socket.emit("typing_stop", { conversationId, role: "CUSTOMER" });
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (!conversationId) {
    return (
      <div className="h-screen bg-white flex flex-col">
        <div className="px-5 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0">
              <MessageCircle size={17} className="text-zinc-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-800">Support</p>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${agentOnline ? "bg-emerald-500" : "bg-zinc-300"}`} />
                <span className="text-xs text-zinc-400">
                  {agentOnline ? "Online" : "Offline"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center">
            <MessageCircle size={26} className="text-zinc-400" />
          </div>
          <div className="max-w-xs">
            <h1 className="text-xl font-semibold text-zinc-800 tracking-tight mb-2">
              Hi there 👋
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {agentOnline
                ? "An agent is available. Start a conversation and we'll get back to you shortly."
                : "We're currently offline. Leave a message and we'll get back to you soon."}
            </p>
          </div>
          <button
            onClick={startChat}
            disabled={loading}
            className="px-6 py-2.5 bg-zinc-800 text-white text-sm font-medium rounded-xl hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Starting..." : "Start conversation"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white flex flex-col">
      <div className="px-4 py-3.5 border-b border-zinc-100 flex items-center gap-3">
        <button
          onClick={() => setConversationId(null)}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 transition-colors text-zinc-400"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0">
          <MessageCircle size={14} className="text-zinc-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-800">Support</p>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${agentOnline ? "bg-emerald-500" : "bg-zinc-300"}`} />
            <span className="text-xs text-zinc-400">
              {agentOnline ? "Online" : "Offline"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-3 bg-zinc-50">
        {messages.length === 0 && (
          <p className="text-center text-xs text-zinc-400 py-4">
            Conversation started. An agent will join shortly.
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === "CUSTOMER" ? "flex-row-reverse" : "flex-row"}`}
          >
            {msg.role === "AGENT" && (
              <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-semibold text-zinc-500 flex-shrink-0 mt-0.5">
                S
              </div>
            )}
            <div className={`flex flex-col max-w-[75%] ${msg.role === "CUSTOMER" ? "items-end" : "items-start"}`}>
              <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                msg.role === "CUSTOMER"
                  ? "bg-zinc-800 text-white rounded-tr-sm"
                  : "bg-white text-zinc-800 border border-zinc-200 rounded-tl-sm"
              }`}>
                {msg.content}
              </div>
              <span className="text-[11px] text-zinc-400 mt-1 px-1">
                {formatTime(msg.createdAt)}
              </span>
            </div>
          </div>
        ))}

        {agentTyping && (
          <div className="flex gap-2 items-end">
            <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-semibold text-zinc-500 flex-shrink-0">
              S
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
          This conversation has been resolved.
        </div>
      ) : (
        <div className="px-4 py-3 bg-white border-t border-zinc-100">
          <div className="flex gap-2 items-end bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-2.5 focus-within:border-zinc-400 transition-colors">
            <textarea
              className="flex-1 bg-transparent text-sm resize-none outline-none placeholder-zinc-400 min-h-[24px] max-h-[120px] text-zinc-800"
              placeholder="Type a message..."
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
    </div>
  );
}