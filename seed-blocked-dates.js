const mongoose = require("mongoose");
const { connect } = require("mongoose");

const MONGODB_URI = "mongodb+srv://kushang:BenTennyson%4010@cluster0.qzcvrhp.mongodb.net/hotel_devang";

const BlockedDateSchema = new mongoose.Schema({
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  roomType: { type: String, required: true, default: "All" },
  reason: { type: String, default: "" },
}, {
  timestamps: true
});

const BlockedDate = mongoose.models.BlockedDate || mongoose.model("BlockedDate", BlockedDateSchema);

const blockedRanges = [
  { startDate: "2026-05-23T00:00:00.000Z", endDate: "2026-06-14T23:59:59.999Z", roomType: "All", reason: "......." },
  { startDate: "2026-05-23T00:00:00.000Z", endDate: "2026-05-23T23:59:59.999Z", roomType: "All", reason: "" },
  { startDate: "2026-06-17T00:00:00.000Z", endDate: "2026-06-24T23:59:59.999Z", roomType: "All", reason: "" },
  { startDate: "2026-07-06T00:00:00.000Z", endDate: "2026-07-08T23:59:59.999Z", roomType: "All", reason: "" },
  { startDate: "2026-07-10T00:00:00.000Z", endDate: "2026-07-17T23:59:59.999Z", roomType: "All", reason: "" },
  { startDate: "2026-08-04T00:00:00.000Z", endDate: "2026-08-11T23:59:59.999Z", roomType: "All", reason: "" },
  { startDate: "2026-08-19T00:00:00.000Z", endDate: "2026-08-20T23:59:59.999Z", roomType: "All", reason: "" },
  { startDate: "2026-09-03T00:00:00.000Z", endDate: "2026-09-04T23:59:59.999Z", roomType: "All", reason: "" }
];

async function seed() {
  try {
    console.log("Connecting to MongoDB Atlas...");
    await connect(MONGODB_URI);
    console.log("Connected successfully!");

    for (const range of blockedRanges) {
      const start = new Date(range.startDate);
      const end = new Date(range.endDate);

      // Check if this date block is already registered to avoid duplicates
      const exists = await BlockedDate.findOne({
        startDate: start,
        endDate: end,
        roomType: range.roomType
      });

      if (!exists) {
        const newBlock = new BlockedDate({
          startDate: start,
          endDate: end,
          roomType: range.roomType,
          reason: range.reason
        });
        await newBlock.save();
        console.log(`Saved Block: ${range.startDate.split('T')[0]} to ${range.endDate.split('T')[0]}`);
      } else {
        console.log(`Block already exists: ${range.startDate.split('T')[0]} to ${range.endDate.split('T')[0]}`);
      }
    }

    console.log("Seeding complete!");
  } catch (err) {
    console.error("Seeding failed:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

seed();
