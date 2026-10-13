const express = require("express");

const protect = require("../middleware/authMiddleware");

const {
  addFriend,
  getFriends,
  getRequests,
  respondToRequest,
} = require("../controllers/friendController");

const router = express.Router();

router.post("/", protect, addFriend);

router.get("/", protect, getFriends);

router.get("/requests", protect, getRequests);

router.patch(
  "/requests/:friendshipId",
  protect,
  respondToRequest
);

module.exports = router;