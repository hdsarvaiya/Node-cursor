import React, { useEffect, useRef, useState } from "react";
import { Network } from "vis-network/standalone";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

const Graph = ({ networkId }) => {
  const containerRef = useRef(null);
  const [network, setNetwork] = useState(null);
  const [nodeStatuses, setNodeStatuses] = useState({});
  const networkInstanceRef = useRef(null);
  const zoomAndPositionRef = useRef({ zoom: 1, x: 0, y: 0 });

  useEffect(() => {
    // Fetch network data from the server
    const fetchNetworkData = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/networks`);
        const data = await response.json();
        setNetwork(data);
      } catch (error) {
        console.error('Error fetching network data:', error);
      }
    };

    fetchNetworkData();

    socket.on("nodeStatus", ({ ip, status }) => {
      setNodeStatuses((prevStatuses) => ({ ...prevStatuses, [ip]: status }));
    });

    return () => {
      socket.off("nodeStatus");
    };
  }, [networkId]);

  useEffect(() => {
    if (!network || containerRef.current === null) return;

    const nodes = [];
    const edges = [];
    let uniqueIdCounter = 0;

    const generateUniqueId = (prefix) => `${prefix}-${uniqueIdCounter++}`;

    const traverseNetwork = (node, parentId = null, type = null) => {
      if (!node || typeof node !== "object") return;

      const id = generateUniqueId(type || "node");
      const label = node.name || node.routerName || node.switchName || node.deviceName || "Unknown Node";
      const ip = node.routerIp || node.switchIp || node.deviceIp;
      const status = nodeStatuses[ip] || "inactive";

      nodes.push({
        id,
        label: `${label}\n${ip || ""}`,
        color: status === "active" ? "green" : "red",
        size: type === "router" ? 50 : type === "switch" ? 40 : 30,
        font: { size: 22, color: "#ffffff" },
      });

      if (parentId) {
        edges.push({
          from: parentId,
          to: id,
          color: { color: status === "active" ? "green" : "red" },
        });
      }

      if (node.switches) {
        node.switches.forEach((sw) => traverseNetwork(sw, id, "switch"));
      }

      if (node.devices) {
        node.devices.forEach((device) => traverseNetwork(device, id, "device"));
      }
    };

    const rootId = "networkRoot";
    nodes.push({
      id: rootId,
      label: network.networkName || "L&T Network",
      color: "blue",
      size: 60,
      font: { size: 40, color: "#ffffff" },
    });

    if (network.routers) {
      network.routers.forEach((router) => {
        traverseNetwork(router, rootId, "router");
      });
    }

    const data = { nodes, edges };

    const options = {
      layout: {
        hierarchical: {
          direction: "UD",
          nodeSpacing: 500,
          levelSeparation: 300,
        },
      },
      physics: {
        enabled: false,
        stabilization: false,
      },
      interaction: {
        dragNodes: true,
        zoomView: true,
        hover: true,
      },
      nodes: {
        shape: "box",
        font: { size: 12 },
        borderWidth: 2,
        margin: 15,
      },
      edges: {
        arrows: { to: { enabled: true, scaleFactor: 1.2 } },
        smooth: {
          type: "cubicBezier",
          roundness: 0.2,
        },
      },
    };

    if (!networkInstanceRef.current) {
      networkInstanceRef.current = new Network(containerRef.current, data, options);

      networkInstanceRef.current.on("zoom", (event) => {
        zoomAndPositionRef.current.zoom = event.scale;
      });

      networkInstanceRef.current.on("dragEnd", (event) => {
        zoomAndPositionRef.current.x = event.pointer.canvas.x;
        zoomAndPositionRef.current.y = event.pointer.canvas.y;
      });
    } else {
      const currentZoom = networkInstanceRef.current.getScale();
      const currentPosition = networkInstanceRef.current.getViewPosition();

      zoomAndPositionRef.current.zoom = currentZoom;
      zoomAndPositionRef.current.x = currentPosition.x;
      zoomAndPositionRef.current.y = currentPosition.y;

      networkInstanceRef.current.setData(data);

      networkInstanceRef.current.moveTo({
        scale: zoomAndPositionRef.current.zoom,
        position: { x: zoomAndPositionRef.current.x, y: zoomAndPositionRef.current.y },
      });
    }

    return () => {};
  }, [network, nodeStatuses]);

  return (
    <div
      ref={containerRef}
      style={{
        height: "700px",
        border: "1px solid #ddd",
        backgroundColor: "#f4f4f4",
        borderRadius: "8px",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
        padding: "20px",
      }}
    />
  );
};

export default Graph;
