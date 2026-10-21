# D&D: Prologue of Spacetime - Implementation Guide
## Complete Guide to Building and Playing the Game

This guide provides **step-by-step instructions** for implementing and playing the "Dungeons & Dragons: Prologue of Spacetime Edition" game with ZITADEL authentication integration.

---

## **Table of Contents**

1. [Game Overview](#game-overview)
2. [System Requirements](#system-requirements)
3. [Technical Architecture](#technical-architecture)
4. [ZITADEL Authentication Setup](#zitadel-authentication-setup)
5. [Game Components](#game-components)
6. [Character Creation Guide](#character-creation-guide)
7. [How to Play (Gameplay Guide)](#how-to-play-gameplay-guide)
8. [AI Dungeon Master Setup](#ai-dungeon-master-setup)
9. [Step-by-Step Implementation](#step-by-step-implementation)
10. [Sample Game Session](#sample-game-session)

---

## **Game Overview**

### **What is This Game?**

**D&D: Prologue of Spacetime Edition** is a web-based role-playing game that combines:
- Traditional Dungeons & Dragons mechanics (d20 system, stats, progression)
- The Five Dining Philosophers cosmology (Energy, Communication, Knowledge, Time, Technology)
- AI-powered Dungeon Master for dynamic storytelling
- Secure authentication via ZITADEL
- Post-apocalyptic survival scenario (300-day countdown)

### **Core Experience**

Players create characters, form a party, and work together to survive an apocalyptic event. An AI Dungeon Master narrates the story, presents challenges, and adjudicates rules. Every action is resolved through dice rolls modified by character stats.

### **Target Audience**

- Students learning systems thinking and resource management
- RPG enthusiasts seeking philosophical depth
- Educators using games for teaching
- Anyone interested in collaborative storytelling

---

## **System Requirements**

### **Hardware Requirements**

**Minimum:**
- Modern computer (2015+)
- 4GB RAM
- Internet connection (5 Mbps+)
- Microphone (optional, for voice interaction)
- Speakers/headphones

**Recommended:**
- 8GB+ RAM
- Stable internet (10 Mbps+)
- Webcam (for video sessions)
- Large screen (15"+ for better map viewing)

### **Software Requirements**

**For Players:**
- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- ZITADEL account (free)
- No installation required (web-based)

**For Developers/Hosts:**
- Node.js 18+ or Python 3.10+
- Database (PostgreSQL 14+ or MongoDB 5+)
- LLM API access (OpenAI GPT-4, Anthropic Claude, or local LLM)
- ZITADEL project setup
- Git for version control

---

## **Technical Architecture**

### **System Components**

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React/Next.js)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Login Page   │  │ Character    │  │ Game Board   │     │
│  │ (ZITADEL)    │  │ Creation     │  │ Interface    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND (Node.js/Python)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Auth Service │  │ Game Logic   │  │ AI DM        │     │
│  │ (ZITADEL)    │  │ Engine       │  │ Service      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                     DATABASE (PostgreSQL)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Users        │  │ Characters   │  │ Game State   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                       │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │ ZITADEL      │  │ LLM API      │                        │
│  │ (Auth)       │  │ (AI DM)      │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

### **Technology Stack**

**Frontend:**
- React 18+ with Next.js 14+ (App Router)
- TailwindCSS for styling
- Shadcn/ui for components
- React Hook Form + Zod for validation
- TanStack Query for data fetching
- Lucide icons

**Backend:**
- Node.js with Express or Next.js API routes
- Prisma ORM for database access
- ZITADEL SDK for authentication
- OpenAI/Anthropic SDK for AI DM

**Database:**
- PostgreSQL (primary choice)
- Alternative: MongoDB for flexible schema

**Authentication:**
- ZITADEL (OAuth 2.0 / OIDC)

---

## **ZITADEL Authentication Setup**

### **Why ZITADEL?**

ZITADEL provides:
- **Secure authentication** (OAuth 2.0, OIDC)
- **User management** (profiles, sessions)
- **Role-based access control** (player, DM, admin)
- **Multi-factor authentication** (optional)
- **Self-hosted or cloud** options

### **Step 1: Create ZITADEL Account**

1. Go to [https://zitadel.com](https://zitadel.com)
2. Sign up for free account
3. Create a new organization (e.g., "Prologue of Spacetime Games")
4. Create a new project (e.g., "D&D Spacetime Edition")

### **Step 2: Configure Application**

1. In ZITADEL console, go to your project
2. Click "New Application"
3. Choose "Web Application"
4. Configure:
   - **Name:** D&D Spacetime Game
   - **Redirect URIs:** `http://localhost:3000/api/auth/callback` (dev), `https://yourdomain.com/api/auth/callback` (prod)
   - **Post Logout URIs:** `http://localhost:3000` (dev), `https://yourdomain.com` (prod)
   - **Grant Types:** Authorization Code, Refresh Token
   - **Response Types:** Code
5. Save and note down:
   - **Client ID**
   - **Client Secret**
   - **Issuer URL** (e.g., `https://yourinstance.zitadel.cloud`)

### **Step 3: Define User Roles**

Create roles in ZITADEL:
- **player:** Can create characters and join games
- **dungeon_master:** Can host games and control AI DM
- **admin:** Full system access

### **Step 4: Environment Variables**

Create `.env.local` file:

```env
# ZITADEL Configuration
ZITADEL_ISSUER=https://yourinstance.zitadel.cloud
ZITADEL_CLIENT_ID=your_client_id_here
ZITADEL_CLIENT_SECRET=your_client_secret_here

# Application URLs
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_random_secret_here

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dnd_spacetime

# AI Service
OPENAI_API_KEY=your_openai_key_here
# OR
ANTHROPIC_API_KEY=your_anthropic_key_here
```

### **Step 5: Install Dependencies**

```bash
npm install @zitadel/next-app-router @zitadel/client
# OR
npm install next-auth @auth/prisma-adapter
```

---

## **Game Components**

### **Physical Components (Optional for Hybrid Play)**

- **Dice:** 1 set of polyhedral dice (d4, d6, d8, d10, d12, d20)
- **Character Sheets:** Printable PDFs or digital forms
- **Map/Board:** Digital map viewer or physical grid
- **Tokens:** Digital avatars or physical miniatures

### **Digital Components (Required)**

1. **Character Management System**
   - Create/edit characters
   - Track stats (ENE, COM, KNO, TIM, TEC)
   - Manage inventory and equipment
   - View progression history

2. **Game Board Interface**
   - Map viewer with fog of war
   - Character tokens
   - Initiative tracker
   - Dice roller (virtual d20)
   - Chat/narration panel

3. **AI Dungeon Master Panel**
   - Story generation controls
   - NPC management
   - Encounter builder
   - Time tracker (300-day countdown)
   - Event scheduler

4. **Admin Dashboard**
   - User management
   - Game session monitoring
   - Analytics and reports
   - System configuration

---

## **Character Creation Guide**

### **Step 1: Login and Access Character Creator**

1. Navigate to game website
2. Click "Login with ZITADEL"
3. Authenticate with your credentials
4. Click "Create New Character"

### **Step 2: Choose Character Concept**

Think about your role in the party:

**Archetypes:**
- **The Engineer (TEC/KNO focus):** Builds equipment, repairs machines
- **The Leader (COM/TIM focus):** Coordinates team, negotiates with NPCs
- **The Survivor (ENE/TEC focus):** Gathers resources, endures hardship
- **The Scholar (KNO/COM focus):** Researches solutions, preserves knowledge
- **The Timekeeper (TIM/KNO focus):** Plans efficiently, predicts outcomes

### **Step 3: Assign Stat Points**

You have **70 points** to distribute among the Five Stats:
- Minimum per stat: 8
- Maximum per stat: 18
- Each stat starts at 10 (costs 0 points)
- Increasing from 10→11 costs 1 point
- Increasing from 11→12 costs 1 point (total 2)
- And so on...

**Example Distribution (The Engineer):**
- ENE: 12 (2 points)
- COM: 10 (0 points)
- KNO: 16 (6 points)
- TIM: 14 (4 points)
- TEC: 18 (8 points)
- **Total: 20 points used out of 70**

**Balanced Distribution:**
- ENE: 14 (4 points)
- COM: 14 (4 points)
- KNO: 14 (4 points)
- TIM: 14 (4 points)
- TEC: 14 (4 points)
- **Total: 20 points used**

### **Step 4: Choose Starting Equipment**

Select **3 items** from the starting equipment list:

| Equipment | Stat Bonus | Description |
|-----------|------------|-------------|
| Toolkit | +1 TEC | Basic repair tools |
| Radio | +1 COM | Short-range communication |
| First Aid Kit | +1 ENE | Medical supplies |
| Journal | +1 KNO | Record observations |
| Watch | +1 TIM | Accurate timekeeping |
| Backpack | - | Carry more items |
| Rope (50ft) | - | Utility item |
| Flashlight | - | Light source |

### **Step 5: Write Character Background**

Answer these questions (100-300 words):
- Who were you before the apocalypse?
- What skills did you have?
- What motivates you to survive?
- What is your greatest fear?
- What is your greatest hope?

### **Step 6: Finalize and Save**

- Review your character sheet
- Click "Save Character"
- Character is now ready for gameplay!

---

## **How to Play (Gameplay Guide)**

### **Game Session Structure**

Each game session follows this flow:

```
1. Login → 2. Join Session → 3. AI DM Introduction → 
4. Player Actions → 5. Dice Rolls → 6. Consequences → 
7. Repeat 4-6 → 8. Session End → 9. Save Progress
```

### **Turn-Based Gameplay**

**Initiative Order:**
- At the start of each scene, all players roll d20 + TIM modifier
- Highest roll goes first
- Proceed in descending order
- NPCs/enemies also roll initiative

**On Your Turn:**

1. **Describe your action** (what you want to do)
2. **AI DM determines DC** (Difficulty Class)
3. **Roll d20 + relevant stat modifier**
4. **Compare to DC:**
   - **Success (≥ DC):** Action succeeds, AI DM narrates outcome
   - **Failure (< DC):** Action fails, AI DM narrates consequences
5. **End turn** (next player goes)

### **Types of Actions**

**Exploration Actions (outside combat):**
- Search an area (KNO check)
- Repair equipment (TEC check)
- Negotiate with NPCs (COM check)
- Navigate terrain (TIM check)
- Lift/move objects (ENE check)

**Combat Actions (during encounters):**
- Attack enemy (ENE check for melee, TEC check for ranged)
- Defend/dodge (TIM check)
- Use equipment (TEC check)
- Coordinate team (COM check)
- Analyze weakness (KNO check)

**Time-Consuming Actions:**
- Building equipment: 1-50 days
- Traveling: 0.5-10 days
- Research: 1-20 days
- Rest/recovery: 1-7 days

### **Difficulty Classes (DC) Reference**

| DC | Difficulty | Example |
|----|------------|---------|
| 5 | Trivial | Open unlocked door |
| 10 | Easy | Repair simple tool |
| 15 | Moderate | Negotiate with neutral NPC |
| 20 | Hard | Build solar panel from scratch |
| 25 | Very Hard | Hack encrypted system |
| 30 | Nearly Impossible | Construct quantum computer |

### **Auto-Success Rule**

**If your base stat ≥ DC, you automatically succeed without rolling.**

Example:
- Task: Repair radio (DC 12)
- Your TEC: 14
- Result: Automatic success, no roll needed!

### **Equipment and Progression**

**Acquiring Equipment:**
- Find in exploration
- Build with TEC checks
- Trade with NPCs
- Receive as quest rewards

**Equipment Effects:**
- Permanently increases stats
- Unlocks new actions
- Reduces time for tasks
- Provides passive benefits

### **The 300-Day Countdown**

**Time Tracking:**
- AI DM tracks current day automatically
- Displayed prominently on game board
- Actions consume time (hours or days)
- Water level rises gradually

**Critical Milestones:**
- **Day 50:** First major settlement floods
- **Day 100:** Coastal cities submerged
- **Day 150:** Resources become scarce
- **Day 200:** Panic and chaos spread
- **Day 250:** Only highlands remain
- **Day 300:** Total submersion (game end)

**Winning Conditions:**
- Build a seaworthy vessel (requires specific equipment and stats)
- Find/create a permanent sanctuary above water level
- Discover alternative solution (AI DM may present options)

**Losing Conditions:**
- All party members die
- Day 300 arrives without achieving win condition
- Critical resources depleted

---

## **AI Dungeon Master Setup**

### **AI DM Responsibilities**

The AI Dungeon Master:
1. **Narrates the story** (describes scenes, NPCs, events)
2. **Sets Difficulty Classes** for player actions
3. **Controls NPCs and enemies** (dialogue, actions)
4. **Tracks game state** (time, resources, party location)
5. **Generates encounters** (challenges, discoveries, conflicts)
6. **Adjudicates rules** (interprets edge cases)
7. **Adapts difficulty** (balances challenge and fun)

### **AI Model Selection**

**Recommended Models:**

| Model | Pros | Cons | Cost |
|-------|------|------|------|
| GPT-4 Turbo | Excellent storytelling, context | Expensive | $0.01/1K tokens |
| Claude 3 Opus | Creative, philosophical depth | Moderate cost | $0.015/1K tokens |
| Claude 3 Sonnet | Good balance of quality/cost | Less creative | $0.003/1K tokens |
| Local LLM (Llama 3) | Free, private | Requires GPU, lower quality | Free |

**Recommended:** Claude 3 Opus for best philosophical integration

### **AI DM Prompt Template**

```markdown
You are the Dungeon Master for "D&D: Prologue of Spacetime Edition."

SETTING:
- Post-apocalyptic world, water levels rising
- 300 days until total submersion
- Current day: {current_day}
- Party location: {location}

PARTY COMPOSITION:
{list of characters with stats}

GAME RULES:
- Players roll d20 + stat modifier vs. DC
- Stats: ENE (Energy), COM (Communication), KNO (Knowledge), TIM (Time), TEC (Technology)
- Auto-success if base stat ≥ DC
- Actions consume time (track carefully)

PHILOSOPHICAL FRAMEWORK:
- Integrate The Five Dining Philosophers concepts
- Reference spacetime principles when appropriate
- Create meaningful choices with moral weight
- Balance urgency (time pressure) with exploration

YOUR ROLE:
1. Narrate vividly and dramatically
2. Set fair but challenging DCs
3. Track time and resources accurately
4. Create emergent storylines from player choices
5. Maintain tension and pacing

CURRENT SCENE:
{scene description}

Player action: {player_action}

Respond with:
1. DC for the action (if applicable)
2. Narration of the outcome (after dice roll)
3. Time consumed
4. New scene description
```

### **Integrating AI DM into Application**

**Backend API Endpoint:**

```javascript
// /api/ai-dm/action
export async function POST(req) {
  const { gameId, playerId, action, diceRoll } = await req.json();
  
  // Fetch game state from database
  const gameState = await getGameState(gameId);
  
  // Build prompt with context
  const prompt = buildDMPrompt(gameState, action);
  
  // Call AI model
  const response = await callAI(prompt);
  
  // Parse response (DC, narration, time cost)
  const { dc, narration, timeCost } = parseAIResponse(response);
  
  // Update game state
  await updateGameState(gameId, {
    currentDay: gameState.currentDay + timeCost,
    lastNarration: narration
  });
  
  return { dc, narration, timeCost };
}
```

---

## **Step-by-Step Implementation**

### **Phase 1: Project Setup (Week 1)**

**Day 1-2: Initialize Project**

```bash
# Create Next.js project
npx create-next-app@latest dnd-spacetime --typescript --tailwind --app

cd dnd-spacetime

# Install dependencies
npm install @zitadel/next-app-router prisma @prisma/client
npm install react-hook-form zod @hookform/resolvers
npm install @tanstack/react-query
npm install openai  # or anthropic SDK

# Install dev dependencies
npm install -D prisma
```

**Day 3-4: Setup Database**

```bash
# Initialize Prisma
npx prisma init

# Edit prisma/schema.prisma
```

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  zitadelId String   @unique
  role      String   @default("player")
  createdAt DateTime @default(now())
  characters Character[]
  gameSessions GameSession[]
}

model Character {
  id          String   @id @default(cuid())
  name        String
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  
  // Five Stats
  energy      Int      @default(10)
  communication Int    @default(10)
  knowledge   Int      @default(10)
  time        Int      @default(10)
  technology  Int      @default(10)
  
  background  String?
  equipment   Json     @default("[]")
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  gameSessionId String?
  gameSession   GameSession? @relation(fields: [gameSessionId], references: [id])
}

model GameSession {
  id          String   @id @default(cuid())
  name        String
  currentDay  Int      @default(1)
  status      String   @default("active") // active, completed, failed
  
  dmUserId    String
  dm          User     @relation(fields: [dmUserId], references: [id])
  
  characters  Character[]
  events      GameEvent[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model GameEvent {
  id          String   @id @default(cuid())
  sessionId   String
  session     GameSession @relation(fields: [sessionId], references: [id])
  
  day         Int
  type        String   // action, narration, combat, discovery
  description String
  data        Json     @default("{}")
  
  createdAt   DateTime @default(now())
}
```

```bash
# Run migration
npx prisma migrate dev --name init

# Generate Prisma Client
npx prisma generate
```

**Day 5-7: Setup ZITADEL Authentication**

Create `lib/auth.ts`:

```typescript
import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    {
      id: "zitadel",
      name: "ZITADEL",
      type: "oauth",
      wellKnown: `${process.env.ZITADEL_ISSUER}/.well-known/openid-configuration`,
      authorization: { params: { scope: "openid email profile" } },
      idToken: true,
      checks: ["pkce", "state"],
      client: {
        token_endpoint_auth_method: "client_secret_basic",
      },
      clientId: process.env.ZITADEL_CLIENT_ID,
      clientSecret: process.env.ZITADEL_CLIENT_SECRET,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          zitadelId: profile.sub,
        };
      },
    },
  ],
  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id;
      session.user.role = user.role;
      return session;
    },
  },
};
```

### **Phase 2: Core Features (Week 2-3)**

**Week 2: Character Creation**

1. Create character creation form with React Hook Form + Zod
2. Implement stat point allocation system
3. Add equipment selection
4. Save to database via API route

**Week 3: Game Board Interface**

1. Create game board layout (map, chat, stats panel)
2. Implement dice roller component
3. Add initiative tracker
4. Create action input system

### **Phase 3: AI Integration (Week 4)**

**AI DM Service:**

```typescript
// lib/ai-dm.ts
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function getDMResponse(
  gameState: GameState,
  playerAction: string,
  diceRoll?: number
) {
  const prompt = buildDMPrompt(gameState, playerAction, diceRoll);
  
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt }
    ],
    temperature: 0.8,
    max_tokens: 1000,
  });
  
  return parseResponse(response.choices[0].message.content);
}
```

### **Phase 4: Testing & Deployment (Week 5)**

1. Write unit tests for game logic
2. Test AI DM responses
3. Conduct playtest sessions
4. Deploy to Vercel/Netlify
5. Configure production ZITADEL settings

---

## **Sample Game Session**

### **Session Start**

**AI DM:** 
> "Welcome, survivors. It is Day 1 of the Deluge. You stand in the ruins of what was once a thriving coastal city. The water has already claimed the lower districts. You have 299 days remaining. The God of Time watches, impassive. What do you do?"

**Player 1 (The Engineer, TEC 18):**
> "I want to search the nearby electronics store for salvageable parts."

**AI DM:**
> "Roll KNO to search effectively. DC 12."

**Player 1 rolls:** d20 (14) + KNO modifier (+2) = 16 ✓ Success

**AI DM:**
> "You find a cache of solar panels, circuit boards, and a portable generator. Add these to your inventory. This search took 2 hours. It is now Day 1, 2pm."

**Player 2 (The Leader, COM 16):**
> "I want to find other survivors and convince them to join our group."

**AI DM:**
> "You encounter a group of 5 survivors holed up in an apartment building. They're suspicious. Roll COM to persuade them. DC 15."

**Player 2 rolls:** d20 (11) + COM modifier (+3) = 14 ✗ Failure

**AI DM:**
> "They refuse to trust strangers. One of them points a weapon at you. 'Leave, now.' You retreat safely but gain no allies. Time: 1 hour. Day 1, 3pm."

**Player 3 (The Scholar, KNO 17):**
> "I want to research the water rise patterns to predict safe zones."

**AI DM:**
> "Your KNO (17) exceeds the DC (15) for basic research. Auto-success! You determine that the highlands 50 miles north will remain dry for at least 200 days. This research took 4 hours. Day 1, 7pm."

### **Session Continues...**

The AI DM continues narrating, setting DCs, tracking time, and creating emergent storylines based on player choices.

---

## **Quick Start Checklist**

### **For Players:**

- [ ] Create ZITADEL account
- [ ] Login to game website
- [ ] Create character (assign stats, choose equipment)
- [ ] Join or create game session
- [ ] Read gameplay guide
- [ ] Ready to play!

### **For Developers:**

- [ ] Setup ZITADEL project and application
- [ ] Clone/create Next.js project
- [ ] Configure environment variables
- [ ] Setup PostgreSQL database
- [ ] Run Prisma migrations
- [ ] Implement authentication
- [ ] Build character creation
- [ ] Build game board interface
- [ ] Integrate AI DM service
- [ ] Test thoroughly
- [ ] Deploy to production

---

## **Additional Resources**

### **Learning Materials**

- [D&D Basic Rules (Official)](https://www.dndbeyond.com/sources/dnd/br-2024)
- [ZITADEL Documentation](https://zitadel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)

### **Community**

- Create Discord server for players
- Setup GitHub repository for development
- Document house rules and variations

### **Future Enhancements**

- Voice-based AI DM (text-to-speech)
- Visual map generation
- Mobile app version
- Multiplayer real-time sessions
- Campaign management tools
- Character progression trees
- Achievement system

---

## **Troubleshooting**

### **Common Issues**

**Issue: ZITADEL authentication fails**
- Verify redirect URIs match exactly
- Check client ID and secret
- Ensure issuer URL is correct

**Issue: AI DM responses are inconsistent**
- Improve prompt engineering
- Add more context to prompts
- Use higher-quality model (GPT-4 vs GPT-3.5)

**Issue: Database connection errors**
- Verify DATABASE_URL in .env
- Check PostgreSQL is running
- Run `npx prisma generate`

**Issue: Dice rolls not working**
- Check JavaScript random number generation
- Verify stat modifiers calculated correctly
- Test with known values

---

## **Conclusion**

This implementation guide provides everything needed to build and play **D&D: Prologue of Spacetime Edition**. The game combines traditional RPG mechanics with philosophical depth, AI-powered storytelling, and modern web technologies.

**Key Takeaways:**
- ZITADEL provides secure, scalable authentication
- The Five Stats replace traditional D&D abilities
- AI DM enables dynamic, emergent narratives
- 300-day countdown creates urgency and meaning
- Educational value through systems thinking

**Next Steps:**
1. Setup development environment
2. Create ZITADEL project
3. Build character creation system
4. Integrate AI DM
5. Playtest with real users
6. Iterate and improve

**May the Five Gods guide your journey through the Deluge!**
