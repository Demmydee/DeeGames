import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import authRoutes from "./server/routes/authRoutes";
import walletRoutes from "./server/routes/walletRoutes";
import payoutAccountRoutes from "./server/routes/payoutAccountRoutes";
import kycRoutes from "./server/routes/kycRoutes";
import lobbyRoutes from "./server/routes/lobbyRoutes";
import gameRequestRoutes from "./server/routes/gameRequestRoutes";
import matchRoutes from "./server/routes/matchRoutes";
import dashboardRoutes from "./server/routes/dashboardRoutes";
import chatRoutes from "./server/routes/chatRoutes";
import voiceRoutes from "./server/routes/voiceRoutes";
import friendRoutes from "./server/routes/friendRoutes";
import notificationRoutes from "./server/routes/notificationRoutes";
import reportRoutes from "./server/routes/reportRoutes";
import supportRoutes from "./server/routes/supportRoutes";
import presenceRoutes from "./server/routes/presenceRoutes";
import socialRoutes from "./server/routes/socialRoutes";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Basic Middleware
  app.use(cors());
  app.use(express.json());

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/wallet", walletRoutes);
  app.use("/api/payout-accounts", payoutAccountRoutes);
  app.use("/api/kyc", kycRoutes);
  app.use("/api/lobby", lobbyRoutes);
  app.use("/api/game-requests", gameRequestRoutes);
  app.use("/api/matches", matchRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/voice", voiceRoutes);
  app.use("/api/friends", friendRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/reports", reportRoutes);
  app.use("/api/support", supportRoutes);
  app.use("/api/presence", presenceRoutes);
  app.use("/api/social", socialRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DeeGames Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
