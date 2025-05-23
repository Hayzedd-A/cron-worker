import dotenv from "dotenv";
dotenv.config();
import cron from "node-cron";
import axios from "axios";
import { connectToDatabase } from "./db";
import Service from "./models/service";
import User from "./models/user";

async function pingServices() {
  await connectToDatabase();

  const services = await Service.find({ active: true });

  for (const service of services) {
    try {
      const response = await axios.get(service.url, { timeout: 5000, params: service.query });
      console.log(`✅ ${service.name}: ${response.status}`);

      const statusCode = response?.status || 500; // fallback to 500
      const message = response?.data?.message || "Ping success";
      service.status = "up";
      service.lastPing = new Date();
      service.lastResponse = {
        text: JSON.stringify(response?.data?.data || response?.data.message).substring(0, 50),
        code: response.status,
      };

      service.history.push({
        response: {
          text: message,
          code: statusCode,
        },
        timestamp: new Date(),
      });
      if (service.history.length > 50) {
        service.history = service.history.slice(-50);
      }
      await service.save();
    } catch (err: any) {
      const statusCode = err.response?.status || 500; // fallback to 500
      const message = err.message || "Unknown error";

      console.log(
        `❌ ${service.name}: Failed (${message}) with code ${statusCode}`
      );

      service.lastResponse = {
        text: message,
        code: statusCode,
      };

      service.history.push({
        response: {
          text: message,
          code: statusCode,
        },
        timestamp: new Date(),
      });
      if (service.history.length > 50) {
        service.history = service.history.slice(-50);
      }

      service.status = "down";
      service.lastPing = new Date();
      await service.save();
    }
  }
}

// Run every minute
cron.schedule("* * * * *", () => {
  console.log("⏰ Running cron ping...");
  pingServices();
});
