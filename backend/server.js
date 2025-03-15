const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const networkRouter = require("./routes/network");
const { startMonitoring } = require("./utils/networkMonitor");
const { Network, Building, Router, Switch, EndDevice } = require("./models/Network");
const { pingNetwork } = require("./utils/tcp");

const app = express();
const server = http.createServer(app);
const ioInstance = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
});

global.io = ioInstance;

// Middleware
app.use(express.json());
app.use(cors());
app.use("/api/network", networkRouter(ioInstance));

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/Network_Updated", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

  async function getNetworkData() {
    try {
      console.log("🔍 Attempting to fetch network data...");
  
      // Fetch network and populate all nested relations
      const networkData = await Network.findOne().populate({
        path: "buildings",
        populate: {
          path: "routers",
          populate: {
            path: "switches",
            populate: {
              path: "endDevices",
            },
          },
        },
      });
  
      console.log("✅ Fetched network data:", JSON.stringify(networkData, null, 2));
  
      if (!networkData) {
        console.error("❌ No network data found in MongoDB");
        return;
      }
  
      // Start monitoring with fetched network data
      startMonitoring(networkData);
    } catch (error) {
      console.error("❌ Error fetching network data:", error.message);
    }
  }
  
  
  

// Define API endpoint
app.get("/api/ping-network", async (req, res) => {
  try {
    const results = await pingNetwork();
    res.json(results);
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/network/parent-nodes", async (req, res) => {
  try {
    const { type, routerId, switchId } = req.query;

    if (!type) return res.status(400).json({ error: "Node type is required" });

    const network = await Network.findOne().populate({
      path: "buildings",
      populate: {
        path: "routers",
        populate: {
          path: "switches",
          populate: {
            path: "endDevices"
          }
        }
      }
    });

    if (!network) return res.status(404).json({ error: "Network not found" });

    let parentNodes = [];

    switch (type) {
      case "building":
        parentNodes = network.buildings;
        break;
      case "router":
        parentNodes = network.buildings.flatMap(building => building.routers);
        break;
      case "switch":
        if (!routerId) return res.status(400).json({ error: "Router ID is required" });
        parentNodes = network.buildings
          .flatMap(building => building.routers)
          .filter(router => router._id.toString() === routerId)
          .flatMap(router => router.switches);
        break;
      case "device":
        if (!switchId) return res.status(400).json({ error: "Switch ID is required" });
        parentNodes = network.buildings
          .flatMap(building => building.routers)
          .flatMap(router => router.switches)
          .filter(switchNode => switchNode._id.toString() === switchId)
          .flatMap(switchNode => switchNode.endDevices);
        break;
      default:
        return res.status(400).json({ error: "Invalid type specified" });
    }

    res.json(parentNodes);
  } catch (error) {
    console.error("Error fetching parent nodes:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Socket.IO Events
ioInstance.on("connection", socket => {
  socket.on("disconnect", () => console.log("Client disconnected"));
});

server.listen(5000, async () => {
  console.log("Server is running on http://localhost:5000");
  await getNetworkData();
});