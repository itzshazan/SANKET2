import React from 'react';

export default function DataSourceBadge({
  isLive = true,
  source = 'Open-Meteo & DEM',
  updatedAt = null,
  compact = false,
}) {
  if (compact) {
    return (
      <span
        className="live-badge-compact"
        title={`Source: ${source}${updatedAt ? ` · Updated ${new Date(updatedAt).toLocaleTimeString()}` : ''}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '2px 7px',
          borderRadius: 4,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          background: isLive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
          color: isLive ? '#10b981' : '#f59e0b',
          border: `1px solid ${isLive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: isLive ? '#10b981' : '#f59e0b',
            boxShadow: isLive ? '0 0 6px #10b981' : 'none',
            animation: isLive ? 'pulse-green 2s infinite' : 'none',
          }}
        />
        {isLive ? 'LIVE' : 'REF'}
      </span>
    );
  }

  return (
    <div
      className="live-data-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.03em',
        background: isLive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
        color: isLive ? '#10b981' : '#f59e0b',
        border: `1px solid ${isLive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          backgroundColor: isLive ? '#10b981' : '#f59e0b',
          boxShadow: isLive ? '0 0 8px #10b981' : 'none',
        }}
      />
      <span>{isLive ? `Live Telemetry (${source})` : 'Offline Reference'}</span>
      {updatedAt && (
        <span style={{ opacity: 0.6, fontSize: 10, borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: 6 }}>
          {new Date(updatedAt).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
