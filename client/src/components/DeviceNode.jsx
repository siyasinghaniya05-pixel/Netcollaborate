import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import {
  Monitor,
  Laptop,
  Server,
  Printer,
  Router as RouterIcon,
  Network,
  Share2,
  Shield,
  Wifi,
  Cloud,
  Globe
} from 'lucide-react';
import { useNetwork } from '../context/NetworkContext';

const getDeviceIcon = (type) => {
  switch ((type || '').toLowerCase()) {
    case 'pc':
      return <Monitor size={18} />;
    case 'laptop':
      return <Laptop size={18} />;
    case 'server':
      return <Server size={18} />;
    case 'printer':
      return <Printer size={18} />;
    case 'router':
      return <Globe size={18} />;
    case 'switch':
      return <Network size={18} />;
    case 'hub':
      return <Share2 size={18} />;
    case 'firewall':
      return <Shield size={18} />;
    case 'accesspoint':
      return <Wifi size={18} />;
    case 'cloud':
    case 'internet':
      return <Cloud size={18} />;
    default:
      return <Monitor size={18} />;
  }
};

const DeviceNode = ({ id, data, selected }) => {
  const { activeNodeId } = useNetwork();
  const isActivePacket = activeNodeId === id;

  const isUp = data.status !== 'down';
  const type = (data.type || 'pc').toLowerCase();

  // Primary display IP
  let displayIP = data.ip;
  if (type === 'router' && (!displayIP || displayIP === '')) {
    const firstIface = (data.interfaces || []).find(i => i.ip);
    displayIP = firstIface ? firstIface.ip : 'Unconfigured';
  } else if (['switch', 'hub'].includes(type)) {
    displayIP = `VLAN 1`;
  }

  return (
    <div
      className={`device-node ${selected ? 'selected' : ''} ${isActivePacket ? 'active-packet' : ''}`}
      style={{
        opacity: isUp ? 1 : 0.6,
        filter: isUp ? 'none' : 'grayscale(0.8)'
      }}
    >
      {/* Handles on all 4 sides for seamless link creation */}
      <Handle type="target" position={Position.Top} id="top" />
      <Handle type="source" position={Position.Right} id="right" />
      <Handle type="target" position={Position.Bottom} id="bottom" />
      <Handle type="source" position={Position.Left} id="left" />

      <div className="device-node-header">
        <div className="device-icon-wrapper">
          {getDeviceIcon(type)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="device-node-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {data.name || id}
          </div>
          <div className="device-node-sub">
            {displayIP || 'No IP'}
          </div>
        </div>

        <span className={`status-dot ${isUp ? 'up' : 'down'}`} title={isUp ? 'Operational' : 'Down'} />
      </div>

      {isActivePacket && (
        <div
          style={{
            fontSize: '0.65rem',
            color: 'var(--warning)',
            fontWeight: 700,
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginTop: '2px'
          }}
        >
          ● Transmitting
        </div>
      )}
    </div>
  );
};

export default memo(DeviceNode);
