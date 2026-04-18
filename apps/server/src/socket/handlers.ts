import { Server } from "socket.io";
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

export function registerSocketHandlers(io: Server) {
  // Track online agents
  let onlineAgents = 0;

  io.on("connection", (socket) => {
    socket.emit("agent_status", { online: onlineAgents > 0 });
    console.log(`Socket connected: ${socket.id}`);

    // Join a conversation room
    socket.on("join_conversation", (conversationId: string) => {
      socket.join(conversationId);
      console.log(`${socket.id} joined room: ${conversationId}`);
    });

    // Agent comes online
    socket.on("agent_online", () => {
      onlineAgents++;
      io.emit("agent_status", { online: onlineAgents > 0 });
    });

    // Send message
    socket.on("send_message", async (payload: MessagePayload) => {
      try {
        const message = await prisma.message.create({
          data: {
            content: payload.content,
            role: payload.role,
            conversationId: payload.conversationId,
          },
        });

        // Update conversation updatedAt
        await prisma.conversation.update({
          where: { id: payload.conversationId },
          data: { updatedAt: new Date() },
        });

        // Emit to everyone in the room
        io.to(payload.conversationId).emit("new_message", message);

        // Notify agent panel of new activity
        io.emit("conversation_updated", { conversationId: payload.conversationId });
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
      if (onlineAgents > 0) onlineAgents--;
      io.emit("agent_status", { online: onlineAgents > 0 });
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}
