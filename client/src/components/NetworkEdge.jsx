import React, { memo } from 'react';
import { getBezierPath, EdgeLabelRenderer, BaseEdge } from 'reactflow';
import { useNetwork } from '../context/NetworkContext';
import { X } from 'lucide-react';

const NetworkEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data = {},
  selected
}) => {
  const { activeEdgeId, deleteEdge } = useNetwork();
  const isActive = activeEdgeId === id;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  });

  const linkType = data.linkType || 'ethernet';
  const status = data.status || 'connected';

  let strokeColor = '#3b82f6'; // Ethernet default
  let strokeDasharray = undefined;

  if (status === 'down') {
    strokeColor = '#ef4444';
  } else if (linkType === 'fiber') {
    strokeColor = '#f59e0b';
    strokeDasharray = '6,4';
  } else if (linkType === 'wireless') {
    strokeColor = '#06b6d4';
    strokeDasharray = '3,5';
  }

  if (isActive) {
    strokeColor = '#ec4899';
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth: selected || isActive ? 3.5 : 2.2,
          strokeDasharray: strokeDasharray,
          filter: isActive ? 'drop-shadow(0 0 8px #ec4899)' : selected ? 'drop-shadow(0 0 4px #3b82f6)' : undefined,
          transition: 'stroke 0.2s, stroke-width 0.2s'
        }}
      />

      {/* Pulsing animated packet traveling on edge */}
      {isActive && (
        <circle r="6" fill="#ec4899" filter="drop-shadow(0 0 6px #ec4899)">
          <animateMotion dur="0.6s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
            display: selected ? 'flex' : 'none',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: 'var(--bg-secondary)',
            padding: '2px 6px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            fontSize: '0.65rem',
            boxShadow: 'var(--shadow-sm)'
          }}
          className="nodrag nopan"
        >
          <span style={{ textTransform: 'capitalize', color: strokeColor, fontWeight: 600 }}>
            {linkType}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteEdge(id);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--danger)'
            }}
            title="Disconnect Link"
          >
            <X size={12} />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default memo(NetworkEdge);
