const express = require("express");
const { Network, Building, Router, Switch, EndDevice } = require("../models/Network");

module.exports = (ioInstance) => {
  const router = express.Router();

  // Add a Node
  router.post("/nodes", async (req, res) => {
    try {
      const { type, parentId, details } = req.body;
      if (!type || !details) {
        return res.status(400).json({ error: "Type and details are required" });
      }

      const network = await Network.findOne();
      if (!network) return res.status(404).json({ error: "Network not found" });

      switch (type) {
        case "router": {
          const building = await Building.findById(parentId);
          if (!building) {
            return res.status(404).json({ error: `Building not found with id: ${parentId}` });
          }

          if (!building.routers) {
            building.routers = [];
          }

          const router = new Router({ ...details, buildingId: parentId });
          await router.save();
          building.routers.push(router._id);
          await building.save();

          console.log(`✅ Router ${router.routerId} added to building ${building.name}`);
          
          ioInstance.emit("node-added", { type, parentId, details });
          return res.status(201).json({ 
            message: "Router added successfully",
            router: router
          });
        }
        case "switch": {
          const router = await Router.findById(parentId);
          if (!router) return res.status(404).json({ error: "Parent router not found" });
          
          const switchNode = new Switch({ ...details, routerId: parentId });
          await switchNode.save();
          router.switches.push(switchNode._id);
          await router.save();
          break;
        }
        case "device": {
          const switchNode = await Switch.findById(parentId);
          if (!switchNode) return res.status(404).json({ error: "Parent switch not found" });
          
          const device = new EndDevice({ ...details, switchId: parentId });
          await device.save();
          switchNode.endDevices.push(device._id);
          await switchNode.save();
          break;
        }
        default:
          return res.status(400).json({ error: "Invalid node type" });
      }
    } catch (error) {
      console.error("Error adding node:", error);
      return res.status(500).json({ 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // Delete a Node
  router.delete("/nodes/:nodeId", async (req, res) => {
    try {
      const { nodeId } = req.params;
      let nodeDeleted = false;

      // Find and delete the node from the appropriate collection
      const router = await Router.findById(nodeId);
      if (router) {
        // Remove router reference from building
        await Building.findByIdAndUpdate(router.buildingId, {
          $pull: { routers: nodeId }
        });
        await router.remove();
        nodeDeleted = true;
      }

      const switchNode = await Switch.findById(nodeId);
      if (switchNode) {
        // Remove switch reference from router
        await Router.findByIdAndUpdate(switchNode.routerId, {
          $pull: { switches: nodeId }
        });
        await switchNode.remove();
        nodeDeleted = true;
      }

      const device = await EndDevice.findById(nodeId);
      if (device) {
        // Remove device reference from switch
        await Switch.findByIdAndUpdate(device.switchId, {
          $pull: { endDevices: nodeId }
        });
        await device.remove();
        nodeDeleted = true;
      }

      if (!nodeDeleted) return res.status(404).json({ error: "Node not found" });

      ioInstance.emit("node-deleted", { nodeId });
      res.json({ message: "Node deleted successfully" });
    } catch (error) {
      console.error("Error deleting node:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Get Network Data
  router.get("/", async (req, res) => {
    try {
      console.log("🌐 Fetching complete network hierarchy...");
      
      const network = await Network.findOne()
        .populate({
          path: "buildings",
          populate: {
            path: "routers",
            model: "Router",
            populate: {
              path: "switches",
              model: "Switch",
              populate: {
                path: "endDevices",
                model: "EndDevice"
              }
            }
          }
        }).exec();

      if (!network) {
        console.log("❌ Network not found");
        return res.status(404).json({ error: "Network not found" });
      }

      console.log("✅ Network hierarchy fetched successfully");
      res.json(network);
    } catch (error) {
      console.error("❌ Error fetching network:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`🌐 Fetching network data for ID: ${id}`);
  
      const network = await Network.findById(id)
        .populate({
          path: "buildings",
          populate: {
            path: "routers",
            model: "Router",
            populate: {
              path: "switches",
              model: "Switch",
              populate: {
                path: "endDevices",
                model: "EndDevice"
              }
            }
          }
        })
        .exec();
  
      if (!network) {
        console.log("❌ Network not found");
        return res.status(404).json({ error: "Network not found" });
      }
  
      console.log("✅ Network data fetched successfully");
      res.json(network);
    } catch (error) {
      console.error("❌ Error fetching network:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Add this new route to get parent nodes
  router.get("/parent-nodes/:type", async (req, res) => {
    try {
      const { type } = req.params;
      let parentNodes = [];

      switch (type) {
        case "router":
          // Return all buildings as potential parent nodes for routers
          const buildings = await Building.find({}, 'name _id');
          parentNodes = buildings.map(building => ({
            id: building._id,
            name: building.name
          }));
          break;

        case "switch":
          // Return all routers as potential parent nodes for switches
          const routers = await Router.find({}, 'routerName _id');
          parentNodes = routers.map(router => ({
            id: router._id,
            name: router.routerName
          }));
          break;

        case "device":
          // Return all switches as potential parent nodes for devices
          const switches = await Switch.find({}, 'switchName _id');
          parentNodes = switches.map(switch_ => ({
            id: switch_._id,
            name: switch_.switchName
          }));
          break;

        default:
          return res.status(400).json({ error: "Invalid node type" });
      }

      res.json(parentNodes);
    } catch (error) {
      console.error("Error fetching parent nodes:", error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
