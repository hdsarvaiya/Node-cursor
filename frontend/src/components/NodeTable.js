import React, { useEffect, useState } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import './NodeTable.css';

const NodeTable = () => {
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
                ip: router.routerIp || 'N/A',
              });

              if (router.switches) {
                router.switches.forEach((switchNode) => {
                  flattenedNodes.push({
                    _id: switchNode._id,
                    name: switchNode.switchName,
                    status: switchNode.status || 'N/A',
                    type: 'Switch',
                    ip: switchNode.switchIp || 'N/A',
                  });

                  if (switchNode.endDevices) {
                    switchNode.endDevices.forEach((device) => {
                      flattenedNodes.push({
                        _id: device._id,
                        name: device.deviceName,
                        status: device.status || 'N/A',
                        type: 'Device',
                        ip: device.deviceIp || 'N/A',
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

  if (!nodes || nodes.length === 0) {
    return (
      <div className="node-table-container">
        <h3>No network nodes available</h3>
      </div>
    );
  }

  return (
    <div className="node-table-container">
      <h3>Network Nodes</h3>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Status</th>
            <th>IP Address</th>
          </tr>
        </thead>
        <tbody>
          {nodes.map((node) => (
            <tr key={node._id}>
              <td>{node.name}</td>
              <td>{node.type}</td>
              <td>{node.status}</td>
              <td>{node.ip || 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

NodeTable.propTypes = {
  nodes: PropTypes.array,
};

export default NodeTable;