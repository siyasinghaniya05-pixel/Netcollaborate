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
  Power
} from 'lucide-react';
import { useNetwork } from '../context/NetworkContext';
import { isValidIPv4, isValidSubnetMask, areInSameSubnet } from '../utils/networkMath';

const ConfigurationPanel = () => {
  const { selectedNode, setSelectedNode, updateDeviceConfig, deleteDevice, nodes } = useNetwork();

  const [formData, setFormData] = useState({});
  const [activeTab, setActiveTab] = useState('ip'); // 'ip' | 'interfaces' | 'routing' | 'ports' | 'rules'

  // New route input state for routers
  const [newRoute, setNewRoute] = useState({ destination: '', mask: '255.255.255.0', nextHop: '', interface: 'G0/0' });

  // Sync selected node data to local form state
  useEffect(() => {
    if (selectedNode) {
      setFormData(JSON.parse(JSON.stringify(selectedNode.data || {})));
      const type = (selectedNode.data?.type || selectedNode.type || '').toLowerCase();
      if (type === 'router') setActiveTab('interfaces');
      else if (['switch', 'hub'].includes(type)) setActiveTab('ports');
      else if (type === 'firewall') setActiveTab('rules');
      else setActiveTab('ip');
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

  // Real-time validation checks for End Devices
  const isIpValid = isValidIPv4(formData.ip);
  const isMaskValid = isValidSubnetMask(formData.subnetMask);
  const isGatewayValid = !formData.gateway || isValidIPv4(formData.gateway);
  const isGatewaySameSubnet = !formData.gateway || !isIpValid || !isMaskValid || areInSameSubnet(formData.ip, formData.gateway, formData.subnetMask);

  return (
    <div
      style={{
        width: '320px',
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
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
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
              {type} Configuration
            </div>
          </div>
        </div>

        <button
          className="btn btn-ghost btn-icon btn-sm"
          onClick={() => setSelectedNode(null)}
          title="Close Configuration Panel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Device Power / Status Bar */}
      <div
        style={{
          padding: '0.6rem 1rem',
          backgroundColor: 'var(--bg-tertiary)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Interface Status
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
            fontSize: '0.7rem',
            fontWeight: 700,
            cursor: 'pointer',
            backgroundColor: formData.status === 'down' ? 'var(--danger-light)' : 'var(--success-light)',
            color: formData.status === 'down' ? 'var(--danger)' : 'var(--success)'
          }}
        >
          <Power size={11} />
          {formData.status === 'down' ? 'OFFLINE' : 'ONLINE'}
        </button>
      </div>

      {/* Tabs for Routers */}
      {isRouter && (
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '0 0.5rem' }}>
          <button
            onClick={() => setActiveTab('interfaces')}
            style={{
              flex: 1,
              padding: '0.5rem 0',
              fontSize: '0.75rem',
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
              fontSize: '0.75rem',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'routing' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'routing' ? 'var(--primary)' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            Routing Table
          </button>
        </div>
      )}

      {/* Body Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        {/* Device Name Field (Common) */}
        <div className="input-group">
          <label className="input-label">Device Name</label>
          <input
            type="text"
            className="input-field"
            value={formData.name || ''}
            onChange={(e) => handleFieldChange('name', e.target.value)}
          />
        </div>

        {/* 1. End Device Configuration (PC, Laptop, Server, Printer) */}
        {isEndDevice && (
          <>
            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="input-label">IPv4 Address</label>
                {formData.ip && (
                  isIpValid ? (
                    <span style={{ fontSize: '0.68rem', color: 'var(--success)' }}>✓ Valid</span>
                  ) : (
                    <span style={{ fontSize: '0.68rem', color: 'var(--danger)' }}>✕ Invalid</span>
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
                    <span style={{ fontSize: '0.68rem', color: 'var(--success)' }}>✓ Valid</span>
                  ) : (
                    <span style={{ fontSize: '0.68rem', color: 'var(--danger)' }}>✕ Invalid</span>
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
                    <span style={{ fontSize: '0.68rem', color: 'var(--success)' }}>✓ OK</span>
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
                  Gateway must be on the same subnet as the host IP!
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

            <div className="input-group">
              <label className="input-label">VLAN Tag</label>
              <input
                type="text"
                className="input-field"
                placeholder="1"
                value={formData.vlan || ''}
                onChange={(e) => handleFieldChange('vlan', e.target.value)}
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
              Static Routes
            </div>

            {/* Existing Routes */}
            {(formData.routingTable || []).length === 0 ? (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '1rem' }}>
                No static routes configured. Only directly connected networks reachable.
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
                        via {route.nextHop} ({route.interface})
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
                <label style={{ fontSize: '0.65rem' }}>Destination Network</label>
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
                <label style={{ fontSize: '0.65rem' }}>Next Hop IP</label>
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

        {/* 4. Switch Ports */}
        {isSwitch && (
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Switch Ports & VLANs
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
                <input
                  type="text"
                  className="input-field"
                  style={{ height: '24px', fontSize: '0.7rem', padding: '0 6px' }}
                  placeholder="VLAN (e.g. 10 or Trunk)"
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

        {/* 5. Firewall Security Rules */}
        {isFirewall && (
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Firewall Access Rules
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
                  Target: {rule.destIp || 'Any Destination'}
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
      </div>

      {/* Delete Device Action */}
      <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border-color)' }}>
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
