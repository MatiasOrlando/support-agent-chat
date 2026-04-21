import { Conversation } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";

export const api = {
  async createConversation(): Promise<Conversation> {
    const res = await fetch(`${BASE_URL}/api/conversations`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to create conversation");
    return res.json();
  },

  async getConversations(): Promise<Conversation[]> {
    const res = await fetch(`${BASE_URL}/api/conversations`);
    if (!res.ok) throw new Error("Failed to fetch conversations");
    return res.json();
  },

  async getConversation(id: string): Promise<Conversation> {
    const res = await fetch(`${BASE_URL}/api/conversations/${id}`);
    if (!res.ok) throw new Error("Failed to fetch conversation");
    return res.json();
  },

  async resolveConversation(id: string): Promise<Conversation> {
    const res = await fetch(`${BASE_URL}/api/conversations/${id}/resolve`, {
      method: "PATCH",
    });
    if (!res.ok) throw new Error("Failed to resolve conversation");
    return res.json();
  },
};
