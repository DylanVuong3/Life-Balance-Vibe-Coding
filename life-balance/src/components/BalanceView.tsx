import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useStore } from '../store';

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

// Custom pie label
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, name, value }: any) {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (value < 0.08) return null; // skip tiny slices
  return (
    <text
      x={x} y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 500 }}
    >
      {pct(value)}
    </text>
  );
}

export default function BalanceView() {
  const { balanceStats, effortLogs, tasks } = useStore();

  if (balanceStats.length === 0) {
    return (
      <div className="empty">
        <div className="empty-icon">◑</div>
        <div className="empty-title">No goals to balance</div>
        <div className="empty-sub">Add top-level goals in the Tree view first.</div>
      </div>
    );
  }

  // Count completions last 7 days per TLI
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentLogs = effortLogs.filter(l => l.loggedAt > weekAgo);
  const completionsByTli: Record<string, number> = {};
  for (const stat of balanceStats) completionsByTli[stat.tliId] = 0;
  for (const log of recentLogs) {
    if (completionsByTli[log.tliId] !== undefined) completionsByTli[log.tliId]++;
  }

  // Total tasks per TLI
  const incomplete = tasks.filter(t => !t.completedAt);

  return (
    <div>
      <div className="balance-grid">
        {/* Left: pie charts */}
        <div>
          <div className="balance-card" style={{ marginBottom: 16 }}>
            <h3>Target balance</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={balanceStats}
                  dataKey="targetShare"
                  nameKey="title"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  labelLine={false}
                  label={PieLabel}
                >
                  {balanceStats.map(stat => (
                    <Cell key={stat.tliId} fill={stat.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => pct(v)}
                  contentStyle={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    border: '1px solid var(--rule)',
                    borderRadius: 6,
                    background: 'var(--paper)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="balance-card">
            <h3>Actual (last 7 days)</h3>
            {recentLogs.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', padding: '8px 0' }}>
                Complete tasks to see your actual balance.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={balanceStats}
                    dataKey="actualShare"
                    nameKey="title"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    labelLine={false}
                    label={PieLabel}
                  >
                    {balanceStats.map(stat => (
                      <Cell key={stat.tliId} fill={stat.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => pct(v)}
                    contentStyle={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      border: '1px solid var(--rule)',
                      borderRadius: 6,
                      background: 'var(--paper)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right: breakdown table */}
        <div>
          <div className="balance-card">
            <h3>Area breakdown</h3>

            {/* Header row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 60px 60px 60px',
              gap: 8,
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              color: 'var(--ink-4)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              paddingBottom: 8,
              borderBottom: '1px solid var(--rule)',
              marginBottom: 2,
            }}>
              <span>Area</span>
              <span style={{ textAlign: 'right' }}>Target</span>
              <span style={{ textAlign: 'right' }}>Actual</span>
              <span style={{ textAlign: 'right' }}>Tasks</span>
            </div>

            {balanceStats.map(stat => {
              const delta = stat.actualShare - stat.targetShare;
              const taskCount = incomplete.filter(t => {
                // Check if task belongs to this TLI
                const walk = (id: string): boolean => {
                  if (id === stat.tliId) return true;
                  const t = tasks.find(t => t.id === id);
                  if (!t || !t.parentId) return false;
                  return walk(t.parentId);
                };
                return walk(t.id);
              }).length;

              return (
                <div key={stat.tliId} style={{ padding: '12px 0', borderBottom: '1px solid var(--rule)' }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 60px 60px 60px',
                    gap: 8,
                    alignItems: 'center',
                    marginBottom: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: stat.color, flexShrink: 0,
                        display: 'inline-block',
                      }} />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{stat.title}</span>
                    </div>
                    <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {pct(stat.targetShare)}
                    </span>
                    <span style={{
                      textAlign: 'right',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: Math.abs(delta) < 0.05
                        ? 'var(--teal)'
                        : delta > 0 ? 'var(--ink-2)' : 'var(--amber)',
                    }}>
                      {pct(stat.actualShare)}
                    </span>
                    <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-4)' }}>
                      {taskCount}
                    </span>
                  </div>

                  {/* Dual bar: target (faded) + actual (solid) */}
                  <div style={{ position: 'relative', height: 6 }}>
                    <div style={{
                      position: 'absolute', top: 0, left: 0,
                      height: 6, borderRadius: 3,
                      width: `${stat.targetShare * 100}%`,
                      background: stat.color,
                      opacity: 0.2,
                    }} />
                    <div style={{
                      position: 'absolute', top: 1, left: 0,
                      height: 4, borderRadius: 2,
                      width: `${stat.actualShare * 100}%`,
                      background: stat.color,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>

                  {/* Status note */}
                  <div style={{ marginTop: 6, fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>
                    {Math.abs(delta) < 0.03
                      ? '✓ On track'
                      : delta > 0
                        ? `↑ ${pct(Math.abs(delta))} over target`
                        : `↓ ${pct(Math.abs(delta))} below target — tasks will be boosted`}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Completions this week */}
          <div className="balance-card" style={{ marginTop: 16 }}>
            <h3>This week</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {balanceStats.map(stat => (
                <div key={stat.tliId} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: stat.color, flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, flex: 1 }}>{stat.title}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
                    {completionsByTli[stat.tliId] ?? 0} tasks
                  </span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                <span style={{ color: 'var(--ink-3)' }}>Total</span>
                <span>{recentLogs.length} tasks</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
