const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  sharingEnabled: { type: Boolean, default: false, index: true },
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  latitude: { type: Number, min: -90, max: 90, default: null },
  longitude: { type: Number, min: -180, max: 180, default: null },
  updatedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model("UserLocation", schema);