import { useStore } from '../store';
import { ScoredTask } from '../types';

function daysUntil(isoDate: string): number {
  return Math.ceil((new Date(isoDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function DeadlineBadge({ deadline }: { deadline: string }) {
  const days = daysUntil(deadline);
  if (days < 0) return <span className="tag tag-overdue">overdue</span>;
  if (days === 0) return <span className="tag tag-deadline">today</span>;
  if (days <= 3) return <span className="tag tag-deadline">{days}d</span>;
  if (days <= 7) return <span className="tag tag-neglected">{days}d</span>;
  return <span className="tag" style={{ background: 'var(--paper-2)', color: 'var(--ink-3)' }}>{days}d</span>;
}

interface QueueItemProps {
  task: ScoredTask;
  rank: number;
  maxScore: number;
}

function QueueItemRow({ task, rank, maxScore }: QueueItemProps) {
  const { selectTask, selectedTaskId, completeTask } = useStore();
  const isSelected = selectedTaskId === task.id;
  const pct = Math.round((task.score / maxScore) * 100);
  const isNeglected = task.neglectMultiplier > 1.5;

  return (
    <div
      className={`queue-item${rank === 1 ? ' top-task' : ''}${isSelected ? ' selected' : ''}`}
      onClick={() => selectTask(isSelected ? null : task.id)}
    >
      {/* Rank number */}
      <div className={`queue-rank rank-${Math.min(rank, 9)}`}>
        {rank}
      </div>

      {/* Task body */}
      <div className="queue-body">
        <div className="queue-title">{task.title}</div>
        <div className="queue-meta">
          {/* TLI badge */}
          <span
            className="tag tag-tli"
            style={{
              background: task.tliColor + '18',
              color: task.tliColor,
            }}
          >
            {task.tliTitle}
          </span>

          {/* Deadline */}
          {task.deadline && <DeadlineBadge deadline={task.deadline} />}

          {/* Neglect indicator */}
          {isNeglected && !task.deadline && (
            <span className="tag tag-neglected">neglected</span>
          )}

          {/* Effort size */}
          <span style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>
            {task.effortSize}
          </span>
        </div>

        {/* Score bar */}
        <div className="score-bar">
          <div
            className="score-bar-fill"
            style={{ width: `${pct}%`, background: task.tliColor }}
          />
        </div>
      </div>

      {/* Complete button */}
      <div className="queue-actions">
        <button
          className="check-btn"
          title="Mark complete"
          onClick={e => {
            e.stopPropagation();
            completeTask(task.id);
          }}
        >
          ✓
        </button>
      </div>
    </div>
  );
}

// ─── Score breakdown tooltip shown in detail panel ────────────────────────────

export function ScoreBreakdown({ task }: { task: ScoredTask }) {
  return (
    <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--ink-3)' }}>Effective importance</span>
        <span>{(task.effectiveImportance * 100).toFixed(1)}%</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--ink-3)' }}>Neglect multiplier</span>
        <span style={{ color: task.neglectMultiplier > 1.5 ? 'var(--amber)' : 'inherit' }}>
          {task.neglectMultiplier.toFixed(2)}×
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--ink-3)' }}>Deadline multiplier</span>
        <span style={{ color: task.deadlineMultiplier > 2 ? 'var(--red)' : 'inherit' }}>
          {task.deadlineMultiplier.toFixed(2)}×
        </span>
      </div>
      <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontWeight: 500 }}>
        <span style={{ color: 'var(--ink-3)' }}>Priority score</span>
        <span>{task.score.toFixed(3)}</span>
      </div>
    </div>
  );
}

// ─── Main queue component ──────────────────────────────────────────────────────

export default function TaskQueue() {
  const { queue } = useStore();

  if (queue.length === 0) {
    return (
      <div className="empty">
        <div className="empty-icon">✓</div>
        <div className="empty-title">All clear</div>
        <div className="empty-sub">No pending tasks. Add some goals in the Tree view.</div>
      </div>
    );
  }

  const maxScore = queue[0]?.score ?? 1;

  return (
    <div>
      {/* "What to do right now" callout */}
      <div style={{
        background: 'var(--paper-2)',
        border: '1px solid var(--rule)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 16px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}>
        <span style={{ fontSize: 18, lineHeight: 1.2 }}>→</span>
        <div>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-4)', marginBottom: 3 }}>
            RIGHT NOW
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>
            {queue[0].title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>
            {queue[0].tliTitle} · {queue[0].effortSize}
          </div>
        </div>
      </div>

      <div className="queue-list">
        {queue.map((task, i) => (
          <QueueItemRow
            key={task.id}
            task={task}
            rank={i + 1}
            maxScore={maxScore}
          />
        ))}
      </div>
    </div>
  );
}
