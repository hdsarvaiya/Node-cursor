// Home.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Routes, Route } from "react-router-dom";
import Graph from "./Graph";
import NodeManagementPortal from "./NodeManagementPortal";
import NodeTable from "./NodeTable";
import { io } from "socket.io-client";

const Home = () => {
  const [network, setNetwork] = useState(null);
  const [nodeStatuses, setNodeStatuses] = useState({}); // Add state for node statuses

  axios.defaults.baseURL = "http://localhost:5000/api/network";

  useEffect(() => {
    // Fetch initial network configuration
    axios.get("/").then((response) => {
      setNetwork(response.data);
    });

    // Setup Socket.IO connection
    const socket = io("http://localhost:5000");

    // Listen for node status updates
    socket.on("nodeStatus", ({ ip, status }) => {
      // Update the node status in state
      setNodeStatuses((prevStatuses) => ({
        ...prevStatuses,
        [ip]: status, // Update the status of the node identified by its IP
      }));
    });

    return () => socket.disconnect(); // Cleanup on component unmount
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ marginTop: "20px" }}>
        <Routes>
          <Route
            path="/"
            element={
              network ? (
                <div style={{ width: "100%" }}>
                  {network ? (
                    <Graph network={network} nodeStatuses={nodeStatuses} />
                  ) : (
                    <p>Loading network...</p>
                  )}
                </div>
              ) : (
                <p>Loading network...</p>
              )
            }
          />
          <Route path="/node-management" element={<NodeManagementPortal />} />
          <Route path="/table" element={<NodeTable />} />
        </Routes>
      </div>
    </div>
  );
};

export default Home;
