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

  app.post("/api/send-test-email", async (req, res) => {
    const { toEmail, senderEmail } = req.body;
    if (!toEmail) {
      return res.status(400).json({ error: "Recipient email (toEmail) is required" });
    }
    if (!senderEmail) {
      return res.status(400).json({ error: "Sender email (senderEmail) is required" });
    }

    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey || apiKey === "xkeysib-...") {
      return res.status(400).json({
        success: false,
        error: "Brevo API key is not configured. Please set the BREVO_API_KEY in the Secrets panel."
      });
    }

    console.log(`[API] Sending test email from ${senderEmail} to ${toEmail}`);

    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "content-type": "application/json",
          "api-key": apiKey
        },
        body: JSON.stringify({
          sender: {
            name: "Alenna Rae Willis (Glucose Reset)",
            email: senderEmail.trim()
          },
          to: [
            {
              email: toEmail.trim(),
              name: "Subscriber Test"
            }
          ],
          subject: "🌸 Your Glucose Reset Test Email is Successful!",
          htmlContent: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0d6cc; border-radius: 12px; background-color: #fcf9f5;">
              <h1 style="color: #b8863d; font-family: serif; border-bottom: 2px solid #b8863d; padding-bottom: 10px;">The Glucose Reset</h1>
              <p style="font-size: 16px; color: #1e1a16; line-height: 1.6;">Hello,</p>
              <p style="font-size: 16px; color: #1e1a16; line-height: 1.6;">
                Congratulations! This is a test email sent from your <strong>Glucose Reset</strong> landing page to confirm your direct Brevo integration works seamlessly.
              </p>
              <div style="background-color: #f5ede4; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #b8863d;">
                <p style="margin: 0; font-size: 14px; color: #6b6258;">
                  <strong>Status Check:</strong><br />
                  ✅ Connection: Established<br />
                  ✅ API Key: Verified<br />
                  ✅ Sender Authentication: Working
                </p>
              </div>
              <p style="font-size: 14px; color: #6b6258;">
                If you did not receive emails when subscribing via the popups, make sure that you have a <strong>Brevo Automation Workflow</strong> activated where the trigger is: "A contact is added to list ${process.env.BREVO_LIST_ID || 'specified'}" and the action is "Send an email".
              </p>
              <p style="font-size: 14px; color: #6b6258; margin-top: 30px; border-top: 1px solid #e0d6cc; padding-top: 15px;">
                Warmly,<br />
                <strong>Alenna Rae Willis</strong><br />
                The Glucose Reset Support
              </p>
            </div>
          `
        })
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        console.error("[Brevo SMTP Error]", responseData);
        return res.status(response.status).json({
          success: false,
          error: responseData?.message || `Brevo SMTP API error (${response.status})`,
          details: responseData
        });
      }

      console.log(`[Brevo SMTP Success] Email sent successfully to ${toEmail}`, responseData);
      return res.json({
        success: true,
        message: "Test email successfully delivered via Brevo SMTP!",
        messageId: responseData?.messageId
      });
    } catch (err: any) {
      console.error("[API Error] SMTP sending failed:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Failed to contact Brevo SMTP service"
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
