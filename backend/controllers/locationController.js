const UserLocation = require("../models/UserLocation");
const Friendship = require("../models/Friendship");

function validCoordinates(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude) &&
    latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

function acceptedFriendshipQuery(userId, friendId) {
  return {
    status: "accepted",
    $or: [
      { requester: userId, recipient: friendId },
      { requester: friendId, recipient: userId },
    ],
  };
}

exports.getDistanceThreshold = async (req, res) => {
  try {
    const friendship = await Friendship.findOne(
      acceptedFriendshipQuery(req.userId, req.params.friendId)
    ).select("distanceThresholdKm");
    if (!friendship) return res.status(404).json({ message: "Accepted friendship not found." });
    return res.json({ distanceThresholdKm: friendship.distanceThresholdKm ?? 1 });
  } catch (error) {
    console.error("getDistanceThreshold error:", error);
    return res.status(500).json({ message: "Could not load the distance threshold." });
  }
};

exports.setDistanceThreshold = async (req, res) => {
  try {
    const thresholdKm = Number(req.body.thresholdKm);
    if (!Number.isFinite(thresholdKm) || thresholdKm < 0.001 || thresholdKm > 1000) {
      return res.status(400).json({ message: "Threshold must be at least 1 m and no more than 1000 km." });
    }
    const friendship = await Friendship.findOneAndUpdate(
      acceptedFriendshipQuery(req.userId, req.params.friendId),
      { $set: { distanceThresholdKm: thresholdKm } },
      { new: true, runValidators: true }
    ).select("distanceThresholdKm");
    if (!friendship) return res.status(404).json({ message: "Accepted friendship not found." });
    return res.json({ message: "Shared distance threshold updated.", distanceThresholdKm: friendship.distanceThresholdKm });
  } catch (error) {
    console.error("setDistanceThreshold error:", error);
    return res.status(500).json({ message: "Could not update the distance threshold." });
  }
};

exports.setSharing = async (req, res) => {
  try {
    const { enabled, latitude, longitude } = req.body;
    if (typeof enabled !== "boolean") {
      return res.status(400).json({ message: "enabled must be true or false." });
    }
    if (enabled && !validCoordinates(latitude, longitude)) {
      return res.status(400).json({ message: "A valid location is required to start sharing." });
    }
    const update = enabled
      ? { sharingEnabled: true, latitude, longitude, updatedAt: new Date() }
      : { sharingEnabled: false };
    const location = await UserLocation.findOneAndUpdate(
      { user: req.userId },
      { $set: update, $setOnInsert: { user: req.userId } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return res.json({
      message: enabled ? "Location sharing is on." : "Location sharing is off.",
      sharingEnabled: location.sharingEnabled,
      updatedAt: location.updatedAt,
    });
  } catch (error) {
    console.error("setSharing error:", error);
    return res.status(500).json({ message: "Could not update location sharing." });
  }
};

exports.updateMyLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (!validCoordinates(latitude, longitude)) {
      return res.status(400).json({ message: "Valid latitude and longitude are required." });
    }
    const location = await UserLocation.findOneAndUpdate(
      { user: req.userId, sharingEnabled: true },
      { $set: { latitude, longitude, updatedAt: new Date() } },
      { new: true, runValidators: true }
    );
    if (!location) {
      return res.status(403).json({ message: "Start location sharing before sending location updates." });
    }
    return res.json({ message: "Location updated.", updatedAt: location.updatedAt });
  } catch (error) {
    console.error("updateMyLocation error:", error);
    return res.status(500).json({ message: "Could not update your location." });
  }
};

exports.getMyLocationStatus = async (req, res) => {
  try {
    const location = await UserLocation.findOne({ user: req.userId }).select("sharingEnabled updatedAt");
    return res.json({ sharingEnabled: Boolean(location?.sharingEnabled), updatedAt: location?.updatedAt || null });
  } catch (error) {
    console.error("getMyLocationStatus error:", error);
    return res.status(500).json({ message: "Could not load sharing status." });
  }
};

exports.getFriendsLocations = async (req, res) => {
  try {
    const friendships = await Friendship.find({
      status: "accepted",
      $or: [{ requester: req.userId }, { recipient: req.userId }],
    }).select("requester recipient");

    const friendIds = friendships.map((f) =>
      String(f.requester) === String(req.userId) ? f.recipient : f.requester
    );
    const locations = await UserLocation.find({
      user: { $in: friendIds }, sharingEnabled: true,
      latitude: { $ne: null }, longitude: { $ne: null },
    }).populate("user", "fullName email")
      .select("user latitude longitude updatedAt").lean();

    return res.json({
      locations: locations.filter((item) => item.user).map((item) => ({
        userId: item.user._id,
        fullName: item.user.fullName,
        email: item.user.email,
        latitude: item.latitude,
        longitude: item.longitude,
        updatedAt: item.updatedAt,
      })),
    });
  } catch (error) {
    console.error("getFriendsLocations error:", error);
    return res.status(500).json({ message: "Could not load friends' shared locations." });
  }
};
