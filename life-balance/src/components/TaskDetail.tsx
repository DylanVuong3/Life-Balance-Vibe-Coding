import { useStore } from '../store';
import { ScoreBreakdown } from './TaskQueue';
import { assignTliColors, getTliId } from '../engine';
import TaskForm from './TaskForm';
import { useState } from 'react';

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function daysUntil(isoDate: string): number {
  return Math.ceil((new Date(isoDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function TaskDetail() {
  const { selectedTaskId, tasks, places, queue, selectTask, completeTask, reopenTask, deleteTask } = useStore();
  const [editing, setEditing] = useState(false);

  const task = tasks.find(t => t.id === selectedTaskId);
  if (!task) return null;

  const scored = queue.find(q => q.id === task.id);
  const tlis = tasks.filter(t => t.parentId === null && !t.completedAt);
  const colorMap = assignTliColors(tlis);
  const tliId = getTliId(task, tasks);
  const tli = tliId ? tasks.find(t => t.id === tliId) : null;
  const color = tliId ? (colorMap[tliId] ?? '#888') : '#888';

  const taskPlaces = places.filter(p => task.placeIds.includes(p.id));

  // Build breadcrumb
  const breadcrumb: string[] = [];
  let cur: typeof task | undefined = task;
  while (cur) {
    breadcrumb.unshift(cur.title);
    cur = cur.parentId ? tasks.find(t => t.id === cur!.parentId) : undefined;
  }

  function handleDelete() {
    if (confirm(`Delete "${task!.title}"?`)) {
      deleteTask(task!.id);
      selectTask(null);
    }
  }

  return (
    <div className="detail-panel">
      <div className="detail-header">
        <div>
          {/* Breadcrumb */}
          {breadcrumb.length > 1 && (
            <div style={{
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              color: 'var(--ink-4)',
              marginBottom: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              flexWrap: 'wrap',
            }}>
              {breadcrumb.slice(0, -1).map((b, i) => (
                <span key={i}>
                  <span style={{ color: tliId && i === 0 ? color : undefined }}>{b}</span>
                  <span style={{ margin: '0 2px' }}>›</span>
                </span>
              ))}
            </div>
          )}
          <div
            className="detail-title"
            style={{ color: task.completedAt ? 'var(--ink-4)' : 'var(--ink)' }}
          >
            {task.completedAt && <span style={{ marginRight: 6, color: 'var(--teal)' }}>✓</span>}
            {task.title}
          </div>
          {tli && (
            <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-3)' }}>
                {tli.title}
              </span>
            </div>
          )}
        </div>
        <button
          className="btn btn-ghost"
          onClick={() => selectTask(null)}
          style={{ flexShrink: 0, fontSize: 16 }}
        >
          ×
        </button>
      </div>

      <div className="detail-body">

        {/* Notes */}
        {task.notes && (
          <div className="detail-field">
            <div className="detail-label">Notes</div>
            <div className="detail-value" style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {task.notes}
            </div>
          </div>
        )}

        {/* Quick stats */}
        <div className="stat-cluster">
          <div className="stat-box">
            <div className="stat-val">{Math.round(task.importance * 100)}%</div>
            <div className="stat-lbl">importance</div>
          </div>
          <div className="stat-box">
            <div className="stat-val" style={{ fontSize: 14, paddingTop: 2 }}>{task.effortSize}</div>
            <div className="stat-lbl">effort</div>
          </div>
          <div className="stat-box">
            {task.deadline ? (
              <>
                <div className="stat-val" style={{
                  fontSize: 14, paddingTop: 2,
                  color: daysUntil(task.deadline) <= 0 ? 'var(--red)' : daysUntil(task.deadline) <= 3 ? 'var(--amber)' : 'var(--ink)',
                }}>
                  {daysUntil(task.deadline) <= 0 ? 'overdue' : `${daysUntil(task.deadline)}d`}
                </div>
                <div className="stat-lbl">deadline</div>
              </>
            ) : (
              <>
                <div className="stat-val" style={{ fontSize: 14, paddingTop: 2 }}>—</div>
                <div className="stat-lbl">deadline</div>
              </>
            )}
          </div>
        </div>

        {/* Deadline */}
        {task.deadline && (
          <div className="detail-field">
            <div className="detail-label">Deadline</div>
            <div className="detail-value">{formatDate(task.deadline)}</div>
          </div>
        )}

        {/* Repeating */}
        {task.repeating && (
          <div className="detail-field">
            <div className="detail-label">Repeating</div>
            <div className="detail-value">Every {task.repeatDays ?? '?'} days</div>
          </div>
        )}

        {/* Places */}
        {taskPlaces.length > 0 && (
          <div className="detail-field">
            <div className="detail-label">Places</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {taskPlaces.map(p => (
                <span
                  key={p.id}
                  className="tag"
                  style={{ background: p.color + '18', color: p.color }}
                >
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Priority score breakdown (only for queued tasks) */}
        {scored && (
          <div className="detail-field">
            <div className="detail-label" style={{ marginBottom: 8 }}>Priority score breakdown</div>
            <div style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--rule)',
              borderRadius: 'var(--radius)',
              padding: '12px',
            }}>
              <ScoreBreakdown task={scored} />
            </div>
          </div>
        )}

        {/* Dates */}
        <div className="detail-field">
          <div className="detail-label">Added</div>
          <div className="detail-value">{formatDate(task.createdAt)}</div>
        </div>

        {task.completedAt && (
          <div className="detail-field">
            <div className="detail-label">Completed</div>
            <div className="detail-value" style={{ color: 'var(--teal)' }}>
              {formatDate(task.completedAt)}
            </div>
          </div>
        )}
      </div>

      {/* Action footer */}
      <div className="detail-footer">
        {task.completedAt ? (
          <button className="btn" onClick={() => reopenTask(task.id)}>↩ Reopen</button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={() => completeTask(task.id)}
          >
            ✓ Complete
          </button>
        )}
        <button className="btn" onClick={() => setEditing(true)}>✎ Edit</button>
        <button
          className="btn"
          style={{ marginLeft: 'auto', color: 'var(--red)', borderColor: 'var(--red)' }}
          onClick={handleDelete}
        >
          Delete
        </button>
      </div>

      {editing && (
        <TaskForm
          editTask={task}
          parentId={task.parentId}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
