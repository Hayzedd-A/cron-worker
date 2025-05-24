
const dotenv = require("dotenv");
dotenv.config();
const cron = require("node-cron")
const axios = require("axios")
const connectToDatabase = require("./db")
const Service = require("./models/service")

// Global error handlers
process.on("unhandledRejection", (reason) => {
  console.error("💥 Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err);
});

async function pingServices() {
  try {
    await connectToDatabase();

    const services = await Service.find({ active: true });

    for (const service of services) {
      try {
        const now = new Date();
        const historyItem = {
          response: { text: "", code: 0 },
          timestamp: now,
        };

        let status = "up";
        let lastResponse = { text: "", code: 0 };

        try {
          const response = await axios.get(service.url, {
            timeout: 5000,
            params: service.query,
          });

          console.log(`✅ ${service.name}: ${response.status}`);

          lastResponse = {
            text: JSON.stringify(response.data).substring(0, 50),
            code: response.status,
          };
        } catch (err) {
          console.log(`❌ ${service.name}: Failed (${err.message})`);

          status = "down";
          lastResponse = {
            text: err.message,
            code: err.response?.status || 500,
          };
        }

        // Add new history item and limit to 50
        const newHistory = [
          ...service.history,
          { response: lastResponse, timestamp: now },
        ];
        if (newHistory.length > 50)
          newHistory.splice(0, newHistory.length - 50);

        await Service.findByIdAndUpdate(service._id, {
          status,
          lastPing: now,
          lastResponse,
          history: newHistory,
        });
      } catch (err) {
        console.error(`🔥 Error updating service ${service.name}:`, err);
      }
    }
  } catch (err) {
    console.error("🔥 Global pingServices error:", err);
  }
}

// Run every 5 minutes
console.log("Service starts")
cron.schedule("*/5 * * * *", () => {
  console.log("⏰ Running cron ping...");
  pingServices();
});
