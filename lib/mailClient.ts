
import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";
import { simpleParser, ParsedMail } from "mailparser";

export const HOSTINGER_CONFIG = {
  user: process.env.HOSTINGER_EMAIL_USER || "info@hoteldevang.com",
  pass: process.env.HOSTINGER_EMAIL_PASS || "Devang@2026",
  imapHost: process.env.HOSTINGER_IMAP_HOST || "imap.hostinger.com",
  imapPort: Number(process.env.HOSTINGER_IMAP_PORT) || 993,
  smtpHost: process.env.HOSTINGER_SMTP_HOST || "smtp.hostinger.com",
  smtpPort: Number(process.env.HOSTINGER_SMTP_PORT) || 465,
};

export const FOLDER_MAP: Record<string, string> = {
  inbox: "INBOX",
  sent: "INBOX.Sent",
  drafts: "INBOX.Drafts",
  junk: "INBOX.Junk",
  trash: "INBOX.Trash",
};

export function resolveFolderPath(folder: string): string {
  const lower = (folder || "inbox").toLowerCase();
  return FOLDER_MAP[lower] || folder || "INBOX";
}

export function getTransporter() {
  return nodemailer.createTransport({
    host: HOSTINGER_CONFIG.smtpHost,
    port: HOSTINGER_CONFIG.smtpPort,
    secure: true,
    auth: {
      user: HOSTINGER_CONFIG.user,
      pass: HOSTINGER_CONFIG.pass,
    },
  });
}

export function getImapClient() {
  return new ImapFlow({
    host: HOSTINGER_CONFIG.imapHost,
    port: HOSTINGER_CONFIG.imapPort,
    secure: true,
    auth: {
      user: HOSTINGER_CONFIG.user,
      pass: HOSTINGER_CONFIG.pass,
    },
    logger: false,
  });
}

export interface EmailSummary {
  uid: number;
  seq: number;
  subject: string;
  fromName: string;
  fromAddress: string;
  to: string;
  date: string;
  isRead: boolean;
  isStarred: boolean;
  snippet?: string;
}

