import { Router } from "express";
import prisma from "../prisma";

const router = Router();

// GET all conversations (agent panel)
router.get("/", async (_req, res) => {
  try {
    const conversations = await prisma.conversation.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: { select: { messages: true } },
      },
    });
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// GET single conversation with messages
router.get("/:id", async (req, res) => {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.id },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch conversation" });
  }
});

// POST create new conversation
router.post("/", async (_req, res) => {
  try {
    const conversation = await prisma.conversation.create({ data: {} });
    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

// PATCH resolve conversation
router.patch("/:id/resolve", async (req, res) => {
  try {
    const conversation = await prisma.conversation.update({
      where: { id: req.params.id },
      data: { status: "RESOLVED" },
    });
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: "Failed to resolve conversation" });
  }
});

export default router;
