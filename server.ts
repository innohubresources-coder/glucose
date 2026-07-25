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

    console.log(`[API] Register lead received: ${email} (source: ${source})`);

    let fluentFormSuccess = false;
    let fluentFormInsertId: number | null = null;
    let redirectUrl = "https://innohubresources.com/glucose-quick-reset-guide/";
    let fluentFormError = "";

    // 1. Submit to WordPress Fluent Form [fluentform id="23"]
    try {
      console.log(`[FluentForm 23] Submitting lead ${email} to WordPress...`);
      const pageRes = await fetch("https://innohubresources.com/?ff_landing=23");
      const html = await pageRes.text();

      const nonceMatch = html.match(/_fluentform_23_fluentformnonce["\s\S]*?value="([^"]+)"/) || html.match(/"nonce":"([^"]+)"/);
      const nonce = nonceMatch ? nonceMatch[1] : "";

      const postIdMatch = html.match(/name=["\']__fluent_form_embded_post_id["\']\s+value=["\']([^"\']+)["\']/);
      const postId = postIdMatch ? postIdMatch[1] : "4466";

      const formDataParams = new URLSearchParams({
        "__fluent_form_embded_post_id": postId,
        "_fluentform_23_fluentformnonce": nonce,
        "_wp_http_referer": "/?ff_landing=23",
        "email": email.trim()
      });

      const bodyParams = new URLSearchParams({
        action: "fluentform_submit",
        form_id: "23",
        data: formDataParams.toString()
      });

      const submitRes = await fetch("https://innohubresources.com/wp-admin/admin-ajax.php?t=" + Date.now(), {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
        },
        body: bodyParams.toString()
      });

      const ffJson = await submitRes.json().catch(() => null);
      if (ffJson && ffJson.success) {
        fluentFormSuccess = true;
        fluentFormInsertId = ffJson.data?.insert_id || null;
        if (ffJson.data?.result?.redirectUrl) {
          redirectUrl = ffJson.data.result.redirectUrl;
        }
        console.log(`[FluentForm 23 Success] Insert ID: ${fluentFormInsertId}, Redirect: ${redirectUrl}`);
      } else {
        fluentFormError = ffJson?.data?.error || ffJson?.errors?.email?.required || "FluentForm submission error";
        console.warn(`[FluentForm 23 Warning] Response:`, ffJson);
      }
    } catch (err: any) {
      console.error("[FluentForm 23 Error]", err);
      fluentFormError = err.message || "Failed to contact WordPress FluentForm endpoint";
    }

    // 2. Dual Sync with Brevo if configured
    const apiKey = process.env.BREVO_API_KEY;
    const listIdStr = process.env.BREVO_LIST_ID;
    let brevoSuccess = false;

    if (apiKey && apiKey !== "xkeysib-...") {
      try {
        const cleanedListId = listIdStr ? listIdStr.replace(/[^0-9]/g, "") : "";
        const parsedId = cleanedListId ? parseInt(cleanedListId, 10) : NaN;
        const listIds = !isNaN(parsedId) ? [parsedId] : [];

        const payload: any = {
          email: email.trim(),
          updateEnabled: true
        };
        if (listIds.length > 0) {
          payload.listIds = listIds;
        }

        const brevoRes = await fetch("https://api.brevo.com/v3/contacts", {
          method: "POST",
          headers: {
            "accept": "application/json",
            "content-type": "application/json",
            "api-key": apiKey
          },
          body: JSON.stringify(payload)
        });

        if (brevoRes.ok) {
          brevoSuccess = true;
          console.log(`[Brevo Success] Contact synced: ${email}`);
        }
      } catch (bErr) {
        console.error("[Brevo Sync Warning]", bErr);
      }
    }

    // Return combined result
    if (fluentFormSuccess || brevoSuccess) {
      return res.json({
        success: true,
        message: "Thank you! You've been successfully subscribed.",
        redirectUrl: redirectUrl,
        fluentFormSubmitted: fluentFormSuccess,
        fluentFormInsertId: fluentFormInsertId,
        brevoSynced: brevoSuccess
      });
    } else {
      return res.status(500).json({
        success: false,
        error: fluentFormError || "Failed to submit lead to WordPress FluentForm."
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