export async function listEmails({
  folder = "INBOX",
  page = 1,
  limit = 25,
}: {
  folder?: string;
  page?: number;
  limit?: number;
}): Promise<{
  emails: EmailSummary[];
  total: number;
  unreadCount: number;
  folder: string;
}> {
  const client = getImapClient();
  const folderPath = resolveFolderPath(folder);

  await client.connect();
  try {
    const lock = await client.getMailboxLock(folderPath);
    try {
      const total = client.mailbox ? client.mailbox.exists : 0;
      
      let unreadCount = 0;
      try {
        const status = await client.status(folderPath, { unseen: true });
        if (status && typeof status === "object" && "unseen" in status) {
          unreadCount = (status as any).unseen || 0;
        }
      } catch {
        // Fallback if status not available
      }

      if (total === 0) {
        return { emails: [], total: 0, unreadCount: 0, folder: folderPath };
      }

      // Calculate sequence range (newest first)
      // e.g. total 10, limit 5, page 1 => seq 6:10
      const startSeq = Math.max(1, total - (page * limit) + 1);
      const endSeq = Math.max(1, total - ((page - 1) * limit));

      if (endSeq < 1 || startSeq > total) {
        return { emails: [], total, unreadCount, folder: folderPath };
      }

      const seqRange = `${startSeq}:${endSeq}`;
      const messages: EmailSummary[] = [];

      for await (const msg of client.fetch(seqRange, {
        envelope: true,
        flags: true,
        internalDate: true,
        uid: true,
      })) {
        const flags = Array.from(msg.flags || []);
        const envelope = msg.envelope;
        const fromObj = envelope?.from?.[0];
        const toList = (envelope?.to || []).map((t) => t.address || t.name || "").join(", ");

        messages.push({
          uid: msg.uid,
          seq: msg.seq,
          subject: envelope?.subject || "(No Subject)",
          fromName: fromObj?.name || fromObj?.address || "Unknown Sender",
          fromAddress: fromObj?.address || "",
          to: toList || HOSTINGER_CONFIG.user,
          date: new Date(msg.internalDate || envelope?.date || Date.now()).toISOString(),
          isRead: flags.includes("\\Seen"),
          isStarred: flags.includes("\\Flagged"),
        });
      }

      // Reverse so newest is first
      messages.reverse();

      return {
        emails: messages,
        total,
        unreadCount,
        folder: folderPath,
      };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

export interface EmailDetail {
  uid: number;
  subject: string;
  fromName: string;
  fromAddress: string;
  to: string;
  date: string;
  html?: string;
  text?: string;
  isRead: boolean;
  isStarred: boolean;
  messageId?: string;
  attachments: Array<{
    filename?: string;
    contentType: string;
    size: number;
  }>;
}

export async function getEmailDetail({
  folder = "INBOX",
  uid,
}: {
  folder?: string;
  uid: number;
}): Promise<EmailDetail | null> {
  const client = getImapClient();
  const folderPath = resolveFolderPath(folder);

  await client.connect();
  try {
    const lock = await client.getMailboxLock(folderPath);
    try {
      const message = await client.fetchOne(String(uid), {
        source: true,
        flags: true,
        envelope: true,
        internalDate: true,
        uid: true,
      }, { uid: true });

      if (!message || !message.source) {
        return null;
      }

      // Mark as read automatically
      try {
        await client.messageFlagsAdd({ uid }, ["\\Seen"], { uid: true });
      } catch (err) {
        console.warn("Could not mark email as seen:", err);
      }

      const parsed: ParsedMail = await simpleParser(message.source);
      const flags = Array.from(message.flags || []);

      const fromObj = parsed.from?.value?.[0];
      const toStr = parsed.to
        ? (Array.isArray(parsed.to) ? parsed.to : [parsed.to])
            .map((t) => t.text)
            .join(", ")
        : "";

      return {
        uid: message.uid,
        subject: parsed.subject || message.envelope?.subject || "(No Subject)",
        fromName: fromObj?.name || fromObj?.address || "Unknown",
        fromAddress: fromObj?.address || "",
        to: toStr || HOSTINGER_CONFIG.user,
        date: new Date(parsed.date || message.internalDate || Date.now()).toISOString(),
        html: parsed.html || parsed.textAsHtml || undefined,
        text: parsed.text || "",
        isRead: true,
        isStarred: flags.includes("\\Flagged"),
        messageId: parsed.messageId,
        attachments: (parsed.attachments || []).map((att) => ({
          filename: att.filename,
          contentType: att.contentType,
          size: att.size,
        })),
      };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}) {
  const transporter = getTransporter();

  const mailOptions = {
    from: `"Hotel Devang, Dwarka" <${HOSTINGER_CONFIG.user}>`,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, " "),
    replyTo: replyTo || HOSTINGER_CONFIG.user,
  };

  const info = await transporter.sendMail(mailOptions);

  // Append a copy to Hostinger's Sent folder
  try {
    const client = getImapClient();
    await client.connect();
    try {
      // Build raw email RFC822 for append
      const rawMessage = [
        `From: "Hotel Devang, Dwarka" <${HOSTINGER_CONFIG.user}>`,
        `To: ${to}`,
        `Subject: ${subject}`,
        `Date: ${new Date().toUTCString()}`,
        `Content-Type: text/html; charset=utf-8`,
        ``,
        html,
      ].join("\r\n");

      await client.append(
        "INBOX.Sent",
        Buffer.from(rawMessage),
        ["\\Seen"]
      );
    } catch (appendErr) {
      console.warn("Could not append email to Sent folder:", appendErr);
    } finally {
      await client.logout();
    }
  } catch (err) {
    console.warn("IMAP sync error on send:", err);
  }

  return info;
}

export async function toggleStarEmail({
  folder = "INBOX",
  uid,
  starred,
}: {
  folder?: string;
  uid: number;
  starred: boolean;
}) {
  const client = getImapClient();
  const folderPath = resolveFolderPath(folder);

  await client.connect();
  try {
    const lock = await client.getMailboxLock(folderPath);
    try {
      if (starred) {
        await client.messageFlagsAdd({ uid }, ["\\Flagged"], { uid: true });
      } else {
        await client.messageFlagsRemove({ uid }, ["\\Flagged"], { uid: true });
      }
      return true;
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

export async function deleteEmail({
  folder = "INBOX",
  uid,
}: {
  folder?: string;
  uid: number;
}) {
  const client = getImapClient();
  const folderPath = resolveFolderPath(folder);

  await client.connect();
  try {
    const lock = await client.getMailboxLock(folderPath);
    try {
      if (folderPath === "INBOX.Trash") {
        await client.messageDelete({ uid }, { uid: true });
      } else {
        // Move to Trash
        await client.messageMove({ uid }, "INBOX.Trash", { uid: true });
      }
      return true;
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}
