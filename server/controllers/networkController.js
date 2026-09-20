const Network = require('../models/Network');
const { validateTopology } = require('../simulation/validator');
const { simulatePacket, simulatePing } = require('../simulation/packetSimulator');
const { netAssistAnalyze, runFullDiagnostics } = require('../simulation/netassist');
const { traceRoute } = require('../simulation/traceroute');
const { buildReplay } = require('../simulation/packetReplay');
const { createSnapshot, compareSnapshots, restoreSnapshot } = require('../simulation/versionControl');
const { generateLabReport } = require('../simulation/reportGenerator');
const { evaluateAssignment, getSampleSubmissions, aggregateClassMetrics, ASSIGNMENTS } = require('../simulation/instructorEngine');

// In-memory network store fallback when MongoDB is not connected
const memoryNetworks = new Map();

function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'NET-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Initial demo network data
const demoNetworkData = {
  id: 'demo-enterprise-network',
  _id: 'demo-enterprise-network',
  name: 'Campus Enterprise Network',
  description: 'Multi-subnet corporate network with two routers, two departmental switches, client workstations, and a core web server.',
  owner: 'system',
  ownerName: 'NetCollaborate Team',
  visibility: 'public',
  roomId: 'NET-DEMO01',
  healthScore: 100,
  nodes: [
    {
      id: 'pc-1',
      type: 'pc',
      position: { x: 80, y: 120 },
      data: {
        name: 'Workstation-1',
        type: 'pc',
        ip: '192.168.1.10',
        subnetMask: '255.255.255.0',
        gateway: '192.168.1.1',
        dns: '8.8.8.8',
        mac: '00:1A:2B:3C:4D:01',
        vlan: '10',
        status: 'up'
      }
    },
    {
      id: 'pc-2',
      type: 'pc',
      position: { x: 80, y: 300 },
      data: {
        name: 'Workstation-2',
        type: 'pc',
        ip: '192.168.1.20',
        subnetMask: '255.255.255.0',
        gateway: '192.168.1.1',
        dns: '8.8.8.8',
        mac: '00:1A:2B:3C:4D:02',
        vlan: '10',
        status: 'up'
      }
    },
    {
      id: 'sw-1',
      type: 'switch',
      position: { x: 300, y: 200 },
      data: {
        name: 'Building-A-Switch',
        type: 'switch',
        status: 'up',
        ports: [
          { number: 1, connectedTo: 'Workstation-1', vlan: '10', status: 'up' },
          { number: 2, connectedTo: 'Workstation-2', vlan: '10', status: 'up' },
          { number: 24, connectedTo: 'Core-Router-1', vlan: 'Trunk', status: 'up' }
        ]
      }
    },
    {
      id: 'r-1',
      type: 'router',
      position: { x: 540, y: 200 },
      data: {
        name: 'Core-Router-1',
        type: 'router',
        status: 'up',
        interfaces: [
          { name: 'G0/0', ip: '192.168.1.1', mask: '255.255.255.0', status: 'up' },
          { name: 'G0/1', ip: '10.0.0.1', mask: '255.255.255.252', status: 'up' }
        ],
        routingTable: [
          { destination: '192.168.2.0', mask: '255.255.255.0', nextHop: '10.0.0.2', interface: 'G0/1', metric: 1 }
        ]
      }
    },
    {
      id: 'r-2',
      type: 'router',
      position: { x: 800, y: 200 },
      data: {
        name: 'Core-Router-2',
        type: 'router',
        status: 'up',
        interfaces: [
          { name: 'G0/0', ip: '10.0.0.2', mask: '255.255.255.252', status: 'up' },
          { name: 'G0/1', ip: '192.168.2.1', mask: '255.255.255.0', status: 'up' }
        ],
        routingTable: [
          { destination: '192.168.1.0', mask: '255.255.255.0', nextHop: '10.0.0.1', interface: 'G0/0', metric: 1 }
        ]
      }
    },
    {
      id: 'sw-2',
      type: 'switch',
      position: { x: 1040, y: 200 },
      data: {
        name: 'DataCenter-Switch',
        type: 'switch',
        status: 'up',
        ports: [
          { number: 1, connectedTo: 'Core-Router-2', vlan: 'Trunk', status: 'up' },
          { number: 24, connectedTo: 'Web-Server-1', vlan: '20', status: 'up' }
        ]
      }
    },
    {
      id: 'srv-1',
      type: 'server',
      position: { x: 1260, y: 200 },
      data: {
        name: 'Web-Server-1',
        type: 'server',
        ip: '192.168.2.10',
        subnetMask: '255.255.255.0',
        gateway: '192.168.2.1',
        dns: '8.8.8.8',
        mac: '00:1A:2B:3C:4D:99',
        vlan: '20',
        status: 'up'
      }
    }
  ],
  edges: [
    { id: 'e-pc1-sw1', source: 'pc-1', target: 'sw-1', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } },
    { id: 'e-pc2-sw1', source: 'pc-2', target: 'sw-1', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } },
    { id: 'e-sw1-r1', source: 'sw-1', target: 'r-1', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } },
    { id: 'e-r1-r2', source: 'r-1', target: 'r-2', type: 'networkEdge', data: { linkType: 'fiber', status: 'connected' } },
    { id: 'e-r2-sw2', source: 'r-2', target: 'sw-2', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } },
    { id: 'e-sw2-srv1', source: 'sw-2', target: 'srv-1', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } }
  ],
  collaborators: [],
  simulationHistory: [
    {
      sourceDevice: 'Workstation-1',
      destDevice: 'Web-Server-1',
      sourceIP: '192.168.1.10',
      destIP: '192.168.2.10',
      protocol: 'ICMP',
      status: 'Delivered',
      durationMs: 14,
      hopsCount: 7,
      timestamp: new Date()
    }
  ],
  stats: {
    devicesCount: 7,
    connectionsCount: 6,
    packetsSent: 12,
    packetsDelivered: 12,
    packetsFailed: 0
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

memoryNetworks.set(demoNetworkData.id, demoNetworkData);
memoryNetworks.set(demoNetworkData.roomId, demoNetworkData);

// @desc    Get all networks for current user
// @route   GET /api/networks
const getNetworks = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    let networks = [];
    try {
      networks = await Network.find({
        $or: [
          { owner: userId },
          { 'collaborators.userId': userId },
          { visibility: 'public' }
        ]
      }).sort({ updatedAt: -1 });
    } catch (dbErr) {
      // Memory fallback
      networks = Array.from(memoryNetworks.values()).filter(net => {
        return (
          net.owner === userId ||
          net.visibility === 'public' ||
          (net.collaborators && net.collaborators.some(c => c.userId === userId))
        );
      });
    }

    // Always include demo network if not present
    if (!networks.some(n => n.id === 'demo-enterprise-network' || n._id === 'demo-enterprise-network')) {
      networks.unshift(demoNetworkData);
    }

    res.json({ success: true, count: networks.length, data: networks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single network by ID or Room ID
// @route   GET /api/networks/:id
const getNetworkById = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === 'demo' || id === 'demo-enterprise-network' || id === 'NET-DEMO01') {
      return res.json({ success: true, data: demoNetworkData });
    }

    let network = null;
    try {
      network = await Network.findOne({
        $or: [{ _id: id }, { roomId: id }]
      });
    } catch (dbErr) {
      network = memoryNetworks.get(id);
    }

    if (!network && memoryNetworks.has(id)) {
      network = memoryNetworks.get(id);
    }

    if (!network) {
      return res.status(404).json({ success: false, message: 'Network project not found' });
    }

    res.json({ success: true, data: network });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new network
// @route   POST /api/networks
const createNetwork = async (req, res) => {
  try {
    const { name, description, visibility, nodes, edges } = req.body;
    const userId = req.user.id || req.user._id;
    const username = req.user.username || req.user.name || 'Engineer';
    const roomId = generateRoomId();

    const networkPayload = {
      name: name || 'Untitled Network',
      description: description || '',
      visibility: visibility || 'private',
      owner: userId,
      ownerName: username,
      roomId,
      nodes: nodes || [],
      edges: edges || [],
      collaborators: [],
      simulationHistory: [],
      healthScore: 100,
      stats: {
        devicesCount: nodes ? nodes.length : 0,
        connectionsCount: edges ? edges.length : 0,
        packetsSent: 0,
        packetsDelivered: 0,
        packetsFailed: 0
      }
    };

    let createdNetwork = null;
    try {
      createdNetwork = await Network.create(networkPayload);
    } catch (dbErr) {
      const id = 'net_' + Date.now();
      createdNetwork = {
        ...networkPayload,
        _id: id,
        id,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      memoryNetworks.set(id, createdNetwork);
      memoryNetworks.set(roomId, createdNetwork);
    }

    res.status(201).json({ success: true, data: createdNetwork });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update network topology and configurations
// @route   PUT /api/networks/:id
const updateNetwork = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, nodes, edges, simulationHistory, stats } = req.body;

    const diagnostics = validateTopology(nodes || [], edges || []);
    const healthScore = diagnostics.healthScore;

    const updateFields = {
      updatedAt: new Date(),
      healthScore
    };

    if (name) updateFields.name = name;
    if (description !== undefined) updateFields.description = description;
    if (nodes) {
      updateFields.nodes = nodes;
      updateFields['stats.devicesCount'] = nodes.length;
    }
    if (edges) {
      updateFields.edges = edges;
      updateFields['stats.connectionsCount'] = edges.length;
    }
    if (simulationHistory) updateFields.simulationHistory = simulationHistory;
    if (stats) updateFields.stats = stats;

    let updatedNetwork = null;
    try {
      updatedNetwork = await Network.findByIdAndUpdate(id, updateFields, { new: true });
    } catch (dbErr) {
      // Memory fallback
    }

    if (!updatedNetwork) {
      const existing = memoryNetworks.get(id) || memoryNetworks.get(req.params.id);
      if (existing) {
        Object.assign(existing, updateFields, {
          nodes: nodes || existing.nodes,
          edges: edges || existing.edges,
          stats: {
            ...existing.stats,
            devicesCount: (nodes || existing.nodes).length,
            connectionsCount: (edges || existing.edges).length,
            ...(stats || {})
          }
        });
        memoryNetworks.set(id, existing);
        updatedNetwork = existing;
      }
    }

    if (!updatedNetwork) {
      return res.status(404).json({ success: false, message: 'Network not found' });
    }

    res.json({ success: true, data: updatedNetwork, diagnostics });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a network
// @route   DELETE /api/networks/:id
const deleteNetwork = async (req, res) => {
  try {
    const { id } = req.params;
    try {
      await Network.findByIdAndDelete(id);
    } catch (dbErr) {
      memoryNetworks.delete(id);
    }
    memoryNetworks.delete(id);

    res.json({ success: true, message: 'Network project deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Simulate packet transmission
// @route   POST /api/networks/:id/simulate
const simulate = async (req, res) => {
  try {
    const { nodes, edges, sourceId, destId, protocol, ttl } = req.body;

    if (!sourceId || !destId) {
      return res.status(400).json({ success: false, message: 'Source and destination devices are required' });
    }

    const simResult = simulatePacket(nodes, edges, sourceId, destId, protocol || 'ICMP', ttl || 64);
    res.json({ success: true, data: simResult });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Run a traceroute simulation
// @route   POST /api/networks/:id/traceroute
const traceroute = async (req, res) => {
  try {
    const { nodes, edges, sourceId, destIdOrIP, maxHops } = req.body;

    if (!sourceId || !destIdOrIP) {
      return res.status(400).json({ success: false, message: 'Source and target devices are required' });
    }

    const result = traceRoute(nodes || [], edges || [], sourceId, destIdOrIP, maxHops || 15);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Build a packet-replay journey from a simulation result
// @route   POST /api/networks/:id/replay
const packetReplay = async (req, res) => {
  try {
    const { nodes, edges, sourceId, destId, protocol, ttl } = req.body;

    if (!sourceId || !destId) {
      return res.status(400).json({ success: false, message: 'Source and destination devices are required' });
    }

    const simResult = simulatePacket(nodes || [], edges || [], sourceId, destId, protocol || 'ICMP', ttl || 64);
    const replay = buildReplay(nodes || [], edges || [], simResult);

    res.json({
      success: true,
      data: {
        replay,
        simulation: simResult
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Run Ping simulation
// @route   POST /api/networks/:id/ping
const ping = async (req, res) => {
  try {
    const { nodes, edges, sourceId, destIdOrIP, count } = req.body;

    if (!sourceId || !destIdOrIP) {
      return res.status(400).json({ success: false, message: 'Source and target device/IP are required' });
    }

    const pingResult = simulatePing(nodes, edges, sourceId, destIdOrIP, count || 4);
    res.json({ success: true, data: pingResult });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Analyze topology & configuration errors
// @route   POST /api/networks/:id/debug
const debugTopology = async (req, res) => {
  try {
    const { nodes, edges } = req.body;
    const diagnostics = validateTopology(nodes || [], edges || []);
    res.json({ success: true, data: diagnostics });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    NetAssist — answer a natural-language troubleshooting question
// @route   POST /api/networks/:id/assist
const netAssist = async (req, res) => {
  try {
    const { nodes, edges, question } = req.body;
    if (!question || !String(question).trim()) {
      return res.status(400).json({ success: false, message: 'A question is required' });
    }
    const answer = netAssistAnalyze(nodes || [], edges || [], question);
    res.json({ success: true, data: answer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    NetAssist — full smart diagnostic pass (issues + fixes + health)
// @route   POST /api/networks/:id/assist/diagnostics
const netAssistDiagnostics = async (req, res) => {
  try {
    const { nodes, edges } = req.body;
    const issues = runFullDiagnostics(nodes || [], edges || []);
    const diagnostics = validateTopology(nodes || [], edges || []);
    res.json({
      success: true,
      data: {
        issues,
        validation: diagnostics,
        healthScore: diagnostics.healthScore
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper to resolve network from DB, memory store, or fallback
async function resolveNetwork(id, fallbackNodes, fallbackEdges) {
  if (id === 'demo' || id === 'demo-enterprise-network' || id === 'NET-DEMO01') {
    return demoNetworkData;
  }
  let network = null;
  try {
    network = await Network.findOne({ $or: [{ _id: id }, { roomId: id }] });
  } catch (err) {
    network = memoryNetworks.get(id);
  }
  if (!network) {
    network = memoryNetworks.get(id);
  }
  if (!network && fallbackNodes) {
    network = {
      id: id || 'active-network',
      name: 'Active Network',
      nodes: fallbackNodes,
      edges: fallbackEdges || [],
      snapshots: []
    };
  }
  return network;
}

// @desc    Get all snapshots for a network
// @route   GET /api/networks/:id/snapshots
const getSnapshots = async (req, res) => {
  try {
    const { id } = req.params;
    const network = await resolveNetwork(id);
    if (!network) {
      return res.status(404).json({ success: false, message: 'Network not found' });
    }
    const snapshots = network.snapshots || [];
    res.json({ success: true, count: snapshots.length, data: snapshots });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a snapshot
// @route   POST /api/networks/:id/snapshots
const createSnapshotHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, nodes, edges, healthScore } = req.body;
    const author = req.user?.name || req.user?.username || 'Collaborator';

    let network = await resolveNetwork(id, nodes, edges);
    if (!network) {
      return res.status(404).json({ success: false, message: 'Network not found' });
    }

    const targetNodes = nodes && nodes.length > 0 ? nodes : (network.nodes || []);
    const targetEdges = edges !== undefined ? edges : (network.edges || []);

    const snapshot = createSnapshot(targetNodes, targetEdges, {
      name,
      description,
      author,
      healthScore
    });

    if (!network.snapshots) {
      network.snapshots = [];
    }
    network.snapshots.unshift(snapshot);

    try {
      if (network.save && typeof network.save === 'function') {
        await network.save();
      }
    } catch (e) {}

    memoryNetworks.set(id, network);

    res.status(201).json({ success: true, data: snapshot });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Compare two snapshots or current network vs a snapshot
// @route   POST /api/networks/:id/snapshots/compare
const compareSnapshotsHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { snapshotAId, snapshotBId, currentNodes, currentEdges } = req.body;

    const network = await resolveNetwork(id, currentNodes, currentEdges);
    const snapshots = network?.snapshots || [];

    let snapA = null;
    let snapB = null;

    if (snapshotAId === 'current') {
      snapA = { nodes: currentNodes || network?.nodes || [], edges: currentEdges || network?.edges || [] };
    } else {
      snapA = snapshots.find(s => s.id === snapshotAId);
    }

    if (snapshotBId === 'current') {
      snapB = { nodes: currentNodes || network?.nodes || [], edges: currentEdges || network?.edges || [] };
    } else {
      snapB = snapshots.find(s => s.id === snapshotBId);
    }

    if (!snapA && snapshots.length > 0) snapA = snapshots[snapshots.length - 1];
    if (!snapB && snapshots.length > 0) snapB = snapshots[0];
    if (!snapA) snapA = { nodes: [], edges: [] };
    if (!snapB) snapB = { nodes: currentNodes || [], edges: currentEdges || [] };

    const diff = compareSnapshots(snapA, snapB);
    res.json({
      success: true,
      data: {
        diff,
        baseline: { id: snapA.id || 'snapshot-a', name: snapA.name || 'Baseline' },
        target: { id: snapB.id || 'snapshot-b', name: snapB.name || 'Target' }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Restore a snapshot
// @route   POST /api/networks/:id/snapshots/:snapshotId/restore
const restoreSnapshotHandler = async (req, res) => {
  try {
    const { id, snapshotId } = req.params;
    const network = await resolveNetwork(id);
    if (!network) {
      return res.status(404).json({ success: false, message: 'Network not found' });
    }

    const snapshot = (network.snapshots || []).find(s => s.id === snapshotId);
    if (!snapshot) {
      return res.status(404).json({ success: false, message: 'Snapshot not found' });
    }

    const restored = restoreSnapshot(snapshot);
    network.nodes = restored.nodes;
    network.edges = restored.edges;

    try {
      if (network.save && typeof network.save === 'function') {
        await network.save();
      }
    } catch (e) {}

    memoryNetworks.set(id, network);

    res.json({ success: true, data: restored });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate a comprehensive lab report
// @route   POST /api/networks/:id/report
const getLabReportHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentName, studentId, courseName, labTitle, instructorComments, gradeOverride, nodes, edges } = req.body || {};

    let network = await resolveNetwork(id, nodes, edges);
    if (!network) {
      return res.status(404).json({ success: false, message: 'Network not found' });
    }

    const reportTarget = {
      ...network,
      nodes: nodes && nodes.length > 0 ? nodes : (network.nodes || []),
      edges: edges !== undefined ? edges : (network.edges || [])
    };

    const report = generateLabReport(reportTarget, {
      studentName: studentName || req.user?.name || req.user?.username || 'Student Engineer',
      studentId: studentId || (req.user?.id ? `STU-${req.user.id.toString().slice(-6).toUpperCase()}` : undefined),
      courseName,
      labTitle,
      instructorComments,
      gradeOverride
    });

    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// In-memory submissions store for instructor dashboard
let instructorSubmissions = getSampleSubmissions();

// @desc    Get instructor assignments catalog
// @route   GET /api/networks/instructor/assignments
const getInstructorAssignmentsHandler = (req, res) => {
  res.json({ success: true, data: ASSIGNMENTS });
};

// @desc    Get all student lab submissions & class metrics
// @route   GET /api/networks/instructor/submissions
const getInstructorSubmissionsHandler = async (req, res) => {
  try {
    const metrics = aggregateClassMetrics(instructorSubmissions);
    res.json({
      success: true,
      data: {
        submissions: instructorSubmissions,
        metrics,
        assignments: ASSIGNMENTS
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Grade or update feedback on a student submission
// @route   PUT /api/networks/instructor/submissions/:submissionId
const gradeSubmissionHandler = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { score, feedback, status, letterGrade } = req.body;

    const sub = instructorSubmissions.find(s => s.id === submissionId);
    if (!sub) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    if (score !== undefined) sub.score = Number(score);
    if (feedback !== undefined) sub.feedback = feedback;
    if (status !== undefined) sub.status = status;
    if (letterGrade !== undefined) sub.letterGrade = letterGrade;

    res.json({ success: true, data: sub });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getNetworks,
  getNetworkById,
  createNetwork,
  updateNetwork,
  deleteNetwork,
  simulate,
  ping,
  traceroute,
  packetReplay,
  debugTopology,
  netAssist,
  netAssistDiagnostics,
  getSnapshots,
  createSnapshotHandler,
  compareSnapshotsHandler,
  restoreSnapshotHandler,
  getLabReportHandler,
  getInstructorAssignmentsHandler,
  getInstructorSubmissionsHandler,
  gradeSubmissionHandler,
  demoNetworkData,
  memoryNetworks
};
