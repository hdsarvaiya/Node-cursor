import React, { useEffect, useRef, useState } from "react";
import { Network } from "vis-network";
import io from "socket.io-client";
import PropTypes from 'prop-types';

const socket = io("http://localhost:5000");

const Graph = ({ network }) => {
  const containerRef = useRef(null);
  const [nodeStatuses, setNodeStatuses] = useState({});
  const networkInstanceRef = useRef(null);
  const zoomAndPositionRef = useRef({ zoom: 1, x: 0, y: 0 });

  useEffect(() => {
    socket.on("nodeStatus", ({ ip, status }) => {
      setNodeStatuses((prevStatuses) => ({ ...prevStatuses, [ip]: status }));
    });

    return () => {
      socket.off("nodeStatus");
    };
  }, []);

  useEffect(() => {
    if (!network || containerRef.current === null) return;

    const nodes = [];
    const edges = [];
    let uniqueIdCounter = 0;

    const generateUniqueId = (prefix) => `${prefix}-${uniqueIdCounter++}`;

    // Save the current zoom and position before updating the graph
    const currentView = networkInstanceRef.current?.getViewPosition();
    const currentZoom = networkInstanceRef.current?.getScale();

    // Define positions for buildings (corners of a box)
    const boxSize = 600; // Size of the box
    const buildingPositions = [
      { x: -boxSize / 2, y: -boxSize / 2, direction: "right" }, // Top-left
      { x: boxSize / 2, y: -boxSize / 2, direction: "down" },   // Top-right
      { x: -boxSize / 2, y: boxSize / 2, direction: "up" },     // Bottom-left
      { x: boxSize / 2, y: boxSize / 2, direction: "left" },    // Bottom-right
    ];

    // Create root network node at the center of the box
    const rootId = "networkRoot";
    nodes.push({
      id: rootId,
      label: network.name || "Network",
      color: "#2B7CE9",
      size: 60,
      font: { size: 30, color: "#ffffff" },
      x: 0,
      y: 0, // Center position
    });

    // Process buildings
    if (network.buildings && Array.isArray(network.buildings)) {
      network.buildings.forEach((building, index) => {
        const buildingId = generateUniqueId("building");
        const position = buildingPositions[index % buildingPositions.length]; // Assign positions cyclically
        nodes.push({
          id: buildingId,
          label: building.name,
          color: "#4CAF50",
          size: 50,
          font: { size: 25, color: "#ffffff" },
          x: position.x,
          y: position.y,
        });
        edges.push({
          from: rootId,
          to: buildingId,
        });

        // Process routers
        if (building.routers && Array.isArray(building.routers)) {
          building.routers.forEach((router, routerIndex) => {
            const routerId = generateUniqueId("router");
            const routerOffset = 100 * (routerIndex + 1); // Reduced offset for routers
            const routerPosition = calculatePosition(position, routerOffset, position.direction);
            nodes.push({
              id: routerId,
              label: `${router.routerName}\n${router.routerIp || ""}`,
              color: nodeStatuses[router.routerIp] === "active" ? "#00ff00" : "#ff4444", // Green if active, red otherwise
              size: 45,
              font: { size: 20, color: "#ffffff" },
              x: routerPosition.x,
              y: routerPosition.y,
            });
            edges.push({
              from: buildingId,
              to: routerId,
            });

            // Process switches
            if (router.switches && Array.isArray(router.switches)) {
              router.switches.forEach((switch_, switchIndex) => {
                const switchId = generateUniqueId("switch");
                const switchOffset = routerOffset + 50 * (switchIndex + 1); // Offset for switches remains the same
                const switchPosition = calculatePosition(routerPosition, switchOffset, position.direction);
                nodes.push({
                  id: switchId,
                  label: `${switch_.switchName}\n${switch_.switchIp || ""}`,
                  color: nodeStatuses[switch_.switchIp] === "active" ? "#00ff00" : "#ff4444", // Green if active, red otherwise
                  size: 40,
                  font: { size: 18, color: "#ffffff" },
                  x: switchPosition.x,
                  y: switchPosition.y,
                });
                edges.push({
                  from: routerId,
                  to: switchId,
                });

                // Process devices
                if (switch_.endDevices && Array.isArray(switch_.endDevices)) {
                  switch_.endDevices.forEach((device, deviceIndex) => {
                    const deviceId = generateUniqueId("device");
                    const deviceOffset = switchOffset + 150 * (deviceIndex + 1); // Offset for devices remains the same
                    const devicePosition = calculatePosition(switchPosition, deviceOffset, position.direction);
                    nodes.push({
                      id: deviceId,
                      label: `${device.deviceName}\n${device.deviceIp || ""}`,
                      color: nodeStatuses[device.deviceIp] === "active" ? "#00ff00" : "#ff4444", // Green if active, red otherwise
                      size: 35,
                      font: { size: 16, color: "#ffffff" },
                      x: devicePosition.x,
                      y: devicePosition.y,
                    });
                    edges.push({
                      from: switchId,
                      to: deviceId,
                    });
                  });
                }
              });
            }
          });
        }
      });
    }

    const data = { nodes, edges };

    const options = {
      physics: {
        enabled: false, // Disable physics for a static layout
      },
      interaction: {
        dragNodes: false, // Disable dragging
        zoomView: true,
        hover: true,
      },
      nodes: {
        shape: "box",
        borderWidth: 2,
        margin: 10,
        shadow: true,
      },
      edges: {
        arrows: { to: { enabled: true, scaleFactor: 1 } },
        smooth: {
          type: "cubicBezier",
          roundness: 0.2,
        },
        shadow: true,
        width: 2,
      },
    };

    if (!networkInstanceRef.current) {
      networkInstanceRef.current = new Network(containerRef.current, data, options);
    } else {
      networkInstanceRef.current.setData(data);
    }

    // Restore the zoom and position after updating the graph
    if (currentView && currentZoom) {
      networkInstanceRef.current.moveTo({
        position: currentView,
        scale: currentZoom,
      });
    }

    return () => {};
  }, [network, nodeStatuses]);

  // Helper function to calculate positions based on diagonal direction
  const calculatePosition = (basePosition, offset, direction) => {
    const gap = 100; // Horizontal gap to ensure spacing between nodes
    switch (direction) {
      case "right":
        return { x: basePosition.x + offset + gap, y: basePosition.y - offset - gap }; // Diagonal up-right (outward)
      case "down":
        return { x: basePosition.x + offset + gap, y: basePosition.y + offset + gap }; // Diagonal down-right (outward)
      case "left":
        return { x: basePosition.x - offset - gap, y: basePosition.y + offset + gap }; // Diagonal down-left (outward)
      case "up":
        return { x: basePosition.x - offset - gap, y: basePosition.y - offset - gap }; // Diagonal up-left (outward)
      default:
        return basePosition;
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        height: "700px",
        width: "100%",
        border: "1px solid #ddd",
        backgroundColor: "#f4f4f4",
        borderRadius: "8px",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
        padding: "20px",
      }}
    />
  );
};

Graph.propTypes = {
  network: PropTypes.object,
};

export default Graph;