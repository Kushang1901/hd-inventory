"use client";

import React, { useEffect, useState } from "react";
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
  FileText
} from "lucide-react";

export default function BookingsManagement() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);

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
    setUpdateLoading(true);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingStatus: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedBooking(data.data);
        fetchBookings();
      }
    } catch (err) {
      alert("Failed to update status");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleCollectOutstanding = async (id: string) => {
    setUpdateLoading(true);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: "Fully Paid" })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedBooking(data.data);
        fetchBookings();
      }
    } catch (err) {
      alert("Failed to record payment");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const openDetailsModal = (booking: any) => {
    setSelectedBooking(booking);
    setModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Confirmed":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "Checked In":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "Checked Out":
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
      case "Cancelled":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20";
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
    <div className="space-y-6">
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
          <h1 className="text-2xl md:text-3xl font-serif text-white font-semibold">Guest Bookings</h1>
          <p className="text-xs md:text-sm text-zinc-500">Manage real-time guest reservations, check-ins, check-outs, and invoices.</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="grid gap-4 md:grid-cols-4 no-print">
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by name, phone or booking code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-amber-500/50 focus:bg-zinc-950 focus:shadow-[0_0_10px_rgba(202,160,53,0.05)]"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <Filter className="absolute top-1/2 left-3 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 pl-10 pr-4 py-2.5 text-sm text-zinc-300 outline-none transition focus:border-amber-500/50 appearance-none cursor-pointer"
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
          className="rounded-lg bg-zinc-900 border border-zinc-800 hover:border-amber-500/30 text-xs font-semibold uppercase tracking-wider text-amber-500 py-2.5 px-4 cursor-pointer transition active:scale-[0.98]"
        >
          Sync Data
        </button>
      </div>

      {/* Bookings Table */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/10 backdrop-blur-md overflow-hidden no-print">
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-3"></div>
            <p className="text-zinc-500 text-sm">Querying database...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20 text-zinc-500 text-sm">
            No bookings found matching the filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold bg-zinc-950/40">
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
              <tbody className="divide-y divide-zinc-800/50 text-sm text-zinc-300">
                {bookings.map((b) => (
                  <tr key={b._id} className="hover:bg-zinc-900/20 transition-all duration-150">
                    <td className="px-6 py-4 font-mono text-xs text-amber-500 font-semibold">{b.bookingId}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{b.guestName}</div>
                      <div className="text-[10px] text-zinc-500 flex items-center gap-1 font-sans mt-0.5">
                        <Phone className="h-3 w-3 inline text-zinc-600" />
                        {b.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs">
                        {new Date(b.checkIn).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        to {new Date(b.checkOut).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        <span className="ml-1 text-amber-500">({getNights(b.checkIn, b.checkOut)} Nights)</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs max-w-xs truncate">{b.roomType}</td>
                    <td className="px-6 py-4 text-right font-semibold text-white">₹{b.totalAmount}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={b.dueAmount > 0 ? "text-amber-500 font-semibold" : "text-emerald-500"}>
                        ₹{b.dueAmount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${getStatusBadge(b.bookingStatus)}`}>
                        {b.bookingStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openDetailsModal(b)}
                        className="rounded bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 text-xs px-3 py-1.5 text-zinc-300 transition cursor-pointer"
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

      {/* Details & Invoicing Modal */}
      {modalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm no-print">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-6 md:p-8 text-zinc-300 shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 rounded-lg p-2 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-100 outline-none transition"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-xl font-serif text-white font-semibold border-b border-zinc-800 pb-3 mb-6 flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-500" />
              <span>Reservation Information</span>
            </h2>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Left Column: Guest info & quick action controls */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-amber-500 font-semibold mb-3">Guest Profile</h3>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-zinc-500">Name:</span> <span className="font-semibold text-white">{selectedBooking.guestName}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500">Phone:</span> <span className="font-semibold text-white">{selectedBooking.phone}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500">Date of Birth:</span> <span className="font-semibold text-white">{selectedBooking.dob}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500">Special Request:</span> <span className="font-semibold text-white">{selectedBooking.specialRequests || "None"}</span></div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs uppercase tracking-wider text-amber-500 font-semibold mb-3">Operations Management</h3>
                  <div className="space-y-2.5">
                    {/* Check In Action */}
                    {selectedBooking.bookingStatus === "Confirmed" && (
                      <button
                        onClick={() => handleStatusUpdate(selectedBooking._id, "Checked In")}
                        disabled={updateLoading}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium py-2.5 text-xs uppercase tracking-wider cursor-pointer transition active:scale-[0.98]"
                      >
                        <CheckCircle className="h-4.5 w-4.5" /> Check In Guest
                      </button>
                    )}

                    {/* Check Out Action */}
                    {selectedBooking.bookingStatus === "Checked In" && (
                      <button
                        onClick={() => handleStatusUpdate(selectedBooking._id, "Checked Out")}
                        disabled={updateLoading}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-2.5 text-xs uppercase tracking-wider cursor-pointer transition active:scale-[0.98]"
                      >
                        <CheckCircle className="h-4.5 w-4.5" /> Check Out Guest (Collect Dues)
                      </button>
                    )}

                    {/* Collect Balance separately */}
                    {selectedBooking.bookingStatus !== "Cancelled" && selectedBooking.dueAmount > 0 && (
                      <button
                        onClick={() => handleCollectOutstanding(selectedBooking._id)}
                        disabled={updateLoading}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-amber-500/30 disabled:opacity-50 text-amber-500 font-medium py-2.5 text-xs uppercase tracking-wider cursor-pointer transition"
                      >
                        <DollarSign className="h-4.5 w-4.5" /> Record On-Site Payment (₹{selectedBooking.dueAmount})
                      </button>
                    )}

                    {/* Cancel Booking */}
                    {selectedBooking.bookingStatus !== "Cancelled" && selectedBooking.bookingStatus !== "Checked Out" && (
                      <button
                        onClick={() => {
                          if (confirm("Are you sure you want to cancel this booking?")) {
                            handleStatusUpdate(selectedBooking._id, "Cancelled");
                          }
                        }}
                        disabled={updateLoading}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-950/40 border border-red-900/30 hover:bg-red-900/20 disabled:opacity-50 text-red-400 font-medium py-2.5 text-xs uppercase tracking-wider cursor-pointer transition"
                      >
                        <XCircle className="h-4.5 w-4.5" /> Cancel Reservation
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handlePrint}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-amber-500/30 text-amber-500 text-xs font-semibold uppercase tracking-wider py-2.5 cursor-pointer transition"
                  >
                    <Printer className="h-4 w-4" /> Print Provisional Bill
                  </button>
                </div>
              </div>

              {/* Right Column: Provisional Bill Visual */}
              <div className="border border-zinc-800 bg-white text-zinc-950 rounded-xl overflow-hidden shadow-lg p-6 relative">
                {/* Print Invoice Frame Container */}
                <div id="print-receipt-section" className="space-y-6 font-sans">
                  {/* Bill header */}
                  <div className="text-center pb-4 border-b border-zinc-200">
                    <span className="text-lg font-bold font-serif tracking-widest block text-red-900">HOTEL DEVANG</span>
                    <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-semibold block mt-0.5">Near Dwarkadhish Temple, Dwarka, Gujarat</span>
                    <span className="text-[10px] text-zinc-400 font-mono block mt-1">Ph: +91 98244 02132</span>
                    
                    <div className="border border-dashed border-red-900/30 rounded inline-block px-4 py-1.5 mt-3 bg-red-50/50">
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
                      <div><span className="text-zinc-400">Date Issued:</span> <span className="font-semibold text-zinc-950">{new Date(selectedBooking.createdAt).toLocaleDateString("en-US")}</span></div>
                      <div><span className="text-zinc-400">Check-In:</span> <span className="font-semibold text-zinc-950">{new Date(selectedBooking.checkIn).toLocaleDateString("en-US")}</span></div>
                      <div><span className="text-zinc-400">Check-Out:</span> <span className="font-semibold text-zinc-950">{new Date(selectedBooking.checkOut).toLocaleDateString("en-US")}</span></div>
                    </div>
                  </div>

                  {/* Room items billing table */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-red-900 uppercase tracking-wider block">Billing Summary</span>
                    
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
                      <span className="font-semibold">- ₹{selectedBooking.paidAmount >= 1000 ? selectedBooking.paidAmount : 1000}</span>
                    </div>
                    
                    <div className="border-t border-double border-zinc-300 pt-2 flex justify-between text-xs font-bold text-red-950">
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
    </div>
  );
}
