const mongoose = require("mongoose");

const ServiceSchema = new mongoose.Schema(
  {
    name: String,
    url: String,
    query: Object,
    active: { type: Boolean, default: true },
    lastPing: Date,
    status: { type: String, enum: ["up", "down"], default: "down" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastResponse: { text: { type: String }, code: { type: Number } },
    history: [
      {
        response: { text: { type: String }, code: { type: Number } },
        timestamp: { type: Date },
      },
    ],
  },
  { timestamps: true }
);

const Service = mongoose.models.Service ||
mongoose.model("Service", ServiceSchema);

module.exports = Service
