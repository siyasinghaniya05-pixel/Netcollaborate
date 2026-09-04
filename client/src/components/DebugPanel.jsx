import React, { useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  RefreshCw,
  Cpu,
  ArrowRight
} from 'lucide-react';
import { useNetwork } from '../context/NetworkContext';

const DebugPanel = () => {
  const { diagnostics, runDiagnostics, applyQuickFix, nodes } = useNetwork();

  useEffect(() => {
    runDiagnostics();
  }, [nodes.length]);

  const { errors = [], warnings = [], validCount = 0, healthScore = 100, summary = {} } = diagnostics || {};

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
          borderBottom: '1px solid var(--border-color)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Network Diagnostics</h3>
          <span className="badge badge-danger">{errors.length} Errors</span>
          <span className="badge badge-warning">{warnings.length} Warnings</span>
          <span className="badge badge-success">{validCount} Configurations Valid</span>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={runDiagnostics}
        >
          <RefreshCw size={13} /> Run Analysis
        </button>
      </div>

      {/* Diagnostic Issues List */}
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
            <CheckCircle2 size={36} color="var(--success)" style={{ margin: '0 auto 0.75rem' }} />
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              All Network Configurations Valid!
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              No IP conflicts, disconnected devices, or subnet mismatches detected.
            </div>
          </div>
        ) : (
          <>
            {/* Critical Errors */}
            {errors.map((err, idx) => (
              <div
                key={err.id || idx}
                style={{
                  padding: '0.85rem 1rem',
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--danger-light)',
                  borderLeft: '4px solid var(--danger)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <AlertCircle size={18} color="var(--danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--danger)' }}>
                        {err.title}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', marginTop: '3px' }}>
                        {err.message}
                      </div>
                    </div>
                  </div>

                  {err.quickFixAction && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => applyQuickFix(err.quickFixAction)}
                      style={{ fontSize: '0.72rem' }}
                    >
                      <Wrench size={13} /> Quick Fix
                    </button>
                  )}
                </div>

                <div
                  style={{
                    marginTop: '0.6rem',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)'
                  }}
                >
                  <strong style={{ color: 'var(--primary)' }}>Suggested Fix:</strong> {err.suggestedFix}
                </div>
              </div>
            ))}

            {/* Warnings */}
            {warnings.map((warn, idx) => (
              <div
                key={warn.id || idx}
                style={{
                  padding: '0.85rem 1rem',
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--warning-light)',
                  borderLeft: '4px solid var(--warning)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <AlertTriangle size={18} color="var(--warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--warning)' }}>
                        {warn.title}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', marginTop: '3px' }}>
                        {warn.message}
                      </div>
                    </div>
                  </div>

                  {warn.quickFixAction && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => applyQuickFix(warn.quickFixAction)}
                      style={{ fontSize: '0.72rem' }}
                    >
                      <Wrench size={13} /> Quick Fix
                    </button>
                  )}
                </div>

                <div
                  style={{
                    marginTop: '0.6rem',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)'
                  }}
                >
                  <strong style={{ color: 'var(--primary)' }}>Suggested Fix:</strong> {warn.suggestedFix}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default DebugPanel;
