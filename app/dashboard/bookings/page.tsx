"use client";

import React, { useEffect, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { 
  Search, 
  Filter, 
  Calendar, 
  Phone, 
  DollarSign, 
  Printer, 
  X, 
  Clock, 
  User,
  CheckCircle,
  XCircle,
  FileText,
  Download
} from "lucide-react";

export default function BookingsManagement() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`);
      const data = await res.json();
      if (data.success) {
        setBookings(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load bookings", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [search, status]);

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    if (!id) {
      alert("Failed to update status: Invalid Booking ID reference");
      return;
    }
    setUpdateLoading(true);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingStatus: newStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedBooking(data.data);
        fetchBookings();
      } else {
        alert(`Failed to update status: ${data.error || res.statusText || "Unknown server error"}`);
      }
    } catch (err: any) {
      alert(`Failed to update status: ${err.message || err}`);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleCollectOutstanding = async (id: string) => {
    if (!id) {
      alert("Failed to record payment: Invalid Booking ID reference");
      return;
    }
    setUpdateLoading(true);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: "Fully Paid" })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedBooking(data.data);
        fetchBookings();
      } else {
        alert(`Failed to record payment: ${data.error || res.statusText || "Unknown server error"}`);
      }
    } catch (err: any) {
      alert(`Failed to record payment: ${err.message || err}`);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDownload = () => {
    if (!selectedBooking) return;

    const runDownload = () => {
      const element = document.getElementById("print-receipt-section");
      if (element) {
        const html2pdf = (window as any).html2pdf;
        if (html2pdf) {
          const opt = {
            margin: [0.4, 0.4, 0.4, 0.4],
            filename: `Hotel_Devang_Provisional_Bill_${selectedBooking.bookingId}.pdf`,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2.5, useCORS: true },
            jsPDF: { unit: "in", format: "a4", orientation: "portrait" }
          };
          html2pdf().from(element).set(opt).save();
        }
      }
    };

    if (!(window as any).html2pdf) {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      script.onload = runDownload;
      document.body.appendChild(script);
    } else {
      runDownload();
    }
  };

  const openDetailsModal = (booking: any) => {
    setSelectedBooking(booking);
    setModalOpen(true);
  };

  const getStatusStyle = (status: string): React.CSSProperties => {
    switch (status) {
      case "Confirmed":
        return { background: "rgba(217,119,6,0.1)", color: "#D97706", border: "1px solid rgba(217,119,6,0.2)" };
      case "Checked In":
        return { background: "rgba(5,150,105,0.1)", color: "#059669", border: "1px solid rgba(5,150,105,0.2)" };
      case "Checked Out":
        return { background: "rgba(100,116,139,0.1)", color: "#64748B", border: "1px solid rgba(100,116,139,0.2)" };
      case "Cancelled":
        return { background: "rgba(220,38,38,0.1)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.2)" };
      default:
        return { background: "rgba(100,116,139,0.1)", color: "#64748B", border: "1px solid rgba(100,116,139,0.2)" };
    }
  };

  const getNights = (inDate: string, outDate: string) => {
    const start = new Date(inDate);
    const end = new Date(outDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diff = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <>
      <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto">
        {/* Print Specific CSS style injection */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
              background: #fff !important;
              color: #000 !important;
            }
            #print-receipt-section, #print-receipt-section * {
              visibility: visible;
            }
            #print-receipt-section {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 1.5cm;
              margin: 0;
              border: none !important;
              box-shadow: none !important;
              background: white !important;
              color: black !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>

        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between no-print">
          <div>
            <h1
              className="text-2xl md:text-3xl font-bold"
              style={{ fontFamily: "Georgia, serif", background: "linear-gradient(135deg, #0D1B4A, #1D4ED8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
            >Guest Bookings</h1>
            <p className="text-xs md:text-sm mt-1" style={{ color: "#64748B" }}>Manage real-time guest reservations, check-ins, check-outs, and invoices.</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="grid gap-3 md:grid-cols-4 no-print">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute top-1/2 left-3 -translate-y-1/2 h-4 w-4" style={{ color: "#94A3B8" }} />
            <input
              type="text"
              placeholder="Search by name, phone or booking code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-all"
              style={{ background: "white", border: "1px solid rgba(29,78,216,0.15)", color: "#1E293B" }}
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute top-1/2 left-3 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "#94A3B8" }} />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none appearance-none cursor-pointer"
              style={{ background: "white", border: "1px solid rgba(29,78,216,0.15)", color: "#1E293B" }}
            >
              <option value="All">All Bookings</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Checked In">Checked In</option>
              <option value="Checked Out">Checked Out</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Reload button */}
          <button 
            onClick={fetchBookings}
            className="rounded-xl text-xs font-bold uppercase tracking-wider py-2.5 px-4 cursor-pointer transition-all active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #1E3A8A, #DC2626)", color: "white", boxShadow: "0 2px 10px rgba(30,58,138,0.3)" }}
          >
            Sync Data
          </button>
        </div>

        {/* Bookings Table */}
        <div
          className="rounded-2xl overflow-hidden no-print"
          style={{ background: "white", border: "1px solid rgba(29,78,216,0.12)", boxShadow: "0 4px 20px rgba(13,27,74,0.06)" }}
        >
          {loading ? (
            <div className="text-center py-20">
              <div className="relative mx-auto mb-3 h-8 w-8">
                <div className="absolute inset-0 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: "#DC2626", borderRightColor: "#1D4ED8" }} />
              </div>
              <p className="text-sm" style={{ color: "#94A3B8" }}>Querying database...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-20 text-sm" style={{ color: "#94A3B8" }}>
              No bookings found matching the filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr
                    className="text-[10px] uppercase tracking-wider font-bold"
                    style={{ background: "linear-gradient(135deg, #0D1B4A, #1E3A8A)", color: "rgba(219,234,254,0.7)" }}
                  >
                    <th className="px-6 py-4">Booking ID</th>
                    <th className="px-6 py-4">Primary Guest</th>
                    <th className="px-6 py-4">Stay Range</th>
                    <th className="px-6 py-4">Room Summary</th>
                    <th className="px-6 py-4 text-right">Total</th>
                    <th className="px-6 py-4 text-right">Balance Due</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="text-sm" style={{ color: "#334155" }}>
                  {bookings.map((b, idx) => (
                    <tr
                      key={b.id || b._id}
                      className="transition-all duration-150"
                      style={{ borderBottom: "1px solid #F1F5F9", background: idx % 2 === 0 ? "white" : "#FAFBFF" }}
                      onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = "#EFF6FF"}
                      onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? "white" : "#FAFBFF"}
                    >
                      <td className="px-6 py-4 font-mono text-xs font-bold" style={{ color: "#1D4ED8" }}>{b.bookingId}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold" style={{ color: "#0F172A" }}>{b.guestName}</div>
                        <div className="text-[10px] flex items-center gap-1 mt-0.5" style={{ color: "#94A3B8" }}>
                          <Phone className="h-3 w-3 inline" />
                          {b.phone}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-medium" style={{ color: "#1E293B" }}>
                          {new Date(b.checkIn).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" })}
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color: "#94A3B8" }}>
                          to {new Date(b.checkOut).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" })}
                          <span className="ml-1 font-semibold" style={{ color: "#1D4ED8" }}>({getNights(b.checkIn, b.checkOut)}N)</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs max-w-xs truncate" style={{ color: "#475569" }}>{b.roomType}</td>
                      <td className="px-6 py-4 text-right font-bold" style={{ color: "#0F172A" }}>₹{b.totalAmount}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-bold" style={{ color: b.dueAmount > 0 ? "#D97706" : "#059669" }}>
                          ₹{b.dueAmount}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className="inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                          style={getStatusStyle(b.bookingStatus)}
                        >
                          {b.bookingStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openDetailsModal(b)}
                          className="rounded-lg text-xs px-3 py-1.5 font-semibold cursor-pointer transition-all"
                          style={{ background: "rgba(29,78,216,0.08)", color: "#1D4ED8", border: "1px solid rgba(29,78,216,0.15)" }}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Details & Invoicing Modal */}
      {modalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm no-print" style={{ background: "rgba(13,27,74,0.6)" }}>
          <div
            className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 md:p-8 shadow-2xl animate-scaleUp"
            style={{ background: "white", border: "1px solid rgba(202,160,53,0.25)", color: "#334155" }}
          >
            {/* Close button */}
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 rounded-xl p-2 transition outline-none cursor-pointer hover:bg-zinc-100"
              style={{ color: "#94A3B8", background: "#F8FAFC" }}
            >
              <X className="h-5 w-5" />
            </button>

            <h2
              className="text-xl font-bold pb-4 mb-6 flex items-center gap-2"
              style={{ fontFamily: "Georgia, serif", color: "#880000", borderBottom: "2px solid", borderImage: "linear-gradient(90deg, #880000, #caa035) 1" }}
            >
              <FileText className="h-5 w-5" style={{ color: "#caa035" }} />
              <span>Reservation Information</span>
            </h2>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Left Column: Guest info & quick action controls */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs uppercase tracking-wider font-bold mb-3" style={{ color: "#caa035" }}>Guest Profile</h3>
                  <div className="rounded-xl p-4 space-y-2 text-xs" style={{ background: "#FAF9F6", border: "1px solid rgba(202,160,53,0.15)" }}>
                    <div className="flex justify-between"><span style={{ color: "#94A3B8" }}>Name:</span> <span className="font-semibold" style={{ color: "#0F172A" }}>{selectedBooking.guestName}</span></div>
                    <div className="flex justify-between"><span style={{ color: "#94A3B8" }}>Phone:</span> <span className="font-semibold" style={{ color: "#0F172A" }}>{selectedBooking.phone}</span></div>
                    <div className="flex justify-between"><span style={{ color: "#94A3B8" }}>Date of Birth:</span> <span className="font-semibold" style={{ color: "#0F172A" }}>{selectedBooking.dob}</span></div>
                    <div className="flex justify-between"><span style={{ color: "#94A3B8" }}>Special Request:</span> <span className="font-semibold" style={{ color: "#0F172A" }}>{selectedBooking.specialRequests || "None"}</span></div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs uppercase tracking-wider font-bold mb-3" style={{ color: "#caa035" }}>Operations Management</h3>
                  <div className="space-y-2.5">
                    {/* Check In Action */}
                    {selectedBooking.bookingStatus === "Confirmed" && (
                      <button
                        onClick={() => handleStatusUpdate(selectedBooking.id || selectedBooking._id, "Checked In")}
                        disabled={updateLoading}
                        className="w-full flex items-center justify-center gap-2 rounded-xl text-white font-bold py-3 text-xs uppercase tracking-wider cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98] disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg, #caa035, #ffd700)", boxShadow: "0 2px 10px rgba(202,160,53,0.3)" }}
                      >
                        <CheckCircle className="h-4 w-4" /> Check In Guest
                      </button>
                    )}

                    {/* Check Out Action */}
                    {selectedBooking.bookingStatus === "Checked In" && (
                      <button
                        onClick={() => handleStatusUpdate(selectedBooking.id || selectedBooking._id, "Checked Out")}
                        disabled={updateLoading}
                        className="w-full flex items-center justify-center gap-2 rounded-xl text-white font-bold py-3 text-xs uppercase tracking-wider cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98] disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg, #059669, #10B981)", boxShadow: "0 2px 10px rgba(5,150,105,0.3)" }}
                      >
                        <CheckCircle className="h-4 w-4" /> Check Out Guest (Collect Dues)
                      </button>
                    )}

                    {/* Collect Balance separately */}
                    {selectedBooking.bookingStatus !== "Cancelled" && selectedBooking.dueAmount > 0 && (
                      <button
                        onClick={() => handleCollectOutstanding(selectedBooking.id || selectedBooking._id)}
                        disabled={updateLoading}
                        className="w-full flex items-center justify-center gap-2 rounded-xl font-bold py-3 text-xs uppercase tracking-wider cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98] disabled:opacity-50"
                        style={{ background: "rgba(202,160,53,0.08)", color: "#caa035", border: "1px solid rgba(202,160,53,0.2)" }}
                      >
                        <DollarSign className="h-4 w-4" /> Record On-Site Payment (₹{selectedBooking.dueAmount})
                      </button>
                    )}

                    {/* Cancel Booking */}
                    {selectedBooking.bookingStatus !== "Cancelled" && selectedBooking.bookingStatus !== "Checked Out" && (
                      <button
                        onClick={() => {
                          setConfirmState({
                            isOpen: true,
                            title: "Cancel Reservation",
                            message: "Are you sure you want to cancel this booking?",
                            confirmText: "Cancel Reservation",
                            isDestructive: true,
                            onConfirm: () => {
                              handleStatusUpdate(selectedBooking.id || selectedBooking._id, "Cancelled");
                            }
                          });
                        }}
                        disabled={updateLoading}
                        className="w-full flex items-center justify-center gap-2 rounded-xl font-bold py-3 text-xs uppercase tracking-wider cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98] disabled:opacity-50"
                        style={{ background: "rgba(220,38,38,0.08)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.2)" }}
                      >
                        <XCircle className="h-4 w-4" /> Cancel Reservation
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleDownload}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl text-xs font-bold uppercase tracking-wider py-3 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:bg-blue-50 active:translate-y-0 active:scale-[0.98]"
                    style={{ background: "rgba(29,78,216,0.08)", color: "#1D4ED8", border: "1px solid rgba(29,78,216,0.15)" }}
                  >
                    <Download className="h-4 w-4" /> Download PDF
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl text-xs font-bold uppercase tracking-wider py-3 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:bg-zinc-100 active:translate-y-0 active:scale-[0.98]"
                    style={{ background: "rgba(100,116,139,0.08)", color: "#475569", border: "1px solid rgba(100,116,139,0.15)" }}
                  >
                    <Printer className="h-4 w-4" /> Print Bill
                  </button>
                </div>
              </div>

              {/* Right Column: Provisional Bill Visual */}
              <div className="border border-amber-200/50 bg-[#FCFBF9] text-zinc-950 rounded-xl overflow-hidden shadow-lg p-6 relative">
                {/* Print Invoice Frame Container */}
                <div id="print-receipt-section" className="space-y-6 font-sans">
                  {/* Bill header */}
                  <div className="text-center pb-4 border-b border-zinc-200">
                    <span className="text-xl font-bold tracking-widest block text-red-900" style={{ fontFamily: "Georgia, serif", color: "#880000" }}>HOTEL DEVANG</span>
                    <span className="text-[9px] text-zinc-500 font-semibold block mt-0.5" style={{ fontFamily: "monospace", fontSize: "9px" }}>GSTIN: 24AADFH4542D2ZU</span>
                    <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-semibold block mt-0.5">Opp Circuit House, Hospital Rd, Dwarka, Gujarat 361335</span>
                    <span className="text-[10px] text-zinc-400 font-mono block mt-1">Ph: +91 98244 02132</span>
                    
                    <div className="border-t border-b border-double border-red-900/30 py-1.5 mt-3 bg-red-50/30">
                      <span className="text-xs uppercase tracking-wider font-bold text-red-900 font-serif block">PROVISIONAL BILL</span>
                    </div>
                  </div>

                  {/* Booking and bill metadata */}
                  <div className="grid grid-cols-2 gap-4 text-[10px] text-zinc-800 border-b border-zinc-100 pb-4">
                    <div className="space-y-1">
                      <div><span className="text-zinc-400">Invoice Number:</span> <span className="font-semibold font-mono text-zinc-950">{selectedBooking.bookingId}</span></div>
                      <div><span className="text-zinc-400">Guest Name:</span> <span className="font-semibold text-zinc-950">{selectedBooking.guestName}</span></div>
                      <div><span className="text-zinc-400">Contact:</span> <span className="font-semibold text-zinc-950">{selectedBooking.phone}</span></div>
                    </div>
                    <div className="space-y-1 text-right">
                      <div><span className="text-zinc-400">Date Issued:</span> <span className="font-semibold text-zinc-950">{new Date(selectedBooking.createdAt).toLocaleDateString("en-US", { timeZone: "UTC" })}</span></div>
                      <div><span className="text-zinc-400">Check-In:</span> <span className="font-semibold text-zinc-950">{new Date(selectedBooking.checkIn).toLocaleDateString("en-US", { timeZone: "UTC" })}</span></div>
                      <div><span className="text-zinc-400">Check-Out:</span> <span className="font-semibold text-zinc-950">{new Date(selectedBooking.checkOut).toLocaleDateString("en-US", { timeZone: "UTC" })}</span></div>
                    </div>
                  </div>

                  {/* Room items billing table */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-red-900 uppercase tracking-wider block" style={{ color: "#880000" }}>Billing Summary</span>
                    
                    <table className="w-full text-[10px] border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-200 text-zinc-500 text-left font-semibold">
                          <th className="pb-1.5">Description</th>
                          <th className="pb-1.5 text-center">Nights</th>
                          <th className="pb-1.5 text-right">Rate</th>
                          <th className="pb-1.5 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 text-zinc-900">
                        {selectedBooking.rooms && selectedBooking.rooms.length > 0 ? (
                          selectedBooking.rooms.map((room: any, index: number) => (
                            <tr key={index} className="py-2">
                              <td className="py-1.5 font-medium">
                                {room.quantity}x {room.roomType} ({room.selectedSubtype})
                                {(() => {
                                  const mattressCount = room.guests > 2 && room.roomType !== "Standard" ? room.guests - 2 : 0;
                                  return mattressCount > 0 ? ` + ${mattressCount} Extra Mattress${mattressCount > 1 ? "es" : ""}` : "";
                                })()}
                                <div className="text-[9px] text-zinc-400 font-sans mt-0.5">Capacity: {room.guests} Guests</div>
                              </td>
                              <td className="py-1.5 text-center">{getNights(selectedBooking.checkIn, selectedBooking.checkOut)}</td>
                              <td className="py-1.5 text-right">₹{room.pricePerNight}</td>
                              <td className="py-1.5 text-right">
                                ₹{room.pricePerNight * room.quantity * getNights(selectedBooking.checkIn, selectedBooking.checkOut)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          // Fallback to legacy single-room display
                          <tr className="py-2">
                            <td className="py-1.5 font-medium">{selectedBooking.roomType} ({selectedBooking.selectedSubtype})</td>
                            <td className="py-1.5 text-center">{getNights(selectedBooking.checkIn, selectedBooking.checkOut)}</td>
                            <td className="py-1.5 text-right">₹{Math.round(selectedBooking.totalAmount / getNights(selectedBooking.checkIn, selectedBooking.checkOut))}</td>
                            <td className="py-1.5 text-right">₹{selectedBooking.totalAmount}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals panel */}
                  <div className="border-t border-zinc-200 pt-4 space-y-1.5 text-[10px] text-zinc-900">
                    <div className="flex justify-between font-semibold">
                      <span>Total Staying Charges:</span>
                      <span>₹{selectedBooking.totalAmount}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700">
                      <span>Advance Received Online (Razorpay):</span>
                      <span className="font-semibold">- ₹{selectedBooking.paidAmount}</span>
                    </div>
                    
                    <div className="border-t border-double border-red-900/30 pt-2.5 flex justify-between text-xs font-bold text-red-950 font-serif" style={{ color: "#880000" }}>
                      <span>BALANCE DUE AT CHECK-IN:</span>
                      <span>₹{selectedBooking.dueAmount}</span>
                    </div>
                  </div>

                  {/* Confirmation Stamp & Stamp visual */}
                  <div className="pt-6 border-t border-zinc-100 flex items-center justify-between gap-4">
                    <div className="text-[9px] text-zinc-400 font-sans max-w-[160px] leading-relaxed">
                      * This is a dynamic provisional booking confirmation. Bring this document at check-in.
                    </div>
                    
                    {/* Stamp */}
                    <div className="h-14 w-32 border-2 border-emerald-600/40 rounded flex flex-col items-center justify-center rotate-[-4deg] text-emerald-600 font-mono font-bold tracking-widest text-center select-none uppercase">
                      <span className="text-[9px] border-b border-emerald-600/20 px-2 py-0.5">DEVANG DWARKA</span>
                      <span className="text-[10px] tracking-wide mt-0.5">CONFIRMED</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        isDestructive={confirmState.isDestructive}
        onConfirm={() => {
          confirmState.onConfirm();
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}
