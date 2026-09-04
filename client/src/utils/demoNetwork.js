/**
 * Preconfigured Multi-Subnet Campus Enterprise Demo Network for NetCollaborate
 */

export const DEMO_NETWORK = {
  id: 'demo-enterprise-network',
  name: 'Campus Enterprise Network',
  description: 'Preconfigured multi-subnet network with client workstations, departmental switches, core routing, and a secure web server.',
  roomId: 'NET-DEMO01',
  healthScore: 100,
  nodes: [
    {
      id: 'pc-1',
      type: 'deviceNode',
      position: { x: 100, y: 120 },
      data: {
        id: 'pc-1',
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
      type: 'deviceNode',
      position: { x: 100, y: 320 },
      data: {
        id: 'pc-2',
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
      type: 'deviceNode',
      position: { x: 340, y: 220 },
      data: {
        id: 'sw-1',
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
      type: 'deviceNode',
      position: { x: 580, y: 220 },
      data: {
        id: 'r-1',
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
      type: 'deviceNode',
      position: { x: 840, y: 220 },
      data: {
        id: 'r-2',
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
      type: 'deviceNode',
      position: { x: 1080, y: 220 },
      data: {
        id: 'sw-2',
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
      type: 'deviceNode',
      position: { x: 1320, y: 220 },
      data: {
        id: 'srv-1',
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
  stats: {
    devicesCount: 7,
    connectionsCount: 6,
    packetsSent: 16,
    packetsDelivered: 16,
    packetsFailed: 0
  }
};
