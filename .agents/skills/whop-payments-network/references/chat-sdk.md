# Chat SDK Reference

Embed Whop chat in your app using React, Vanilla JS, or Swift.

## React

### Install

```bash
npm install @whop/embedded-components-react-js @whop/embedded-components-vanilla-js
```

### Full Example

```tsx
import {
  ChatElement,
  ChatSession,
  Elements,
} from "@whop/embedded-components-react-js";
import { loadWhopElements } from "@whop/embedded-components-vanilla-js";
import type { ChatElementOptions } from "@whop/embedded-components-vanilla-js/types";
import { useMemo } from "react";

const elements = loadWhopElements();

async function getToken() {
  const response = await fetch("/api/token");
  const data = await response.json();
  return data.token;
}

export function ChatPage() {
  const chatOptions: ChatElementOptions = useMemo(() => {
    return {
      channelId: "chat_XXXXXXXXXXXXXX",
    };
  }, []);

  return (
    <Elements elements={elements}>
      <ChatSession token={getToken}>
        <ChatElement
          options={chatOptions}
          style={{ height: "100dvh", width: "100%" }}
        />
      </ChatSession>
    </Elements>
  );
}
```

### Component Hierarchy

```
<Elements elements={elements}>        // Initialize Whop elements
  <ChatSession token={getToken}>      // Authenticate the chat session
    <ChatElement options={...} />      // Render the chat UI
  </ChatSession>
</Elements>
```

### Token Endpoint (Server-side)

The `getToken` function should call your backend, which creates an access token:

```typescript
// /api/token route handler
import Whop from "@whop/sdk";

const client = new Whop({ apiKey: process.env.WHOP_API_KEY });

export async function GET() {
  const token = await client.accessTokens.create({
    company_id: "biz_xxxxxxxxxxxxx",
    // Optionally scope to specific chat permissions
  });

  return Response.json({ token: token.token });
}
```

## Vanilla JS

### Install

```bash
npm install @whop/embedded-components-vanilla-js
```

### Full Example

```typescript
import { loadWhopElements } from "@whop/embedded-components-vanilla-js";

async function getToken() {
  const response = await fetch("/api/token");
  const data = await response.json();
  return data.token;
}

const whopElements = await loadWhopElements();

// Create a chat session
const session = whopElements.createChatSession({
  token: getToken,
});

// Create and mount the chat element
const chatElement = session.createElement("chat-element", {
  channelId: "chat_XXXXXXXXXXXXXX",
});

chatElement.mount("#chat-container");
```

### HTML

```html
<div id="chat-container" style="height: 100vh; width: 100%;"></div>
```

## Swift (iOS)

### Install

Add `WhopElements` via Swift Package Manager.

### Full Example

```swift
import SwiftUI
import WhopElements

struct ContentView: View {
    var body: some View {
        NavigationStack {
            WhopChatView(
                channelId: "chat_XXXXXXXXXXXXXX",
                style: .imessage
            )
        }
        .task {
            await WhopSDK.configureWithOAuth(
                appId: "app_XXXXXXXXXXXXXX",
                scopes: [
                    "openid", "profile", "email",
                    "chat:message:create", "chat:read",
                    "dms:read", "dms:message:manage", "dms:channel:manage",
                    "support_chat:read", "support_chat:message:create",
                ]
            )
        }
    }
}
```

### Required OAuth Scopes (Swift)

| Scope | Purpose |
|-------|---------|
| `openid` | OpenID Connect authentication |
| `profile` | User profile access |
| `email` | User email access |
| `chat:message:create` | Send chat messages |
| `chat:read` | Read chat messages |
| `dms:read` | Read direct messages |
| `dms:message:manage` | Manage DM messages |
| `dms:channel:manage` | Manage DM channels |
| `support_chat:read` | Read support chat |
| `support_chat:message:create` | Send support messages |

### Chat Styles (Swift)

| Style | Description |
|-------|-------------|
| `.imessage` | iMessage-style bubble layout |

## Messages API (Programmatic)

Create DM channels and send messages programmatically via the SDK:

```typescript
// Create a DM channel between users
const dmChannel = await client.dmChannels.create({
  with_user_ids: [userId1, userId2],
  company_id: "biz_xxx",
});

// Send a message
const message = await client.messages.create({
  channel_id: dmChannel.id,
  content: "Hello!",
});

// Pin important messages
await client.messages.update(message.id, { is_pinned: true });
```

## Chat API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/chat_channels` | GET | List chat channels |
| `/api/v1/chat_channels` | POST | Create a chat channel |
| `/api/v1/messages` | GET | List messages in a channel |
| `/api/v1/messages` | POST | Send a message |
| `/api/v1/support_channels` | GET | List support channels |
| `/api/v1/support_channels` | POST | Create a support channel |
| `/api/v1/dm_channels` | GET | List DM channels |

## Important Notes

- The `token` prop on `ChatSession` / `createChatSession` accepts an **async function**, not a static value. The SDK calls it when it needs a fresh token.
- Channel IDs start with `chat_` and can be found in your Whop dashboard or via the API.
- For Swift, use `WhopSDK.configureWithOAuth` with the appropriate scopes before rendering `WhopChatView`.
- `loadWhopElements()` should be called once at the module level, not inside a component render cycle.
