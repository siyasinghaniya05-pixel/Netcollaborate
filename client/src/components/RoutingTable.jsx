import React, { useState } from 'react';
import {
  Network,
  Table2,
  Plus,
  Trash2,
  Pencil,
  Check,
  Link2,
  Info
} from 'lucide-react';
import { useNetwork } from '../context/NetworkContext';
import { isValidIPv4, isValidSubnetMask, maskToCIDR } from '../utils/networkMath';

const EMPTY_ROUTE = { destination: '', mask: '255.255.255.0', nextHop: '', interface: 'G0/0', metric: 1 };

const RoutingTable = () => {
  const { nodes, selectedNode, setSelectedNode, updateDeviceConfig } = useNetwork();

  const device = selectedNode && selectedNode.data?.type === 'router'
    ? selectedNode
    : nodes.find((n) => n.data?.type === 'router') || null;

  const [editingIndex, setEditingIndex] = useState(-1);
  const [draft, setDraft] = useState(EMPTY_ROUTE);
  const [error, setError] = useState('');

  if (!device) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
        <Network size={16} /> Add a Router to the canvas to view and edit its routing table.
      </div>
    );
  }

  const routes = device.data?.routingTable || [];
  const interfaces = device.data?.interfaces || [];

  const saveRoutes = (nextRoutes) => {
    updateDeviceConfig(device.id, { routingTable: nextRoutes });
  };

  const addRoute = () => {
    if (!isValidIPv4(draft.destination) && draft.destination !== '0.0.0.0') {
      setError('Destination must be a valid network address or 0.0.0.0 for default.');
      return;
    }
    if (!isValidSubnetMask(draft.mask)) {
      setError('Subnet mask is invalid (must be a valid contiguous mask).');
      return;
    }
    if (!isValidIPv4(draft.nextHop) && draft.nextHop !== '0.0.0.0') {
      setError('Next hop must be a valid IPv4 address (use 0.0.0.0 for a direct/connected route).');
      return;
    }
    const i = draft.interface;
    if (interfaces.length > 0 && !interfaces.some((iface) => iface.name === i)) {
      setError(`Interface ${i} does not exist on this router.`);
      return;
    }
    setError('');

    const next = [...routes, { ...draft, destination: draft.destination || '0.0.0.0' }];
    saveRoutes(next);
    setDraft(EMPTY_ROUTE);
  };

  const updateRoute = (index) => {
    if (!isValidIPv4(draft.destination) && draft.destination !== '0.0.0.0') {
      setError('Destination is invalid.');
      return;
    }
    if (!isValidSubnetMask(draft.mask)) {
      setError('Subnet mask is invalid.');
      return;
    }
    setError('');
    const next = routes.map((r, i) => (i === index ? { ...draft } : r));
    saveRoutes(next);
    setEditingIndex(-1);
    setDraft(EMPTY_ROUTE);
  };

  const deleteRoute = (index) => {
    saveRoutes(routes.filter((_, i) => i !== index));
  };

  const startEdit = (index) => {
    setDraft({ ...routes[index] });
    setEditingIndex(index);
    setError('');
  };

  const startAdd = () => {
    setDraft({
      ...EMPTY_ROUTE,
      interface: interfaces[0]?.name || 'G0/0'
    });
    setEditingIndex(-2);
    setError('');
  };

  const selectRouter = (id) => setSelectedNode(nodes.find((n) => n.id === id));

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Routing table editor */}
      <div
        style={{
          width: '58%',
          padding: '0.9rem',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
          overflowY: 'auto'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Table2 size={15} color="var(--primary)" />
          <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>ROUTING TABLE</span>
          <select
            className="input-field"
            style={{ marginLeft: 'auto', width: 'auto', fontSize: '0.7rem', padding: '3px 8px' }}
            value={device.id}
            onChange={(e) => selectRouter(e.target.value)}
          >
            {nodes.filter((n) => n.data?.type === 'router').map((r) => (
              <option key={r.id} value={r.id}>{r.data?.name}</option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          Editing <b style={{ color: 'var(--primary)' }}>{device.data?.name}</b> — routes are used by the packet simulator
          for cross-subnet forwarding decisions.
        </div>

        {/* Route rows */}
        {routes.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', padding: '0.4rem 0' }}>
            No routes configured. Click <b>Add Route</b> to populate the table.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {routes.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 120px 120px 80px 50px 70px',
                gap: '0.3rem',
                fontSize: '0.62rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                padding: '0 0.3rem'
              }}
            >
              <span>Destination</span><span>Mask (/cidr)</span><span>Next Hop</span><span>Iface</span><span>Metric</span><span style={{ textAlign: 'right' }}>Actions</span>
            </div>
          )}

          {routes.map((route, idx) => {
            const isDefault = route.destination === '0.0.0.0';
            const isEditing = editingIndex === idx;
            return isEditing ? (
              <RouteForm
                key={idx}
                route={draft}
                setRoute={setDraft}
                interfaces={interfaces}
                error={error}
                onSave={() => updateRoute(idx)}
                onCancel={() => { setEditingIndex(-1); setError(''); }}
              />
            ) : (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 120px 120px 80px 50px 70px',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.35rem 0.3rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.73rem'
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)' }}>
                  {isDefault ? '0.0.0.0' : route.destination}
                  {isDefault && <span className="badge badge-primary" style={{ marginLeft: '4px', fontSize: '0.55rem' }}>default</span>}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  {route.mask} <span style={{ color: 'var(--text-muted)', fontSize: '0.62rem' }}>/ {maskToCIDR(route.mask)}</span>
                </span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{route.nextHop === '0.0.0.0' ? 'Direct' : route.nextHop}</span>
                <span style={{ fontSize: '0.68rem' }}>{route.interface}</span>
                <span>{route.metric ?? 1}</span>
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                  <button className="btn btn-ghost btn-icon btn-sm" title="Edit" onClick={() => startEdit(idx)}>
                    <Pencil size={13} />
                  </button>
                  <button className="btn btn-ghost btn-icon btn-sm" title="Delete" onClick={() => deleteRoute(idx)}>
                    <Trash2 size={13} style={{ color: 'var(--danger)' }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {editingIndex === -2 && (
          <RouteForm
            route={draft}
            setRoute={setDraft}
            interfaces={interfaces}
            error={error}
            onSave={addRoute}
            onCancel={() => { setEditingIndex(-1); setError(''); }}
          />
        )}

        <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={startAdd}>
          <Plus size={13} /> Add Route
        </button>
      </div>

      {/* Right: interfaces + explanation */}
      <div style={{ width: '42%', padding: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
          <Link2 size={15} color="var(--primary)" /> INTERFACES
        </div>
        {interfaces.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No interfaces configured.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {interfaces.map((iface, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.4rem 0.6rem',
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.72rem'
                }}
              >
                <span style={{ fontWeight: 700 }}>{iface.name}</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>{iface.ip || 'unassigned'}/{maskToCIDR(iface.mask)}</span>
                <span className={`badge ${iface.status === 'up' ? 'badge-success' : 'badge-danger'}`} style={{ marginLeft: 'auto', fontSize: '0.6rem' }}>
                  {iface.status || 'down'}
                </span>
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            padding: '0.6rem 0.7rem',
            fontSize: '0.7rem',
            lineHeight: 1.55,
            color: 'var(--text-secondary)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700, marginBottom: '0.3rem' }}>
            <Info size={13} color="var(--primary)" /> HOW ROUTES ARE MATCHED
          </div>
          When a packet arrives, the router performs a <b>longest-prefix match</b>: every route whose network (destination AND mask)
          contains the packet's destination IP is a candidate, and the route with the largest prefix (/cidr) wins.
          A <b>default route (0.0.0.0/0)</b> matches everything and is used only when no more specific route exists.
          Connected routes (next hop <b>Direct</b>, i.e. 0.0.0.0) are the router's own subnets.
        </div>
      </div>
    </div>
  );
};

const RouteForm = ({ route, setRoute, interfaces, error, onSave, onCancel }) => {
  const set = (key) => (e) => setRoute({ ...route, [key]: e.target.value });

  return (
    <div
      style={{
        display: 'grid',
        gap: '0.35rem',
        padding: '0.5rem 0.5rem',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: 'var(--bg-active, #f4f7fb)',
        border: '1px solid var(--primary)',
        fontSize: '0.72rem'
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '150px 130px 130px 110px 50px', gap: '0.35rem' }}>
        <label>
          <div className="input-label">Destination</div>
          <input className="input-field" placeholder="192.168.3.0" value={route.destination} onChange={set('destination')} />
        </label>
        <label>
          <div className="input-label">Subnet Mask</div>
          <input className="input-field" value={route.mask} onChange={set('mask')} />
        </label>
        <label>
          <div className="input-label">Next Hop</div>
          <input className="input-field" placeholder="0.0.0.0 = Direct" value={route.nextHop} onChange={set('nextHop')} />
        </label>
        <label>
          <div className="input-label">Interface</div>
          <select className="input-field" value={route.interface} onChange={set('interface')}>
            {interfaces.length === 0 && <option value="">—</option>}
            {interfaces.map((iface) => <option key={iface.name} value={iface.name}>{iface.name}</option>)}
          </select>
        </label>
        <label>
          <div className="input-label">Metric</div>
          <input className="input-field" type="number" min={1} value={route.metric ?? 1} onChange={set('metric')} />
        </label>
      </div>

      {error && <div style={{ color: 'var(--danger)', fontSize: '0.68rem' }}>{error}</div>}

      <div style={{ display: 'flex', gap: '0.4rem' }}>
        <button className="btn btn-primary btn-sm" onClick={onSave} style={{ fontSize: '0.68rem' }}>
          <Check size={12} /> Save Route
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel} style={{ fontSize: '0.68rem' }}>Cancel</button>
      </div>
    </div>
  );
};

export default RoutingTable;