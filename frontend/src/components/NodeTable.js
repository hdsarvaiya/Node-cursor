import React, { useEffect, useState } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import './NodeTable.css'; // Import the CSS file

const NodeTable = ({ nodes = [], onUpdateNetwork = () => {} }) => {
  // Define these functions INSIDE the component
  const handleEdit = async (node) => {
    try {
      console.log('Editing node:', node);
      // Add edit logic here
    } catch (error) {
      console.error('Error editing node:', error);
    }
  };

  const handleDelete = async (node) => {
    try {
      const response = await axios.delete(`http://localhost:5000/api/network/nodes/${node._id}`);
      if (response.status === 200) {
        console.log('Node deleted successfully');
        onUpdateNetwork(); // Refresh the network data
      }
    } catch (error) {
      console.error('Error deleting node:', error);
    }
  };

  // Helper function to determine node type
  const getNodeType = (node) => {
    if (node.routerId) return 'Router';
    if (node.switchId) return 'Switch';
    if (node.deviceId) return 'End Device';
    return 'Building';
  };

  // Add more descriptive empty state
  if (!nodes || nodes.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>No network nodes available</p>
      </div>
    );
  }

  // Handle status toggle for active/inactive for routers, switches, and devices
  const toggleStatus = async (nodeId, currentStatus, nodeType, parentId) => {
    try {
      const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
      // Construct URL based on nodeType
      const url = nodeType === 'router' 
        ? `/api/routers/${nodeId}/status` 
        : nodeType === 'switch' 
        ? `/api/switches/${nodeId}/status`
        : `/api/devices/${nodeId}/status`;

      await axios.put(url, { status: newStatus });

      // Update the state locally to reflect the change
      onUpdateNetwork((prevData) => ({
        ...prevData,
        buildings: prevData.buildings.map((building) =>
          building._id === parentId
            ? {
                ...building,
                routers: building.routers.map((router) =>
                  router._id === nodeId
                    ? { ...router, status: newStatus }
                    : {
                        ...router,
                        switches: router.switches.map((switchItem) =>
                          switchItem._id === nodeId
                            ? { ...switchItem, status: newStatus }
                            : {
                                ...switchItem,
                                endDevices: switchItem.endDevices.map((device) =>
                                  device._id === nodeId
                                    ? { ...device, status: newStatus }
                                    : device
                                ),
                              }
                        ),
                      }
                ),
              }
            : building
        ),
      }));
    } catch (error) {
      console.error('Error updating node status:', error);
    }
  };

  // Recursive function to render network elements
  const renderNetworkElements = (node, nodeType, parentId) => {
    if (nodeType === 'router') {
      return (
        <tr key={node._id}>
          <td>{node.routerId}</td>
          <td>{node.routerName}</td>
          <td>{node.routerIp}</td>
          <td>{node.status}</td>
          <td>
            <button onClick={() => toggleStatus(node._id, node.status, nodeType, parentId)}>
              Toggle Status
            </button>
          </td>
        </tr>
      );
    }

    if (nodeType === 'switch') {
      return (
        <tr key={node._id}>
          <td>{node.switchId}</td>
          <td>{node.switchName}</td>
          <td>{node.switchIp}</td>
          <td>{node.status}</td>
          <td>
            <button onClick={() => toggleStatus(node._id, node.status, nodeType, parentId)}>
              Toggle Status
            </button>
          </td>
        </tr>
      );
    }

    if (nodeType === 'device') {
      return (
        <tr key={node._id}>
          <td>{node.deviceId}</td>
          <td>{node.deviceName}</td>
          <td>{node.deviceIp}</td>
          <td>{node.status}</td>
          <td>
            <button onClick={() => toggleStatus(node._id, node.status, nodeType, parentId)}>
              Toggle Status
            </button>
          </td>
        </tr>
      );
    }

    return null;
  };

  return (
    <div style={{ padding: '20px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ padding: '10px', borderBottom: '2px solid #ddd' }}>Name</th>
            <th style={{ padding: '10px', borderBottom: '2px solid #ddd' }}>Type</th>
            <th style={{ padding: '10px', borderBottom: '2px solid #ddd' }}>Status</th>
            <th style={{ padding: '10px', borderBottom: '2px solid #ddd' }}>IP Address</th>
            <th style={{ padding: '10px', borderBottom: '2px solid #ddd' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {nodes.map((node) => (
            <tr key={node._id}>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
                {node.name || node.routerName || node.switchName || node.deviceName}
              </td>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
                {getNodeType(node)}
              </td>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
                {node.status || 'N/A'}
              </td>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
                {node.routerIp || node.switchIp || node.deviceIp || 'N/A'}
              </td>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
                <button 
                  onClick={() => handleEdit(node)}
                  style={{ marginRight: '5px', padding: '5px 10px' }}
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(node)}
                  style={{ padding: '5px 10px' }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

NodeTable.propTypes = {
  nodes: PropTypes.array,
  onUpdateNetwork: PropTypes.func
};

NodeTable.defaultProps = {
  nodes: [],
  onUpdateNetwork: () => {}
};

export default NodeTable;
