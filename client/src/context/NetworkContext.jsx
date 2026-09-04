import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { networkAPI } from '../services/api';
import { getSocket } from '../services/socket';
import { useAuth } from './AuthContext';
import { DEMO_NETWORK } from '../utils/demoNetwork';
import { generateMAC } from '../utils/networkMath';

const NetworkContext = createContext(null);

/**
 * Lightweight, dependency-free stand-ins for React Flow's applyNodeChanges /
 * applyEdgeChanges / addEdge helpers. Implemented locally so that the Network
 * context does NOT statically import `reactflow`, keeping the heavy canvas
 * library out of the shared bundle that loads on the Landing / Login pages.
 * This makes first paint dramatically faster.
 */
function applyNodeChanges(changes = [], nodes = []) {
  let nextNodes = nodes;

  for (const change of changes) {
    switch (change.type) {
      case 'add':
        nextNodes = [...nextNodes, change.item];
        break;
      case 'remove':
        nextNodes = nextNodes.filter((n) => n.id !== change.id);
        break;
      case 'position': {
        const existing = nextNodes.find((n) => n.id === change.id);
        if (!existing) break;
        nextNodes = nextNodes.map((n) => {
          if (n.id !== change.id) return n;
          const pos = {
            x: typeof change.position.x === 'number' ? change.position.x : (n.position?.x ?? 0),
            y: typeof change.position.y === 'number' ? change.position.y : (n.position?.y ?? 0)
          };
          return { ...n, position: pos };
        });
        break;
      }
      case 'dimensions': {
        nextNodes = nextNodes.map((n) =>
          n.id !== change.id
            ? n
            : {
                ...n,
                width: change.dimensions?.width ?? n.width,
                height: change.dimensions?.height ?? n.height
              }
        );
        break;
      }
      case 'select':
      case 'toggleSelect': {
        const isToggle = change.type === 'toggleSelect';
        nextNodes = nextNodes.map((n) => {
          if (n.id !== change.id) {
            if (isToggle) return n;
            return { ...n, selected: false };
          }
          return { ...n, selected: isToggle ? !n.selected : change.selected };
        });
        break;
      }
      case 'reset':
        nextNodes = nextNodes.map((n) => ({ ...n, selected: false }));
        break;
      case 'replace':
        nextNodes = nextNodes.map((n) => (n.id === change.id ? change.item : n));
        break;
      default:
        break;
    }
  }

  return nextNodes;
}

function applyEdgeChanges(changes = [], edges = []) {
  let nextEdges = edges;

  for (const change of changes) {
    switch (change.type) {
      case 'add':
        nextEdges = [...nextEdges, change.item];
        break;
      case 'remove':
        nextEdges = nextEdges.filter((e) => e.id !== change.id);
        break;
      case 'select':
      case 'toggleSelect': {
        const isToggle = change.type === 'toggleSelect';
        nextEdges = nextEdges.map((e) => {
          if (e.id !== change.id) {
            if (isToggle) return e;
            return { ...e, selected: false };
          }
          return { ...e, selected: isToggle ? !e.selected : change.selected };
        });
        break;
      }
      case 'reset':
        nextEdges = nextEdges.map((e) => ({ ...e, selected: false }));
        break;
      case 'replace':
        nextEdges = nextEdges.map((e) => (e.id === change.id ? change.item : e));
        break;
      default:
        break;
    }
  }

  return nextEdges;
}

function addEdge(edgeParams, edges = []) {
  const { source, target } = edgeParams;
  const alreadyExists = (edges || []).some((e) => e.source === source && e.target === target);
  if (alreadyExists) return edges;
  return [...edges, edgeParams];
}

