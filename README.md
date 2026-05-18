# DeeGames - Phase 1

DeeGames is a peer-to-peer wagering platform. Phase 1 implements the core authentication foundation and landing experience.

## Tech Stack
- **Frontend:** React (Vite), Tailwind CSS, Lucide React, Motion
- **Backend:** Node.js, Express, TypeScript, Zod, JWT, Bcrypt
- **Database:** Supabase (PostgreSQL)

## Local Setup

### 1. Database Setup
1. Create a new project on [Supabase](https://supabase.com).
2. Go to the **SQL Editor** and run the contents of `schema.sql`.
3. Copy your **Project URL** and **Anon Key** from Project Settings > API.

### 2. Environment Variables
Create a `.env` file in the root (use `.env.example` as a template):
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET=your_random_secret_string
VITE_API_URL=http://localhost:3000
```

### 3. Installation
```bash
npm install
```

### 4. Running the App
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.

## Deployment

### Backend (Render)
1. Connect your GitHub repository to Render.
2. Create a new **Web Service**.
3. Set the build command to `npm run build`.
4. Set the start command to `npm start`.
5. Add your environment variables in the Render dashboard.

### Frontend (Cloudflare Pages)
1. Connect your GitHub repository to Cloudflare Pages.
2. Set the framework preset to **Vite**.
3. Set the build command to `npm run build`.
4. Set the build output directory to `dist`.
5. Add `VITE_API_URL` pointing to your Render backend URL.

## Phase 5D: Whot Card Game
- **Game Engine:** Custom Whot Card Engine supporting 2-4 players.
- **Card Specification:** 44-card Nigerian Whot deck (Circle, Triangle, Cross, Square, Star, and Whot bits).
- **Variants:**
  - **Classic Whot:** Traditional "last card" mechanics with order-of-finish rankings.
  - **Scored Whot:** First to finish wins; others ranked by hand value tally (Star cards doubled).
- **Special Cards:**
  - **1 (Check Here):** Change requested suit.
  - **2 (Pick Two):** Next player picks 2 or stacks.
  - **3 (Pick Three):** Next player picks 3 or stacks.
  - **8 (Hold On):** Skip next player.
  - **14 (General Market):** Everyone else picks 1 unless they have a 14.
  - **20 (Whot):** Wild card, can be played on anything.
- **Automated Voice Announcements:** Uses Web Speech API for immersive Nigerian game culture atmosphere.
- **Privacy:** Server-authoritative deck; opponent hands are strictly hidden in API responses.
- **Timers:** 15-second turn timers with automated timeout actions.

## Previous Phases
- **Phase 1:** Auth, landing page, dashboard.
- **Phase 2:** Wallet, Paystack, transactions.
- **Phase 3:** Lobby, matches, wagers.
- **Phase 4:** Chat, cliques, support.
- **Phase 5A-C:** Dice, Chess, and Ludo game engines.
