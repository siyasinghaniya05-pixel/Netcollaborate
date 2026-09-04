import React, { useState } from 'react';
import {
  BookOpen,
  Globe,
  Network,
  Share2,
  Shield,
  Layers,
  Server,
  Binary,
  Search,
  ExternalLink
} from 'lucide-react';

const CONCEPTS = [
  {
    id: 'router',
    title: 'Router',
    layer: 'Layer 3 – Network Layer',
    icon: Globe,
    summary: 'Connects multiple distinct IP subnets and forwards packets based on IP routing tables.',
    keyFunctions: [
      'Determines the best path for packets using routing algorithms (OSPF, BGP, Static)',
      'Performs Longest Prefix Match (LPM) on IP destination addresses',
      'Decrements Time To Live (TTL) on each forwarding hop to prevent loops',
      'Acts as Default Gateway for local host devices'
    ],
    pdu: 'Packets',
    addressing: 'IPv4 / IPv6 addresses'
  },
  {
    id: 'switch',
    title: 'Switch',
    layer: 'Layer 2 – Data Link Layer',
    icon: Network,
    summary: 'Forwards Ethernet frames inside a local area network (LAN) using MAC address learning.',
    keyFunctions: [
      'Inspects source MAC addresses to dynamically build MAC address table',
      'Forwards frames only to the designated destination port (micro-segmentation)',
      'Floods unknown unicast and broadcast frames to all ports in the VLAN',
      'Separates collision domains per port, maintaining high bandwidth'
    ],
    pdu: 'Frames',
    addressing: 'MAC (Media Access Control) 48-bit hex addresses'
  },
  {
    id: 'hub',
    title: 'Hub',
    layer: 'Layer 1 – Physical Layer',
    icon: Share2,
    summary: 'A multiport physical repeater that broadcasts incoming electrical signals to all other ports.',
    keyFunctions: [
      'Operates with no awareness of MAC or IP addresses',
      'Shares a single collision domain among all connected devices',
      'Prone to collisions when multiple devices transmit simultaneously',
      'Obsolete in modern enterprise networking due to inefficiency'
    ],
    pdu: 'Bits / Electrical pulses',
    addressing: 'None'
  },
  {
    id: 'firewall',
    title: 'Firewall',
    layer: 'Layer 3, 4 & 7',
    icon: Shield,
    summary: 'Monitors, filters, and blocks unauthorized incoming and outgoing network traffic based on security policies.',
    keyFunctions: [
      'Inspects IP addresses, TCP/UDP ports, and protocol states',
      'Implements Stateless Packet Filtering or Stateful Packet Inspection (SPI)',
      'Defines Allow / Deny access control lists (ACLs)',
      'Protects internal networks from external unauthorized reconnaissance'
    ],
    pdu: 'Packets & Application Payloads',
    addressing: 'IP addresses + Transport Ports'
  },
  {
    id: 'ipv4',
    title: 'IPv4 Addressing & Subnetting',
    layer: 'Layer 3 – Network Layer',
    icon: Binary,
    summary: '32-bit logical address divided into Network portion and Host portion using a subnet mask.',
    keyFunctions: [
      'Represented in dotted-decimal format (e.g. 192.168.1.10)',
      'Subnet mask determines which bits belong to the network vs host',
      'CIDR prefix notation (e.g. /24 = 255.255.255.0 = 254 usable hosts)',
      'First address is Network ID; last address is Broadcast ID'
    ],
    pdu: 'IP Datagram Header',
    addressing: '32-bit integer formatted as 4 octets (0-255)'
  },
  {
    id: 'dns',
    title: 'DNS (Domain Name System)',
    layer: 'Layer 7 – Application Layer',
    icon: Server,
    summary: 'Resolves human-readable domain names (e.g. netcollaborate.com) into machine-routable IP addresses.',
    keyFunctions: [
      'Operates primarily over UDP port 53',
      'Maintains distributed hierarchy of Root, TLD, and Authoritative servers',
      'DNS records: A (IPv4), AAAA (IPv6), CNAME (alias), MX (mail)'
    ],
    pdu: 'Application Messages',
    addressing: 'FQDN to IP mapping'
  }
];

const EducationalPanel = () => {
  const [selectedConcept, setSelectedConcept] = useState(CONCEPTS[0]);
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = CONCEPTS.filter(c =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.layer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        overflow: 'hidden'
      }}
    >
      {/* Left List of Topics */}
      <div
        style={{
          width: '260px',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search concepts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '28px', height: '30px', fontSize: '0.75rem' }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
          {filtered.map((concept) => {
            const isSelected = selectedConcept.id === concept.id;
            const IconComponent = concept.icon;

            return (
              <div
                key={concept.id}
                onClick={() => setSelectedConcept(concept)}
                style={{
                  padding: '0.6rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent',
                  border: isSelected ? '1px solid var(--primary)' : '1px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  marginBottom: '0.25rem'
                }}
              >
                <IconComponent size={16} color={isSelected ? 'var(--primary)' : 'var(--text-muted)'} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: isSelected ? 'var(--primary)' : 'var(--text-primary)' }}>
                    {concept.title}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    {concept.layer}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Concept Explainer View */}
      <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span className="badge badge-primary">{selectedConcept.layer}</span>
          <span className="badge badge-success">PDU: {selectedConcept.pdu}</span>
        </div>

        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          {selectedConcept.title}
        </h2>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          {selectedConcept.summary}
        </p>

        <div
          style={{
            padding: '1rem',
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            marginBottom: '1.25rem'
          }}
        >
          <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.6rem', color: 'var(--primary)' }}>
            Key Functions & Operational Roles
          </div>
          <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem' }}>
            {selectedConcept.keyFunctions.map((fn, idx) => (
              <li key={idx} style={{ color: 'var(--text-secondary)' }}>{fn}</li>
            ))}
          </ul>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Addressing Scheme</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '2px' }}>{selectedConcept.addressing}</div>
          </div>
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>OSI Model Layer</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '2px' }}>{selectedConcept.layer}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EducationalPanel;
