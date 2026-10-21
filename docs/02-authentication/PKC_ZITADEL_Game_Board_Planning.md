# Planning: Multiplayer Board Game (Monopoly-style) in PKC with ZITADEL

## 1. Overview
The objective is to design and implement a multiplayer board game (similar to Monopoly) within the Personal Knowledge Container (PKC) ecosystem. The system will leverage **ZITADEL** as the centralized Identity Provider (IdP) to handle user authentication, account management, and profile provisioning. This enables users to join game sessions securely using their established identities.

## 2. Architecture & Tech Stack

*   **Identity Provider (IdP):** ZITADEL (OIDC/OAuth 2.0). Provides secure login, user profile data (avatars, usernames), and session management.
*   **Frontend (PKC App):** Web-based interface for the game board. Can be built using standard web technologies (HTML5 Canvas, React, or Vue) to render the board, player tokens, and UI panels.
*   **Backend / Game Server:** A backend service (Node.js, Go, or Python) to act as the authoritative source for game logic and state validation.
*   **Real-time Communication:** WebSockets (or WebRTC for strict P2P) to broadcast game state changes (e.g., dice rolls, property purchases, player movement) to all connected clients instantly.

## 3. ZITADEL Integration (User Accounts & Profiles)

Integrating ZITADEL ensures that every action in the game is tied to an authenticated user.

*   **Setup OIDC Application:** Create a new application within the ZITADEL Console to generate a `client_id` and configure redirect URIs for the PKC app.
*   **Authentication Flow (PKCE):**
    1.  User accesses the PKC Game Board lobby.
    2.  If unauthenticated, the user is redirected to the ZITADEL login page.
    3.  Upon successful login, ZITADEL redirects back to the PKC frontend with an authorization code.
    4.  The frontend/backend exchanges the code for an ID Token and Access Token.
*   **Profile Data Injection:** The ID Token contains standardized OIDC claims such as `name`, `preferred_username`, and `picture`. This data will be extracted to display the user's avatar and name on the game board and in the lobby.
*   **Secure WebSockets:** When a user connects to the multiplayer WebSocket server, they must pass their ZITADEL Access Token. The server verifies the token's signature using ZITADEL's public keys before allowing them to join a game room.

## 4. Game Board Mechanics & Data Structure

The authoritative game state must be managed securely to prevent cheating.

*   **Game State Object:**
    ```json
    {
      "roomId": "game-xyz",
      "status": "in_progress",
      "turn": "user-id-from-zitadel-123",
      "players": [
        {
          "id": "user-id-from-zitadel-123",
          "name": "Alessandro",
          "avatar": "url-from-zitadel",
          "position": 5,
          "balance": 1500,
          "properties": ["oriental_ave", "vermont_ave"]
        }
      ],
      "board": [ ...tile properties... ]
    }
    ```
*   **WebSocket Event Lifecycle:**
    *   `join_game`: Player connects, authenticates via ZITADEL token, server adds them to `players`.
    *   `roll_dice`: Player initiates a roll. Server generates random numbers, calculates the new position, triggers land events (e.g., pay rent), and broadcasts a `state_update`.
    *   `buy_property`: Player attempts to buy the highlighted tile. Server validates funds, deducts balance, assigns ownership, and broadcasts a `state_update`.
    *   `end_turn`: Validates the end of the current player's actions and shifts the `turn` to the next player ID.

## 5. Implementation Phases

### Phase 1: Authentication & Base Setup
*   Configure the ZITADEL project and application.
*   Implement the login/logout flow in the PKC application.
*   Create a "Lobby" screen that fetches and displays the authenticated user's profile information from ZITADEL.

### Phase 2: Game Board Prototype (Local)
*   Design and render the static UI for the Monopoly-style board (tiles, cards, player tokens).
*   Implement standard game logic (dice rolling, token movement, property purchasing) in a local, single-player environment to finalize rules.

### Phase 3: Multiplayer & Real-time Sync
*   Deploy a WebSocket server.
*   Implement the Lobby system (create a room, generate an invite link/code, join a room).
*   Enforce ZITADEL token validation on WebSocket connections.
*   Migrate game logic to the authoritative server and sync the state across all connected clients.

### Phase 4: Polish & Edge Cases
*   Handle network disconnects (allow users to easily re-join a game in progress using their ZITADEL session).
*   Add advanced game features (trading between players, chance/community chest cards, mortgaging).
*   Apply final PKC aesthetic styling.
