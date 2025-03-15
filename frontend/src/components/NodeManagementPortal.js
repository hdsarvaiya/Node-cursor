import React, { useState, useEffect } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const NodeManagementPortal = ({ onUpdateGraph }) => {
  const [actionType, setActionType] = useState("add");
  const [nodeType, setNodeType] = useState("router");
  const [parentNodes, setParentNodes] = useState([]);
  const [selectedParentNodeId, setSelectedParentNodeId] = useState("");
  const [nodeDetails, setNodeDetails] = useState({
    routerName: "",
    routerId: "",
    routerIp: "",
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
    const newSocket = io(); // Replace with your server address
    setSocket(newSocket);

    newSocket.on("graphUpdated", (updatedGraph) => {
      onUpdateGraph(updatedGraph);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [onUpdateGraph]);

  const fetchParentNodes = async (nodeType) => {
    try {
      // First, get the network structure
      const response = await axios.get('http://localhost:5000/api/network');
      const network = response.data;

      let nodes = [];
      switch (nodeType) {
        case 'router':
          // For routers, return all buildings
          nodes = network.buildings.map(building => ({
            id: building._id,
            name: building.name
          }));
          break;
        case 'switch':
          // For switches, get all routers from all buildings
          nodes = network.buildings.flatMap(building => 
            (building.routers || []).map(router => ({
              id: router._id,
              name: router.routerName
            }))
          );
          break;
        case 'device':
          // For devices, get all switches from all routers
          nodes = network.buildings.flatMap(building =>
            (building.routers || []).flatMap(router =>
              (router.switches || []).map(switch_ => ({
                id: switch_._id,
                name: switch_.switchName
              }))
            )
          );
          break;
      }
      setParentNodes(nodes);
      setSelectedParentNodeId(nodes[0]?.id || "");
      return nodes;
    } catch (error) {
      console.error("Error fetching parent nodes:", error);
      setError(error.message);
      return [];
    }
  };

  useEffect(() => {
    fetchParentNodes(nodeType);
  }, [nodeType]);

  const handleAddNode = async () => {
    try {
      setLoading(true);
      const payload = {
        type: nodeType,
        parentNode: selectedParentNodeId,
        details: nodeDetails,
      };
      console.log("Add node payload:", payload);
      const response = await axios.post("/nodes", payload);
      onUpdateGraph(response.data);
      socket.emit("nodeAdded", response.data);
      alert("Node added successfully!");
    } catch (error) {
      alert(`Error adding node: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNode = async () => {
    try {
      setLoading(true);
      const response = await axios.delete(`/nodes/${nodeIdToDelete}`);
      onUpdateGraph(response.data);
      socket.emit("nodeDeleted", response.data);
      alert("Node deleted successfully!");
    } catch (error) {
      alert(`Error deleting node: ${error.message}`);
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
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Action</label>
          <select
            style={styles.select}
            value={actionType}
            onChange={(e) => setActionType(e.target.value)}
          >
            <option value="add">Add Node</option>
            <option value="delete">Delete Node</option>
          </select>
        </div>

        {actionType === "add" && (
          <>
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

            <div style={styles.formGroup}>
              <label style={styles.label}>Parent Node</label>
              <select
                style={styles.select}
                value={selectedParentNodeId}
                onChange={(e) => setSelectedParentNodeId(e.target.value)}
              >
                {parentNodes.length > 0 ? (
                  parentNodes.map((node) => (
                    <option key={node._id} value={node._id}>
                      {node.routerName || node.buildingName || node.switchName}
                    </option>
                  ))
                ) : (
                  <option disabled>No parent nodes available</option>
                )}
              </select>
            </div>

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
                  />
                </div>
              </>
            )}

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
                  />
                </div>
              </>
            )}

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
                  />
                </div>
              </>
            )}

            <div style={styles.formGroup}>
              <label style={styles.label}>Status</label>
              <select
                style={styles.select}
                name="status"
                value={nodeDetails.status}
                onChange={handleDetailChange}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </>
        )}

        {actionType === "delete" && (
          <div style={styles.formGroup}>
            <label style={styles.label}>Node ID to Delete</label>
            <input
              style={styles.input}
              type="text"
              value={nodeIdToDelete}
              onChange={(e) => setNodeIdToDelete(e.target.value)}
              placeholder="Enter Node ID"
            />
          </div>
        )}

        <button type="submit" style={styles.button} disabled={loading}>
          {loading
            ? "Processing..."
            : actionType === "add"
            ? "Add Node"
            : "Delete Node"}
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

export default NodeManagementPortal;
