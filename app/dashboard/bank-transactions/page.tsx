"use client";

import React, { useEffect, useState, useMemo } from "react";
import { 
  Building2, 
  IndianRupee, 
  Search, 
  RefreshCw, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Copy, 
  Check, 
  X, 
  ExternalLink, 
  Download, 
  Plus, 
  Filter, 
  Calendar,
  Wallet,
  Receipt,
  ShieldCheck,
  CreditCard
} from "lucide-react";

type BankTransaction = {
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
};

type SummaryStats = {
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
};

export default function BankTransactionsPage() {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [summary, setSummary] = useState<SummaryStats>({
    totalInflow: 0,
    totalOutflow: 0,
    netPosition: 0,
    totalCount: 0,
    creditCount: 0,
    debitCount: 0,
    latestBalance: null,
    lastSyncedAt: "",
    accountNumber: "**HDFC",
    bankName: "HDFC Bank",
    accountType: "Savings Account",
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "CREDIT" | "DEBIT" | "PENDING">("ALL");
  const [modeFilter, setModeFilter] = useState("ALL");

  // Selected Transaction for Detail Modal
  const [selectedTxn, setSelectedTxn] = useState<BankTransaction | null>(null);

  // Copied UTR feedback
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  // Fetch Live Data (In-Memory from Bank Alert Stream)
  const fetchTransactions = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/bank-transactions");
      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.error || "Failed to connect to bank transaction stream");
      }

      if (resData.success) {
        const liveTxns: BankTransaction[] = resData.data.transactions || [];
        setTransactions(liveTxns);
        setSummary(resData.data.summary);
      } else {
        throw new Error(resData.error || "Server could not retrieve bank data");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to HDFC Bank transaction stream");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleCopyUtr = (utr: string) => {
    if (!utr) return;
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  // Toggle status of a transaction (e.g. from Pending to Reflected)
  const handleToggleStatus = (txnId: string) => {
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id === txnId) {
          const nextStatus = t.status === "REFLECTED" ? "PENDING_VERIFICATION" : "REFLECTED";
          return { ...t, status: nextStatus };
        }
        return t;
      })
    );
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const headers = ["Date", "Time", "Type", "Party / Narration", "Payment Mode", "UTR / Reference", "Amount (INR)", "Status"];
    const rows = filteredTransactions.map((t) => [
      new Date(t.timestamp).toLocaleDateString("en-IN"),
      t.time,
      t.type,
      `"${t.partyName.replace(/"/g, '""')} - ${t.description.replace(/"/g, '""')}"`,
      t.mode,
      t.utr,
      t.amount,
      t.status === "REFLECTED" ? "Reflected in Bank" : "Pending Reflection",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `HDFC_Bank_Transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter & Search
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Type Filter
      if (typeFilter === "CREDIT" && tx.type !== "CREDIT") return false;
      if (typeFilter === "DEBIT" && tx.type !== "DEBIT") return false;
      if (typeFilter === "PENDING" && tx.status !== "PENDING_VERIFICATION") return false;

      // Mode Filter
      if (modeFilter !== "ALL" && tx.mode !== modeFilter) return false;

      // Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          tx.utr.toLowerCase().includes(q) ||
          tx.partyName.toLowerCase().includes(q) ||
          tx.description.toLowerCase().includes(q) ||
          tx.amount.toString().includes(q) ||
          tx.mode.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [transactions, typeFilter, modeFilter, searchQuery]);

  // Count pending transactions
  const pendingCount = useMemo(() => {
    return transactions.filter((t) => t.status === "PENDING_VERIFICATION").length;
  }, [transactions]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto mb-4 h-12 w-12">
            <div 
              className="absolute inset-0 rounded-full border-3 border-transparent animate-spin"
              style={{ borderTopColor: "#004C8F", borderRightColor: "#ED232A", borderWidth: "3px" }}
            />
          </div>
          <p className="text-sm font-medium" style={{ color: "#64748B" }}>
            Connecting to Live HDFC Bank Stream...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* ─── Top Header ─── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 
              className="text-2xl md:text-3xl font-bold flex items-center gap-3"
              style={{ 
                fontFamily: "Georgia, serif",
                background: "linear-gradient(135deg, #0A1F44, #004C8F)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text"
              }}
            >
              <Building2 className="h-8 w-8 text-[#004C8F]" />
              Bank Transactions
            </h1>
            <span 
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border shadow-sm"
              style={{ 
                background: "#F0F7FF", 
                borderColor: "#BFDBFE", 
                color: "#004C8F" 
              }}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              HDFC Bank Savings ({summary.accountNumber})
            </span>
          </div>
          <p className="text-xs md:text-sm mt-1" style={{ color: "#64748B" }}>
            Live in-memory ledger tracking all money credited and debited directly in Hotel Devang's bank account.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => fetchTransactions(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 text-xs md:text-sm font-medium rounded-xl border transition-all duration-200 shadow-sm hover:shadow"
            style={{ 
              background: "#FFFFFF", 
              borderColor: "#E2E8F0", 
              color: "#1E293B" 
            }}
          >
            <RefreshCw className={`h-4 w-4 text-[#004C8F] ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "Syncing..." : "Sync Live Alerts"}</span>
          </button>

          <button
            onClick={() => setIsRecordModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-semibold rounded-xl text-white transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
            style={{ 
              background: "linear-gradient(135deg, #004C8F 0%, #0A1F44 100%)",
            }}
          >
            <Plus className="h-4 w-4 text-[#FFD700]" />
            <span>Record Transaction</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={transactions.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 text-xs md:text-sm font-medium rounded-xl border transition-all duration-200 shadow-sm hover:shadow disabled:opacity-50"
            style={{ 
              background: "#FFFFFF", 
              borderColor: "#E2E8F0", 
              color: "#475569" 
            }}
            title="Export to CSV"
          >
            <Download className="h-4 w-4 text-[#475569]" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* ─── Error Notification if any ─── */}
      {error && (
        <div 
          className="p-4 rounded-xl border flex items-start gap-3 text-sm shadow-sm"
          style={{ background: "#FEF2F2", borderColor: "#FECACA", color: "#991B1B" }}
        >
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Notice regarding Bank Stream</p>
            <p className="text-xs mt-0.5 opacity-90">{error}</p>
          </div>
          <button onClick={() => setError("")} className="text-red-600 hover:opacity-75">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ─── 4 Summary Metric Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Money Received (Inflow / Credit) */}
        <div 
          className="p-5 rounded-2xl border bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
          style={{ borderColor: "#E2E8F0" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Inflow (Received)
            </span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100">
              <ArrowDownLeft className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold tracking-tight text-emerald-700">
              ₹{summary.totalInflow.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs font-medium text-emerald-600 mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{summary.creditCount} transactions credited</span>
            </p>
          </div>
        </div>

        {/* Card 2: Total Money Deducted (Outflow / Debit) */}
        <div 
          className="p-5 rounded-2xl border bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
          style={{ borderColor: "#E2E8F0" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Outflow (Deducted)
            </span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-rose-50 text-rose-600 border border-rose-100">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold tracking-tight text-rose-700">
              ₹{summary.totalOutflow.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs font-medium text-rose-600 mt-1 flex items-center gap-1">
              <Receipt className="h-3.5 w-3.5" />
              <span>{summary.debitCount} debits / payments</span>
            </p>
          </div>
        </div>

        {/* Card 3: Net Account Movement */}
        <div 
          className="p-5 rounded-2xl border bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
          style={{ borderColor: "#E2E8F0" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Net Inflow Position
            </span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-100">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className={`text-2xl font-bold tracking-tight ${summary.netPosition >= 0 ? "text-blue-900" : "text-rose-600"}`}>
              {summary.netPosition >= 0 ? "+" : ""}
              ₹{summary.netPosition.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
              <span>{summary.totalCount} total ledger entries</span>
            </p>
          </div>
        </div>

        {/* Card 4: Pending Bank Reflection */}
        <div 
          className="p-5 rounded-2xl border bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
          style={{ borderColor: pendingCount > 0 ? "#FDE68A" : "#E2E8F0" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Unreflected in Portal
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
              pendingCount > 0 
                ? "bg-amber-50 text-amber-600 border-amber-200" 
                : "bg-slate-50 text-slate-400 border-slate-200"
            }`}>
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className={`text-2xl font-bold tracking-tight ${pendingCount > 0 ? "text-amber-700" : "text-slate-700"}`}>
              {pendingCount}
            </p>
            <p className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1">
              {pendingCount > 0 ? (
                <span className="text-amber-600 font-semibold">● Requires NetBanking check</span>
              ) : (
                <span className="text-emerald-600 font-medium">✓ All transactions reflected</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Search, Tabs & Filters Bar ─── */}
      <div 
        className="p-4 rounded-2xl border bg-white shadow-sm space-y-3"
        style={{ borderColor: "#E2E8F0" }}
      >
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
            <button
              onClick={() => setTypeFilter("ALL")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                typeFilter === "ALL" 
                  ? "bg-white text-slate-900 shadow-sm" 
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({transactions.length})
            </button>
            <button
              onClick={() => setTypeFilter("CREDIT")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                typeFilter === "CREDIT" 
                  ? "bg-emerald-600 text-white shadow-sm" 
                  : "text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              <span>Credits / Inflow</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${typeFilter === "CREDIT" ? "bg-emerald-700" : "bg-emerald-100"}`}>
                {summary.creditCount}
              </span>
            </button>
            <button
              onClick={() => setTypeFilter("DEBIT")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                typeFilter === "DEBIT" 
                  ? "bg-rose-600 text-white shadow-sm" 
                  : "text-rose-700 hover:bg-rose-50"
              }`}
            >
              <span>Debits / Outflow</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${typeFilter === "DEBIT" ? "bg-rose-700" : "bg-rose-100"}`}>
                {summary.debitCount}
              </span>
            </button>
            {pendingCount > 0 && (
              <button
                onClick={() => setTypeFilter("PENDING")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  typeFilter === "PENDING" 
                    ? "bg-amber-500 text-white shadow-sm" 
                    : "text-amber-800 hover:bg-amber-50"
                }`}
              >
                <span>Pending Reflection</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900 font-bold">
                  {pendingCount}
                </span>
              </button>
            )}
          </div>

          {/* Mode Dropdown Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 hidden sm:inline">Mode:</span>
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-xl border bg-white text-slate-700 outline-none focus:border-[#004C8F]"
              style={{ borderColor: "#CBD5E1" }}
            >
              <option value="ALL">All Modes</option>
              <option value="UPI">UPI</option>
              <option value="IMPS">IMPS</option>
              <option value="NEFT">NEFT</option>
              <option value="RTGS">RTGS</option>
              <option value="CASH">Cash Deposit</option>
              <option value="ATM">ATM Withdrawal</option>
              <option value="POS">POS / Card</option>
            </select>
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by 12-digit UTR No, Guest/Vendor name, Narration, or Amount (e.g. 1500, UPI/4312...)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border bg-slate-50/50 text-slate-800 placeholder-slate-400 outline-none transition-all focus:bg-white focus:border-[#004C8F] focus:ring-2 focus:ring-blue-100"
            style={{ borderColor: "#E2E8F0" }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ─── Transactions Ledger Table ─── */}
      <div 
        className="rounded-2xl border bg-white shadow-sm overflow-hidden"
        style={{ borderColor: "#E2E8F0" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr 
                className="border-b text-xs uppercase tracking-wider font-semibold text-slate-500"
                style={{ background: "#F8FAFC", borderColor: "#E2E8F0" }}
              >
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Party / Description</th>
                <th className="py-3.5 px-4">Mode</th>
                <th className="py-3.5 px-4">UTR / Ref No.</th>
                <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-sm">
                    <div className="max-w-sm mx-auto space-y-2">
                      <Building2 className="h-10 w-10 mx-auto text-slate-300" />
                      <p className="font-semibold text-slate-600">No Bank Transactions Found</p>
                      <p className="text-xs text-slate-400">
                        {searchQuery 
                          ? "No transactions match your search filter." 
                          : "HDFC Bank transaction alerts will appear here automatically when received in your email, or you can record a counter transaction using the button above."}
                      </p>
                      {!searchQuery && (
                        <button
                          onClick={() => setIsRecordModalOpen(true)}
                          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#004C8F] text-white hover:bg-[#0A1F44]"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Record First Transaction</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isCredit = tx.type === "CREDIT";
                  return (
                    <tr 
                      key={tx.id} 
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => setSelectedTxn(tx)}
                    >
                      {/* Date & Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-800 text-xs sm:text-sm">
                          {new Date(tx.timestamp).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />
                          <span>{tx.time}</span>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span 
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase border ${
                            isCredit 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {isCredit ? (
                            <>
                              <ArrowDownLeft className="h-3 w-3" />
                              <span>INFLOW</span>
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="h-3 w-3" />
                              <span>OUTFLOW</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Party & Description */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-slate-800 text-xs sm:text-sm truncate">
                          {tx.partyName}
                        </div>
                        <div className="text-xs text-slate-500 truncate mt-0.5" title={tx.description}>
                          {tx.description}
                        </div>
                      </td>

                      {/* Mode Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {tx.mode}
                        </span>
                      </td>

                      {/* UTR / Ref Number with 1-click copy */}
                      <td 
                        className="py-3.5 px-4 whitespace-nowrap font-mono text-xs text-slate-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-800 tracking-tight">{tx.utr}</span>
                          <button
                            onClick={() => handleCopyUtr(tx.utr)}
                            className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
                            title="Copy UTR Reference"
                          >
                            {copiedUtr === tx.utr ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className={`font-bold text-sm sm:text-base ${isCredit ? "text-emerald-600" : "text-rose-600"}`}>
                          {isCredit ? "+" : "-"} ₹{tx.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        {tx.balanceAfter !== null && (
                          <div className="text-[10px] text-slate-400">
                            Bal: ₹{tx.balanceAfter.toLocaleString("en-IN")}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td 
                        className="py-3.5 px-4 whitespace-nowrap text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {tx.status === "REFLECTED" ? (
                          <button
                            onClick={() => handleToggleStatus(tx.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
                            title="Click to toggle status"
                          >
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            <span>In Bank</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(tx.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition animate-pulse"
                            title="Click to mark as verified in NetBanking"
                          >
                            <Clock className="h-3 w-3 text-amber-600" />
                            <span>Unreflected</span>
                          </button>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-center text-slate-400 group-hover:text-[#004C8F]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTxn(tx);
                          }}
                          className="p-1 rounded hover:bg-slate-100 transition"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Detail Modal / Bank Slip ─── */}
      {selectedTxn && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setSelectedTxn(null)}
        >
          <div 
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Slip Header */}
            <div 
              className="p-6 text-white text-center relative"
              style={{ background: "linear-gradient(135deg, #0A1F44 0%, #004C8F 100%)" }}
            >
              <button 
                onClick={() => setSelectedTxn(null)}
                className="absolute right-4 top-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="w-12 h-12 mx-auto rounded-full bg-white/10 border border-white/20 flex items-center justify-center mb-3">
                <Building2 className="h-6 w-6 text-[#FFD700]" />
              </div>

              <h3 className="text-lg font-bold">HDFC Bank Digital Slip</h3>
              <p className="text-xs text-blue-100 mt-0.5">Hotel Devang Official Account</p>

              <div className="mt-4 pt-3 border-t border-white/15">
                <span className="text-xs uppercase tracking-wider text-blue-200 font-semibold">
                  {selectedTxn.type === "CREDIT" ? "Total Amount Credited" : "Total Amount Debited"}
                </span>
                <p className="text-3xl font-extrabold text-[#FFD700] mt-1">
                  ₹{selectedTxn.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Slip Breakdown Details */}
            <div className="p-6 space-y-3.5 text-xs sm:text-sm">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Transaction Status</span>
                <span className={`font-semibold flex items-center gap-1 ${selectedTxn.status === "REFLECTED" ? "text-emerald-600" : "text-amber-600"}`}>
                  {selectedTxn.status === "REFLECTED" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                  {selectedTxn.status === "REFLECTED" ? "Reflected in NetBanking" : "Pending Bank Portal Reflection"}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">12-Digit UTR / Ref No.</span>
                <div className="flex items-center gap-1 font-mono font-bold text-slate-800">
                  <span>{selectedTxn.utr}</span>
                  <button 
                    onClick={() => handleCopyUtr(selectedTxn.utr)}
                    className="text-slate-400 hover:text-slate-700 ml-1"
                  >
                    {copiedUtr === selectedTxn.utr ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Party / Particulars</span>
                <span className="font-semibold text-slate-800 text-right">{selectedTxn.partyName}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Payment Mode</span>
                <span className="font-semibold text-slate-800">{selectedTxn.mode}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Date & Time</span>
                <span className="font-semibold text-slate-800">
                  {new Date(selectedTxn.timestamp).toLocaleDateString("en-IN", { dateStyle: "medium" })} at {selectedTxn.time}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Account</span>
                <span className="font-semibold text-slate-800">HDFC Savings ({selectedTxn.accountNumber})</span>
              </div>

              {selectedTxn.balanceAfter !== null && (
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Updated Balance</span>
                  <span className="font-bold text-blue-900">
                    ₹{selectedTxn.balanceAfter.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {selectedTxn.description && (
                <div className="pt-1">
                  <span className="text-slate-500 text-xs block mb-1">Narration / Notes:</span>
                  <p className="p-2.5 rounded-lg bg-slate-50 text-slate-700 text-xs border border-slate-200">
                    {selectedTxn.description}
                  </p>
                </div>
              )}
            </div>

            {/* Slip Footer Action */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  handleToggleStatus(selectedTxn.id);
                  setSelectedTxn((prev) => prev ? { ...prev, status: prev.status === "REFLECTED" ? "PENDING_VERIFICATION" : "REFLECTED" } : null);
                }}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition"
              >
                {selectedTxn.status === "REFLECTED" ? "Mark as Pending" : "Mark as Reflected in Bank"}
              </button>
              <button
                onClick={() => setSelectedTxn(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#004C8F] text-white hover:bg-[#0A1F44] transition"
              >
                Close Slip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Record Quick Transaction Modal ─── */}
      {isRecordModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setIsRecordModalOpen(false)}
        >
          <div 
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              className="p-5 text-white flex items-center justify-between"
              style={{ background: "linear-gradient(135deg, #0A1F44 0%, #004C8F 100%)" }}
            >
              <div className="flex items-center gap-2.5">
                <Plus className="h-5 w-5 text-[#FFD700]" />
                <h3 className="font-bold text-base md:text-lg">Record Bank Transaction</h3>
              </div>
              <button 
                onClick={() => setIsRecordModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuickTxn} className="p-6 space-y-4">
              {/* Type Switcher: Credit vs Debit */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                  Transaction Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickForm({ ...quickForm, type: "CREDIT" })}
                    className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                      quickForm.type === "CREDIT"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <ArrowDownLeft className="h-4 w-4" />
                    <span>Money Received (Credit)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickForm({ ...quickForm, type: "DEBIT" })}
                    className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                      quickForm.type === "DEBIT"
                        ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    <span>Money Paid (Debit)</span>
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Amount in ₹ <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 2500"
                    value={quickForm.amount}
                    onChange={(e) => setQuickForm({ ...quickForm, amount: e.target.value })}
                    className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-300 outline-none focus:border-[#004C8F] font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Party / Person Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  {quickForm.type === "CREDIT" ? "Sender / Guest Name" : "Receiver / Vendor Name"}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma (Room 204)"
                  value={quickForm.partyName}
                  onChange={(e) => setQuickForm({ ...quickForm, partyName: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 outline-none focus:border-[#004C8F]"
                />
              </div>

              {/* Mode & UTR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={quickForm.mode}
                    onChange={(e) => setQuickForm({ ...quickForm, mode: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 outline-none focus:border-[#004C8F] bg-white"
                  >
                    <option value="UPI">UPI (QR / GPay / PhonePe)</option>
                    <option value="IMPS">IMPS Immediate Transfer</option>
                    <option value="NEFT">NEFT Bank Transfer</option>
                    <option value="RTGS">RTGS Transfer</option>
                    <option value="CASH">Cash Deposited to Bank</option>
                    <option value="CHEQUE">Cheque Clearance</option>
                    <option value="POS">Card POS Machine</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    12-Digit UPI / UTR Ref No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 431289123456"
                    value={quickForm.utr}
                    onChange={(e) => setQuickForm({ ...quickForm, utr: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 outline-none focus:border-[#004C8F] font-mono"
                  />
                </div>
              </div>

              {/* Status Radio */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                  Bank Reflection Status
                </label>
                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-amber-200 bg-amber-50/60 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={quickForm.status === "PENDING_VERIFICATION"}
                      onChange={() => setQuickForm({ ...quickForm, status: "PENDING_VERIFICATION" })}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-xs font-bold text-amber-900 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-amber-600" />
                        Pending in HDFC NetBanking (Unreflected)
                      </div>
                      <div className="text-[11px] text-amber-700">
                        Money received/paid, but not yet visible in HDFC online transaction list.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={quickForm.status === "REFLECTED"}
                      onChange={() => setQuickForm({ ...quickForm, status: "REFLECTED" })}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Already Reflected in Bank Statement
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Confirmed showing in bank passbook or online netbanking.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Notes / Particulars
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Paid balance at reception counter via GPay QR..."
                  value={quickForm.notes}
                  onChange={(e) => setQuickForm({ ...quickForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 outline-none focus:border-[#004C8F]"
                />
              </div>

              {/* Form Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-[#004C8F] text-white hover:bg-[#0A1F44] transition shadow-md"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

