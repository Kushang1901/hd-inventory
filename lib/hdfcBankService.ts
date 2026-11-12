import { getImapClient } from "./mailClient";
import { simpleParser, ParsedMail } from "mailparser";

export interface BankTransactionItem {
  id: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  date: string;
  time: string;
  timestamp: number;
  partyName: string;
  mode: "UPI" | "IMPS" | "NEFT" | "RTGS" | "ATM" | "POS" | "CHEQUE" | "TRANSFER" | "BANK";
  utr: string;
  accountNumber: string;
  balanceAfter: number | null;
  description: string;
  rawSubject: string;
  status: "REFLECTED" | "PENDING_VERIFICATION";
}

export interface BankSummaryStats {
  totalInflow: number;
  totalOutflow: number;
  netPosition: number;
  totalCount: number;
  creditCount: number;
  debitCount: number;
  latestBalance: number | null;
  lastSyncedAt: string;
  accountNumber: string;
  bankName: string;
  accountType: string;
}

// Helper to clean and parse Indian Currency string (e.g. "1,500.00" -> 1500)
function parseIndianAmount(rawStr: string): number {
  if (!rawStr) return 0;
  const cleaned = rawStr.replace(/[^\d.]/g, "");
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

// Extract transaction details from HDFC Bank alert emails
export function parseHdfcEmail(subject: string, textBody: string, htmlBody: string, emailDate: Date, uid: number): BankTransactionItem | null {
  const fullContent = `${subject}\n${textBody || ""}\n${htmlBody || ""}`;
  const lower = fullContent.toLowerCase();

  // Check if this is an HDFC Bank transaction alert
  const isHdfc = lower.includes("hdfc") || lower.includes("hdfcbank");
  const isTxn = lower.includes("credit") || lower.includes("debit") || lower.includes("received") || lower.includes("inr") || lower.includes("rs.");
  
  if (!isHdfc && !isTxn) {
    return null;
  }

  // Determine Type: CREDIT or DEBIT
  let type: "CREDIT" | "DEBIT" = "CREDIT";
  if (
    lower.includes("has been debited") ||
    lower.includes("debited from") ||
    lower.includes("debit alert") ||
    lower.includes("sent inr") ||
    lower.includes("paid inr") ||
    lower.includes("debited by")
  ) {
    type = "DEBIT";
  } else if (
    lower.includes("credited") ||
    lower.includes("received inr") ||
    lower.includes("credit alert") ||
    lower.includes("deposited")
  ) {
    type = "CREDIT";
  }

  // 1. Amount Extraction
  // Examples: "INR 2,500.00", "Rs. 1500", "INR 2500"
  let amount = 0;
  const amountMatch = fullContent.match(/(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i);
  if (amountMatch && amountMatch[1]) {
    amount = parseIndianAmount(amountMatch[1]);
  }

  if (amount <= 0) {
    return null; // Not a valid financial transaction alert
  }

  // 2. Mode Extraction (UPI, IMPS, NEFT, ATM, etc.)
  let mode: BankTransactionItem["mode"] = "UPI";
  if (lower.includes("upi") || lower.includes("vpa")) {
    mode = "UPI";
  } else if (lower.includes("imps")) {
    mode = "IMPS";
  } else if (lower.includes("neft")) {
    mode = "NEFT";
  } else if (lower.includes("rtgs")) {
    mode = "RTGS";
  } else if (lower.includes("atm")) {
    mode = "ATM";
  } else if (lower.includes("pos") || lower.includes("card")) {
    mode = "POS";
  } else if (lower.includes("cheque")) {
    mode = "CHEQUE";
  } else if (lower.includes("transfer")) {
    mode = "TRANSFER";
  }

  // 3. UTR / Reference Number Extraction (12-digit UPI or alphanumeric ref)
  let utr = "";
  const utrMatch = fullContent.match(/(?:UTR(?:\s*No\.?)?|Ref(?:\s*No\.?)?|UPI\s*Ref(?:\s*No\.?)?|Ref\s*#)[:\s]*([A-Za-z0-9]{8,22})/i);
  if (utrMatch && utrMatch[1]) {
    utr = utrMatch[1].trim();
  } else {
    // Look for standalone 12-digit number (standard UPI UTR format in India)
    const twelveDigit = fullContent.match(/\b([4-9]\d{11})\b/);
    if (twelveDigit && twelveDigit[1]) {
      utr = twelveDigit[1];
    } else {
      utr = `HDFC${uid}${Math.floor(emailDate.getTime() / 1000).toString().slice(-6)}`;
    }
  }

  // 4. Account Number (e.g. "**8830" or ending 8830)
  let accountNumber = "**HDFC";
  const accMatch = fullContent.match(/(?:a\/c(?:\s*no\.?)?|\*\*|ending(?:\s*with)?)\s*[:.]?\s*(\d{3,4})/i);
  if (accMatch && accMatch[1]) {
    accountNumber = `**${accMatch[1]}`;
  }

  // 5. Party / Beneficiary / Sender Name
  let partyName = type === "CREDIT" ? "Guest / Payer" : "Vendor / Payee";
  // Check for UPI VPA or name after UPI/
  const upiInfoMatch = fullContent.match(/(?:from|to|VPA|Info)[:\s]+([A-Za-z0-9._@/-]+(?:\s+[A-Za-z]+)?)/i);
  if (upiInfoMatch && upiInfoMatch[1]) {
    const rawParty = upiInfoMatch[1].trim();
    if (!rawParty.toLowerCase().includes("hdfc") && rawParty.length > 3) {
      partyName = rawParty.replace(/^UPI\//i, "").replace(/\/.*$/, "").trim();
    }
  }

  // 6. Available Balance (if mentioned in alert)
  let balanceAfter: number | null = null;
  const balMatch = fullContent.match(/(?:Bal(?:ance)?|Avail(?:able)?\s*Bal(?:ance)?)\s*(?:is)?\s*(?:INR|Rs\.?|₹)?\s*([\d,]+\.?\d*)/i);
  if (balMatch && balMatch[1]) {
    balanceAfter = parseIndianAmount(balMatch[1]);
  }

  // 7. Human-readable description
  const description = type === "CREDIT"
    ? `Received via ${mode} from ${partyName}`
    : `Paid via ${mode} to ${partyName}`;

  const dateStr = emailDate.toISOString();
  const timeStr = emailDate.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return {
    id: `tx_${uid}_${emailDate.getTime()}`,
    type,
    amount,
    date: dateStr,
    time: timeStr,
    timestamp: emailDate.getTime(),
    partyName,
    mode,
    utr,
    accountNumber,
    balanceAfter,
    description,
    rawSubject: subject || "",
    status: "REFLECTED",
  };
}

// In-Memory Live Fetcher from Hostinger Mailbox
export async function getLiveHdfcTransactions(): Promise<{
  transactions: BankTransactionItem[];
  summary: BankSummaryStats;
}> {
  const client = getImapClient();
  const transactions: BankTransactionItem[] = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const total = client.mailbox ? client.mailbox.exists : 0;

      if (total > 0) {
        // Fetch up to the last 150 emails to inspect for HDFC Bank transaction alerts
        const fetchCount = Math.min(150, total);
        const startSeq = Math.max(1, total - fetchCount + 1);
        const seqRange = `${startSeq}:${total}`;

        for await (const msg of client.fetch(seqRange, {
          envelope: true,
          internalDate: true,
          source: true,
          uid: true,
        })) {
          try {
            if (!msg.source) continue;
            const parsed = (await (simpleParser as any)(msg.source)) as ParsedMail;
            const subject = parsed.subject || msg.envelope?.subject || "";
            const fromAddr = parsed.from?.value?.[0]?.address || msg.envelope?.from?.[0]?.address || "";
            const textBody = parsed.text || "";
            const htmlBody = (parsed.html as string) || "";
            const emailDate = new Date(msg.internalDate || msg.envelope?.date || Date.now());

            // Check if sender or subject is related to HDFC Bank or Banking transactions
            const isRelevant =
              fromAddr.toLowerCase().includes("hdfc") ||
              subject.toLowerCase().includes("hdfc") ||
              subject.toLowerCase().includes("credited") ||
              subject.toLowerCase().includes("debited");

            if (isRelevant) {
              const item = parseHdfcEmail(subject, textBody, htmlBody, emailDate, msg.uid);
              if (item) {
                transactions.push(item);
              }
            }
          } catch (parseErr) {
            console.warn("Could not parse single email for HDFC txn:", parseErr);
          }
        }
      }
    } finally {
      lock.release();
    }
  } catch (err: any) {
    console.warn("IMAP live HDFC scan notice:", err?.message || err);
  } finally {
    try {
      await client.logout();
    } catch {}
  }

  // Sort newest first
  transactions.sort((a, b) => b.timestamp - a.timestamp);

  // Compute live in-memory stats
  let totalInflow = 0;
  let totalOutflow = 0;
  let creditCount = 0;
  let debitCount = 0;
  let latestBalance: number | null = null;
  let detectedAccount = "**HDFC";

  transactions.forEach((tx) => {
    if (tx.type === "CREDIT") {
      totalInflow += tx.amount;
      creditCount++;
    } else {
      totalOutflow += tx.amount;
      debitCount++;
    }

    if (latestBalance === null && tx.balanceAfter !== null) {
      latestBalance = tx.balanceAfter;
    }
    if (tx.accountNumber && tx.accountNumber !== "**HDFC") {
      detectedAccount = tx.accountNumber;
    }
  });

  const summary: BankSummaryStats = {
    totalInflow,
    totalOutflow,
    netPosition: totalInflow - totalOutflow,
    totalCount: transactions.length,
    creditCount,
    debitCount,
    latestBalance,
    lastSyncedAt: new Date().toISOString(),
    accountNumber: detectedAccount,
    bankName: "HDFC Bank",
    accountType: "Savings Account",
  };

  return {
    transactions,
    summary,
  };
}

