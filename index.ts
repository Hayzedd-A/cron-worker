// import dotenv from "dotenv";
// dotenv.config();
// import cron from "node-cron";
// import axios from "axios";
// import { connectToDatabase } from "./db";
// import Service from "./models/service";
// import User from "./models/user";

// async function pingServices() {
//   await connectToDatabase();

//   const services = await Service.find({ active: true });

//   for (const service of services) {
//     try {
//       const response = await axios.get(service.url, { timeout: 5000, params: service.query });
//       console.log(`✅ ${service.name}: ${response.status}`);

//       const statusCode = response?.status || 500; // fallback to 500
//       const message = response?.data?.message || "Ping success";
//       service.status = "up";
//       service.lastPing = new Date();
//       service.lastResponse = {
//         text: JSON.stringify(response?.data?.data || response?.data.message).substring(0, 50),
//         code: response.status,
//       };

//       service.history.push({
//         response: {
//           text: message,
//           code: statusCode,
//         },
//         timestamp: new Date(),
//       });
//       if (service.history.length > 50) {
//         service.history = service.history.slice(-50);
//       }
//       await service.save();
//     } catch (err: any) {
//       const statusCode = err.response?.status || 500; // fallback to 500
//       const message = err.message || "Unknown error";

//       console.log(
//         `❌ ${service.name}: Failed (${message}) with code ${statusCode}`
//       );

//       service.lastResponse = {
//         text: message,
//         code: statusCode,
//       };

//       service.history.push({
//         response: {
//           text: message,
//           code: statusCode,
//         },
//         timestamp: new Date(),
//       });
//       if (service.history.length > 50) {
//         service.history = service.history.slice(-50);
//       }

//       service.status = "down";
//       service.lastPing = new Date();
//       await service.save();
//     }
//   }
// }

// // Run every 5 minute
// cron.schedule("*/5 * * * *", () => {
//   console.log("⏰ Running cron ping every 5 minutes...");
//   pingServices();
// });


import dotenv from "dotenv";
dotenv.config();
import cron from "node-cron";
import axios from "axios";
import mongoose from "mongoose";
import { connectToDatabase } from "./db";
import Service from "./models/service";

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
        } catch (err: any) {
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
cron.schedule("*/5 * * * *", () => {
  console.log("⏰ Running cron ping...");
  pingServices();
});
