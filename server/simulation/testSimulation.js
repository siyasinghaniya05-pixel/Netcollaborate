const { isValidIPv4, isValidSubnetMask, validateTopology } = require('./validator');
const { simulatePacket, simulatePing } = require('./packetSimulator');

console.log('--- Testing IP Validation ---');
console.log('192.168.1.10 valid?', isValidIPv4('192.168.1.10') === true ? 'PASS' : 'FAIL');
console.log('999.999.1.1 invalid?', isValidIPv4('999.999.1.1') === false ? 'PASS' : 'FAIL');
console.log('255.255.255.0 mask valid?', isValidSubnetMask('255.255.255.0') === true ? 'PASS' : 'FAIL');
console.log('255.255.255.10 mask invalid?', isValidSubnetMask('255.255.255.10') === false ? 'PASS' : 'FAIL');

// Create test network: PC1 -> Switch1 -> Router1 -> Router2 -> Server1
const nodes = [
  { id: 'pc1', type: 'pc', data: { name: 'PC1', ip: '192.168.1.10', subnetMask: '255.255.255.0', gateway: '192.168.1.1', status: 'up' } },
  { id: 'sw1', type: 'switch', data: { name: 'Switch1', status: 'up' } },
  {
    id: 'r1',
    type: 'router',
    data: {
      name: 'Router1',
      status: 'up',
      interfaces: [
        { name: 'G0/0', ip: '192.168.1.1', mask: '255.255.255.0', status: 'up' },
        { name: 'G0/1', ip: '10.0.0.1', mask: '255.255.255.252', status: 'up' }
      ],
      routingTable: [
        { destination: '192.168.2.0', mask: '255.255.255.0', nextHop: '10.0.0.2', interface: 'G0/1' }
      ]
    }
  },
  {
    id: 'r2',
    type: 'router',
    data: {
      name: 'Router2',
      status: 'up',
      interfaces: [
        { name: 'G0/0', ip: '10.0.0.2', mask: '255.255.255.252', status: 'up' },
        { name: 'G0/1', ip: '192.168.2.1', mask: '255.255.255.0', status: 'up' }
      ],
      routingTable: [
        { destination: '192.168.1.0', mask: '255.255.255.0', nextHop: '10.0.0.1', interface: 'G0/0' }
      ]
    }
  },
  { id: 'sw2', type: 'switch', data: { name: 'Switch2', status: 'up' } },
  { id: 'srv1', type: 'server', data: { name: 'Server1', ip: '192.168.2.10', subnetMask: '255.255.255.0', gateway: '192.168.2.1', status: 'up' } }
];

const edges = [
  { id: 'e1', source: 'pc1', target: 'sw1' },
  { id: 'e2', source: 'sw1', target: 'r1' },
  { id: 'e3', source: 'r1', target: 'r2' },
  { id: 'e4', source: 'r2', target: 'sw2' },
  { id: 'e5', source: 'sw2', target: 'srv1' }
];

console.log('\n--- Testing Topology Diagnostics ---');
const diagnostics = validateTopology(nodes, edges);
console.log(`Diagnostics: ${diagnostics.errors.length} errors, ${diagnostics.warnings.length} warnings. Health: ${diagnostics.healthScore}%`);

console.log('\n--- Testing Packet Simulation PC1 -> Server1 ---');
const result = simulatePacket(nodes, edges, 'pc1', 'srv1', 'ICMP');
console.log('Result Success:', result.success);
console.log('Path Nodes:', result.pathNodes);
console.log('Total Hops:', result.hops.length);
if (result.hops.length > 0) {
  result.hops.forEach(h => console.log(` [Hop ${h.step}] ${h.device} (${h.type}): ${h.action} -> ${h.details}`));
}

console.log('\n--- Testing Ping Simulation PC1 -> 192.168.2.10 ---');
const pingResult = simulatePing(nodes, edges, 'pc1', 'srv1', 3);
console.log('Ping Success:', pingResult.success);
console.log('Ping Lines:\n' + pingResult.lines.join('\n'));
