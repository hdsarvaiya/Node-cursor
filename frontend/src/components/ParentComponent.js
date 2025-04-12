import React, { useEffect, useState } from 'react';
import axios from 'axios';
import NodeTable from './NodeTable';

const NetworkManager = () => {
  const [nodes, setNodes] = useState([]);

  // Fetch network data from the backend
  const fetchNetworkData = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/network');
      const networkData = response.data;

      // Flatten the network data into a single array of nodes
      const flattenedNodes = [];
      if (networkData.buildings) {
        networkData.buildings.forEach((building) => {
          flattenedNodes.push({
            _id: building._id,
            name: building.name,
            status: building.status || 'N/A',
            type: 'Building',
          });

          if (building.routers) {
            building.routers.forEach((router) => {
              flattenedNodes.push({
                _id: router._id,
                name: router.routerName,
                status: router.status || 'N/A',
                type: 'Router',
                routerIp: router.routerIp,
              });

              if (router.switches) {
                router.switches.forEach((switchNode) => {
                  flattenedNodes.push({
                    _id: switchNode._id,
                    name: switchNode.switchName,
                    status: switchNode.status || 'N/A',
                    type: 'Switch',
                    switchIp: switchNode.switchIp,
                  });

                  if (switchNode.endDevices) {
                    switchNode.endDevices.forEach((device) => {
                      flattenedNodes.push({
                        _id: device._id,
                        name: device.deviceName,
                        status: device.status || 'N/A',
                        type: 'Device',
                        deviceIp: device.deviceIp,
                      });
                    });
                  }
                });
              }
            });
          }
        });
      }

      setNodes(flattenedNodes);
    } catch (error) {
      console.error('Error fetching network data:', error);
    }
  };

  useEffect(() => {
    fetchNetworkData();
  }, []);

  return (
    <div>
      <h1>Network Manager</h1>
      <NodeTable nodes={nodes} onUpdateNetwork={fetchNetworkData} />
    </div>
  );
};

export default NetworkManager;