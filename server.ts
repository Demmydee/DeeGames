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
