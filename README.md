# Support Chat

Real-time customer support chat: a customer widget and an agent panel talking to
each other over WebSockets, with every message persisted in PostgreSQL.

## Architecture

```
support-chat/
├── apps/
│   ├── client/     
│   └── server/    
└── package.json    # Monorepo root with npm workspaces
```

## Tech Stack

**Frontend**: Next.js 16 (App Router), React 19, TypeScript, React Query, Socket.io client
**Backend**: Node.js, Express, TypeScript, Socket.io, Prisma ORM
**Database**: PostgreSQL (Neon)
**Hosting**: Vercel (client) · Render (server) · Neon (database)

## Features

- Real-time messaging via WebSockets
- Two views: Customer chat widget + Agent panel
- Typing indicators (both directions)
- Agent online/offline status
- Conversation history persisted in PostgreSQL
- Resolve conversations
- Auto-scroll to latest message

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/MatiasOrlando/support-agent-chat.git
cd support-agent-chat
npm install
```

### 2. Create a PostgreSQL database

```sql
CREATE DATABASE support_chat;
```

### 3. Configure environment variables

```bash
cp apps/server/.env.example apps/server/.env
cp apps/client/.env.example apps/client/.env.local
```

Edit `apps/server/.env`:
```
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/support_chat"
PORT=4000
CLIENT_URL=http://localhost:3000
```

### 4. Run Prisma migrations

```bash
cd apps/server
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Start both apps

From the root:
```bash
npm run dev
```

Or separately:
```bash
npm run dev:server   # http://localhost:4000
npm run dev:client   # http://localhost:3000
```

Then open `http://localhost:3000` (customer) and `http://localhost:3000/agent`
(agent) in two windows.

## Deployment

- **Server (Render)** — root directory `apps/server`, build `npm install && npm run build`,
  start `npm run start`. The `start` script runs `prisma migrate deploy` before
  booting, and `prisma generate` runs on both install and start so the generated
  client is always present in the hosted environment.
- **Client (Vercel)** — root directory `apps/client`, with `NEXT_PUBLIC_SERVER_URL`
  pointing at the Render server URL.
- **Database (Neon)** — serverless PostgreSQL; its connection string is the
  server's `DATABASE_URL`.
- **CORS** — the server reads `CLIENT_URL` to allow the deployed client origin.

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join_conversation` | Client → Server | Join a conversation room |
| `send_message` | Client → Server | Send a message (validated, persisted, then broadcast) |
| `new_message` | Server → Client | Broadcast new message to the room |
| `typing_start` | Client → Server | User started typing |
| `typing_stop` | Client → Server | User stopped typing |
| `agent_online` | Client → Server | Agent registers as online |
| `agent_status` | Server → Client | Broadcast agent availability |
| `conversation_updated` | Server → Client | Notify agent panel of new activity |

## Live Demo

No login or credentials required, both views are open.

| View | URL |
|------|-----|
| **Customer** | https://support-agent-chat-kappa.vercel.app |
| **Agent panel** | https://support-agent-chat-kappa.vercel.app/agent |

**How to try it:** open the two URLs in separate windows side by side. Start a
conversation as the customer, reply from the agent panel, and watch messages,
typing indicators, and the agent's online status update in real time.

> The backend runs on a free Render instance kept awake by an uptime monitor.
> If the first request is slow, it is waking from idle. Retry once.
