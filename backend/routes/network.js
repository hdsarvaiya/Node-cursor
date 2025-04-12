const express = require("express");
const { Network, Building, Router, Switch, EndDevice } = require("../models/Network");
const mongoose = require("mongoose");

module.exports = (ioInstance) => {
  const router = express.Router();

  // Add a Node
  router.post("/nodes", async (req, res) => {
    const { type, parentId, details } = req.body;

    // Validate required fields
    if (!type || !parentId || !details) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate parentId as a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(parentId)) {
      return res.status(400).json({ error: "Invalid parentId" });
    }

    try {
      switch (type) {
        case "router": {
          const building = await Building.findById(parentId);
          if (!building) {
            return res.status(404).json({ error: `Building not found with id: ${parentId}` });
          }

          const router = new Router({
            routerName: details.routerName,
            routerId: details.routerId,
            routerIp: details.routerIp,
            port: parseInt(details.port),
            buildingId: parentId
          });
          await router.save();

          if (!building.routers) {
            building.routers = [];
          }

          building.routers.push(router._id);
          await building.save();
          break;
        }

        case "switch": {
          const router = await Router.findById(parentId);
          if (!router) {
            return res.status(404).json({ error: `Router not found with id: ${parentId}` });
          }

          const switchNode = new Switch({
            switchName: details.switchName,
            switchId: details.switchId,
            switchIp: details.switchIp,
            port: parseInt(details.port),
            routerId: parentId
          });
          await switchNode.save();

          if (!router.switches) {
            router.switches = [];
          }

          router.switches.push(switchNode._id);
          await router.save();
          break;
        }

        case "device": {
          // Check if the parent switch exists
          const parentSwitch = await Switch.findById(parentId);
          if (!parentSwitch) {
            return res.status(404).json({ error: "Parent switch not found" });
          }

          // Create the new device
          const newDevice = new EndDevice({ ...details, switchId: parentId });
          await newDevice.save();

          // Add the device to the parent switch's endDevices array
          parentSwitch.endDevices.push(newDevice._id);
          await parentSwitch.save();

          return res.status(201).json(newDevice);
        }

        default:
          return res.status(400).json({ error: "Invalid node type" });
      }

      const updatedNetwork = await Network.findOne()
        .populate({
          path: 'buildings',
          populate: {
            path: 'routers',
            populate: {
              path: 'switches',
              populate: {
                path: 'endDevices'
              }
            }
          }
        });

      if (!updatedNetwork) {
        return res.status(404).json({ error: "Network not found" });
      }

      res.json(updatedNetwork);

    } catch (error) {
      console.error("Error adding device:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Delete a Node
  router.delete("/nodes/:nodeId", async (req, res) => {
    try {
      const { nodeId } = req.params;
      let deleted = false;

      const router = await Router.findById(nodeId);
      if (router) {
        await Building.updateMany(
          { routers: nodeId },
          { $pull: { routers: nodeId } }
        );
        await router.remove();
        deleted = true;
      }

      const switchNode = await Switch.findById(nodeId);
      if (switchNode) {
        await Router.updateMany(
          { switches: nodeId },
          { $pull: { switches: nodeId } }
        );
        await switchNode.remove();
        deleted = true;
      }

      const device = await EndDevice.findById(nodeId);
      if (device) {
        await Switch.updateMany(
          { endDevices: nodeId },
          { $pull: { endDevices: nodeId } }
        );
        await device.remove();
        deleted = true;
      }

      if (!deleted) {
        return res.status(404).json({ error: "Node not found" });
      }

      const updatedNetwork = await Network.findOne().populate({
        path: 'buildings',
        populate: {
          path: 'routers',
          populate: {
            path: 'switches',
            populate: {
              path: 'endDevices'
            }
          }
        }
      });

      res.json(updatedNetwork);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Helper function to get updated network data
  async function getUpdatedNetwork() {
    return await Network.findOne().populate({
      path: 'buildings',
      populate: {
        path: 'routers',
        populate: {
          path: 'switches',
          populate: {
            path: 'endDevices'
          }
        }
      }
    });
  }

  // Get Network Data
  router.get("/", async (req, res) => {
    try {
      const network = await Network.findOne()
        .populate({
          path: 'buildings',
          populate: {
            path: 'routers',
            populate: {
              path: 'switches',
              populate: {
                path: 'endDevices'
              }
            }
          }
        });

      if (!network) {
        return res.status(404).json({ error: "Network not found" });
      }

      res.json(network);
      
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/:id", async (req, res) => {
    try {
      const { id } = req.params;
  
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
        return res.status(404).json({ error: "Network not found" });
      }
  
      res.json(network);
    } catch (error) {
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
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};