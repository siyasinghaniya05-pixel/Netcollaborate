import React, { useState } from 'react';
import {
  Monitor,
  Laptop,
  Server,
  Printer,
  Globe,
  Network,
  Share2,
  Shield,
  Wifi,
  Cloud,
  Search,
  Info,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useNetwork } from '../context/NetworkContext';

const DEVICE_LIBRARY = [
  {
    category: 'End Devices',
    items: [
      { type: 'pc', label: 'PC', icon: Monitor, layer: 'Layer 7', desc: 'Standard client workstation for network communications.' },
      { type: 'laptop', label: 'Laptop', icon: Laptop, layer: 'Layer 7', desc: 'Portable client with Wi-Fi / Ethernet connectivity.' },
      { type: 'server', label: 'Server', icon: Server, layer: 'Layer 7', desc: 'Provides network services like HTTP, DNS, DHCP.' },
      { type: 'printer', label: 'Printer', icon: Printer, layer: 'Layer 7', desc: 'Networked printer device for print services.' }
    ]
  },
  {
    category: 'Network Infrastructure',
    items: [
      { type: 'router', label: 'Router', icon: Globe, layer: 'Layer 3', desc: 'Connects different IP subnets and forwards packets.' },
      { type: 'switch', label: 'Switch', icon: Network, layer: 'Layer 2', desc: 'Forwards frames using MAC addresses within a LAN.' },
      { type: 'hub', label: 'Hub', icon: Share2, layer: 'Layer 1', desc: 'Repeats all incoming signals to all ports (Collision domain).' },
      { type: 'firewall', label: 'Firewall', icon: Shield, layer: 'Layer 3/4', desc: 'Filters and blocks unauthorized network traffic.' },
      { type: 'accesspoint', label: 'Access Point', icon: Wifi, layer: 'Layer 2', desc: 'Enables wireless devices to connect to a wired network.' }
    ]
  },
  {
    category: 'WAN & External',
    items: [
      { type: 'cloud', label: 'Cloud / Internet', icon: Cloud, layer: 'WAN', desc: 'Simulates connection to external ISP or public cloud.' }
    ]
  }
];

const Sidebar = () => {
  const { addDevice } = useNetwork();
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsed, setCollapsed] = useState({});
  const [activeTooltip, setActiveTooltip] = useState(null);

  const toggleSection = (category) => {
    setCollapsed(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const onDragStart = (event, deviceType) => {
    event.dataTransfer.setData('application/netcollaborate-device', deviceType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside
      style={{
        width: '260px',
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        userSelect: 'none',
        zIndex: 10
      }}
    >
      {/* Sidebar Header & Search */}
      <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
            Device Library
          </h2>
          <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>Drag & Drop</span>
        </div>

        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Search devices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '30px', fontSize: '0.8rem', height: '32px' }}
          />
        </div>
      </div>

      {/* Device Catalog List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
        {DEVICE_LIBRARY.map((section) => {
          const filteredItems = section.items.filter(item =>
            item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.desc.toLowerCase().includes(searchTerm.toLowerCase())
          );

          if (filteredItems.length === 0) return null;
          const isCollapsed = collapsed[section.category];

          return (
            <div key={section.category} style={{ marginBottom: '1rem' }}>
              <div
                onClick={() => toggleSection(section.category)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.25rem 0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}
              >
                <span>{section.category}</span>
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </div>

              {!isCollapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.35rem' }}>
                  {filteredItems.map((item) => {
                    const IconComponent = item.icon;

                    return (
                      <div
                        key={item.type}
                        draggable
                        onDragStart={(e) => onDragStart(e, item.type)}
                        onClick={() => addDevice(item.type)}
                        onMouseEnter={() => setActiveTooltip(item.type)}
                        onMouseLeave={() => setActiveTooltip(null)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.55rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          cursor: 'grab',
                          transition: 'all 0.15s ease',
                          position: 'relative'
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                        onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                      >
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'var(--primary-light)',
                            color: 'var(--primary)'
                          }}
                        >
                          <IconComponent size={16} />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {item.label}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            {item.layer}
                          </div>
                        </div>

                        {/* Tooltip on hover */}
                        {activeTooltip === item.type && (
                          <div
                            style={{
                              position: 'absolute',
                              left: '102%',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              width: '210px',
                              backgroundColor: 'var(--bg-secondary)',
                              border: '1px solid var(--border-color)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '0.6rem',
                              boxShadow: 'var(--shadow-lg)',
                              zIndex: 100,
                              pointerEvents: 'none',
                              fontSize: '0.72rem',
                              lineHeight: '1.4'
                            }}
                          >
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
                              {item.label} ({item.layer})
                            </div>
                            <div style={{ color: 'var(--text-secondary)' }}>{item.desc}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};

export default Sidebar;
