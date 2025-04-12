import React, { useState, useEffect } from 'react';
import Graph from './components/Graph';
import NodeManagementPortal from './components/NodeManagementPortal';
import axios from 'axios';
import { io } from 'socket.io-client';
import NodeTable from './components/NodeTable';
import { useNavigate } from 'react-router-dom';

const App = () => {
  const [network, setNetwork] = useState(null);
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
      if (response.data) {
        console.log("Network data received:", response.data);
        setNetworkData(response.data);
        setNetwork(response.data);
      }
    } catch (error) {
      console.error('Error fetching network data:', error);
      setError(error.message);
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

  const handleUpdateGraph = (updatedNetwork) => {
    console.log("Updating network data:", updatedNetwork);
    setNetworkData(updatedNetwork);
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
          <Graph network={network} nodeStatuses={nodeStatuses} />
        ) : (
          <p>No network nodes available</p>
        )}
      </div>
      <NodeManagementPortal onUpdateGraph={handleUpdateGraph} />
      <NodeTable 
        nodes={networkData.buildings || []}
        onUpdateNetwork={handleUpdateNetwork}
      />
    </div>
  );
};

export default App;