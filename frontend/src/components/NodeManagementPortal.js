import React, { useState, useEffect } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import PropTypes from 'prop-types';

const NodeManagementPortal = ({ onUpdateGraph }) => {
  const [actionType, setActionType] = useState("add");
  const [nodeType, setNodeType] = useState("router");
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [selectedRouter, setSelectedRouter] = useState("");
  const [selectedSwitch, setSelectedSwitch] = useState("");
  const [buildings, setBuildings] = useState([]);
  const [routers, setRouters] = useState([]);
  const [switches, setSwitches] = useState([]);
  const [nodeDetails, setNodeDetails] = useState({
    routerName: "",
    routerId: "",
    routerIp: "",
    port: "",
    switchName: "",
    switchId: "",
    switchIp: "",
    deviceName: "",
    deviceId: "",
    deviceIp: "",
    status: "active",
  });
  const [nodeIdToDelete, setNodeIdToDelete] = useState("");
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const newSocket = io("http://localhost:5000"); // Specify the correct server URL
    setSocket(newSocket);

    newSocket.on("graphUpdated", (updatedGraph) => {
      onUpdateGraph(updatedGraph);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [onUpdateGraph]);

  // Fetch initial network data
  useEffect(() => {
    const fetchNetworkData = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/network');
        const network = response.data;
        setBuildings(network.buildings || []);
      } catch (error) {
        console.error("Error fetching network data:", error);
        alert("Error fetching network data");
      }
    };
    fetchNetworkData();
  }, []);

  // Update available routers when building is selected
  useEffect(() => {
    if (selectedBuilding) {
      const building = buildings.find(b => b._id === selectedBuilding);
      setRouters(building?.routers || []);
      setSelectedRouter("");
      setSelectedSwitch("");
    } else {
      setRouters([]);
    }
  }, [selectedBuilding, buildings]);

  // Update available switches when router is selected
  useEffect(() => {
    if (selectedRouter) {
      const router = routers.find(r => r._id === selectedRouter);
      setSwitches(router?.switches || []);
      setSelectedSwitch("");
    } else {
      setSwitches([]);
    }
  }, [selectedRouter, routers]);

  const handleAddNode = async () => {
    try {
      setLoading(true);
      let parentId;
      
      switch (nodeType) {
        case "router":
          parentId = selectedBuilding;
          break;
        case "switch":
          parentId = selectedRouter;
          break;
        case "device":
          parentId = selectedSwitch;
          break;
        default:
          throw new Error("Invalid node type");
      }

      if (!parentId) {
        throw new Error("Please select a parent node");
      }

      const payload = {
        type: nodeType,
        parentId,
        details: nodeDetails
      };

      const response = await axios.post("http://localhost:5000/api/network/nodes", payload);
      onUpdateGraph(response.data);
      alert("Node added successfully!");
      
      // Reset form
      setNodeDetails({
        routerName: "",
        routerId: "",
        routerIp: "",
        port: "",
        switchName: "",
        switchId: "",
        switchIp: "",
        deviceName: "",
        deviceId: "",
        deviceIp: "",
        status: "active"
      });
    } catch (error) {
      alert(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNode = async () => {
    try {
      setLoading(true);
      const response = await axios.delete(`http://localhost:5000/api/network/nodes/${nodeIdToDelete}`);
      onUpdateGraph(response.data);
      setNodeIdToDelete('');
      alert("Node deleted successfully!");
    } catch (error) {
      alert(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    actionType === "add" ? handleAddNode() : handleDeleteNode();
  };

  const handleDetailChange = (e) => {
    const { name, value } = e.target;
    setNodeDetails((prevDetails) => ({
      ...prevDetails,
      [name]: value,
    }));
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>Node Management Portal</h2>
      <form onSubmit={(e) => { e.preventDefault(); handleAddNode(); }} style={styles.form}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Node Type</label>
          <select
            style={styles.select}
            value={nodeType}
            onChange={(e) => setNodeType(e.target.value)}
          >
            <option value="router">Router</option>
            <option value="switch">Switch</option>
            <option value="device">Device</option>
          </select>
        </div>

        {/* Building Selection */}
        <div style={styles.formGroup}>
          <label style={styles.label}>Building</label>
          <select
            style={styles.select}
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            required
          >
            <option value="">Select Building</option>
            {buildings.map(building => (
              <option key={building._id} value={building._id}>
                {building.name}
              </option>
            ))}
          </select>
        </div>

        {/* Router Selection - Show only for switch and device */}
        {(nodeType === "switch" || nodeType === "device") && (
          <div style={styles.formGroup}>
            <label style={styles.label}>Router</label>
            <select
              style={styles.select}
              value={selectedRouter}
              onChange={(e) => setSelectedRouter(e.target.value)}
              required
            >
              <option value="">Select Router</option>
              {routers.map(router => (
                <option key={router._id} value={router._id}>
                  {router.routerName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Switch Selection - Show only for device */}
        {nodeType === "device" && (
          <div style={styles.formGroup}>
            <label style={styles.label}>Switch</label>
            <select
              style={styles.select}
              value={selectedSwitch}
              onChange={(e) => setSelectedSwitch(e.target.value)}
              required
            >
              <option value="">Select Switch</option>
              {switches.map(switch_ => (
                <option key={switch_._id} value={switch_._id}>
                  {switch_.switchName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Router Details Form */}
        {nodeType === "router" && (
          <>
            <div style={styles.formGroup}>
              <label style={styles.label}>Router Name</label>
              <input
                style={styles.input}
                type="text"
                name="routerName"
                value={nodeDetails.routerName}
                onChange={handleDetailChange}
                required
                placeholder="Enter router name"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Router ID</label>
              <input
                style={styles.input}
                type="text"
                name="routerId"
                value={nodeDetails.routerId}
                onChange={handleDetailChange}
                required
                placeholder="Enter router ID"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Router IP</label>
              <input
                style={styles.input}
                type="text"
                name="routerIp"
                value={nodeDetails.routerIp}
                onChange={handleDetailChange}
                required
                placeholder="Enter router IP (e.g., 192.168.1.1)"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Port</label>
              <input
                style={styles.input}
                type="number"
                name="port"
                value={nodeDetails.port}
                onChange={handleDetailChange}
                required
                placeholder="Enter port number (e.g., 8080)"
                min="1"
                max="65535"
              />
            </div>
          </>
        )}

        {/* Switch Details Form */}
        {nodeType === "switch" && (
          <>
            <div style={styles.formGroup}>
              <label style={styles.label}>Switch Name</label>
              <input
                style={styles.input}
                type="text"
                name="switchName"
                value={nodeDetails.switchName}
                onChange={handleDetailChange}
                required
                placeholder="Enter switch name"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Switch ID</label>
              <input
                style={styles.input}
                type="text"
                name="switchId"
                value={nodeDetails.switchId}
                onChange={handleDetailChange}
                required
                placeholder="Enter switch ID"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Switch IP</label>
              <input
                style={styles.input}
                type="text"
                name="switchIp"
                value={nodeDetails.switchIp}
                onChange={handleDetailChange}
                required
                placeholder="Enter switch IP (e.g., 192.168.1.2)"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Port</label>
              <input
                style={styles.input}
                type="number"
                name="port"
                value={nodeDetails.port}
                onChange={handleDetailChange}
                required
                placeholder="Enter port number (e.g., 8081)"
                min="1"
                max="65535"
              />
            </div>
          </>
        )}

        {/* Device Details Form */}
        {nodeType === "device" && (
          <>
            <div style={styles.formGroup}>
              <label style={styles.label}>Device Name</label>
              <input
                style={styles.input}
                type="text"
                name="deviceName"
                value={nodeDetails.deviceName}
                onChange={handleDetailChange}
                required
                placeholder="Enter device name"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Device ID</label>
              <input
                style={styles.input}
                type="text"
                name="deviceId"
                value={nodeDetails.deviceId}
                onChange={handleDetailChange}
                required
                placeholder="Enter device ID"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Device IP</label>
              <input
                style={styles.input}
                type="text"
                name="deviceIp"
                value={nodeDetails.deviceIp}
                onChange={handleDetailChange}
                required
                placeholder="Enter device IP (e.g., 192.168.1.10)"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Port</label>
              <input
                style={styles.input}
                type="number"
                name="port"
                value={nodeDetails.port}
                onChange={handleDetailChange}
                required
                placeholder="Enter port number (e.g., 8082)"
                min="1"
                max="65535"
              />
            </div>
          </>
        )}

        <button 
          type="submit" 
          style={styles.button}
          disabled={loading}
        >
          {loading ? "Adding..." : "Add Node"}
        </button>
      </form>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "500px",
    margin: "20px auto",
    padding: "20px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
    backgroundColor: "#f9f9f9",
  },
  header: {
    textAlign: "center",
    color: "#333",
    marginBottom: "20px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
  },
  label: {
    marginBottom: "5px",
    fontSize: "14px",
    fontWeight: "bold",
  },
  input: {
    padding: "8px",
    fontSize: "14px",
    border: "1px solid #ccc",
    borderRadius: "4px",
  },
  select: {
    padding: "8px",
    fontSize: "14px",
    border: "1px solid #ccc",
    borderRadius: "4px",
  },
  button: {
    padding: "10px 20px",
    backgroundColor: "#4CAF50",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
};

NodeManagementPortal.propTypes = {
  onUpdateGraph: PropTypes.func.isRequired,
};

export default NodeManagementPortal;