require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/database");
const authRoutes = require("./routes/authRoutes");
const protect = require("./middleware/authMiddleware");
const friendRoutes = require("./routes/friendRoutes");
const app = express();
const PORT =  process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const locationRoutes = require("./routes/locationRoutes");
app.use("/api/location", locationRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/friends", friendRoutes);

app.get("/api/auth/me", protect, async (req, res) => {
  const User = require("./models/User");

  const user = await User.findById(req.userId).select("-password");

  if (!user) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  res.json({
    user,
  });
});

app.get("/", (req, res) => {
  res.send("SafeSpace backend is running!");
});

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
};

startServer();