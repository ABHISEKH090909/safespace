const express = require("express");
const protect = require("../middleware/authMiddleware");
const {
  setSharing,
  updateMyLocation,
  getMyLocationStatus,
  getFriendsLocations,
  getDistanceThreshold,
  setDistanceThreshold,
} = require("../controllers/locationController");

const router = express.Router();
router.get("/me", protect, getMyLocationStatus);
router.put("/share", protect, setSharing);
router.put("/me", protect, updateMyLocation);
router.get("/friends", protect, getFriendsLocations);
router.get("/friends/:friendId/threshold", protect, getDistanceThreshold);
router.put("/friends/:friendId/threshold", protect, setDistanceThreshold);
module.exports = router;
