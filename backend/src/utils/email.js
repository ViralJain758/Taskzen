import nodemailer from "nodemailer";

let transporter;

const getTransporter = async () => {
  if (transporter) return transporter;
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Generate test account if no SMTP provided
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log("Test email account created. Emails will be logged with Preview URLs.");
  }
  return transporter;
};

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const t = await getTransporter();
    const info = await t.sendMail({
      from: '"Taskzen Security" <noreply@taskzen.com>',
      to,
      subject,
      html,
    });
    
    console.log("Message sent to %s: %s", to, info.messageId);
    if (!process.env.SMTP_HOST) {
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    }
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Could not send email.");
  }
};
