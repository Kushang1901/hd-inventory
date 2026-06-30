"use client";

import React, { useEffect, useState } from "react";
import { 
  Landmark, 
  IndianRupee, 
  Search, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  X, 
  ExternalLink,
  Info,
  Calendar,
  HelpCircle
} from "lucide-react";

type BookingDetail = {
  bookingId: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
};

type PaymentRecord = {
  id: string;
  amount: number;
  fee?: number;
  tax?: number;
  status: string;
  method: string;
  email: string;
  contact: string;
  created_at: number;
  settlement_id: string | null;
  booking: BookingDetail | null;
};

type SettlementRecord = {
  id: string;
  amount: number;
  status: string;
  fees: number;
  tax: number;
  utr: string;
  created_at: number;
};

type SummaryStats = {
  pendingSettlement: number;
  totalSettled: number;
  netReceivedInBank: number;
  totalOnlineRevenue: number;
  totalFees: number;
  totalTax: number;
  pendingCount: number;
};

export default function SettlementsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<SummaryStats>({
    pendingSettlement: 0,
    totalSettled: 0,
    netReceivedInBank: 0,
    totalOnlineRevenue: 0,
    totalFees: 0,
    totalTax: 0,
    pendingCount: 0
  });
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"settlements" | "transactions">("settlements");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal State for Settlement Detail
  const [selectedSettlement, setSelectedSettlement] = useState<SettlementRecord | null>(null);
  const [settlementPayments, setSettlementPayments] = useState<PaymentRecord[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");
    try {
      const res = await fetch("/api/settlements");
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to load settlement details");
      }
      if (resData.success) {
        setSettlements(resData.data.settlements || []);
        setPayments(resData.data.payments || []);
        setSummary(resData.data.summary);
      } else {
        throw new Error(resData.error || "Server failed to process settlements");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while connecting to Razorpay.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    fetchData(true);
  };

  const handleOpenSettlementDetails = async (settlement: SettlementRecord) => {
    setSelectedSettlement(settlement);
    setLoadingDetails(true);
    setDetailsError("");
    setSettlementPayments([]);
    try {
      const res = await fetch(`/api/settlements?settlementId=${settlement.id}`);
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to load settlement transactions");
      }
      if (resData.success) {
        setSettlementPayments(resData.data || []);
      } else {
        throw new Error(resData.error || "Server failed to retrieve transactions");
      }
    } catch (err: any) {
      setDetailsError(err.message || "Failed to retrieve transaction breakdown.");
    } finally {
      setLoadingDetails(false);
    }
  };

  const formatTimestamp = (ts: number) => {
    return new Date(ts * 1000).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  };

  // Filter & Search payments list
  const filteredPayments = payments.filter((pay) => {
    const matchesSearch = 
      pay.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pay.settlement_id && pay.settlement_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (pay.booking?.guestName && pay.booking.guestName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (pay.booking?.bookingId && pay.booking.bookingId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      pay.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pay.contact.includes(searchQuery);

    if (statusFilter === "all") return matchesSearch;
    if (statusFilter === "settled") return matchesSearch && pay.settlement_id !== null;
    if (statusFilter === "pending") return matchesSearch && pay.settlement_id === null && pay.status === "captured";
    if (statusFilter === "refunded") return matchesSearch && pay.status === "refunded";
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto mb-4 h-12 w-12">
            <div 
              className="absolute inset-0 rounded-full border-3 border-transparent animate-spin"
              style={{ borderTopColor: "#DC2626", borderRightColor: "#1D4ED8", borderWidth: "3px" }}
            />
          </div>
          <p className="text-sm font-medium" style={{ color: "#64748B" }}>Fetching Razorpay Settlement Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ── Welcome Header ── */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 
            className="text-2xl md:text-3xl font-bold flex items-center gap-3"
            style={{ 
              fontFamily: "Georgia, serif",
              background: "linear-gradient(135deg, #0D1B4A, #1D4ED8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}
          >
            Payment Settlements
          </h1>
          <p className="text-xs md:text-sm mt-1" style={{ color: "#64748B" }}>
            Verify online pre-payments and check bank payouts received in your bank account.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div 
            className="text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5"
            style={{ 
              background: "rgba(16,185,129,0.1)",
              border: "1px solid rgba(16,185,129,0.2)",
              color: "#059669"
            }}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Razorpay Live
          </div>
          
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer transition-all duration-200"
            style={{ 
              background: "white",
              border: "1px solid rgba(29,78,216,0.15)",
              color: "#1D4ED8",
              boxShadow: "0 2px 8px rgba(13,27,74,0.06)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#EFF6FF";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "white";
            }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Syncing..." : "Sync Razorpay"}
          </button>
        </div>
      </div>

      {error ? (
        <div 
          className="rounded-2xl p-6 text-center max-w-xl mx-auto mt-6"
          style={{ 
            background: "#FFF5F5",
            border: "1px solid rgba(220,38,38,0.2)",
            color: "#DC2626"
          }}
        >
          <AlertCircle className="h-10 w-10 mx-auto mb-3" style={{ color: "#DC2626" }} />
          <h3 className="text-lg font-semibold mb-1">Razorpay Connection Error</h3>
          <p className="text-sm opacity-80 mb-4">{error}</p>
          <div className="text-left text-xs bg-white/70 p-4 rounded-xl space-y-2 text-slate-700 border border-red-100">
            <p className="font-bold flex items-center gap-1.5 text-slate-800">
              <Info className="h-3.5 w-3.5 text-slate-500" /> Troubleshooting checklist:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Confirm your internet connection is active.</li>
              <li>Verify that the <code>RAZORPAY_KEY_ID</code> and <code>RAZORPAY_KEY_SECRET</code> inside the <code>.env</code> file are correct and valid.</li>
              <li>Ensure your Razorpay account is active and has permissions to fetch transactions/settlements.</li>
            </ul>
          </div>
        </div>
      ) : (
        <>
          {/* ── Stats Summary Grid ── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            
            {/* Card 1: Pending Settlement */}
            <div 
              className="relative overflow-hidden rounded-2xl p-5 bg-white border border-amber-100"
              style={{ boxShadow: "0 4px 20px rgba(13,27,74,0.04)" }}
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400" />
              <div className="flex items-center justify-between mb-3 mt-1">
                <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
                  Unsettled Balance
                </span>
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Clock className="h-4 w-4 text-amber-500" />
                </div>
              </div>
              <div className="text-2xl md:text-3xl font-bold tracking-tight mb-1 text-slate-800">
                ₹{summary.pendingSettlement.toLocaleString("en-IN")}
              </div>
              <div className="flex items-center justify-between text-[10px] text-amber-600 font-semibold">
                <span>Held in Razorpay</span>
                <span>{summary.pendingCount} bookings pending</span>
              </div>
            </div>

            {/* Card 2: Net Payout Received */}
            <div 
              className="relative overflow-hidden rounded-2xl p-5 bg-white border border-emerald-100"
              style={{ boxShadow: "0 4px 20px rgba(13,27,74,0.04)" }}
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
              <div className="flex items-center justify-between mb-3 mt-1">
                <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
                  Net Settled to Bank
                </span>
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <Landmark className="h-4 w-4 text-emerald-500" />
                </div>
              </div>
              <div className="text-2xl md:text-3xl font-bold tracking-tight mb-1 text-slate-800">
                ₹{summary.netReceivedInBank.toLocaleString("en-IN")}
              </div>
              <div className="text-[10px] text-emerald-600 font-semibold">
                Transferred successfully to bank
              </div>
            </div>

            {/* Card 3: Total Online Collected (Gross) */}
            <div 
              className="relative overflow-hidden rounded-2xl p-5 bg-white border border-blue-100"
              style={{ boxShadow: "0 4px 20px rgba(13,27,74,0.04)" }}
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600" />
              <div className="flex items-center justify-between mb-3 mt-1">
                <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
                  Gross Online Revenue
                </span>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <IndianRupee className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <div className="text-2xl md:text-3xl font-bold tracking-tight mb-1 text-slate-800">
                ₹{summary.totalOnlineRevenue.toLocaleString("en-IN")}
              </div>
              <div className="text-[10px] text-blue-600 font-semibold">
                Total advance booking pre-payments
              </div>
            </div>

            {/* Card 4: Deductible Fees & GST */}
            <div 
              className="relative overflow-hidden rounded-2xl p-5 bg-white border border-rose-100"
              style={{ boxShadow: "0 4px 20px rgba(13,27,74,0.04)" }}
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
              <div className="flex items-center justify-between mb-3 mt-1">
                <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
                  Razorpay Fees & GST
                </span>
                <div className="p-2 bg-rose-50 rounded-lg">
                  <Info className="h-4 w-4 text-rose-500" />
                </div>
              </div>
              <div className="text-2xl md:text-3xl font-bold tracking-tight mb-1 text-slate-800">
                ₹{(summary.totalFees + summary.totalTax).toLocaleString("en-IN")}
              </div>
              <div className="text-[10px] text-rose-500 font-semibold">
                Fees: ₹{summary.totalFees.toLocaleString("en-IN")} | GST: ₹{summary.totalTax.toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          {/* ── Main Tabbed Content ── */}
          <div 
            className="rounded-2xl bg-white border"
            style={{ 
              borderColor: "rgba(29,78,216,0.1)",
              boxShadow: "0 4px 20px rgba(13,27,74,0.04)"
            }}
          >
            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-100">
              <button
                onClick={() => setActiveTab("settlements")}
                className="px-6 py-4 text-sm font-bold border-b-2 transition-all cursor-pointer relative"
                style={{
                  color: activeTab === "settlements" ? "#1E3A8A" : "#64748B",
                  borderColor: activeTab === "settlements" ? "#1E3A8A" : "transparent"
                }}
              >
                Bank Settlements (Payouts)
                {activeTab === "settlements" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
                )}
              </button>
              <button
                onClick={() => setActiveTab("transactions")}
                className="px-6 py-4 text-sm font-bold border-b-2 transition-all cursor-pointer relative"
                style={{
                  color: activeTab === "transactions" ? "#1E3A8A" : "#64748B",
                  borderColor: activeTab === "transactions" ? "#1E3A8A" : "transparent"
                }}
              >
                Online Transactions Status
                {activeTab === "transactions" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
                )}
              </button>
            </div>

            {/* TAB 1: BANK SETTLEMENTS */}
            {activeTab === "settlements" && (
              <div className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-slate-500" />
                    Settlement Payout Batches
                  </h3>
                  <span className="text-xs text-slate-400">Showing last {settlements.length} settlement cycles</span>
                </div>

                {settlements.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    No bank settlements recorded yet on this account.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-xs font-bold uppercase text-slate-400 bg-slate-50/50">
                          <th className="py-3 px-4">Payout Date</th>
                          <th className="py-3 px-4">Settlement ID</th>
                          <th className="py-3 px-4 text-right">Gross Transferred</th>
                          <th className="py-3 px-4 text-right">Razorpay Fees</th>
                          <th className="py-3 px-4 text-right">Tax (18% GST)</th>
                          <th className="py-3 px-4 text-right">Net Credited</th>
                          <th className="py-3 px-4">UTR Reference</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {settlements.map((settle) => {
                          const gross = settle.amount + settle.fees + settle.tax;
                          return (
                            <tr key={settle.id} className="hover:bg-slate-50/30 transition-colors">
                              <td className="py-3.5 px-4 font-medium text-slate-700 whitespace-nowrap">
                                {formatTimestamp(settle.created_at)}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                                {settle.id}
                              </td>
                              <td className="py-3.5 px-4 text-right text-slate-500">
                                ₹{gross.toFixed(2)}
                              </td>
                              <td className="py-3.5 px-4 text-right text-rose-500">
                                -₹{settle.fees.toFixed(2)}
                              </td>
                              <td className="py-3.5 px-4 text-right text-rose-500">
                                -₹{settle.tax.toFixed(2)}
                              </td>
                              <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                                ₹{settle.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                                {settle.utr || <span className="text-slate-400 italic">Processing</span>}
                              </td>
                              <td className="py-3.5 px-4">
                                <span 
                                  className="inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap"
                                  style={{
                                    background: settle.status === "processed" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                                    color: settle.status === "processed" ? "#059669" : "#D97706",
                                    border: settle.status === "processed" ? "1px solid rgba(16,185,129,0.15)" : "1px solid rgba(245,158,11,0.15)"
                                  }}
                                >
                                  {settle.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <button
                                  onClick={() => handleOpenSettlementDetails(settle)}
                                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg cursor-pointer"
                                >
                                  <span>View Breakdown</span>
                                  <ArrowUpRight className="h-3 w-3" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: ONLINE TRANSACTIONS */}
            {activeTab === "transactions" && (
              <div className="p-6">
                
                {/* Search & Filter Header */}
                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search Guest Name, Booking ID, Payment ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      style={{ borderColor: "rgba(29,78,216,0.15)" }}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Status:</span>
                    <div className="inline-flex rounded-xl bg-slate-50 p-1 border border-slate-100">
                      {[
                        { id: "all", label: "All" },
                        { id: "settled", label: "Settled" },
                        { id: "pending", label: "Pending" },
                        { id: "refunded", label: "Refunded" }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setStatusFilter(tab.id)}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                          style={{
                            background: statusFilter === tab.id ? "white" : "transparent",
                            color: statusFilter === tab.id ? "#1E3A8A" : "#64748B",
                            boxShadow: statusFilter === tab.id ? "0 2px 6px rgba(13,27,74,0.06)" : "none"
                          }}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {filteredPayments.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    No transactions found matching the search/filter criteria.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-xs font-bold uppercase text-slate-400 bg-slate-50/50">
                          <th className="py-3 px-4">Transaction Date</th>
                          <th className="py-3 px-4">Payment ID</th>
                          <th className="py-3 px-4">Linked Booking Details</th>
                          <th className="py-3 px-4">Customer Contact</th>
                          <th className="py-3 px-4">Method</th>
                          <th className="py-3 px-4 text-right">Paid Amount</th>
                          <th className="py-3 px-4">Settlement Status</th>
                          <th className="py-3 px-4">Payout Ref ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredPayments.map((pay) => (
                          <tr key={pay.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="py-3.5 px-4 font-medium text-slate-700 whitespace-nowrap">
                              {formatTimestamp(pay.created_at)}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                              {pay.id}
                            </td>
                            <td className="py-3.5 px-4">
                              {pay.booking ? (
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-800">{pay.booking.guestName}</span>
                                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                                      {pay.booking.bookingId}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-400">
                                    Check-in: {new Date(pay.booking.checkIn).toLocaleDateString("en-IN", { timeZone: "UTC" })}
                                  </span>
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <span className="text-slate-400 italic">No Matching Local Booking</span>
                                  <span className="block text-[9px] text-slate-400 font-mono">External/Legacy Deposit</span>
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="text-xs text-slate-500">
                                <div>{pay.contact}</div>
                                <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{pay.email}</div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase">
                              {pay.method}
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-slate-800">
                              ₹{pay.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3.5 px-4">
                              {pay.status === "refunded" ? (
                                <span 
                                  className="inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap bg-rose-50 text-rose-600 border border-rose-100"
                                >
                                  Refunded
                                </span>
                              ) : pay.settlement_id ? (
                                <span 
                                  className="inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-1 w-fit"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  In Bank
                                </span>
                              ) : (
                                <span 
                                  className="inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap bg-amber-50 text-amber-600 border border-amber-100 flex items-center gap-1 w-fit animate-pulse"
                                >
                                  <Clock className="h-3 w-3" />
                                  Pending Bank
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                              {pay.settlement_id || <span className="italic text-slate-300">Wait settlement</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════
          MODAL: SETTLEMENT TRANSACTION BREAKDOWN
          ══════════════════════════════════════════ */}
      {selectedSettlement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div 
            className="relative w-full max-w-4xl bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] border"
            style={{ borderColor: "rgba(29,78,216,0.15)" }}
          >
            {/* Modal Header */}
            <div 
              className="px-6 py-4 flex items-center justify-between text-white"
              style={{ background: "linear-gradient(135deg, #0D1B4A 0%, #1E3A8A 100%)" }}
            >
              <div>
                <h3 className="text-base font-bold font-serif flex items-center gap-2">
                  <Landmark className="h-4.5 w-4.5 text-blue-200" />
                  Settlement Details: {selectedSettlement.id}
                </h3>
                <p className="text-xs text-blue-100 mt-0.5">
                  Processed on {formatTimestamp(selectedSettlement.created_at)}
                </p>
              </div>
              <button 
                onClick={() => setSelectedSettlement(null)}
                className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* Quick Batch Summary */}
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Bank UTR Reference</span>
                  <span className="font-mono text-sm font-bold text-slate-800">{selectedSettlement.utr || "Pending"}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Gross Settled</span>
                  <span className="text-sm font-bold text-slate-800">
                    ₹{(selectedSettlement.amount + selectedSettlement.fees + selectedSettlement.tax).toFixed(2)}
                  </span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Fees & GST Deductions</span>
                  <span className="text-sm font-bold text-rose-600">
                    -₹{(selectedSettlement.fees + selectedSettlement.tax).toFixed(2)}
                  </span>
                </div>
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">Credited To Bank</span>
                  <span className="text-base font-bold text-emerald-700">₹{selectedSettlement.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Transactions List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                  Payments Included In This Payout
                </h4>

                {loadingDetails ? (
                  <div className="py-12 flex flex-col items-center justify-center">
                    <div className="relative mb-3 h-8 w-8">
                      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-600 animate-spin" />
                    </div>
                    <span className="text-xs text-slate-400">Loading payouts detail breakdown...</span>
                  </div>
                ) : detailsError ? (
                  <div className="py-8 text-center text-rose-500 text-sm">
                    {detailsError}
                  </div>
                ) : settlementPayments.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed">
                    No transactions captured under this settlement. This could be due to a settlement delay or manual settlement adjustment in Razorpay.
                  </div>
                ) : (
                  <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <table className="w-full border-collapse text-left text-xs bg-white">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 font-bold uppercase text-slate-400">
                          <th className="py-2.5 px-4">Payment ID</th>
                          <th className="py-2.5 px-4">Guest / Booking ID</th>
                          <th className="py-2.5 px-4">Date/Time</th>
                          <th className="py-2.5 px-4">Method</th>
                          <th className="py-2.5 px-4 text-right">Amount (Gross)</th>
                          <th className="py-2.5 px-4 text-right">Settled Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {settlementPayments.map((pay) => (
                          <tr key={pay.id} className="hover:bg-slate-50/20">
                            <td className="py-3 px-4 font-mono text-slate-500">{pay.id}</td>
                            <td className="py-3 px-4">
                              {pay.booking ? (
                                <div className="space-y-0.5">
                                  <div className="font-bold text-slate-700">{pay.booking.guestName}</div>
                                  <div className="text-[9px] font-mono text-slate-400">{pay.booking.bookingId}</div>
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <span className="text-slate-400 italic">External Payment</span>
                                  <div className="text-[9px] text-slate-400 truncate max-w-[150px]">{pay.email}</div>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                              {formatTimestamp(pay.created_at)}
                            </td>
                            <td className="py-3 px-4 text-slate-500 uppercase">{pay.method}</td>
                            <td className="py-3 px-4 text-right font-bold text-slate-700">₹{pay.amount.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right">
                              <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[9px] font-bold uppercase text-emerald-600 border border-emerald-100">
                                Settled
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs">
              <span className="flex items-center gap-1 text-slate-400">
                <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                These transactions represent payments collected via online booking pre-payments.
              </span>
              <button 
                onClick={() => setSelectedSettlement(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
