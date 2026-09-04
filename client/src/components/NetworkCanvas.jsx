import React, { useRef, useCallback, useMemo } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useReactFlow,
  ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';

import DeviceNode from './DeviceNode';
import NetworkEdge from './NetworkEdge';
import { useNetwork } from '../context/NetworkContext';
import { getSocket } from '../services/socket';
import { Navigation } from 'lucide-react';

const nodeTypes = {
  deviceNode: DeviceNode
};

const edgeTypes = {
  networkEdge: NetworkEdge
};

const NetworkCanvasInner = () => {
  const reactFlowWrapper = useRef(null);
  const reactFlowInstance = useReactFlow();

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setSelectedNode,
    addDevice,
    deleteDevice,
    saveNetwork,
    undo,
    redo,
    cursors,
    network,
    theme
  } = useNetwork();

  // Drag and Drop from Sidebar
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const deviceType = event.dataTransfer.getData('application/netcollaborate-device');
      if (!deviceType) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top
      });

      addDevice(deviceType, position);
    },
    [reactFlowInstance, addDevice]
  );

  // Throttled Collaborative Cursor Tracking
  const lastCursorEmitRef = useRef(0);
  const onMouseMove = useCallback(
    (e) => {
      const now = Date.now();
      if (now - lastCursorEmitRef.current > 40 && reactFlowWrapper.current && network?.roomId) {
        lastCursorEmitRef.current = now;
        const rect = reactFlowWrapper.current.getBoundingClientRect();
        const flowPos = reactFlowInstance.project({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });

        const socket = getSocket();
        socket.emit('cursor-move', {
          roomId: network.roomId,
          cursor: flowPos
        });
      }
    },
    [reactFlowInstance, network?.roomId]
  );

  // Keyboard Shortcuts (Delete, Ctrl+S, Ctrl+Z, Ctrl+Y)
  const onKeyDown = useCallback(
    (event) => {
      if (['input', 'textarea', 'select'].includes(document.activeElement.tagName.toLowerCase())) {
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        const selected = nodes.find(n => n.selected);
        if (selected) {
          deleteDevice(selected.id);
        }
      } else if (event.ctrlKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveNetwork();
      } else if (event.ctrlKey && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        undo();
      } else if (event.ctrlKey && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
      }
    },
    [nodes, deleteDevice, saveNetwork, undo, redo]
  );

  const onNodeClick = useCallback((_, node) => {
    setSelectedNode(node);
  }, [setSelectedNode]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  return (
    <div
      ref={reactFlowWrapper}
      className="canvas-wrapper"
      onDrop={onDrop}
      onDragOver={onDragOver}
      onMouseMove={onMouseMove}
      onKeyDown={onKeyDown}
      tabIndex={0}
      style={{ outline: 'none' }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        defaultEdgeOptions={{ type: 'networkEdge' }}
      >
        <Controls showInteractive={false} />
        <MiniMap
          nodeStrokeColor={(n) => (n.type === 'deviceNode' ? '#3b82f6' : '#94a3b8')}
          nodeColor={(n) => (n.selected ? '#3b82f6' : 'rgba(30, 41, 59, 0.8)')}
          nodeBorderRadius={4}
          maskColor={theme === 'dark' ? 'rgba(10, 13, 20, 0.7)' : 'rgba(240, 243, 246, 0.7)'}
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)'
          }}
        />
        <Background
          color={theme === 'dark' ? '#334155' : '#cbd5e1'}
          gap={24}
          size={1.5}
        />
      </ReactFlow>

      {/* Render Remote Collaborator Cursors */}
      {Object.entries(cursors).map(([socketId, c]) => {
        if (!c?.cursor) return null;
        // Project flow position back to screen position
        const screenPos = reactFlowInstance.flowToScreenPosition(c.cursor);
        const bounds = reactFlowWrapper.current?.getBoundingClientRect();
        if (!bounds) return null;

        const left = screenPos.x - bounds.left;
        const top = screenPos.y - bounds.top;

        return (
          <div
            key={socketId}
            className="collaborator-cursor"
            style={{
              left: `${left}px`,
              top: `${top}px`,
              transform: 'translate(-2px, -2px)'
            }}
          >
            <Navigation
              size={18}
              fill={c.avatarColor || '#3b82f6'}
              color="#ffffff"
              style={{ transform: 'rotate(-45deg)' }}
            />
            <div
              className="collaborator-cursor-tag"
              style={{ backgroundColor: c.avatarColor || '#3b82f6' }}
            >
              {c.name}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const NetworkCanvas = () => {
  return (
    <ReactFlowProvider>
      <NetworkCanvasInner />
    </ReactFlowProvider>
  );
};

export default NetworkCanvas;
