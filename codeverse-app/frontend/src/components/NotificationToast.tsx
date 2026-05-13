import React from 'react';
import { useAppStore } from '../store/useAppStore';

export const NotificationToast: React.FC = () => {
  const { notifications, removeNotification } = useAppStore();

  if (notifications.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'none',
      }}
    >
      {notifications.map((n) => {
        const colors: Record<string, string> = {
          success: '#10b981',
          error: '#ef4444',
          warning: '#f59e0b',
          info: '#4f7cff',
        };
        return (
          <div
            key={n.id}
            className="animate-slide-in-right"
            style={{
              padding: '12px 20px',
              background: 'rgba(22, 27, 44, 0.95)',
              backdropFilter: 'blur(20px)',
              border: `1px solid ${colors[n.type]}40`,
              borderLeft: `3px solid ${colors[n.type]}`,
              borderRadius: '10px',
              color: '#e2e8f0',
              fontSize: '14px',
              maxWidth: '360px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              pointerEvents: 'auto',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
            onClick={() => removeNotification(n.id)}
          >
            <span style={{ fontSize: '16px' }}>
              {n.type === 'success'
                ? '✓'
                : n.type === 'error'
                ? '✕'
                : n.type === 'warning'
                ? '⚠'
                : 'ℹ'}
            </span>
            {n.message}
          </div>
        );
      })}
    </div>
  );
};
