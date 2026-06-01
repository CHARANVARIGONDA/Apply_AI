import nodemailer from "nodemailer";

export interface EmailPayload {
  to: string;
  subject: string;
  htmlBody: string;
  resumeFileName?: string;
  resumeContent?: Buffer | string; // Buffer for compiled PDF attachments
}

export class EmailRelayService {
  /**
   * Dispatches customized application email payloads using Gmail SMTP relays.
   */
  static async sendApplicationEmail(
    userEmail: string,
    gmailAppPassword: string,
    payload: EmailPayload
  ): Promise<{ success: boolean; messageId?: string }> {
    
    // Sandbox validation: if dummy values are supplied, bypass actual Nodemailer transport
    if (
      userEmail.includes("example.com") || 
      userEmail.includes("test@") ||
      gmailAppPassword === "password" || 
      gmailAppPassword.length < 6
    ) {
      console.log(`[SMTP Sandbox Sandbox] Simulating email delivery to ${payload.to} with CC to sricharanvarigonda07@gmail.com`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return {
        success: true,
        messageId: `sandbox-message-id-${Math.random().toString(36).substring(7)}`,
      };
    }

    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: userEmail,
          pass: gmailAppPassword,
        },
      });

      // Prepare attachments if resume details are supplied
      const attachments: any[] = [];
      if (payload.resumeFileName && payload.resumeContent) {
        attachments.push({
          filename: payload.resumeFileName,
          content: payload.resumeContent,
        });
      }

      const mailOptions = {
        from: userEmail,
        to: payload.to,
        cc: "sricharanvarigonda07@gmail.com",
        subject: payload.subject,
        html: payload.htmlBody,
        attachments,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`Email successfully dispatched. Message ID: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (err: any) {
      console.error("Nodemailer failed to dispatch application email:", err);
      throw new Error(err.message || "Failed to dispatch email via SMTP transporter.");
    }
  }
}
