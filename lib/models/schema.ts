import mongoose, { Schema, Document } from "mongoose";

// Interface for Room booking details inside a booking
export interface IRoomBooking {
  roomType: string; // "Standard", "Deluxe", "Super Deluxe", "Suite"
  selectedSubtype: string; // "AC", "Non-AC"
  quantity: number;
  guests: number;
  extraMattress?: boolean;
  pricePerNight: number;
}

// Interface for Booking Document

export interface IBooking extends Document {
  bookingId: string; // e.g. HD-YYYYMMDD-123
  guestName: string;
  phone: string;
  dob: string;
  checkIn: Date;
  checkOut: Date;
  rooms: IRoomBooking[];
  roomType: string; // Backward compatibility (main room type or list)
  selectedSubtype: string; // Backward compatibility
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: "Unpaid" | "Advance Paid" | "Fully Paid";
  bookingStatus: "Confirmed" | "Checked In" | "Checked Out" | "Cancelled";
  specialRequests?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Interface for BlockedDate Document
export interface IBlockedDate extends Document {
  startDate: Date;
  endDate: Date;
  roomType: string; // "All", "Standard", "Deluxe", "Super Deluxe", "Suite"
  reason?: string;
  createdAt: Date;
}

const RoomBookingSchema = new Schema<IRoomBooking>({
  roomType: { type: String, required: true },
  selectedSubtype: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  guests: { type: Number, required: true },
  extraMattress: { type: Boolean, default: false },
  pricePerNight: { type: Number, required: true }
});

const BookingSchema = new Schema<IBooking>({
  bookingId: { type: String, required: true, unique: true },
  guestName: { type: String, required: true },
  phone: { type: String, required: true },
  dob: { type: String, required: true },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  rooms: { type: [RoomBookingSchema], required: true },
  roomType: { type: String, required: true },
  selectedSubtype: { type: String, required: true },
  totalAmount: { type: Number, required: true },
  paidAmount: { type: Number, required: true, default: 1000 },
  dueAmount: { type: Number, required: true },
  paymentStatus: { 
    type: String, 
    enum: ["Unpaid", "Advance Paid", "Fully Paid"], 
    required: true,
    default: "Advance Paid"
  },
  bookingStatus: { 
    type: String, 
    enum: ["Confirmed", "Checked In", "Checked Out", "Cancelled"], 
    required: true,
    default: "Confirmed" 
  },
  specialRequests: { type: String, default: "" },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
}, {
  timestamps: true
});

const BlockedDateSchema = new Schema<IBlockedDate>({
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  roomType: { type: String, required: true, default: "All" },
  reason: { type: String, default: "" },
}, {
  timestamps: true
});

// Avoid model compilation error during Next.js serverless route re-loads
export const Booking = mongoose.models.Booking || mongoose.model<IBooking>("Booking", BookingSchema);
export const BlockedDate = mongoose.models.BlockedDate || mongoose.model<IBlockedDate>("BlockedDate", BlockedDateSchema);
