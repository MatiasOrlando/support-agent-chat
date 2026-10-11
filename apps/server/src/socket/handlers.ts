import { Server, Socket } from "socket.io";
import prisma from "../prisma";

interface TypingPayload {
  conversationId: string;
  role: "CUSTOMER" | "AGENT";
}

interface MessagePayload {
  conversationId: string;
  content: string;
  role: "CUSTOMER" | "AGENT";
}

const MAX_MESSAGE_LENGTH = 2000;
const VALID_ROLES = ["CUSTOMER", "AGENT"] as const;

type ValidationResult =
  | { ok: true; data: { conversationId: string; content: string; role: "CUSTOMER" | "AGENT" } }
  | { ok: false; error: string };

function validateMessagePayload(payload: unknown): ValidationResult {
  if (typeof payload !== "object" || payload === null) {
    return { ok: false, error: "Invalid payload" };
  }

  const { conversationId, content, role } = payload as Record<string, unknown>;

  if (typeof conversationId !== "string" || conversationId.length === 0) {
    return { ok: false, error: "conversationId is required" };
  }

  if (typeof content !== "string") {
    return { ok: false, error: "content must be a string" };
  }

  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "content cannot be empty" };
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: `content exceeds ${MAX_MESSAGE_LENGTH} characters` };
  }

  if (typeof role !== "string" || !VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) {
    return { ok: false, error: "role must be CUSTOMER or AGENT" };
  }

  return {
    ok: true,
    data: { conversationId, content: trimmed, role: role as "CUSTOMER" | "AGENT" },
  };
}

export function registerSocketHandlers(io: Server) {
  // Track online agents
  let onlineAgents = 0;

  io.on("connection", (socket: Socket) => {
    socket.data.isAgent = false;
    socket.emit("agent_status", { online: onlineAgents > 0 });
    console.log(`Socket connected: ${socket.id}`);

    // Join a conversation room
    socket.on("join_conversation", (conversationId: string) => {
      if (typeof conversationId !== "string" || conversationId.length === 0) return;
      socket.join(conversationId);
      console.log(`${socket.id} joined room: ${conversationId}`);
    });

    // Agent comes online
    socket.on("agent_online", () => {
      // Only count a socket once, even if the event fires more than once.
      if (socket.data.isAgent) return;
      socket.data.isAgent = true;
      onlineAgents++;
      io.emit("agent_status", { online: onlineAgents > 0 });
    });

    // Send message
    socket.on("send_message", async (payload: MessagePayload) => {
      const result = validateMessagePayload(payload);
      if (!result.ok) {
        socket.emit("error", { message: result.error });
        return;
      }
      const { conversationId, content, role } = result.data;

      try {
        // Ensure the conversation exists before writing a message to it.
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
          select: { id: true },
        });
        if (!conversation) {
          socket.emit("error", { message: "Conversation not found" });
          return;
        }

        const message = await prisma.message.create({
          data: { content, role, conversationId },
        });

        // Update conversation updatedAt
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        // Emit to everyone in the room
        io.to(conversationId).emit("new_message", message);

        // Notify agent panel of new activity
        io.emit("conversation_updated", { conversationId });
      } catch (error) {
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Typing indicators
    socket.on("typing_start", (payload: TypingPayload) => {
      socket.to(payload.conversationId).emit("typing_start", payload);
    });

    socket.on("typing_stop", (payload: TypingPayload) => {
      socket.to(payload.conversationId).emit("typing_stop", payload);
    });

    socket.on("disconnect", () => {
      // Only decrement for sockets that actually registered as an agent.
      if (socket.data.isAgent && onlineAgents > 0) {
        onlineAgents--;
        io.emit("agent_status", { online: onlineAgents > 0 });
      }
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}
