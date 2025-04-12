const { fetchAndPingNetwork } = require('./tcp'); 

function startMonitoring() {
  console.log("🟢 startMonitoring() called! Initializing network monitoring...");
  
  setInterval(async () => {
    try {
      console.log("🔄 Fetching network status...");
      const statuses = await fetchAndPingNetwork();

      if (!statuses || Object.keys(statuses).length === 0) {
        console.log("⚠️ No statuses received!");
      }

      for (const ip in statuses) {
        if (statuses.hasOwnProperty(ip)) {
          console.log(`📡 Emitting status update for ${ip}: ${statuses[ip]}`);
          global.io.emit("nodeStatus", { ip, status: statuses[ip] });
        }
      }
    } catch (error) {
      console.error("❌ Error in network monitoring:", error.message);
    }
  }, 5000);
}

module.exports = { startMonitoring };