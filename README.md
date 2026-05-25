# Support Chat

Real-time customer support chat built with Next.js 15, Node.js, Socket.io, PostgreSQL, and Prisma.

## Architecture

```
support-chat/
├── apps/
│   ├── client/     
│   └── server/    
└── package.json    # Monorepo root with npm workspaces
```

## Tech Stack

**Frontend**: Next.js 15, TypeScript, React Query, Socket.io client  
**Backend**: Node.js, Express, TypeScript, Socket.io, Prisma ORM  
**Database**: PostgreSQL  

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
git clone <repo>
cd support-chat
npm install
```

### 2. Set up the database

Create a PostgreSQL database:

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

## Usage

- **Customer view**: `http://localhost:3000` — start a conversation
- **Agent panel**: `http://localhost:3000/agent` — view and reply to conversations

Open both in separate browser windows to test real-time messaging.

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join_conversation` | Client → Server | Join a conversation room |
| `send_message` | Client → Server | Send a message |
| `new_message` | Server → Client | Broadcast new message to room |
| `typing_start` | Client → Server | User started typing |
| `typing_stop` | Client → Server | User stopped typing |
| `agent_online` | Client → Server | Agent connected |
| `agent_status` | Server → Client | Broadcast agent availability |
