import React, { useEffect, useState } from 'react';
import { api } from './api';

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState('');

  async function loadSummary() {
    setLoadingSummary(true);
    setError('');
    try {
      const res = await api.get('/admin/summary');
      setSummary(res.data);
    } catch (e) {
      console.error('Admin summary failed', e);
      setError(e?.response?.data?.error || 'Failed to load admin summary');
    } finally {
      setLoadingSummary(false);
    }
  }

  async function loadUsers() {
    setLoadingUsers(true);
    setError('');
    try {
      const res = await api.get('/admin/users');
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Admin users failed', e);
      setError(e?.response?.data?.error || 'Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => {
    loadSummary();
    loadUsers();
  }, []);

  return (
    <div className="admin-container" style={{ padding: '1rem' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>Admin Dashboard</h1>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)' }}>
        Organization-wide overview and user management.
      </p>

      {error && (
        <div
          style={{
            margin: '1rem 0',
            padding: '0.75rem 1rem',
            border: '1px solid var(--border-primary)',
            borderRadius: 8,
            color: 'var(--danger-text)',
            background: 'var(--danger-bg)',
          }}
        >
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <section style={{ marginTop: '1rem' }}>
        <h3 style={{ marginBottom: '0.75rem' }}>Summary</h3>
        {loadingSummary ? (
          <div>Loading summary...</div>
        ) : summary ? (
          <div
            className="admin-kpi-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.75rem',
            }}
          >
            <KpiCard label="Users" value={summary.users} />
            <KpiCard label="Documents" value={summary.documents} />
            <KpiCard label="Tasks" value={summary.tasks} />
            <KpiCard label="Orders" value={summary.orders} />
          </div>
        ) : (
          <div>No summary available.</div>
        )}
      </section>

      {/* Users Table */}
      <section style={{ marginTop: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <h3 style={{ marginBottom: '0.75rem' }}>Users</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="edit-btn" onClick={loadUsers} disabled={loadingUsers}>
              {loadingUsers ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        <div
          style={{
            width: '100%',
            overflowX: 'auto',
            border: '1px solid var(--border-primary)',
            borderRadius: 8,
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: 720,
            }}
          >
            <thead>
              <tr
                style={{
                  background: 'var(--bg-secondary)',
                  borderBottom: '1px solid var(--border-primary)',
                }}
              >
                <Th>ID</Th>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Business</Th>
                <Th>Industry</Th>
                <Th>Locale</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody>
              {loadingUsers ? (
                <tr>
                  <Td colSpan={8}>Loading users...</Td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <Td colSpan={8}>No users found.</Td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                    <Td>{u.id}</Td>
                    <Td>{u.name || '—'}</Td>
                    <Td>{u.email}</Td>
                    <Td>
                      <RoleBadge role={u.role} />
                    </Td>
                    <Td>{u.businessName || '—'}</Td>
                    <Td>{u.industry || '—'}</Td>
                    <Td>{u.locale || '—'}</Td>
                    <Td>{new Date(u.createdAt).toLocaleString()}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value }) {
  return (
    <div
      className="kpi-card"
      style={{
        border: '1px solid var(--border-primary)',
        borderRadius: 12,
        padding: '0.9rem 1rem',
        background: 'var(--bg-primary)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function RoleBadge({ role }) {
  const tone =
    role === 'admin'
      ? { bg: 'var(--warning-bg)', color: 'var(--warning-text)' }
      : role === 'vendor'
      ? { bg: 'var(--info-bg)', color: 'var(--info-text)' }
      : role === 'consultant'
      ? { bg: 'var(--accent-bg)', color: 'var(--accent-text)' }
      : { bg: 'var(--success-bg)', color: 'var(--success-text)' };

  return (
    <span
      style={{
        padding: '0.1rem 0.5rem',
        borderRadius: 999,
        fontSize: 12,
        background: tone.bg,
        color: tone.color,
      }}
    >
      {role}
    </span>
  );
}

function Th({ children }) {
  return (
    <th
      style={{
        textAlign: 'left',
        padding: '0.6rem 0.75rem',
        fontWeight: 600,
        fontSize: 13,
        color: 'var(--text-secondary)',
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, colSpan }) {
  return (
    <td
      colSpan={colSpan}
      style={{
        padding: '0.6rem 0.75rem',
        fontSize: 14,
      }}
    >
      {children}
    </td>
  );
}
