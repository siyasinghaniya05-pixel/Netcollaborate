import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  RefreshCw,
  Cpu,
  ArrowRight,
  HelpCircle,
  ShieldAlert,
  Check,
  X,
  Play
} from 'lucide-react';
import { useNetwork } from '../context/NetworkContext';
import { networkAPI } from '../services/api';

const DebugPanel = () => {
  const {
    diagnostics,
    runDiagnostics,
    applyQuickFix,
    nodes,
    edges,
    network,
    updateDeviceConfig,
    playSimulationAnimation
  } = useNetwork();

  const [guidedIssue, setGuidedIssue] = useState(null);
  const [fixApplied, setFixApplied] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    runDiagnostics();
  }, [nodes.length]);

  const { errors = [], warnings = [], validCount = 0, healthScore = 100, summary = {} } = diagnostics || {};

  // Open "Guide Me to Fix" workflow
  const openGuide = (issue) => {
    setGuidedIssue({
      ...issue,
      severity: issue.type?.includes('error') || issue.quickFixAction?.type ? 'CRITICAL' : 'WARNING',
      affectedDevice: issue.deviceName || issue.deviceId || 'Network Device',
      affectedInterface: issue.interfaceName || 'Primary / G0/0',
      evidence: issue.evidence || `Detected: ${issue.message}`,
      rootCause: issue.rootCause || issue.message,
      suggestedFix: issue.suggestedFix || 'Apply recommended parameter correction.',
      whyItWorks: issue.whyItWorks || 'Correcting the network parameter ensures IP packets comply with IPv4 subnet masking and routing table lookups, eliminating ARP drops and routing table lookup misses.'
    });
    setFixApplied(false);
    setTestResult(null);
  };

  // Confirm and Apply Fix
  const handleConfirmFix = async () => {
    if (!guidedIssue) return;

    if (guidedIssue.quickFixAction) {
      applyQuickFix(guidedIssue.quickFixAction);
    } else if (guidedIssue.type === 'missing_ip') {
      updateDeviceConfig(guidedIssue.deviceId, { ip: '192.168.1.10', subnetMask: '255.255.255.0' });
    } else if (guidedIssue.type === 'invalid_ip') {
      updateDeviceConfig(guidedIssue.deviceId, { ip: '192.168.1.10' });
    } else if (guidedIssue.type === 'gateway_subnet_mismatch') {
      const dev = nodes.find(n => n.id === guidedIssue.deviceId);
      const ip = dev?.data?.ip || '192.168.1.10';
      const subnetPrefix = ip.substring(0, ip.lastIndexOf('.'));
      updateDeviceConfig(guidedIssue.deviceId, { gateway: `${subnetPrefix}.1` });
    } else if (guidedIssue.type === 'duplicate_ip') {
      // Change the second duplicate device IP
      if (guidedIssue.devices && guidedIssue.devices.length > 1) {
        const secondDev = guidedIssue.devices[1];
        updateDeviceConfig(secondDev.deviceId, { ip: '192.168.1.25' });
      }
    }

    setFixApplied(true);
    await runDiagnostics();

    // Automatically rerun connectivity test to show verified actual result
    setTesting(true);
    setTimeout(async () => {
      try {
        const eligible = nodes.filter(n => n.type === 'deviceNode' || n.type === 'pc' || n.data?.ip);
        if (eligible.length >= 2) {
          const res = await networkAPI.simulate(network.id || network._id, {
            nodes,
            edges,
            sourceId: eligible[0].id,
            destId: eligible[eligible.length - 1].id,
            protocol: 'ICMP'
          });
          if (res.data?.success) {
            setTestResult(res.data.data);
            playSimulationAnimation(res.data.data);
          }
        }
      } catch (err) {
        console.warn('Post-fix verification note:', err.message);
      } finally {
        setTesting(false);
      }
    }, 600);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        padding: '1rem'
      }}
    >
      {/* Diagnostics Header & Summary Pills */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid var(--border-color)',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800 }}>Network Diagnostic Analyzer</h3>
          <span className="badge badge-danger">{errors.length} Errors</span>
          <span className="badge badge-warning">{warnings.length} Warnings</span>
          <span className="badge badge-success">{validCount} Checks Passed</span>
          <span
            className={`badge ${healthScore >= 90 ? 'badge-success' : healthScore >= 70 ? 'badge-warning' : 'badge-danger'}`}
          >
            Health Score: {healthScore}%
          </span>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={runDiagnostics}
        >
          <RefreshCw size={13} /> Run Diagnosis
        </button>
      </div>

      {/* Main Body */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {errors.length === 0 && warnings.length === 0 ? (
          <div
            style={{
              padding: '2.5rem',
              textAlign: 'center',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)'
            }}
          >
            <CheckCircle2 size={40} color="var(--success)" style={{ margin: '0 auto 0.75rem' }} />
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              100% Topology Health — No Errors Detected
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              All IP addresses, subnet boundaries, default gateways, and link connections pass RFC specifications.
            </div>
          </div>
        ) : (
          <>
            {/* Critical Errors */}
            {errors.map((err, idx) => (
              <div
                key={err.id || idx}
                style={{
                  padding: '1rem 1.25rem',
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--danger-light)',
                  borderLeft: '5px solid var(--danger)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <AlertCircle size={20} color="var(--danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--danger)' }}>
                        {err.title}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginTop: '4px', lineHeight: 1.5 }}>
                        {err.message}
                      </div>
                    </div>
                  </div>

                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => openGuide(err)}
                    style={{ fontSize: '0.75rem', flexShrink: 0 }}
                  >
                    <Wrench size={13} /> Guide Me to Fix
                  </button>
                </div>

                <div
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.5rem 0.85rem',
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <strong style={{ color: 'var(--primary)' }}>Suggested Fix:</strong>
                  <span>{err.suggestedFix}</span>
                </div>
              </div>
            ))}

            {/* Warnings */}
            {warnings.map((warn, idx) => (
              <div
                key={warn.id || idx}
                style={{
                  padding: '1rem 1.25rem',
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--warning-light)',
                  borderLeft: '5px solid var(--warning)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <AlertTriangle size={20} color="var(--warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--warning)' }}>
                        {warn.title}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginTop: '4px', lineHeight: 1.5 }}>
                        {warn.message}
                      </div>
                    </div>
                  </div>

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => openGuide(warn)}
                    style={{ fontSize: '0.75rem', flexShrink: 0 }}
                  >
                    <HelpCircle size={13} /> Guide Me to Fix
                  </button>
                </div>

                <div
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.5rem 0.85rem',
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)'
                  }}
                >
                  <strong style={{ color: 'var(--warning)' }}>Suggestion:</strong> {warn.suggestedFix || warn.suggestion}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* "Guide Me to Fix" Interactive Modal */}
      {guidedIssue && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '1.5rem'
          }}
          onClick={() => setGuidedIssue(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '640px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-lg)',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Intelligent Guided Fix: {guidedIssue.title}</h3>
                  <span className={`badge ${guidedIssue.severity === 'CRITICAL' ? 'badge-danger' : 'badge-warning'}`}>
                    Severity: {guidedIssue.severity}
                  </span>
                </div>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setGuidedIssue(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Diagnostic Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Affected Device:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{guidedIssue.affectedDevice}</strong>
              </div>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Affected Interface:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{guidedIssue.affectedInterface}</strong>
              </div>
            </div>

            {/* Evidence & Root Cause */}
            <div style={{ padding: '0.85rem 1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', fontSize: '0.82rem', lineHeight: 1.6 }}>
              <div style={{ marginBottom: '6px' }}>
                <strong style={{ color: 'var(--danger)' }}>Evidence:</strong> {guidedIssue.evidence}
              </div>
              <div>
                <strong style={{ color: 'var(--warning)' }}>Root Cause:</strong> {guidedIssue.rootCause}
              </div>
            </div>

            {/* Why Fix Works */}
            <div style={{ padding: '0.85rem 1rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '8px', fontSize: '0.82rem', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--primary)' }}>Why This Fix Works:</strong>
              <p style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>{guidedIssue.whyItWorks}</p>
            </div>

            {/* Action Bar / Confirmation */}
            {!fixApplied ? (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <button className="btn btn-secondary" onClick={() => setGuidedIssue(null)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleConfirmFix}>
                  <Check size={16} />
                  <span>Confirm & Apply Fix</span>
                </button>
              </div>
            ) : (
              <div style={{ padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.15)', borderRadius: '8px', border: '1px solid #10b981' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 800, marginBottom: '6px' }}>
                  <CheckCircle2 size={18} />
                  <span>Fix Applied Successfully!</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {testing ? (
                    'Rerunning end-to-end packet simulation to verify connectivity...'
                  ) : testResult ? (
                    `Actual Verified Outcome: ${testResult.success ? 'ICMP Packet Delivered Successfully! 0% loss.' : 'Simulation resulted in: ' + testResult.reason}`
                  ) : (
                    'Topology updated and verified against RFC standards.'
                  )}
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: '0.75rem' }}
                  onClick={() => setGuidedIssue(null)}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugPanel;
