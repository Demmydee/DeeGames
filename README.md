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

## Phase 1 Features
- **Landing Page:** Modern, gaming-branded UI.
- **Registration:** Secure validation (username, email, phone uniqueness, 18+ check).
- **Login:** Identifier-based (username or email) with JWT.
- **Dashboard:** Protected route with user-specific welcome message and placeholders for future modules.
