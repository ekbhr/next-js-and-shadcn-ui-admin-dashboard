import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  // If no API key is set, log to console (for development)
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set. Email would be sent to:", to);
    console.info("Subject:", subject);
    console.info("HTML:", html);
    return { success: true, id: "dev-mode" };
  }

  try {
    // Use Resend's test domain by default (works without domain verification)
    // For production, verify your domain in Resend and set EMAIL_FROM to your verified domain
    // Domain ekbhr.com is verified - use: noreply@ekbhr.com
    const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
    
    console.log("Sending email via Resend:", {
      from,
      to,
      subject,
      hasApiKey: !!process.env.RESEND_API_KEY,
      apiKeyLength: process.env.RESEND_API_KEY?.length,
    });
    
    // Warn if using a custom domain that might not be verified
    if (from !== "onboarding@resend.dev" && !from.includes("@resend.dev")) {
      console.warn("⚠️  Using custom domain. Make sure it's verified in Resend: https://resend.com/domains");
    }
    
    const result = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""), // Strip HTML tags for text version
    });

    console.log("Email sent successfully:", result);
    return { success: true, id: result.data?.id, result };
  } catch (error) {
    console.error("Failed to send email:", error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    throw error;
  }
}