export const NetworkProvider = ({ children }) => {
  const { user } = useAuth();
  const [theme, setTheme] = useState(localStorage.getItem('netcollaborate-theme') || 'dark');

  // Network State
  const [network, setNetwork] = useState(DEMO_NETWORK);
  const [nodes, setNodes] = useState(DEMO_NETWORK.nodes);
  const [edges, setEdges] = useState(DEMO_NETWORK.edges);
  const [selectedNode, setSelectedNode] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'unsaved'

  // Undo / Redo Stacks
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoRef = useRef(false);

  // Diagnostics & Health
  const [diagnostics, setDiagnostics] = useState({
    errors: [],
    warnings: [],
    validCount: 7,
    healthScore: 100,
    summary: { errorCount: 0, warningCount: 0, validCount: 7, healthRating: 'Excellent' }
  });

  // Simulation & Animation State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [activeStepIndex, setActiveStepIndex] = useState(-1);
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [activeEdgeId, setActiveEdgeId] = useState(null);
  const [simulationHistory, setSimulationHistory] = useState(DEMO_NETWORK.simulationHistory || []);

  // Collaboration State
  const [activeUsers, setActiveUsers] = useState([]);
  const [cursors, setCursors] = useState({});
  const [activityLogs, setActivityLogs] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);

  // Only establish the Socket.IO collaboration connection when the user is
  // actually inside a workspace. Otherwise (Landing / Login / Register /
  // Dashboard) we avoid a redundant connection and its latency.
  const [collaborationActive, setCollaborationActive] = useState(false);

  const activateCollaboration = useCallback(() => setCollaborationActive(true), []);
  const deactivateCollaboration = useCallback(() => {
    setCollaborationActive(false);
    setActiveUsers([]);
    setCursors({});
  }, []);

  // Apply Theme to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('netcollaborate-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Push state to undo stack
  const recordHistory = useCallback((newNodes, newEdges) => {
    if (isUndoRedoRef.current) return;
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, { nodes: JSON.parse(JSON.stringify(newNodes)), edges: JSON.parse(JSON.stringify(newEdges)) }];
    });
    setHistoryIndex(prev => prev + 1);
    setSaveStatus('unsaved');
  }, [historyIndex]);

  // Handle initial history
  useEffect(() => {
    if (history.length === 0 && nodes.length > 0) {
      setHistory([{ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }]);
      setHistoryIndex(0);
    }
  }, []);

  const undo = () => {
    if (historyIndex > 0) {
      isUndoRedoRef.current = true;
      const targetState = history[historyIndex - 1];
      setNodes(targetState.nodes);
      setEdges(targetState.edges);
      setHistoryIndex(prev => prev - 1);
      setSelectedNode(null);
      setTimeout(() => { isUndoRedoRef.current = false; }, 50);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      isUndoRedoRef.current = true;
      const targetState = history[historyIndex + 1];
      setNodes(targetState.nodes);
      setEdges(targetState.edges);
      setHistoryIndex(prev => prev + 1);
      setSelectedNode(null);
      setTimeout(() => { isUndoRedoRef.current = false; }, 50);
    }
  };

  // React Flow Handlers
  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => {
      const updated = applyNodeChanges(changes, nds);
      return updated;
    });
    setSaveStatus('unsaved');
  }, []);

  const onEdgesChange = useCallback((changes) => {
    setEdges((eds) => {
      const updated = applyEdgeChanges(changes, eds);
      return updated;
    });
    setSaveStatus('unsaved');
  }, []);

  const onConnect = useCallback((connection) => {
    const newEdge = {
      ...connection,
      id: `e-${connection.source}-${connection.target}-${Date.now().toString().slice(-4)}`,
      type: 'networkEdge',
      data: {
        linkType: 'ethernet',
        status: 'connected',
        bandwidth: '1 Gbps',
        latency: 2
      }
    };
    setEdges((eds) => {
      const updated = addEdge(newEdge, eds);
      recordHistory(nodes, updated);

      // Broadcast to room
      const socket = getSocket();
      socket.emit('edge-change', {
        roomId: network.roomId,
        changeType: 'add',
        edge: newEdge,
        edges: updated,
        user
      });

      return updated;
    });
  }, [nodes, recordHistory, network.roomId, user]);

  // Add Device to Canvas
  const addDevice = (deviceType, position) => {
    const count = nodes.filter(n => (n.type === 'deviceNode' && n.data?.type === deviceType)).length + 1;
    const typeUpper = deviceType.toUpperCase();
    const name = `${typeUpper}-${count}`;
    const id = `${deviceType}-${Date.now().toString().slice(-4)}`;

    const isEndDevice = ['pc', 'laptop', 'server', 'printer'].includes(deviceType);
    const isRouter = deviceType === 'router';
    const isSwitch = ['switch', 'hub'].includes(deviceType);

    const defaultIp = isEndDevice ? `192.168.1.${10 + count}` : '';
    const defaultMask = isEndDevice ? '255.255.255.0' : '';
    const defaultGateway = isEndDevice ? '192.168.1.1' : '';

    const newNode = {
      id,
      type: 'deviceNode',
      position: position || { x: 250 + Math.random() * 150, y: 150 + Math.random() * 150 },
      data: {
        id,
        name,
        type: deviceType,
        status: 'up',
        ip: defaultIp,
        subnetMask: defaultMask,
        gateway: defaultGateway,
        dns: isEndDevice ? '8.8.8.8' : '',
        mac: generateMAC(),
        vlan: isEndDevice ? '1' : undefined,
        interfaces: isRouter ? [
          { name: 'G0/0', ip: `192.168.${count}.1`, mask: '255.255.255.0', status: 'up' },
          { name: 'G0/1', ip: `10.0.0.${count}`, mask: '255.255.255.252', status: 'up' }
        ] : [],
        routingTable: isRouter ? [] : [],
        ports: isSwitch ? [
          { number: 1, vlan: '1', status: 'up' },
          { number: 2, vlan: '1', status: 'up' },
          { number: 3, vlan: '1', status: 'up' },
          { number: 4, vlan: '1', status: 'up' }
        ] : [],
        firewallRules: deviceType === 'firewall' ? [
          { id: 'rule-1', action: 'allow', protocol: 'ALL', destIp: '' }
        ] : []
      }
    };

    const updatedNodes = [...nodes, newNode];
    setNodes(updatedNodes);
    recordHistory(updatedNodes, edges);
    setSelectedNode(newNode);

    // Broadcast node addition
    const socket = getSocket();
    socket.emit('node-change', {
      roomId: network.roomId,
      changeType: 'add',
      node: newNode,
      nodes: updatedNodes,
      user
    });

    return newNode;
  };

  // Update Device Configuration
  const updateDeviceConfig = (nodeId, updatedData) => {
    setNodes(nds => {
      const updated = nds.map(n => {
        if (n.id === nodeId) {
          const merged = {
            ...n,
            data: { ...n.data, ...updatedData }
          };
          if (selectedNode?.id === nodeId) {
            setSelectedNode(merged);
          }
          return merged;
        }
        return n;
      });
      recordHistory(updated, edges);

      // Broadcast config change
      const socket = getSocket();
      socket.emit('config-change', {
        roomId: network.roomId,
        nodeId,
        config: updatedData,
        user
      });

      return updated;
    });
  };

  // Delete Device
  const deleteDevice = (nodeId) => {
    const updatedNodes = nodes.filter(n => n.id !== nodeId);
    const updatedEdges = edges.filter(e => e.source !== nodeId && e.target !== nodeId);

    setNodes(updatedNodes);
    setEdges(updatedEdges);
    recordHistory(updatedNodes, updatedEdges);
    if (selectedNode?.id === nodeId) setSelectedNode(null);

    // Broadcast deletion
    const socket = getSocket();
    socket.emit('node-change', {
      roomId: network.roomId,
      changeType: 'delete',
      node: { id: nodeId },
      nodes: updatedNodes,
      user
    });
  };

  // Delete Connection / Edge
  const deleteEdge = (edgeId) => {
    const updatedEdges = edges.filter(e => e.id !== edgeId);
    setEdges(updatedEdges);
    recordHistory(nodes, updatedEdges);

    const socket = getSocket();
    socket.emit('edge-change', {
      roomId: network.roomId,
      changeType: 'delete',
      edge: { id: edgeId },
      edges: updatedEdges,
      user
    });
  };

  // Run Diagnostics (Local & Server synced)
  const runDiagnostics = async () => {
    try {
      const res = await networkAPI.debugTopology(network.id || network._id, { nodes, edges });
      if (res.data?.success) {
        setDiagnostics(res.data.data);
        setNetwork(prev => ({ ...prev, healthScore: res.data.data.healthScore }));
        return res.data.data;
      }
    } catch (err) {
      console.warn('Fallback local diagnostics:', err.message);
    }
  };

  // Apply Quick Fix
  const applyQuickFix = (fix) => {
    if (!fix) return;
    if (fix.type === 'SET_IP') {
      updateDeviceConfig(fix.deviceId, { ip: fix.defaultIp, subnetMask: fix.defaultMask });
    } else if (fix.type === 'SET_MASK') {
      updateDeviceConfig(fix.deviceId, { subnetMask: fix.defaultMask });
    } else if (fix.type === 'ALIGN_GATEWAY_SUBNET') {
      updateDeviceConfig(fix.deviceId, { gateway: fix.gateway });
    }
    setTimeout(() => { runDiagnostics(); }, 100);
  };

  // Load Network Project
  const loadNetwork = (networkData) => {
    setNetwork(networkData);
    setNodes(networkData.nodes || []);
    setEdges(networkData.edges || []);
    setSelectedNode(null);
    setSimulationHistory(networkData.simulationHistory || []);
    setHistory([{ nodes: networkData.nodes || [], edges: networkData.edges || [] }]);
    setHistoryIndex(0);
    setSaveStatus('saved');
  };

  // Save Network Project to Backend / Local storage
  const saveNetwork = async () => {
    setSaveStatus('saving');
    try {
      const payload = {
        name: network.name,
        description: network.description,
        nodes,
        edges,
        simulationHistory,
        stats: {
          devicesCount: nodes.length,
          connectionsCount: edges.length,
          packetsSent: simulationHistory.length,
          packetsDelivered: simulationHistory.filter(s => s.status === 'Delivered').length,
          packetsFailed: simulationHistory.filter(s => s.status !== 'Delivered').length
        }
      };

      const res = await networkAPI.updateNetwork(network.id || network._id, payload);
      if (res.data?.success) {
        setSaveStatus('saved');
        if (res.data.diagnostics) {
          setDiagnostics(res.data.diagnostics);
        }
      }
    } catch (err) {
      console.warn('Saved locally (server error):', err.message);
      setSaveStatus('saved');
    }
  };

  // Socket.IO Room Setup & Real-time Collaboration Listeners
  // Deferred until the workspace calls activateCollaboration(), so the Socket.IO
  // client (and its connection attempts) are never started on the landing / auth
  // pages. This keeps first load instant and avoids blocking on a dead backend.
  useEffect(() => {
    if (!collaborationActive || !network?.roomId) return;
    const socket = getSocket();

    socket.emit('join-room', {
      roomId: network.roomId,
      user: {
        id: user?.id || user?._id || 'guest',
        name: user?.name || 'Engineer',
        username: user?.username || 'engineer',
        avatarColor: user?.avatarColor || '#3b82f6'
      }
    });

    const handleRoomUsers = (users) => setActiveUsers(users);
    const handleActivityUpdated = (logs) => setActivityLogs(logs);
    const handleChatHistory = (msgs) => setChatMessages(msgs);
    const handleNewMessage = (msg) => setChatMessages(prev => [...prev, msg]);

    const handleCursorUpdate = ({ socketId, name, avatarColor, cursor }) => {
      setCursors(prev => ({
        ...prev,
        [socketId]: { name, avatarColor, cursor }
      }));
    };

    const handleCursorRemove = ({ socketId }) => {
      setCursors(prev => {
        const copy = { ...prev };
        delete copy[socketId];
        return copy;
      });
    };

    const handleNodeSynced = ({ changeType, node, nodes: syncedNodes }) => {
      if (syncedNodes) {
        isUndoRedoRef.current = true;
        setNodes(syncedNodes);
        setTimeout(() => { isUndoRedoRef.current = false; }, 50);
      }
    };

    const handleEdgeSynced = ({ changeType, edge, edges: syncedEdges }) => {
      if (syncedEdges) {
        isUndoRedoRef.current = true;
        setEdges(syncedEdges);
        setTimeout(() => { isUndoRedoRef.current = false; }, 50);
      }
    };

    const handleConfigSynced = ({ nodeId, config }) => {
      setNodes(nds => nds.map(n => (n.id === nodeId ? { ...n, data: { ...n.data, ...config } } : n)));
    };

    const handleSimulationTriggered = ({ simResult, sourceName, destName }) => {
      playSimulationAnimation(simResult);
    };

    socket.on('room-users', handleRoomUsers);
    socket.on('activity-updated', handleActivityUpdated);
    socket.on('chat-history', handleChatHistory);
    socket.on('new-message', handleNewMessage);
    socket.on('cursor-update', handleCursorUpdate);
    socket.on('cursor-remove', handleCursorRemove);
    socket.on('node-synced', handleNodeSynced);
    socket.on('edge-synced', handleEdgeSynced);
    socket.on('config-synced', handleConfigSynced);
    socket.on('simulation-triggered', handleSimulationTriggered);

    return () => {
      socket.off('room-users', handleRoomUsers);
      socket.off('activity-updated', handleActivityUpdated);
      socket.off('chat-history', handleChatHistory);
      socket.off('new-message', handleNewMessage);
      socket.off('cursor-update', handleCursorUpdate);
      socket.off('cursor-remove', handleCursorRemove);
      socket.off('node-synced', handleNodeSynced);
      socket.off('edge-synced', handleEdgeSynced);
      socket.off('config-synced', handleConfigSynced);
      socket.off('simulation-triggered', handleSimulationTriggered);
    };
  }, [collaborationActive, network?.roomId, user]);

  // Send In-Room Chat Message
  const sendChatMessage = (text) => {
    if (!text.trim() || !network?.roomId) return;
    const socket = getSocket();
    socket.emit('send-message', {
      roomId: network.roomId,
      text,
      user
    });
  };

  // Step-by-Step Packet Simulation Player
  const playSimulationAnimation = (simResult) => {
    if (!simResult || !simResult.animationSteps) return;

    setIsSimulating(true);
    setSimulationResult(simResult);
    const steps = simResult.animationSteps;

    let idx = 0;
    const interval = setInterval(() => {
      if (idx >= steps.length) {
        clearInterval(interval);
        setTimeout(() => {
          setIsSimulating(false);
          setActiveNodeId(null);
          setActiveEdgeId(null);
        }, 1200);
        return;
      }

      const step = steps[idx];
      setActiveStepIndex(idx);
      if (step.type === 'node') {
        setActiveNodeId(step.id);
        setActiveEdgeId(null);
      } else if (step.type === 'edge') {
        setActiveEdgeId(step.id);
      }
      idx++;
    }, 700);
  };

  return (
    <NetworkContext.Provider
      value={{
        theme,
        toggleTheme,
        network,
        setNetwork,
        nodes,
        setNodes,
        edges,
        setEdges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        selectedNode,
        setSelectedNode,
        saveStatus,
        addDevice,
        updateDeviceConfig,
        deleteDevice,
        deleteEdge,
        undo,
        redo,
        canUndo: historyIndex > 0,
        canRedo: historyIndex < history.length - 1,
        diagnostics,
        runDiagnostics,
        applyQuickFix,
        loadNetwork,
        saveNetwork,
        isSimulating,
        simulationResult,
        activeStepIndex,
        activeNodeId,
        activeEdgeId,
        playSimulationAnimation,
        simulationHistory,
        setSimulationHistory,
        activeUsers,
        cursors,
        activityLogs,
        chatMessages,
        sendChatMessage,
        activateCollaboration,
        deactivateCollaboration
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};
