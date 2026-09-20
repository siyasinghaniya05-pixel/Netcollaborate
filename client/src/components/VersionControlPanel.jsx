import React, { useState, useEffect } from 'react';
import {
  History,
  Camera,
  GitCompare,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  MinusCircle,
  Edit3,
  Clock,
  User,
  Layers,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { useNetwork } from '../context/NetworkContext';

const VersionControlPanel = () => {
  const {
    network,
    nodes,
    edges,
    diagnostics,
    snapshots,
    fetchSnapshots,
    takeSnapshot,
    revertToSnapshot,
    compareVersions,
    diffResult,
    setDiffResult,
    isLoadingSnapshots
  } = useNetwork();

  const [snapshotName, setSnapshotName] = useState('');
  const [snapshotDesc, setSnapshotDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [comparingSnapshotId, setComparingSnapshotId] = useState(null);
  const [restoringId, setRestoringId] = useState(null);
  const [confirmRestoreId, setConfirmRestoreId] = useState(null);
  const [activeTab, setActiveTab] = useState('timeline'); // 'timeline' | 'diff'

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  const handleCreateSnapshot = async (e) => {
    e.preventDefault();
    if (!snapshotName.trim()) return;
    setIsCreating(true);
    await takeSnapshot(snapshotName.trim(), snapshotDesc.trim());
    setSnapshotName('');
    setSnapshotDesc('');
    setIsCreating(false);
  };

  const handleCompare = async (snapshotId) => {
    setComparingSnapshotId(snapshotId);
    setActiveTab('diff');
    await compareVersions(snapshotId, 'current');
  };

  const handleRestore = async (snapshotId) => {
    setRestoringId(snapshotId);
    await revertToSnapshot(snapshotId);
    setRestoringId(null);
    setConfirmRestoreId(null);
    setDiffResult(null);
    setActiveTab('timeline');
  };

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
      {/* Left Column: Create Snapshot & Snapshot Timeline (360px wide) */}
      <div
        style={{
          width: '380px',
          minWidth: '340px',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-secondary)'
        }}
      >
        {/* Form: Create Checkpoint */}
        <div
          style={{
            padding: '0.85rem 1rem',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-tertiary)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
              <Camera size={14} color="var(--primary)" />
              <span>Capture Snapshot Checkpoint</span>
            </div>
            <span
              style={{
                fontSize: '0.7rem',
                padding: '2px 6px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: diagnostics?.healthScore >= 90 ? 'var(--success-light)' : 'var(--warning-light)',
                color: diagnostics?.healthScore >= 90 ? 'var(--success)' : 'var(--warning)',
                fontWeight: 600
              }}
            >
              Health: {diagnostics?.healthScore ?? 100}%
            </span>
          </div>

          <form onSubmit={handleCreateSnapshot} style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Checkpoint name (e.g., Pre-OSPF migration, Lab 2 Start)"
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
              style={{ fontSize: '0.75rem', height: '28px', padding: '0 8px' }}
              disabled={isCreating}
            />
            <div style={{ display: 'flex', gap: '0.45rem' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Optional description / notes..."
                value={snapshotDesc}
                onChange={(e) => setSnapshotDesc(e.target.value)}
                style={{ fontSize: '0.72rem', height: '28px', padding: '0 8px', flex: 1 }}
                disabled={isCreating}
              />
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={!snapshotName.trim() || isCreating}
                style={{ fontSize: '0.72rem', whiteSpace: 'nowrap', height: '28px' }}
              >
                <Camera size={12} />
                <span>{isCreating ? 'Saving...' : 'Capture'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Timeline Header */}
        <div
          style={{
            padding: '0.45rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-color)',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            fontWeight: 600
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <History size={13} />
            <span>Version History ({snapshots.length})</span>
          </div>
          <button
            onClick={fetchSnapshots}
            className="btn btn-ghost btn-icon btn-sm"
            style={{ width: '22px', height: '22px', padding: 0 }}
            title="Refresh snapshots"
          >
            <RefreshCw size={12} className={isLoadingSnapshots ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Snapshots List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
          {snapshots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              <History size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
              <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No snapshots captured yet</p>
              <p style={{ fontSize: '0.7rem' }}>Take a checkpoint to track network modifications and compare changes.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {snapshots.map((snap) => {
                const isSelected = comparingSnapshotId === snap.id;
                const formattedTime = new Date(snap.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                });
                const formattedDate = new Date(snap.createdAt).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric'
                });

                return (
                  <div
                    key={snap.id}
                    style={{
                      padding: '0.6rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: isSelected ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                      border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'border-color 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {snap.name}
                        </div>
                        {snap.description && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {snap.description}
                          </div>
                        )}
                      </div>

                      <span
                        style={{
                          fontSize: '0.65rem',
                          padding: '1px 5px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-secondary)',
                          fontWeight: 600,
                          flexShrink: 0
                        }}
                      >
                        {snap.stats?.nodeCount ?? snap.nodes?.length ?? 0} devs
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{formattedDate} {formattedTime}</span>
                        <span>•</span>
                        <span>{snap.author || 'Collaborator'}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          onClick={() => handleCompare(snap.id)}
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: '0.68rem', padding: '2px 6px', height: '22px' }}
                          title="Compare with active canvas"
                        >
                          <GitCompare size={11} />
                          <span>Diff</span>
                        </button>

                        {confirmRestoreId === snap.id ? (
                          <div style={{ display: 'flex', gap: '2px' }}>
                            <button
                              onClick={() => handleRestore(snap.id)}
                              className="btn btn-primary btn-sm"
                              style={{ fontSize: '0.65rem', padding: '2px 5px', height: '22px', backgroundColor: 'var(--danger)' }}
                              disabled={restoringId === snap.id}
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmRestoreId(null)}
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: '0.65rem', padding: '2px 5px', height: '22px' }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmRestoreId(snap.id)}
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: '0.68rem', padding: '2px 6px', height: '22px', color: 'var(--warning)' }}
                            title="Restore this version"
                          >
                            <RotateCcw size={11} />
                            <span>Restore</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Visual Diff & Comparison Viewer */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Diff Navigation Bar */}
        <div
          style={{
            padding: '0.5rem 1rem',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-tertiary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GitCompare size={15} color="var(--primary)" />
            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>
              {diffResult
                ? `Diff: ${diffResult.baseline?.name} → ${diffResult.target?.name}`
                : 'Select a snapshot on the left to inspect differences'}
            </span>
          </div>

          {diffResult && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: diffResult.diff?.hasChanges ? 'var(--warning-light)' : 'var(--success-light)',
                  color: diffResult.diff?.hasChanges ? 'var(--warning)' : 'var(--success)',
                  fontWeight: 600
                }}
              >
                {diffResult.diff?.hasChanges
                  ? `${diffResult.diff?.totalChanges} change(s) discovered`
                  : 'Identical (0 changes)'}
              </span>

              {comparingSnapshotId && (
                <button
                  onClick={() => handleRestore(comparingSnapshotId)}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.72rem', height: '26px' }}
                >
                  <RotateCcw size={12} />
                  <span>Restore Snapshot</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Diff Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {!diffResult ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <GitCompare size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Visual Network Diff Comparison
              </h4>
              <p style={{ fontSize: '0.78rem', maxWidth: '440px', margin: '0 auto' }}>
                Compare any past snapshot against your active network canvas. You'll see newly added devices, removed nodes, modified IP/routing configurations, and altered physical links.
              </p>
            </div>
          ) : !diffResult.diff?.hasChanges ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={36} color="var(--success)" style={{ margin: '0 auto 0.75rem' }} />
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                Zero Topology Changes
              </h4>
              <p style={{ fontSize: '0.78rem' }}>
                The selected snapshot exactly matches the active network topology.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '900px' }}>
              {/* Summary KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                <div style={{ padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Added Devices</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--success)' }}>
                    +{diffResult.diff.summary.addedNodesCount}
                  </div>
                </div>

                <div style={{ padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Removed Devices</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--danger)' }}>
                    -{diffResult.diff.summary.removedNodesCount}
                  </div>
                </div>

                <div style={{ padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Config Changes</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--warning)' }}>
                    ~{diffResult.diff.summary.modifiedNodesCount}
                  </div>
                </div>

                <div style={{ padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Link / Edge Changes</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>
                    {diffResult.diff.summary.addedEdgesCount + diffResult.diff.summary.removedEdgesCount + diffResult.diff.summary.modifiedEdgesCount}
                  </div>
                </div>
              </div>

              {/* Added Nodes */}
              {diffResult.diff.nodes.added.length > 0 && (
                <div style={{ backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--success)', marginBottom: '0.5rem' }}>
                    <PlusCircle size={14} />
                    <span>Added Devices ({diffResult.diff.nodes.added.length})</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                    {diffResult.diff.nodes.added.map(n => (
                      <div key={n.id} style={{ padding: '0.5rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.72rem' }}>
                        <div style={{ fontWeight: 700 }}>{n.name}</div>
                        <div style={{ color: 'var(--text-muted)' }}>Type: {n.type} | IP: {n.ip}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Removed Nodes */}
              {diffResult.diff.nodes.removed.length > 0 && (
                <div style={{ backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--danger)', marginBottom: '0.5rem' }}>
                    <MinusCircle size={14} />
                    <span>Removed Devices ({diffResult.diff.nodes.removed.length})</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                    {diffResult.diff.nodes.removed.map(n => (
                      <div key={n.id} style={{ padding: '0.5rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.72rem' }}>
                        <div style={{ fontWeight: 700 }}>{n.name}</div>
                        <div style={{ color: 'var(--text-muted)' }}>Type: {n.type} | IP: {n.ip}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modified Nodes (Config Differences) */}
              {diffResult.diff.nodes.modified.length > 0 && (
                <div style={{ backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--warning)', marginBottom: '0.5rem' }}>
                    <Edit3 size={14} />
                    <span>Configuration Changes ({diffResult.diff.nodes.modified.length} device(s))</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {diffResult.diff.nodes.modified.map(n => (
                      <div key={n.id} style={{ padding: '0.55rem 0.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: '0.35rem' }}>
                          {n.name} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({n.type})</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {n.changes.map((c, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem' }}>
                              <span style={{ width: '110px', color: 'var(--text-muted)', fontWeight: 600 }}>{c.field}:</span>
                              <span style={{ color: 'var(--danger)', textDecoration: 'line-through' }}>{c.before}</span>
                              <ArrowRight size={11} color="var(--text-muted)" />
                              <span style={{ color: 'var(--success)', fontWeight: 700 }}>{c.after}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Edge Differences */}
              {(diffResult.diff.edges.added.length > 0 || diffResult.diff.edges.removed.length > 0 || diffResult.diff.edges.modified.length > 0) && (
                <div style={{ backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                    Physical Links & Connection Diffs
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.72rem' }}>
                    {diffResult.diff.edges.added.map(e => (
                      <div key={e.id} style={{ color: 'var(--success)' }}>
                        + Added Link: {e.source} ↔ {e.target} ({e.linkType})
                      </div>
                    ))}
                    {diffResult.diff.edges.removed.map(e => (
                      <div key={e.id} style={{ color: 'var(--danger)' }}>
                        - Removed Link: {e.source} ↔ {e.target}
                      </div>
                    ))}
                    {diffResult.diff.edges.modified.map(e => (
                      <div key={e.id} style={{ color: 'var(--warning)' }}>
                        ~ Modified Link: {e.source} ↔ {e.target} ({e.changes.map(c => `${c.field}: ${c.before} -> ${c.after}`).join(', ')})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VersionControlPanel;
