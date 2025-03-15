import React, { useState, useEffect } from 'react';
import Graph from './components/Graph';
import NodeManagementPortal from './components/NodeManagementPortal';
import axios from 'axios';
import { io } from 'socket.io-client';
import NodeTable from './components/NodeTable';
import { useNavigate } from 'react-router-dom';

const App = () => {
  const [networkData, setNetworkData] = useState({
    buildings: [],
    name: '',
    routers: [],
    switches: [],
    devices: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nodeStatuses, setNodeStatuses] = useState({});

  const fetchNetworkData = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/network');
      const data = response.data || { 
        buildings: [], 
        routers: [], 
        switches: [], 
        devices: [],
        name: '' 
      };
      setNetworkData({
        ...data,
        buildings: data.buildings || [],
        routers: data.routers || [],
        switches: data.switches || [],
        devices: data.devices || []
      });
    } catch (err) {
      console.error('Error fetching network data:', err);
      setError(err.message);
      setNetworkData({
        buildings: [],
        name: '',
        routers: [],
        switches: [],
        devices: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNetworkData();

    const socket = io('http://localhost:5000');
    socket.on('nodeStatus', ({ ip, status }) => {
      setNodeStatuses((prevStatuses) => ({
        ...prevStatuses,
        [ip]: status,
      }));
    });

    return () => socket.disconnect();
  }, []);

  const handleUpdateNetwork = () => {
    fetchNetworkData();
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <p>Loading network data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: 'red' }}>
        <p>Error: {error}</p>
        <button onClick={fetchNetworkData}>Retry</button>
      </div>
    );
  }

  const hasNodes = (
    networkData.buildings.length > 0 ||
    networkData.routers.length > 0 ||
    networkData.switches.length > 0 ||
    networkData.devices.length > 0
  );

  return (
    <div style={{ justifyContent: 'space-between', padding: '20px' }}>
      <div style={{ width: '100%' }}>
        {hasNodes ? (
          <Graph network={networkData} nodeStatuses={nodeStatuses} />
        ) : (
          <p>No network nodes available</p>
        )}
      </div>
      <NodeManagementPortal networkData={networkData} />
      <NodeTable 
        nodes={networkData.buildings || []}
        onUpdateNetwork={handleUpdateNetwork}
      />
    </div>
  );
};

export default App;
