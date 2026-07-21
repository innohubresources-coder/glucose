import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes first!
  app.get("/api/config", (req, res) => {
    res.json({
      brevoConfigured: !!process.env.BREVO_API_KEY && process.env.BREVO_API_KEY !== "xkeysib-...",
      listId: process.env.BREVO_LIST_ID || null
    });
  });

  app.post("/api/register-lead", async (req, res) => {
    const { email, source } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const apiKey = process.env.BREVO_API_KEY;
    const listIdStr = process.env.BREVO_LIST_ID;

    console.log(`[API] Register lead received: ${email} (source: ${source})`);

    // If API key is not configured, run in Simulation/Sandbox mode
    if (!apiKey || apiKey === "xkeysib-...") {
      console.log(`[Brevo Simulation] Contact simulated: ${email}`);
      return res.json({
        success: true,
        simulated: true,
        message: "Subscription simulated successfully! (Brevo API key is not configured yet - configure BREVO_API_KEY in the Secrets panel)."
      });
    }

    try {
      // Clean and parse the list ID robustly (e.g. support "#5", " 5", "5")
      const cleanedListId = listIdStr ? listIdStr.replace(/[^0-9]/g, "") : "";
      const parsedId = cleanedListId ? parseInt(cleanedListId, 10) : NaN;
      const listIds = !isNaN(parsedId) ? [parsedId] : [];

      const payload: any = {
        email: email,
        updateEnabled: true
      };
      if (listIds.length > 0) {
        payload.listIds = listIds;
      }

      const response = await fetch("https://api.brevo.com/v3/contacts", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "content-type": "application/json",
          "api-key": apiKey
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        console.error("[Brevo Error]", responseData);
        return res.status(response.status).json({
          success: false,
          error: responseData?.message || `Brevo API error (${response.status})`,
          details: responseData
        });
      }

      console.log(`[Brevo Success] Contact subscribed: ${email}`, responseData);
      return res.json({
        success: true,
        simulated: false,
        message: "Successfully subscribed to Brevo!"
      });
    } catch (err: any) {
      console.error("[API Error] Failed to contact Brevo:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Failed to contact Brevo service"
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
