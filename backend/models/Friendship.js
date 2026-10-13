const mongoose = require("mongoose");

const friendshipSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    distanceThresholdKm: {
      type: Number,
      min: 0.001,
      max: 1000,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

const Friendship = mongoose.model(
  "Friendship",
  friendshipSchema
);

module.exports = Friendship;
