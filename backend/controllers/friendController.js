const User = require("../models/User");
const Friendship = require("../models/Friendship");

const addFriend = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Friend email is required",
      });
    }

    const friend = await User.findOne({ email });

    if (!friend) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (friend._id.toString() === req.userId.toString()) {
      return res.status(400).json({
        message: "You cannot add yourself",
      });
    }

    const existing = await Friendship.findOne({
      $or: [
        {
          requester: req.userId,
          recipient: friend._id,
        },
        {
          requester: friend._id,
          recipient: req.userId,
        },
      ],
    });

    if (existing) {
      return res.status(400).json({
        message: "Friend request already exists",
      });
    }

    const friendship = await Friendship.create({
      requester: req.userId,
      recipient: friend._id,
    });

    res.status(201).json({
      message: "Friend request sent",
      friendship,
    });
  } catch (error) {
    console.error("Add friend error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

const getFriends = async (req, res) => {
  try {
    const friendships = await Friendship.find({
      $or: [
        { requester: req.userId },
        { recipient: req.userId },
      ],
      status: "accepted",
    })
      .populate("requester", "fullName email")
      .populate("recipient", "fullName email");

    const friends = friendships.map((friendship) => {
      return friendship.requester._id.toString() ===
        req.userId.toString()
        ? friendship.recipient
        : friendship.requester;
    });

    res.json({
      friends,
    });
  } catch (error) {
    console.error("Get friends error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

const getRequests = async (req, res) => {
  try {
    const requests = await Friendship.find({
      recipient: req.userId,
      status: "pending",
    })
      .populate("requester", "fullName email");

    res.json({
      requests,
    });
  } catch (error) {
    console.error("Get requests error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

const respondToRequest = async (req, res) => {
  try {
    const { friendshipId } = req.params;
    const { action } = req.body;

    if (!["accepted", "rejected"].includes(action)) {
      return res.status(400).json({
        message: "Invalid action",
      });
    }

    const friendship = await Friendship.findOne({
      _id: friendshipId,
      recipient: req.userId,
      status: "pending",
    });

    if (!friendship) {
      return res.status(404).json({
        message: "Friend request not found",
      });
    }

    friendship.status = action;

    await friendship.save();

    res.json({
      message:
        action === "accepted"
          ? "Friend request accepted"
          : "Friend request rejected",
    });
  } catch (error) {
    console.error("Respond to request error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  addFriend,
  getFriends,
  getRequests,
  respondToRequest,
};