const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI || "";

if (!MONGODB_URI) throw new Error("Missing MONGODB_URI in .env");

let isConnected = false;

const connectToDatabase = async () => {
  if (isConnected) return;

  await mongoose.connect(MONGODB_URI);
  isConnected = true;
  console.log("✅ Connected to MongoDB");
};

module.exports = connectToDatabase;
