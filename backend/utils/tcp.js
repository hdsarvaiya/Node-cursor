const { Network, Building, Router, Switch, EndDevice } = require('../models/Network');
const ping = require('ping');
const mongoose = require('mongoose');

async function fetchAndPingNetwork() {
  try {
    console.log("🌐 Fetching network from MongoDB...");

    // 1️⃣ Fetch the Network (Parent Node)
    const network = await Network.findOne();
    if (!network) throw new Error('No network data found in MongoDB');

    console.log("✅ Network data fetched:", network);

    const statuses = {};

    // 🛠 Debugging: Check the type of building IDs
    console.log("🧐 Network.buildings (Raw):", network.buildings);
    
    if (!network.buildings || network.buildings.length === 0) {
      console.warn("⚠️ No buildings associated with this network!");
      return statuses;
    }

    // 2️⃣ Ensure Building IDs are of correct type
    const buildingIds = network.buildings.map(id =>
      mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id
    );
    
    console.log("🔍 Final Building IDs for Query:", buildingIds);
    
    const buildings = await Building.find({ _id: { $in: buildingIds } });
    
    
    if (!buildings.length) {
      console.warn("⚠️ No buildings found! Check if the queried IDs exist in the database.");
      return statuses;
    }
    
    console.log("🏢 Found buildings:", buildings.map(b => b.name));
    

    // 4️⃣ Fetch all Routers inside the Buildings
    const routerIds = buildings.flatMap(b => b.routers); // Extract router IDs from buildings
    console.log("🧐 Router IDs:", routerIds);

    const routers = await Router.find({ _id: { $in: routerIds } });

    if (!routers.length) {
      console.warn("⚠️ No routers found for this network!");
      return statuses;
    }

    console.log("🛠 Found routers:", routers.map(r => r.routerName));

    // 5️⃣ Ping Routers
    for (const router of routers) {
      try {
        const routerPing = await ping.promise.probe(router.routerIp);
        statuses[router.routerIp] = routerPing.alive ? 'active' : 'inactive';
        global.io.emit('nodeStatus', { ip: router.routerIp, status: statuses[router.routerIp] });
        console.log(`🔹 Pinging router ${router.routerIp} - ${statuses[router.routerIp]}`);
      } catch (err) {
        console.error(`❌ Error pinging router ${router.routerIp}:`, err.message);
      }

      // 6️⃣ Fetch all Switches inside each Router
      const switchIds = router.switches || [];
      const switches = await Switch.find({ _id: { $in: switchIds } });

      for (const sw of switches) {
        try {
          const switchPing = await ping.promise.probe(sw.ip);
          statuses[sw.ip] = switchPing.alive ? 'active' : 'inactive';
          global.io.emit('nodeStatus', { ip: sw.ip, status: statuses[sw.ip] });
          console.log(`🔸 Pinging switch ${sw.ip} - ${statuses[sw.ip]}`);
        } catch (err) {
          console.error(`❌ Error pinging switch ${sw.ip}:`, err.message);
        }

        // 7️⃣ Fetch End Devices from each Switch
        const deviceIds = sw.endDevices || [];
        const devices = await EndDevice.find({ _id: { $in: deviceIds } });

        for (const device of devices) {
          try {
            const devicePing = await ping.promise.probe(device.ip);
            statuses[device.ip] = devicePing.alive ? 'active' : 'inactive';
            global.io.emit('nodeStatus', { ip: device.ip, status: statuses[device.ip] });
            console.log(`🖥️ Pinging device ${device.ip} - ${statuses[device.ip]}`);
          } catch (err) {
            console.error(`❌ Error pinging device ${device.ip}:`, err.message);
          }
        }
      }
    }

    return statuses;
  } catch (error) {
    console.error('❌ Error pinging network:', error.message);
    throw error;
  }
}

module.exports = { fetchAndPingNetwork };
