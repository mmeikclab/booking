import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "",
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: (process.env.SMTP_PORT ?? "587") === "465",
  auth: process.env.SMTP_USER
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }
    : undefined,
});

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!process.env.SMTP_HOST) {
    console.log(`[mail] skipped (SMTP yok): ${to} — ${subject}`);
    return;
  }
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? "Randevu Sistemi <no-reply@localhost>",
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("[mail] gönderim hatası:", err);
  }
}