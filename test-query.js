const { MongoClient } = require("mongodb");
require("dotenv").config();
const uri = process.env.MONGODB_URI;

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log("Connected to MongoDB.");
    const db = client.db("hotel_devang");
    const bookings = await db.collection("bookings").find().limit(3).toArray();
    console.log("Bookings retrieved:", JSON.stringify(bookings, null, 2));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

run();
