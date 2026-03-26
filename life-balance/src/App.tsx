import { useEffect, useState } from 'react';
import { useStore } from './store';
import { seedIfEmpty } from './seed';
import { assignTliColors } from './engine';
import { ViewMode } from './types';
import TaskQueue from './components/TaskQueue';
import TaskTree from './components/TaskTree';
import BalanceView from './components/BalanceView';
import TaskDetail from './components/TaskDetail';
import PlacesPanel from './components/PlacesPanel';
import TaskForm from './components/TaskForm';

type ExtendedView = ViewMode | 'places';

export default function App() {
  const {
    loadAll, tasks, places, balanceStats,
    view, setView,
    activePlaceIds, setActivePlaces,
    selectedTaskId, queue,
  } = useStore();

  const [loaded, setLoaded] = useState(false);
  const [extView, setExtView] = useState<ExtendedView>('queue');
  const [showAddTli, setShowAddTli] = useState(false);

  useEffect(() => {
    (async () => {
      await seedIfEmpty();
      await loadAll();
      setLoaded(true);
    })();
  }, []);

  function navigate(v: ExtendedView) {
    setExtView(v);
    if (v === 'queue' || v === 'tree' || v === 'balance') {
      setView(v as ViewMode);
    }
  }

  const incomplete = tasks.filter(t => !t.completedAt);
  const tlis = incomplete.filter(t => t.parentId === null);
  const colorMap = assignTliColors(tlis);

  const detailOpen = selectedTaskId !== null;

  // Header text per view
  const VIEW_META: Record<ExtendedView, { title: string; sub: string }> = {
    queue:   { title: 'Priority queue', sub: 'What to work on, right now' },
    tree:    { title: 'Goal tree', sub: 'Your goals and all their tasks' },
    balance: { title: 'Balance', sub: 'Target vs. actual effort this week' },
    places:  { title: 'Places', sub: 'Context filters for your task queue' },
  };

  if (!loaded) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-4)',
      }}>
        Loading…
      </div>
    );
  }

  return (
    <div className={`app${detailOpen ? ' detail-open' : ''}`}>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>Life Balance</h1>
          <div className="tagline">what matters · right now</div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {([
            ['queue',   '→', 'Queue'],
            ['tree',    '⊞', 'Tree'],
            ['balance', '◑', 'Balance'],
            ['places',  '◎', 'Places'],
          ] as [ExtendedView, string, string][]).map(([v, icon, label]) => (
            <button
              key={v}
              className={`nav-btn${extView === v ? ' active' : ''}`}
              onClick={() => navigate(v)}
            >
              <span className="nav-icon">{icon}</span>
              {label}
              {v === 'queue' && queue.length > 0 && (
                <span style={{
                  marginLeft: 'auto',
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  background: extView === 'queue' ? 'rgba(255,255,255,0.2)' : 'var(--paper-3)',
                  color: extView === 'queue' ? 'var(--paper)' : 'var(--ink-3)',
                  padding: '1px 6px',
                  borderRadius: 10,
                }}>
                  {queue.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* TLI list */}
        <div className="sidebar-tli">
          {tlis.length > 0 && (
            <>
              <div className="sidebar-section-label">Goals</div>
              {tlis.map(tli => {
                const stat = balanceStats.find(s => s.tliId === tli.id);
                const color = colorMap[tli.id] ?? '#888';
                return (
                  <div key={tli.id} className="tli-item" onClick={() => navigate('tree')}>
                    <span className="tli-dot" style={{ background: color }} />
                    <span style={{ flex: 1, fontSize: 12, color: 'var(--ink-2)' }}>{tli.title}</span>
                    {stat && (
                      <span className="tli-pct">
                        {Math.round(tli.importance * 100)}%
                      </span>
                    )}
                  </div>
                );
              })}
            </>
          )}

          <div
            className="add-task-row"
            style={{ marginTop: 8, padding: '5px 10px' }}
            onClick={() => setShowAddTli(true)}
          >
            <span style={{ fontSize: 12 }}>+</span>
            <span style={{ fontSize: 12 }}>New goal</span>
          </div>
        </div>

        {/* Place filter chips */}
        {places.length > 0 && (
          <div className="place-filter">
            <div className="sidebar-section-label" style={{ marginBottom: 6 }}>Context</div>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {places.map(p => {
                const isActive = activePlaceIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    className={`place-chip${isActive ? ' active' : ''}`}
                    style={isActive ? {} : { borderColor: p.color + '50', color: p.color }}
                    onClick={() => setActivePlaces(
                      isActive
                        ? activePlaceIds.filter(id => id !== p.id)
                        : [...activePlaceIds, p.id]
                    )}
                  >
                    <span style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: isActive ? 'var(--paper)' : p.color,
                      display: 'inline-block',
                    }} />
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="main">
        <div className="main-header">
          <div>
            <div className="main-title">{VIEW_META[extView].title}</div>
            <div className="main-subtitle">{VIEW_META[extView].sub}</div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Active place filter indicator */}
            {activePlaceIds.length > 0 && (
              <div style={{
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                color: 'var(--ink-3)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span>Filtered:</span>
                {activePlaceIds.map(id => {
                  const p = places.find(pl => pl.id === id);
                  return p ? (
                    <span
                      key={id}
                      style={{
                        background: p.color + '18',
                        color: p.color,
                        padding: '2px 7px',
                        borderRadius: 10,
                        fontSize: 10,
                      }}
                    >
                      {p.name}
                    </span>
                  ) : null;
                })}
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setActivePlaces([])}
                  style={{ fontSize: 11 }}
                >
                  clear
                </button>
              </div>
            )}

            {/* Quick-add button */}
            {extView === 'queue' || extView === 'tree' ? (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowAddTli(true)}
              >
                + Add goal
              </button>
            ) : null}
          </div>
        </div>

        <div className="main-content">
          {extView === 'queue'   && <TaskQueue />}
          {extView === 'tree'    && <TaskTree />}
          {extView === 'balance' && <BalanceView />}
          {extView === 'places'  && <PlacesPanel />}
        </div>
      </main>

      {/* ── Detail panel ─────────────────────────────────────────────────── */}
      {detailOpen && <TaskDetail />}

      {/* ── Top-level task form modal ─────────────────────────────────────── */}
      {showAddTli && (
        <TaskForm parentId={null} onClose={() => setShowAddTli(false)} />
      )}
    </div>
  );
}
