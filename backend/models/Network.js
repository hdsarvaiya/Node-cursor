const mongoose = require("mongoose");

// End Device Schema
const endDeviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  deviceName: { type: String, required: true },
  // deviceType: { type: String, required: true },
  deviceIp: { type: String, required: true },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  port: { type: Number, required: true },
  switchId: { type: mongoose.Schema.Types.ObjectId, ref: "Switch", required: true }
}, { timestamps: true });

// Switch Schema
const switchSchema = new mongoose.Schema({
  switchId: { type: String, required: true, unique: true },
  switchName: { type: String, required: true },
  switchIp: { type: String, required: true },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  port: { type: Number, required: true },
  routerId: { type: mongoose.Schema.Types.ObjectId, ref: "Router", required: true },
  endDevices: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EndDevice'
    }],
    default: []
  }
}, { timestamps: true });

// Router Schema
const routerSchema = new mongoose.Schema({
  routerId: { type: String, required: true, unique: true },
  routerName: { type: String, required: true },
  routerIp: { type: String, required: true },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  port: { type: Number, required: true },
  buildingId: { type: mongoose.Schema.Types.ObjectId, ref: "Building", required: true },
  switches: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Switch'
    }],
    default: []
  }
}, { timestamps: true });

// Building Schema
const buildingSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  routers: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Router'
    }],
    default: []
  }
}, { timestamps: true });

// Ensure routers array is initialized
buildingSchema.pre('save', function(next) {
  if (!this.routers) {
    this.routers = [];
  }
  next();
});

// Network Schema (Main Organization)
const networkSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  buildings: [{ type: mongoose.Schema.Types.ObjectId, ref: "Building" }]
}, { timestamps: true });

// Define and Export Models
const EndDevice = mongoose.model("EndDevice", endDeviceSchema, "endDevices");
const Switch = mongoose.model("Switch", switchSchema, "switches");
const Router = mongoose.model("Router", routerSchema, "routers");
const Building = mongoose.model("Building", buildingSchema, "buildings");
const Network = mongoose.model("Network", networkSchema, "network");

module.exports = { EndDevice, Switch, Router, Building, Network };