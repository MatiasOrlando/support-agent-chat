export type Role = "CUSTOMER" | "AGENT";
export type Status = "OPEN" | "RESOLVED";

export interface Message {
  id: string;
  content: string;
  role: Role;
  createdAt: string;
  conversationId: string;
}

export interface Conversation {
  id: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
  _count?: { messages: number };
}
