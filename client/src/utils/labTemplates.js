/**
 * 10 Standardized Networking Lab Starter Templates for NetCollaborate
 * Supports full interactive simulation, topology loading, and step-by-step challenges.
 */

export const LAB_TEMPLATES = [
  {
    id: 'template-two-pcs-switch',
    title: '1. Two PCs Connected Through a Switch',
    category: 'LAN Fundamentals',
    difficulty: 'Beginner',
    duration: '15 mins',
    objective: 'Understand Layer 2 Ethernet switching, MAC address learning, and local subnet communication without a router.',
    description: 'Connect two workstation PCs to a centralized Layer 2 Ethernet switch on the same subnet (192.168.1.0/24). Test direct ARP resolution and ICMP Echo communication.',
    requirements: [
      'Assign PC-A IP: 192.168.1.10 / 255.255.255.0',
      'Assign PC-B IP: 192.168.1.20 / 255.255.255.0',
      'Both hosts connected to Switch-1 via Ethernet links',
      'Simulate ping between PC-A and PC-B'
    ],
    testCases: [
      { source: 'pc-a', dest: 'pc-b', expected: true, description: 'PC-A should successfully ping PC-B across the switch' }
    ],
    hints: [
      'Since both PCs are on 192.168.1.0/24, no default gateway is required for intra-subnet communication.',
      'The switch forwards Ethernet frames using MAC addresses and does not decrement TTL.'
    ],
    nodes: [
      {
        id: 'pc-a',
        type: 'deviceNode',
        position: { x: 180, y: 220 },
        data: {
          name: 'PC-A',
          type: 'pc',
          ip: '192.168.1.10',
          subnetMask: '255.255.255.0',
          gateway: '',
          dns: '8.8.8.8',
          status: 'up'
        }
      },
      {
        id: 'sw-1',
        type: 'deviceNode',
        position: { x: 440, y: 220 },
        data: {
          name: 'Switch-1',
          type: 'switch',
          status: 'up',
          ports: [
            { number: 1, connectedTo: 'PC-A', vlan: '1', status: 'up' },
            { number: 2, connectedTo: 'PC-B', vlan: '1', status: 'up' }
          ]
        }
      },
      {
        id: 'pc-b',
        type: 'deviceNode',
        position: { x: 700, y: 220 },
        data: {
          name: 'PC-B',
          type: 'pc',
          ip: '192.168.1.20',
          subnetMask: '255.255.255.0',
          gateway: '',
          dns: '8.8.8.8',
          status: 'up'
        }
      }
    ],
    edges: [
      { id: 'e-pca-sw1', source: 'pc-a', target: 'sw-1', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } },
      { id: 'e-pcb-sw1', source: 'pc-b', target: 'sw-1', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } }
    ]
  },
  {
    id: 'template-basic-lan',
    title: '2. Basic Local Area Network (LAN)',
    category: 'LAN Fundamentals',
    difficulty: 'Beginner',
    duration: '20 mins',
    objective: 'Design a departmental local network with client workstations, a network printer, and a local file server.',
    description: 'Configure a full office subnet on 192.168.1.0/24. Verify that multiple clients can access both the printer and the server simultaneously through a star topology.',
    requirements: [
      'Workstation-1: 192.168.1.11 / 255.255.255.0',
      'Laptop-1: 192.168.1.12 / 255.255.255.0',
      'Office-Printer: 192.168.1.50 / 255.255.255.0',
      'File-Server: 192.168.1.100 / 255.255.255.0'
    ],
    testCases: [
      { source: 'pc-1', dest: 'srv-file', expected: true, description: 'Workstation-1 reaches File Server' },
      { source: 'lap-1', dest: 'prn-1', expected: true, description: 'Laptop-1 reaches Office Printer' }
    ],
    hints: [
      'All devices must have distinct IP addresses on the 192.168.1.0/24 subnet.',
      'Check the Diagnostics panel to ensure no IP address duplicates exist.'
    ],
    nodes: [
      {
        id: 'pc-1',
        type: 'deviceNode',
        position: { x: 140, y: 120 },
        data: { name: 'Workstation-1', type: 'pc', ip: '192.168.1.11', subnetMask: '255.255.255.0', gateway: '', status: 'up' }
      },
      {
        id: 'lap-1',
        type: 'deviceNode',
        position: { x: 140, y: 300 },
        data: { name: 'Laptop-1', type: 'laptop', ip: '192.168.1.12', subnetMask: '255.255.255.0', gateway: '', status: 'up' }
      },
      {
        id: 'sw-core',
        type: 'deviceNode',
        position: { x: 420, y: 210 },
        data: { name: 'Office-Switch', type: 'switch', status: 'up' }
      },
      {
        id: 'prn-1',
        type: 'deviceNode',
        position: { x: 700, y: 120 },
        data: { name: 'Office-Printer', type: 'printer', ip: '192.168.1.50', subnetMask: '255.255.255.0', gateway: '', status: 'up' }
      },
      {
        id: 'srv-file',
        type: 'deviceNode',
        position: { x: 700, y: 300 },
        data: { name: 'File-Server', type: 'server', ip: '192.168.1.100', subnetMask: '255.255.255.0', gateway: '', status: 'up' }
      }
    ],
    edges: [
      { id: 'e-pc1-sw', source: 'pc-1', target: 'sw-core', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } },
      { id: 'e-lap1-sw', source: 'lap-1', target: 'sw-core', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } },
      { id: 'e-sw-prn', source: 'sw-core', target: 'prn-1', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } },
      { id: 'e-sw-srv', source: 'sw-core', target: 'srv-file', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } }
    ]
  },
  {
    id: 'template-router-to-router',
    title: '3. Router-to-Router Connectivity',
    category: 'Routing',
    difficulty: 'Intermediate',
    duration: '25 mins',
    objective: 'Interconnect two subnets separated by two routers connected over a point-to-point /30 serial/fiber link.',
    description: 'Configure Subnet A (192.168.1.0/24) and Subnet B (192.168.2.0/24) connected via a point-to-point transit link (10.0.0.0/30) between Router-1 and Router-2.',
    requirements: [
      'Router-1: G0/0 = 192.168.1.1/24, G0/1 = 10.0.0.1/30',
      'Router-2: G0/0 = 10.0.0.2/30, G0/1 = 192.168.2.1/24',
      'PC-1: IP 192.168.1.10, Gateway 192.168.1.1',
      'Server-1: IP 192.168.2.10, Gateway 192.168.2.1',
      'Static routes on both routers pointing to the opposite subnet'
    ],
    testCases: [
      { source: 'pc-1', dest: 'srv-1', expected: true, description: 'PC-1 reaches Server-1 across two routers' }
    ],
    hints: [
      'Router-1 needs a static route: 192.168.2.0/24 via Next Hop 10.0.0.2.',
      'Router-2 needs a return route: 192.168.1.0/24 via Next Hop 10.0.0.1.'
    ],
    nodes: [
      {
        id: 'pc-1',
        type: 'deviceNode',
        position: { x: 100, y: 200 },
        data: { name: 'PC-1', type: 'pc', ip: '192.168.1.10', subnetMask: '255.255.255.0', gateway: '192.168.1.1', status: 'up' }
      },
      {
        id: 'sw-1',
        type: 'deviceNode',
        position: { x: 300, y: 200 },
        data: { name: 'Switch-A', type: 'switch', status: 'up' }
      },
      {
        id: 'r-1',
        type: 'deviceNode',
        position: { x: 500, y: 200 },
        data: {
          name: 'Router-1',
          type: 'router',
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
        id: 'r-2',
        type: 'deviceNode',
        position: { x: 720, y: 200 },
        data: {
          name: 'Router-2',
          type: 'router',
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
      {
        id: 'sw-2',
        type: 'deviceNode',
        position: { x: 920, y: 200 },
        data: { name: 'Switch-B', type: 'switch', status: 'up' }
      },
      {
        id: 'srv-1',
        type: 'deviceNode',
        position: { x: 1120, y: 200 },
        data: { name: 'Server-1', type: 'server', ip: '192.168.2.10', subnetMask: '255.255.255.0', gateway: '192.168.2.1', status: 'up' }
      }
    ],
    edges: [
      { id: 'e-pc1-sw1', source: 'pc-1', target: 'sw-1', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } },
      { id: 'e-sw1-r1', source: 'sw-1', target: 'r-1', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } },
      { id: 'e-r1-r2', source: 'r-1', target: 'r-2', type: 'networkEdge', data: { linkType: 'fiber', status: 'connected' } },
      { id: 'e-r2-sw2', source: 'r-2', target: 'sw-2', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } },
      { id: 'e-sw2-srv1', source: 'sw-2', target: 'srv-1', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } }
    ]
  },
  {
    id: 'template-static-routing',
    title: '4. Static Routing Mastery',
    category: 'Routing',
    difficulty: 'Intermediate',
    duration: '30 mins',
    objective: 'Configure explicit static routes, next-hop addresses, and default routes across a 3-router transit network.',
    description: 'Learn how routers make forwarding decisions using Longest Prefix Match (LPM). Practice adding, modifying, and troubleshooting static routes across 3 distinct subnets.',
    requirements: [
      'Subnet 1: 172.16.10.0/24 (HQ Clients)',
      'Subnet 2: 172.16.20.0/24 (Branch Office)',
      'Subnet 3: 172.16.30.0/24 (Central Data Center)',
      'Establish bilateral connectivity with zero packet loss'
    ],
    testCases: [
      { source: 'pc-hq', dest: 'srv-dc', expected: true, description: 'HQ client reaches Data Center server' },
      { source: 'pc-branch', dest: 'srv-dc', expected: true, description: 'Branch client reaches Data Center server' }
    ],
    hints: [
      'Remember the Golden Rule of Routing: It takes two routes to communicate — a forward route to the destination and a return route back to the source!',
      'Check TTL values during traceroute to ensure packets decrement by 1 at each router hop.'
    ],
    nodes: [
      {
        id: 'pc-hq',
        type: 'deviceNode',
        position: { x: 100, y: 120 },
        data: { name: 'HQ-Workstation', type: 'pc', ip: '172.16.10.10', subnetMask: '255.255.255.0', gateway: '172.16.10.1', status: 'up' }
      },
      {
        id: 'pc-branch',
        type: 'deviceNode',
        position: { x: 100, y: 320 },
        data: { name: 'Branch-Client', type: 'pc', ip: '172.16.20.10', subnetMask: '255.255.255.0', gateway: '172.16.20.1', status: 'up' }
      },
      {
        id: 'r-hq',
        type: 'deviceNode',
        position: { x: 380, y: 120 },
        data: {
          name: 'HQ-Router',
          type: 'router',
          status: 'up',
          interfaces: [
            { name: 'G0/0', ip: '172.16.10.1', mask: '255.255.255.0', status: 'up' },
            { name: 'G0/1', ip: '10.1.1.1', mask: '255.255.255.252', status: 'up' }
          ],
          routingTable: [
            { destination: '172.16.30.0', mask: '255.255.255.0', nextHop: '10.1.1.2', interface: 'G0/1' }
          ]
        }
      },
      {
        id: 'r-branch',
        type: 'deviceNode',
        position: { x: 380, y: 320 },
        data: {
          name: 'Branch-Router',
          type: 'router',
          status: 'up',
          interfaces: [
            { name: 'G0/0', ip: '172.16.20.1', mask: '255.255.255.0', status: 'up' },
            { name: 'G0/1', ip: '10.2.2.1', mask: '255.255.255.252', status: 'up' }
          ],
          routingTable: [
            { destination: '172.16.30.0', mask: '255.255.255.0', nextHop: '10.2.2.2', interface: 'G0/1' }
          ]
        }
      },
      {
        id: 'r-core',
        type: 'deviceNode',
        position: { x: 680, y: 220 },
        data: {
          name: 'Core-Router',
          type: 'router',
          status: 'up',
          interfaces: [
            { name: 'G0/0', ip: '10.1.1.2', mask: '255.255.255.252', status: 'up' },
            { name: 'G0/1', ip: '10.2.2.2', mask: '255.255.255.252', status: 'up' },
            { name: 'G0/2', ip: '172.16.30.1', mask: '255.255.255.0', status: 'up' }
          ],
          routingTable: [
            { destination: '172.16.10.0', mask: '255.255.255.0', nextHop: '10.1.1.1', interface: 'G0/0' },
            { destination: '172.16.20.0', mask: '255.255.255.0', nextHop: '10.2.2.1', interface: 'G0/1' }
          ]
        }
      },
      {
        id: 'srv-dc',
        type: 'deviceNode',
        position: { x: 960, y: 220 },
        data: { name: 'DC-Database', type: 'server', ip: '172.16.30.50', subnetMask: '255.255.255.0', gateway: '172.16.30.1', status: 'up' }
      }
    ],
    edges: [
      { id: 'e-hq-rhq', source: 'pc-hq', target: 'r-hq', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } },
      { id: 'e-br-rbr', source: 'pc-branch', target: 'r-branch', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } },
      { id: 'e-rhq-core', source: 'r-hq', target: 'r-core', type: 'networkEdge', data: { linkType: 'fiber', status: 'connected' } },
      { id: 'e-rbr-core', source: 'r-branch', target: 'r-core', type: 'networkEdge', data: { linkType: 'fiber', status: 'connected' } },
      { id: 'e-core-dc', source: 'r-core', target: 'srv-dc', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } }
    ]
  },
  {
    id: 'template-multiple-subnets',
    title: '5. Multiple Subnets on a Central Router',
    category: 'Subnetting',
    difficulty: 'Intermediate',
    duration: '25 mins',
    objective: 'Configure a multi-homed router connecting 3 distinct departmental subnets: Engineering, Sales, and IT.',
    description: 'Explore variable length subnetting and inter-subnet routing. Verify that traffic from Engineering (10.1.0.0/24) routes cleanly to Sales (10.2.0.0/24) through directly-connected router interfaces.',
    requirements: [
      'Engineering Subnet: 10.1.0.0/24 (Gateway: 10.1.0.1)',
      'Sales Subnet: 10.2.0.0/24 (Gateway: 10.2.0.1)',
      'IT Support Subnet: 10.3.0.0/24 (Gateway: 10.3.0.1)'
    ],
    testCases: [
      { source: 'pc-eng', dest: 'pc-sales', expected: true, description: 'Engineering PC pings Sales PC' },
      { source: 'pc-sales', dest: 'pc-it', expected: true, description: 'Sales PC pings IT PC' }
    ],
    hints: [
      'Directly connected subnets on router interfaces do not require static routes because the router automatically learns connected networks.',
      'Ensure each host points to the router interface in its own subnet as its default gateway.'
    ],
    nodes: [
      {
        id: 'pc-eng',
        type: 'deviceNode',
        position: { x: 120, y: 100 },
        data: { name: 'Eng-Workstation', type: 'pc', ip: '10.1.0.10', subnetMask: '255.255.255.0', gateway: '10.1.0.1', status: 'up' }
      },
      {
        id: 'pc-sales',
        type: 'deviceNode',
        position: { x: 120, y: 240 },
        data: { name: 'Sales-Laptop', type: 'laptop', ip: '10.2.0.20', subnetMask: '255.255.255.0', gateway: '10.2.0.1', status: 'up' }
      },
      {
        id: 'pc-it',
        type: 'deviceNode',
        position: { x: 120, y: 380 },
        data: { name: 'IT-Workstation', type: 'pc', ip: '10.3.0.30', subnetMask: '255.255.255.0', gateway: '10.3.0.1', status: 'up' }
      },
      {
        id: 'r-multi',
        type: 'deviceNode',
        position: { x: 500, y: 240 },
        data: {
          name: 'Campus-Gateway',
          type: 'router',
          status: 'up',
          interfaces: [
            { name: 'G0/0', ip: '10.1.0.1', mask: '255.255.255.0', status: 'up' },
            { name: 'G0/1', ip: '10.2.0.1', mask: '255.255.255.0', status: 'up' },
            { name: 'G0/2', ip: '10.3.0.1', mask: '255.255.255.0', status: 'up' }
          ],
          routingTable: []
        }
      }
    ],
    edges: [
      { id: 'e-eng-r', source: 'pc-eng', target: 'r-multi', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } },
      { id: 'e-sales-r', source: 'pc-sales', target: 'r-multi', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } },
      { id: 'e-it-r', source: 'pc-it', target: 'r-multi', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } }
    ]
  },
  {
    id: 'template-vlan-segmentation',
    title: '6. VLAN Segmentation & Isolation',
    category: 'Switching',
    difficulty: 'Intermediate',
    duration: '25 mins',
    objective: 'Isolate network traffic using Virtual Local Area Networks (VLAN 10 and VLAN 20) on a shared Layer 2 switch.',
    description: 'Verify that workstations assigned to VLAN 10 can communicate with other VLAN 10 hosts, but cannot reach VLAN 20 hosts without a router (Broadcast Domain Isolation).',
    requirements: [
      'PC-1 & PC-2 assigned to VLAN 10 (HR Dept)',
      'PC-3 & PC-4 assigned to VLAN 20 (Finance Dept)',
      'Verify intra-VLAN connectivity (PC-1 to PC-2 succeeds)',
      'Verify inter-VLAN isolation (PC-1 to PC-3 is blocked by VLAN boundary)'
    ],
    testCases: [
      { source: 'pc-1', dest: 'pc-2', expected: true, description: 'PC-1 can ping PC-2 within VLAN 10' },
      { source: 'pc-3', dest: 'pc-4', expected: true, description: 'PC-3 can ping PC-4 within VLAN 20' }
    ],
    hints: [
      'VLANs partition a physical switch into distinct logical broadcast domains at Layer 2.',
      'Without an inter-VLAN router (Router-on-a-Stick or L3 switch), communication between different VLANs is impossible by design.'
    ],
    nodes: [
      {
        id: 'pc-1',
        type: 'deviceNode',
        position: { x: 120, y: 120 },
        data: { name: 'HR-PC1', type: 'pc', ip: '192.168.10.1', subnetMask: '255.255.255.0', vlan: '10', status: 'up' }
      },
      {
        id: 'pc-2',
        type: 'deviceNode',
        position: { x: 120, y: 220 },
        data: { name: 'HR-PC2', type: 'pc', ip: '192.168.10.2', subnetMask: '255.255.255.0', vlan: '10', status: 'up' }
      },
      {
        id: 'sw-vlan',
        type: 'deviceNode',
        position: { x: 420, y: 220 },
        data: {
          name: 'VLAN-Switch',
          type: 'switch',
          status: 'up',
          ports: [
            { number: 1, connectedTo: 'HR-PC1', vlan: '10', status: 'up' },
            { number: 2, connectedTo: 'HR-PC2', vlan: '10', status: 'up' },
            { number: 3, connectedTo: 'Fin-PC1', vlan: '20', status: 'up' },
            { number: 4, connectedTo: 'Fin-PC2', vlan: '20', status: 'up' }
          ]
        }
      },
      {
        id: 'pc-3',
        type: 'deviceNode',
        position: { x: 720, y: 120 },
        data: { name: 'Fin-PC1', type: 'pc', ip: '192.168.20.1', subnetMask: '255.255.255.0', vlan: '20', status: 'up' }
      },
      {
        id: 'pc-4',
        type: 'deviceNode',
        position: { x: 720, y: 220 },
        data: { name: 'Fin-PC2', type: 'pc', ip: '192.168.20.2', subnetMask: '255.255.255.0', vlan: '20', status: 'up' }
      }
    ],
    edges: [
      { id: 'e-pc1-sw', source: 'pc-1', target: 'sw-vlan', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } },
      { id: 'e-pc2-sw', source: 'pc-2', target: 'sw-vlan', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } },
      { id: 'e-sw-pc3', source: 'sw-vlan', target: 'pc-3', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } },
      { id: 'e-sw-pc4', source: 'sw-vlan', target: 'pc-4', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } }
    ]
  },
  {
    id: 'template-dhcp-dns',
    title: '7. DHCP & DNS Core Services',
    category: 'Application Layer',
    difficulty: 'Intermediate',
    duration: '25 mins',
    objective: 'Simulate application and infrastructure service resolution: client DNS query and web server HTTP requests.',
    description: 'Learn how DNS translates human-readable domain names (like lab.college.edu) into IP addresses (192.168.1.80) and how client workstations utilize default gateways and DNS servers.',
    requirements: [
      'DNS Server configured at 192.168.1.53',
      'Web Server hosting HTTP at 192.168.1.80',
      'Client workstation querying DNS for server IP address'
    ],
    testCases: [
      { source: 'pc-client', dest: 'srv-dns', expected: true, description: 'Client queries DNS Server' },
      { source: 'pc-client', dest: 'srv-web', expected: true, description: 'Client retrieves HTTP content from Web Server' }
    ],
    hints: [
      'Ensure the client PC has DNS configured as 192.168.1.53.',
      'Observe the protocol field in the Simulation panel when sending DNS or HTTP requests.'
    ],
    nodes: [
      {
        id: 'pc-client',
        type: 'deviceNode',
        position: { x: 120, y: 220 },
        data: { name: 'Student-PC', type: 'pc', ip: '192.168.1.15', subnetMask: '255.255.255.0', gateway: '192.168.1.1', dns: '192.168.1.53', status: 'up' }
      },
      {
        id: 'sw-svc',
        type: 'deviceNode',
        position: { x: 420, y: 220 },
        data: { name: 'Services-Switch', type: 'switch', status: 'up' }
      },
      {
        id: 'srv-dns',
        type: 'deviceNode',
        position: { x: 720, y: 120 },
        data: { name: 'Core-DNS-Server', type: 'server', ip: '192.168.1.53', subnetMask: '255.255.255.0', gateway: '192.168.1.1', status: 'up' }
      },
      {
        id: 'srv-web',
        type: 'deviceNode',
        position: { x: 720, y: 320 },
        data: { name: 'Campus-Web-Portal', type: 'server', ip: '192.168.1.80', subnetMask: '255.255.255.0', gateway: '192.168.1.1', status: 'up' }
      }
    ],
    edges: [
      { id: 'e-pc-sw', source: 'pc-client', target: 'sw-svc', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } },
      { id: 'e-sw-dns', source: 'sw-svc', target: 'srv-dns', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } },
      { id: 'e-sw-web', source: 'sw-svc', target: 'srv-web', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } }
    ]
  },
  {
    id: 'template-soho-network',
    title: '8. Small Office / Home Office (SOHO)',
    category: 'Enterprise',
    difficulty: 'Advanced',
    duration: '35 mins',
    objective: 'Build and configure a realistic small business office network with wired workstations, Wi-Fi access, and an Internet gateway.',
    description: 'Design a complete SOHO architecture connecting local workstations, laptops, a network printer, an access point, a central switch, a border gateway router, and the public Cloud/Internet.',
    requirements: [
      'Internal LAN subnet: 192.168.50.0/24',
      'Default Gateway on Router: 192.168.50.1',
      'Public WAN Link to Cloud: 203.0.113.1/30',
      'Verify all workstations can reach the Cloud/Internet gateway'
    ],
    testCases: [
      { source: 'pc-1', dest: 'cloud-wan', expected: true, description: 'Workstation connects to public Cloud' },
      { source: 'lap-1', dest: 'srv-local', expected: true, description: 'Wi-Fi Laptop reaches local file server' }
    ],
    hints: [
      'The SOHO gateway uses a default route 0.0.0.0/0 pointing towards the ISP Cloud router.',
      'Check the Diagnostics panel to ensure all default gateways match 192.168.50.1.'
    ],
    nodes: [
      {
        id: 'pc-1',
        type: 'deviceNode',
        position: { x: 100, y: 100 },
        data: { name: 'Desk-PC-1', type: 'pc', ip: '192.168.50.11', subnetMask: '255.255.255.0', gateway: '192.168.50.1', status: 'up' }
      },
      {
        id: 'lap-1',
        type: 'deviceNode',
        position: { x: 100, y: 220 },
        data: { name: 'Sales-Laptop', type: 'laptop', ip: '192.168.50.12', subnetMask: '255.255.255.0', gateway: '192.168.50.1', status: 'up' }
      },
      {
        id: 'srv-local',
        type: 'deviceNode',
        position: { x: 100, y: 340 },
        data: { name: 'Internal-NAS', type: 'server', ip: '192.168.50.50', subnetMask: '255.255.255.0', gateway: '192.168.50.1', status: 'up' }
      },
      {
        id: 'sw-soho',
        type: 'deviceNode',
        position: { x: 360, y: 220 },
        data: { name: 'SOHO-Switch', type: 'switch', status: 'up' }
      },
      {
        id: 'r-soho',
        type: 'deviceNode',
        position: { x: 620, y: 220 },
        data: {
          name: 'Border-Gateway',
          type: 'router',
          status: 'up',
          interfaces: [
            { name: 'G0/0', ip: '192.168.50.1', mask: '255.255.255.0', status: 'up' },
            { name: 'G0/1', ip: '203.0.113.1', mask: '255.255.255.252', status: 'up' }
          ],
          routingTable: [
            { destination: '0.0.0.0', mask: '0.0.0.0', nextHop: '203.0.113.2', interface: 'G0/1' }
          ]
        }
      },
      {
        id: 'cloud-wan',
        type: 'deviceNode',
        position: { x: 880, y: 220 },
        data: { name: 'Public-Internet', type: 'cloud', ip: '203.0.113.2', subnetMask: '255.255.255.252', status: 'up' }
      }
    ],
    edges: [
      { id: 'e-pc1-sw', source: 'pc-1', target: 'sw-soho', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } },
      { id: 'e-lap1-sw', source: 'lap-1', target: 'sw-soho', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } },
      { id: 'e-srv-sw', source: 'srv-local', target: 'sw-soho', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } },
      { id: 'e-sw-r', source: 'sw-soho', target: 'r-soho', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } },
      { id: 'e-r-cloud', source: 'r-soho', target: 'cloud-wan', type: 'networkEdge', data: { linkType: 'fiber', status: 'connected' } }
    ]
  },
  {
    id: 'template-basic-firewall',
    title: '9. Basic Firewall Security Policy',
    category: 'Security',
    difficulty: 'Advanced',
    duration: '30 mins',
    objective: 'Implement stateful access control rules on a perimeter firewall separating a Trusted LAN from an Untrusted DMZ.',
    description: 'Configure firewall filtering rules. Permit authorized ICMP and HTTP traffic from the Trusted Workstation while denying unauthorized traffic from suspicious external hosts.',
    requirements: [
      'Trusted LAN: 192.168.1.0/24',
      'DMZ Server: 10.0.0.10/24',
      'Firewall rule: Allow ICMP from 192.168.1.10 to 10.0.0.10',
      'Firewall rule: Deny packets with protocol UDP or rogue IPs'
    ],
    testCases: [
      { source: 'pc-trusted', dest: 'srv-dmz', expected: true, description: 'Trusted PC reaches DMZ server with permitted ICMP' }
    ],
    hints: [
      'Review the firewall rules configured on the Firewall node in the configuration panel.',
      'Firewalls evaluate rules top-to-bottom and drop packets that match explicit deny statements.'
    ],
    nodes: [
      {
        id: 'pc-trusted',
        type: 'deviceNode',
        position: { x: 120, y: 220 },
        data: { name: 'Trusted-PC', type: 'pc', ip: '192.168.1.10', subnetMask: '255.255.255.0', gateway: '192.168.1.1', status: 'up' }
      },
      {
        id: 'fw-1',
        type: 'deviceNode',
        position: { x: 440, y: 220 },
        data: {
          name: 'Perimeter-Firewall',
          type: 'firewall',
          status: 'up',
          interfaces: [
            { name: 'Inside', ip: '192.168.1.1', mask: '255.255.255.0', status: 'up' },
            { name: 'Outside', ip: '10.0.0.1', mask: '255.255.255.0', status: 'up' }
          ],
          firewallRules: [
            { id: 'rule-1', action: 'allow', protocol: 'ICMP', source: '192.168.1.0/24', destination: '10.0.0.0/24' },
            { id: 'rule-2', action: 'allow', protocol: 'HTTP', source: '192.168.1.0/24', destination: '10.0.0.0/24' },
            { id: 'rule-3', action: 'deny', protocol: 'ALL', source: '0.0.0.0/0', destination: '0.0.0.0/0' }
          ],
          routingTable: [
            { destination: '10.0.0.0', mask: '255.255.255.0', nextHop: '10.0.0.10', interface: 'Outside' }
          ]
        }
      },
      {
        id: 'srv-dmz',
        type: 'deviceNode',
        position: { x: 760, y: 220 },
        data: { name: 'DMZ-Web-Server', type: 'server', ip: '10.0.0.10', subnetMask: '255.255.255.0', gateway: '10.0.0.1', status: 'up' }
      }
    ],
    edges: [
      { id: 'e-pc-fw', source: 'pc-trusted', target: 'fw-1', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } },
      { id: 'e-fw-srv', source: 'fw-1', target: 'srv-dmz', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } }
    ]
  },
  {
    id: 'template-troubleshooting-challenge',
    title: '10. Troubleshooting Challenge (Broken Network)',
    category: 'Troubleshooting',
    difficulty: 'Expert',
    duration: '40 mins',
    objective: 'Diagnose and repair multiple deliberate configuration errors in an enterprise network topology.',
    description: 'This network is completely down! There is an IP address duplicate, a wrong default gateway, a disabled router interface, and a missing static return route. Use the Diagnostics panel and packet trace to find and fix all issues.',
    requirements: [
      '1. Find and resolve the duplicate IP address on PC-2',
      '2. Fix the invalid default gateway on PC-1',
      '3. Bring up the administratively disabled interface on Router-2',
      '4. Add the missing return route on Router-2 back to 192.168.1.0/24',
      '5. Verify 100% packet delivery between PC-1 and Server-1'
    ],
    testCases: [
      { source: 'pc-1', dest: 'srv-1', expected: true, description: 'PC-1 successfully pings Server-1 after all repairs' }
    ],
    hints: [
      'Open the Diagnostics & Debugger drawer to inspect all 4 critical errors with 1-click Quick Fixes.',
      'Check Router-2 interface G0/1: its status is currently "down" (administratively disabled).',
      'Check Router-2 routing table: it has no route to reach 192.168.1.0/24!'
    ],
    nodes: [
      {
        id: 'pc-1',
        type: 'deviceNode',
        position: { x: 100, y: 140 },
        data: {
          name: 'Workstation-1',
          type: 'pc',
          ip: '192.168.1.10',
          subnetMask: '255.255.255.0',
          gateway: '192.168.99.1', // ERROR 1: Wrong gateway subnet!
          status: 'up'
        }
      },
      {
        id: 'pc-2',
        type: 'deviceNode',
        position: { x: 100, y: 300 },
        data: {
          name: 'Workstation-2',
          type: 'pc',
          ip: '192.168.1.10', // ERROR 2: Duplicate IP! Same as PC-1
          subnetMask: '255.255.255.0',
          gateway: '192.168.1.1',
          status: 'up'
        }
      },
      {
        id: 'sw-1',
        type: 'deviceNode',
        position: { x: 340, y: 220 },
        data: { name: 'Switch-1', type: 'switch', status: 'up' }
      },
      {
        id: 'r-1',
        type: 'deviceNode',
        position: { x: 560, y: 220 },
        data: {
          name: 'Router-1',
          type: 'router',
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
        id: 'r-2',
        type: 'deviceNode',
        position: { x: 800, y: 220 },
        data: {
          name: 'Router-2',
          type: 'router',
          status: 'up',
          interfaces: [
            { name: 'G0/0', ip: '10.0.0.2', mask: '255.255.255.252', status: 'up' },
            { name: 'G0/1', ip: '192.168.2.1', mask: '255.255.255.0', status: 'down' } // ERROR 3: Interface disabled!
          ],
          routingTable: [] // ERROR 4: Missing return route to 192.168.1.0/24!
        }
      },
      {
        id: 'srv-1',
        type: 'deviceNode',
        position: { x: 1040, y: 220 },
        data: {
          name: 'Server-1',
          type: 'server',
          ip: '192.168.2.10',
          subnetMask: '255.255.255.0',
          gateway: '192.168.2.1',
          status: 'up'
        }
      }
    ],
    edges: [
      { id: 'e-pc1-sw1', source: 'pc-1', target: 'sw-1', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } },
      { id: 'e-pc2-sw1', source: 'pc-2', target: 'sw-1', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } },
      { id: 'e-sw1-r1', source: 'sw-1', target: 'r-1', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } },
      { id: 'e-r1-r2', source: 'r-1', target: 'r-2', type: 'networkEdge', data: { linkType: 'fiber', status: 'connected' } },
      { id: 'e-r2-srv1', source: 'r-2', target: 'srv-1', type: 'networkEdge', data: { linkType: 'ethernet', status: 'connected' } }
    ]
  }
];

export function getTemplateById(id) {
  return LAB_TEMPLATES.find(t => t.id === id) || null;
}
