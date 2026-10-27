import React, { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  AlertCircle,
  CheckCircle,
  Plus,
  Network,
  Globe,
  Monitor,
  Shield,
  Layers,
  Power,
  Terminal,
  RotateCcw,
  Sliders,
  List
} from 'lucide-react';
import { useNetwork } from '../context/NetworkContext';
import { isValidIPv4, isValidSubnetMask, areInSameSubnet, generateMAC } from '../utils/networkMath';

const ConfigurationPanel = () => {
  const { selectedNode, setSelectedNode, updateDeviceConfig, deleteDevice, nodes, edges } = useNetwork();

  const [formData, setFormData] = useState({});
  const [activeTab, setActiveTab] = useState('ip'); // 'ip' | 'interfaces' | 'routing' | 'ports' | 'rules' | 'mac' | 'cli'

  // New route input state for routers
  const [newRoute, setNewRoute] = useState({ destination: '', mask: '255.255.255.0', nextHop: '', interface: 'G0/0' });

  // Interactive CLI Terminal State
  const [cliInput, setCliInput] = useState('');
  const [cliHistory, setCliHistory] = useState([
    'NetCollaborate Network Operating System (NOS) v2.4',
    'Type "help" for a list of supported networking commands.\n'
  ]);

  // Sync selected node data to local form state
  useEffect(() => {
    if (selectedNode) {
      setFormData(JSON.parse(JSON.stringify(selectedNode.data || {})));
      const type = (selectedNode.data?.type || selectedNode.type || '').toLowerCase();
      if (type === 'router') setActiveTab('interfaces');
      else if (['switch', 'hub'].includes(type)) setActiveTab('ports');
      else if (type === 'firewall') setActiveTab('rules');
      else setActiveTab('ip');

      setCliHistory([
        `NetCollaborate Terminal — ${(selectedNode.data?.name || selectedNode.id)}`,
        'Type "help" for command syntax.\n'
      ]);
    }
  }, [selectedNode?.id]);

  if (!selectedNode) return null;

  const type = (formData.type || selectedNode.type || 'pc').toLowerCase();
  const isRouter = type === 'router';
  const isSwitch = ['switch', 'hub'].includes(type);
  const isFirewall = type === 'firewall';
  const isEndDevice = ['pc', 'laptop', 'server', 'printer'].includes(type);

  // Field change handler
  const handleFieldChange = (field, value) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    updateDeviceConfig(selectedNode.id, updated);
  };

  // Reset to Defaults
  const handleResetDefaults = () => {
    if (!window.confirm(`Reset ${formData.name || 'this device'} to default factory configuration?`)) return;

    let defaults = {
      name: formData.name || selectedNode.id,
      type,
      status: 'up'
    };

    if (isEndDevice) {
      defaults = {
        ...defaults,
        ip: type === 'server' ? '192.168.1.100' : '192.168.1.10',
        subnetMask: '255.255.255.0',
        gateway: '192.168.1.1',
        dns: '8.8.8.8',
        mac: generateMAC(),
        vlan: '1'
      };
    } else if (isRouter) {
      defaults = {
        ...defaults,
        interfaces: [
          { name: 'G0/0', ip: '192.168.1.1', mask: '255.255.255.0', status: 'up' },
          { name: 'G0/1', ip: '10.0.0.1', mask: '255.255.255.252', status: 'up' }
        ],
        routingTable: []
      };
    } else if (isSwitch) {
      defaults = {
        ...defaults,
        ports: [
          { number: 1, mode: 'access', vlan: '1', status: 'up' },
          { number: 2, mode: 'access', vlan: '1', status: 'up' },
          { number: 3, mode: 'access', vlan: '1', status: 'up' },
          { number: 24, mode: 'trunk', vlan: 'Trunk', status: 'up' }
        ]
      };
    } else if (isFirewall) {
      defaults = {
        ...defaults,
        firewallRules: [
          { id: 'rule-1', action: 'allow', protocol: 'ICMP', destIp: '' },
          { id: 'rule-2', action: 'allow', protocol: 'HTTP', destIp: '' }
        ]
      };
    }

    setFormData(defaults);
    updateDeviceConfig(selectedNode.id, defaults);
  };

  // Router Interface update
  const handleInterfaceChange = (index, field, value) => {
    const ifaces = [...(formData.interfaces || [])];
    ifaces[index] = { ...ifaces[index], [field]: value };
    handleFieldChange('interfaces', ifaces);
  };

  const addInterface = () => {
    const ifaces = formData.interfaces || [];
    const name = `G0/${ifaces.length}`;
    const newIface = { name, ip: '', mask: '255.255.255.0', status: 'up' };
    handleFieldChange('interfaces', [...ifaces, newIface]);
  };

  // Router Routing Table update
  const handleAddRoute = () => {
    if (!newRoute.destination || !newRoute.mask) return;
    const currentTable = formData.routingTable || [];
    const updated = [...currentTable, { ...newRoute }];
    handleFieldChange('routingTable', updated);
    setNewRoute({ destination: '', mask: '255.255.255.0', nextHop: '', interface: 'G0/0' });
  };

  const handleDeleteRoute = (idx) => {
    const currentTable = formData.routingTable || [];
    const updated = currentTable.filter((_, i) => i !== idx);
    handleFieldChange('routingTable', updated);
  };

  // Switch Port update
  const handlePortChange = (index, field, value) => {
    const ports = [...(formData.ports || [])];
    ports[index] = { ...ports[index], [field]: value };
    handleFieldChange('ports', ports);
  };

  // CLI Command Execution
  const handleCliSubmit = (e) => {
    e.preventDefault();
    const raw = cliInput.trim();
    if (!raw) return;

    const parts = raw.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    const promptLabel = `${formData.name || selectedNode.id}#`;
    let output = '';

    if (cmd === 'help' || cmd === '?') {
      output = `Supported commands:
  show ip int brief         - Display interfaces and operational status
  show ip route             - Display static and connected routing table
  show mac-address-table    - Display Layer 2 forwarding entries
  ping <ip>                 - Send ICMP echo request to target IP
  ip address <ip> <mask>    - Assign IP address and subnet mask
  ip route <dst> <mask> <nh>- Add static route
  shutdown / no shutdown    - Disable or enable primary interface
  clear                     - Clear terminal console`;
    } else if (cmd === 'clear') {
      setCliHistory([]);
      setCliInput('');
      return;
    } else if (raw.toLowerCase().includes('show ip int brief') || raw.toLowerCase().includes('show ip interface brief')) {
      if (isRouter) {
        const lines = (formData.interfaces || []).map(
          i => `${i.name.padEnd(8)} ${ (i.ip || 'unassigned').padEnd(16)} YES manual ${(i.status === 'down' ? 'down' : 'up').padEnd(6)} up`
        );
        output = `Interface   IP-Address      OK? Method Status Protocol\n` + lines.join('\n');
      } else {
        output = `Interface   IP-Address      Status\neth0        ${formData.ip || 'unassigned'}     ${formData.status === 'down' ? 'down' : 'up'}`;
      }
    } else if (raw.toLowerCase().includes('show ip route')) {
      if (isRouter) {
        const connRoutes = (formData.interfaces || [])
          .filter(i => i.ip && i.status !== 'down')
          .map(i => `C    ${i.ip}/${i.mask} is directly connected, ${i.name}`);
        const staticRoutes = (formData.routingTable || []).map(
          r => `S    ${r.destination}/${r.mask} [1/0] via ${r.nextHop || 'direct'}`
        );
        output = `Codes: C - connected, S - static\n\n` + [...connRoutes, ...staticRoutes].join('\n');
      } else {
        output = `IPv4 Routing Table:\nDestination       Gateway       Netmask\n0.0.0.0           ${formData.gateway || 'None'}       0.0.0.0`;
      }
    } else if (raw.toLowerCase().includes('show mac-address-table') || raw.toLowerCase().includes('show mac')) {
      const neighborEdges = edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id);
      const rows = neighborEdges.map((e, idx) => {
        const otherId = e.source === selectedNode.id ? e.target : e.source;
        const otherNode = nodes.find(n => n.id === otherId);
        return `   1    ${otherNode?.data?.mac || '00:1A:2B:3C:4D:' + (10 + idx)}    DYNAMIC     Fa0/${idx + 1}`;
      });
      output = `          Mac Address Table\n-------------------------------------------\nVlan    Mac Address       Type        Ports\n----    -----------       --------    -----\n` + (rows.length > 0 ? rows.join('\n') : 'No dynamic MAC entries learned.');
    } else if (cmd === 'ping') {
      const targetIP = args[0];
      if (!targetIP) {
        output = '% Usage: ping <target-ip>';
      } else {
        output = `Type escape sequence to abort.\nSending 5, 100-byte ICMP Echos to ${targetIP}, timeout is 2 seconds:\n!!!!!\nSuccess rate is 100 percent (5/5), round-trip min/avg/max = 1/4/9 ms`;
      }
    } else if (cmd === 'ip' && args[0] === 'address') {
      const ip = args[1];
      const mask = args[2] || '255.255.255.0';
      if (isValidIPv4(ip) && isValidSubnetMask(mask)) {
        handleFieldChange('ip', ip);
        handleFieldChange('subnetMask', mask);
        output = `Configured primary IP to ${ip} ${mask}`;
      } else {
        output = '% Invalid IPv4 address or subnet mask format.';
      }
    } else if (cmd === 'shutdown') {
      handleFieldChange('status', 'down');
      output = `% Interface administratively shut down.`;
    } else if (cmd === 'no' && args[0] === 'shutdown') {
      handleFieldChange('status', 'up');
      output = `% Interface administratively up.`;
    } else {
      output = `% Unrecognized command "${raw}". Type "help" for syntax.`;
    }

    setCliHistory(prev => [...prev, `${promptLabel} ${raw}`, output, '']);
    setCliInput('');
  };

  // Real-time validation checks for End Devices
  const isIpValid = isValidIPv4(formData.ip);
  const isMaskValid = isValidSubnetMask(formData.subnetMask);
  const isGatewayValid = !formData.gateway || isValidIPv4(formData.gateway);
  const isGatewaySameSubnet = !formData.gateway || !isIpValid || !isMaskValid || areInSameSubnet(formData.ip, formData.gateway, formData.subnetMask);

  return (
    <div
      style={{
        width: '340px',
        backgroundColor: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        zIndex: 20
      }}
    >
      {/* Panel Header */}
      <div
        style={{
          padding: '0.85rem 1rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-tertiary)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isRouter ? <Globe size={16} /> : isSwitch ? <Network size={16} /> : isFirewall ? <Shield size={16} /> : <Monitor size={16} />}
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {formData.name || selectedNode.id}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              {type} • Configuration
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={handleResetDefaults}
            title="Reset to Factory Defaults"
          >
            <RotateCcw size={14} />
          </button>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => setSelectedNode(null)}
            title="Close Panel"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Device Power / Status Bar */}
      <div
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Operational State
        </span>
        <button
          onClick={() => handleFieldChange('status', formData.status === 'down' ? 'up' : 'down')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            fontSize: '0.68rem',
            fontWeight: 700,
            cursor: 'pointer',
            backgroundColor: formData.status === 'down' ? 'var(--danger-light)' : 'var(--success-light)',
            color: formData.status === 'down' ? 'var(--danger)' : 'var(--success)'
          }}
        >
          <Power size={11} />
          {formData.status === 'down' ? 'ADMIN DOWN' : 'UP (ONLINE)'}
        </button>
      </div>

      {/* Tabs Selector */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '0 0.5rem', backgroundColor: 'var(--bg-tertiary)' }}>
        {isEndDevice && (
          <button
            onClick={() => setActiveTab('ip')}
            style={{
              flex: 1,
              padding: '0.5rem 0',
              fontSize: '0.72rem',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'ip' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'ip' ? 'var(--primary)' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            IP Config
          </button>
        )}

        {isRouter && (
          <>
            <button
              onClick={() => setActiveTab('interfaces')}
              style={{
                flex: 1,
                padding: '0.5rem 0',
                fontSize: '0.72rem',
                fontWeight: 600,
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'interfaces' ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === 'interfaces' ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              Interfaces
            </button>
            <button
              onClick={() => setActiveTab('routing')}
              style={{
                flex: 1,
                padding: '0.5rem 0',
                fontSize: '0.72rem',
                fontWeight: 600,
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'routing' ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === 'routing' ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              Static Routes
            </button>
          </>
        )}

        {isSwitch && (
          <>
            <button
              onClick={() => setActiveTab('ports')}
              style={{
                flex: 1,
                padding: '0.5rem 0',
                fontSize: '0.72rem',
                fontWeight: 600,
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'ports' ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === 'ports' ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              Ports & VLANs
            </button>
            <button
              onClick={() => setActiveTab('mac')}
              style={{
                flex: 1,
                padding: '0.5rem 0',
                fontSize: '0.72rem',
                fontWeight: 600,
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'mac' ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === 'mac' ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              MAC Table
            </button>
          </>
        )}

        {isFirewall && (
          <button
            onClick={() => setActiveTab('rules')}
            style={{
              flex: 1,
              padding: '0.5rem 0',
              fontSize: '0.72rem',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'rules' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'rules' ? 'var(--primary)' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            Access Rules
          </button>
        )}

        {/* Universal CLI Terminal Tab */}
        <button
          onClick={() => setActiveTab('cli')}
          style={{
            flex: 1,
            padding: '0.5rem 0',
            fontSize: '0.72rem',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'cli' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'cli' ? 'var(--primary)' : 'var(--text-secondary)',
            cursor: 'pointer'
          }}
        >
          CLI Terminal
        </button>
      </div>

      {/* Body Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        {/* Device Name Field (Common) */}
        {activeTab !== 'cli' && (
          <div className="input-group">
            <label className="input-label">Device Name</label>
            <input
              type="text"
              className="input-field"
              value={formData.name || ''}
              onChange={(e) => handleFieldChange('name', e.target.value)}
            />
          </div>
        )}

        {/* 1. End Device Configuration */}
        {isEndDevice && activeTab === 'ip' && (
          <>
            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="input-label">IPv4 Address</label>
                {formData.ip && (
                  isIpValid ? (
                    <span style={{ fontSize: '0.68rem', color: 'var(--success)' }}>✓ Valid IPv4</span>
                  ) : (
                    <span style={{ fontSize: '0.68rem', color: 'var(--danger)' }}>✕ Invalid format</span>
                  )
                )}
              </div>
              <input
                type="text"
                className="input-field"
                placeholder="192.168.1.10"
                value={formData.ip || ''}
                onChange={(e) => handleFieldChange('ip', e.target.value)}
                style={{ borderColor: formData.ip && !isIpValid ? 'var(--danger)' : undefined }}
              />
            </div>

            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="input-label">Subnet Mask</label>
                {formData.subnetMask && (
                  isMaskValid ? (
                    <span style={{ fontSize: '0.68rem', color: 'var(--success)' }}>✓ Valid Subnet</span>
                  ) : (
                    <span style={{ fontSize: '0.68rem', color: 'var(--danger)' }}>✕ Invalid Mask</span>
                  )
                )}
              </div>
              <input
                type="text"
                className="input-field"
                placeholder="255.255.255.0"
                value={formData.subnetMask || ''}
                onChange={(e) => handleFieldChange('subnetMask', e.target.value)}
                style={{ borderColor: formData.subnetMask && !isMaskValid ? 'var(--danger)' : undefined }}
              />
            </div>

            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="input-label">Default Gateway</label>
                {formData.gateway && (
                  !isGatewaySameSubnet ? (
                    <span style={{ fontSize: '0.68rem', color: 'var(--danger)' }}>✕ Subnet mismatch</span>
                  ) : (
                    <span style={{ fontSize: '0.68rem', color: 'var(--success)' }}>✓ Subnet aligned</span>
                  )
                )}
              </div>
              <input
                type="text"
                className="input-field"
                placeholder="192.168.1.1"
                value={formData.gateway || ''}
                onChange={(e) => handleFieldChange('gateway', e.target.value)}
                style={{ borderColor: formData.gateway && !isGatewaySameSubnet ? 'var(--danger)' : undefined }}
              />
              {formData.gateway && !isGatewaySameSubnet && (
                <span style={{ fontSize: '0.68rem', color: 'var(--danger)', marginTop: '2px' }}>
                  Gateway must reside on the same local subnet!
                </span>
              )}
            </div>

            <div className="input-group">
              <label className="input-label">DNS Server</label>
              <input
                type="text"
                className="input-field"
                placeholder="8.8.8.8"
                value={formData.dns || ''}
                onChange={(e) => handleFieldChange('dns', e.target.value)}
              />
            </div>

            <div className="input-group">
              <label className="input-label">MAC Address</label>
              <input
                type="text"
                className="input-field"
                value={formData.mac || ''}
                onChange={(e) => handleFieldChange('mac', e.target.value)}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}
              />
            </div>
          </>
        )}

        {/* 2. Router Interfaces */}
        {isRouter && activeTab === 'interfaces' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Configured Interfaces
              </span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={addInterface}
                style={{ fontSize: '0.7rem', padding: '2px 6px' }}
              >
                <Plus size={12} /> Add Interface
              </button>
            </div>

            {(formData.interfaces || []).map((iface, index) => (
              <div
                key={index}
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '0.75rem',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--primary)' }}>
                    {iface.name}
                  </span>
                  <button
                    onClick={() => handleInterfaceChange(index, 'status', iface.status === 'down' ? 'up' : 'down')}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: iface.status === 'down' ? 'var(--danger)' : 'var(--success)',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {iface.status === 'down' ? 'SHUTDOWN' : 'ACTIVE'}
                  </button>
                </div>

                <div className="input-group" style={{ marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>IP Address</label>
                  <input
                    type="text"
                    className="input-field"
                    style={{ height: '28px', fontSize: '0.75rem' }}
                    value={iface.ip || ''}
                    placeholder="192.168.1.1"
                    onChange={(e) => handleInterfaceChange(index, 'ip', e.target.value)}
                  />
                </div>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Subnet Mask</label>
                  <input
                    type="text"
                    className="input-field"
                    style={{ height: '28px', fontSize: '0.75rem' }}
                    value={iface.mask || ''}
                    placeholder="255.255.255.0"
                    onChange={(e) => handleInterfaceChange(index, 'mask', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 3. Router Static Routing Table */}
        {isRouter && activeTab === 'routing' && (
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Static Routing Table
            </div>

            {(formData.routingTable || []).length === 0 ? (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '1rem' }}>
                No static routes configured. Only directly connected interfaces will resolve.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                {(formData.routingTable || []).map((route, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.5rem',
                      backgroundColor: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.72rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{route.destination}/{route.mask}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>
                        via {route.nextHop} ({route.interface || 'G0/1'})
                      </div>
                    </div>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => handleDeleteRoute(idx)}
                      style={{ color: 'var(--danger)' }}
                      title="Delete Route"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Route Form */}
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)'
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Add Static Route
              </div>

              <div className="input-group" style={{ marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.65rem' }}>Destination Subnet</label>
                <input
                  type="text"
                  className="input-field"
                  style={{ height: '28px', fontSize: '0.75rem' }}
                  placeholder="192.168.2.0"
                  value={newRoute.destination}
                  onChange={(e) => setNewRoute({ ...newRoute, destination: e.target.value })}
                />
              </div>

              <div className="input-group" style={{ marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.65rem' }}>Subnet Mask</label>
                <input
                  type="text"
                  className="input-field"
                  style={{ height: '28px', fontSize: '0.75rem' }}
                  placeholder="255.255.255.0"
                  value={newRoute.mask}
                  onChange={(e) => setNewRoute({ ...newRoute, mask: e.target.value })}
                />
              </div>

              <div className="input-group" style={{ marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.65rem' }}>Next Hop Router IP</label>
                <input
                  type="text"
                  className="input-field"
                  style={{ height: '28px', fontSize: '0.75rem' }}
                  placeholder="10.0.0.2"
                  value={newRoute.nextHop}
                  onChange={(e) => setNewRoute({ ...newRoute, nextHop: e.target.value })}
                />
              </div>

              <button
                className="btn btn-primary btn-sm"
                style={{ width: '100%', marginTop: '0.4rem' }}
                onClick={handleAddRoute}
              >
                <Plus size={13} /> Add Route
              </button>
            </div>
          </div>
        )}

        {/* 4. Switch Ports & VLANs */}
        {isSwitch && activeTab === 'ports' && (
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Switch Ports & VLAN Assignments
            </div>

            {(formData.ports || []).map((port, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.4rem 0.6rem',
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '0.4rem',
                  fontSize: '0.75rem'
                }}
              >
                <span style={{ fontWeight: 700, minWidth: '45px' }}>Port {port.number}</span>
                <select
                  value={port.mode || 'access'}
                  onChange={(e) => handlePortChange(idx, 'mode', e.target.value)}
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    height: '24px'
                  }}
                >
                  <option value="access">Access</option>
                  <option value="trunk">Trunk</option>
                </select>
                <input
                  type="text"
                  className="input-field"
                  style={{ height: '24px', fontSize: '0.7rem', padding: '0 6px', flex: 1 }}
                  placeholder="VLAN ID"
                  value={port.vlan || ''}
                  onChange={(e) => handlePortChange(idx, 'vlan', e.target.value)}
                />
                <button
                  onClick={() => handlePortChange(idx, 'status', port.status === 'down' ? 'up' : 'down')}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: port.status === 'down' ? 'var(--danger)' : 'var(--success)',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {port.status === 'down' ? 'OFF' : 'ON'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 5. Switch MAC Address Table */}
        {isSwitch && activeTab === 'mac' && (
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Dynamic MAC Address Table
            </div>
            <div style={{ backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', padding: '0.5rem', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '4px' }}>
                <span>VLAN</span>
                <span>MAC Address</span>
                <span>Port</span>
              </div>
              {edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).map((e, idx) => {
                const neighborId = e.source === selectedNode.id ? e.target : e.source;
                const neighborNode = nodes.find(n => n.id === neighborId);
                return (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', padding: '2px 0' }}>
                    <span>VLAN 1</span>
                    <span>{neighborNode?.data?.mac || '00:1A:2B:3C:4D:' + (10 + idx)}</span>
                    <span>Fa0/{idx + 1}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. Firewall Access Rules */}
        {isFirewall && activeTab === 'rules' && (
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Firewall Security Policy
            </div>

            {(formData.firewallRules || []).map((rule, idx) => (
              <div
                key={idx}
                style={{
                  padding: '0.5rem',
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '0.5rem',
                  fontSize: '0.72rem',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: rule.action === 'allow' ? 'var(--success)' : 'var(--danger)' }}>
                    {rule.action.toUpperCase()} {rule.protocol}
                  </span>
                  <button
                    onClick={() => {
                      const updated = (formData.firewallRules || []).filter((_, i) => i !== idx);
                      handleFieldChange('firewallRules', updated);
                    }}
                    style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', marginTop: '2px' }}>
                  Destination: {rule.destIp || 'Any IP Address'}
                </div>
              </div>
            ))}

            <button
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', marginTop: '0.5rem' }}
              onClick={() => {
                const current = formData.firewallRules || [];
                handleFieldChange('firewallRules', [
                  ...current,
                  { id: 'rule-' + Date.now(), action: 'deny', protocol: 'ICMP', destIp: '' }
                ]);
              }}
            >
              <Plus size={13} /> Add Rule
            </button>
          </div>
        )}

        {/* 7. Interactive Cisco-style CLI Terminal */}
        {activeTab === 'cli' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div
              style={{
                flex: 1,
                minHeight: '260px',
                backgroundColor: '#0a0f1d',
                borderRadius: '8px',
                padding: '0.75rem',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                color: '#38bdf8',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                border: '1px solid #1e293b',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}
            >
              {cliHistory.map((item, idx) => (
                <div key={idx} style={{ color: item.includes('%') ? '#f87171' : item.includes('#') ? '#a78bfa' : '#94a3b8' }}>
                  {item}
                </div>
              ))}
            </div>

            <form onSubmit={handleCliSubmit} style={{ marginTop: '0.5rem', display: 'flex', gap: '4px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Enter command (e.g. show ip route, ping 192.168.1.1)..."
                value={cliInput}
                onChange={(e) => setCliInput(e.target.value)}
                style={{ height: '30px', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}
              />
              <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '0 8px' }}>
                <Terminal size={13} />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Delete Device Action */}
      <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)' }}>
        <button
          className="btn btn-danger btn-sm"
          style={{ width: '100%' }}
          onClick={() => deleteDevice(selectedNode.id)}
        >
          <Trash2 size={14} />
          <span>Delete Device</span>
        </button>
      </div>
    </div>
  );
};

export default ConfigurationPanel;
