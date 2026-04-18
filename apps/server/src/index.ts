import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import conversationsRouter from "./routes/conversations";
import { registerSocketHandlers } from "./socket/handlers";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PATCH"],
  },
});

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000" }));
app.use(express.json());

// Routes
app.use("/api/conversations", conversationsRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Socket handlers
registerSocketHandlers(io);

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
