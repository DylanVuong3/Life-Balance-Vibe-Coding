import { useState, useEffect } from 'react';
import { Task, EffortSize } from '../types';
import { useStore } from '../store';

interface TaskFormProps {
  onClose: () => void;
  parentId?: string | null;
  editTask?: Task;
}

const EFFORT_OPTIONS: EffortSize[] = ['tiny', 'small', 'medium', 'large', 'huge'];

const EFFORT_LABELS: Record<EffortSize, string> = {
  tiny:   'Tiny (15 min)',
  small:  'Small (30 min)',
  medium: 'Medium (1 hr)',
  large:  'Large (2 hr)',
  huge:   'Huge (4+ hr)',
};

export default function TaskForm({ onClose, parentId = null, editTask }: TaskFormProps) {
  const { addTask, updateTask, tasks, places } = useStore();

  const [title, setTitle]           = useState(editTask?.title ?? '');
  const [notes, setNotes]           = useState(editTask?.notes ?? '');
  const [importance, setImportance] = useState(editTask?.importance ?? 0.7);
  const [effortSize, setEffortSize] = useState<EffortSize>(editTask?.effortSize ?? 'small');
  const [repeating, setRepeating]   = useState(editTask?.repeating ?? false);
  const [repeatDays, setRepeatDays] = useState(editTask?.repeatDays ?? 7);
  const [deadline, setDeadline]     = useState(editTask?.deadline?.split('T')[0] ?? '');
  const [selectedPlaces, setSelectedPlaces] = useState<string[]>(editTask?.placeIds ?? []);
  const [saving, setSaving]         = useState(false);

  // Available parent tasks (for reparenting — not shown in add mode)
  const tlis = tasks.filter(t => t.parentId === null && !t.completedAt);

  async function handleSubmit() {
    if (!title.trim()) return;
    setSaving(true);
    const data = {
      parentId: parentId ?? null,
      title: title.trim(),
      notes,
      importance,
      effortSize,
      repeating,
      repeatDays: repeating ? repeatDays : undefined,
      deadline: deadline || undefined,
      placeIds: selectedPlaces,
    };
    if (editTask) {
      await updateTask(editTask.id, data);
    } else {
      await addTask(data);
    }
    setSaving(false);
    onClose();
  }

  function togglePlace(id: string) {
    setSelectedPlaces(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  }

  // Get parent context label
  const parent = tasks.find(t => t.id === parentId);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>{editTask ? 'Edit task' : 'Add task'}</h2>

        {parent && (
          <div style={{ marginBottom: 16, fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
            Under: <span style={{ color: 'var(--ink-2)' }}>{parent.title}</span>
          </div>
        )}

        <div className="form-field">
          <label className="form-label">Title</label>
          <input
            className="form-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="What needs doing?"
            autoFocus
          />
        </div>

        <div className="form-field">
          <label className="form-label">Notes</label>
          <textarea
            className="form-textarea"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any context, links, or details…"
          />
        </div>

        <div className="form-row">
          <div className="form-field">
            <label className="form-label">
              Importance — {Math.round(importance * 100)}%
            </label>
            <input
              type="range"
              className="importance-slider"
              min={0.1}
              max={1}
              step={0.05}
              value={importance}
              onChange={e => setImportance(+e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="form-label">Effort</label>
            <select
              className="form-select"
              value={effortSize}
              onChange={e => setEffortSize(e.target.value as EffortSize)}
            >
              {EFFORT_OPTIONS.map(s => (
                <option key={s} value={s}>{EFFORT_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label className="form-label">Deadline (optional)</label>
            <input
              type="date"
              className="form-input"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="form-label">Repeating</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
              <input
                type="checkbox"
                checked={repeating}
                onChange={e => setRepeating(e.target.checked)}
                id="repeating-check"
              />
              <label htmlFor="repeating-check" style={{ fontSize: 12, cursor: 'pointer' }}>
                Every{' '}
                <input
                  type="number"
                  value={repeatDays}
                  min={1}
                  max={365}
                  onChange={e => setRepeatDays(+e.target.value)}
                  style={{ width: 40, padding: '2px 4px', borderRadius: 4, border: '1px solid var(--rule)', fontFamily: 'var(--font-mono)', fontSize: 12 }}
                />{' '}days
              </label>
            </div>
          </div>
        </div>

        {places.length > 0 && (
          <div className="form-field">
            <label className="form-label">Places (optional)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {places.map(p => (
                <button
                  key={p.id}
                  type="button"
                  className={`place-chip ${selectedPlaces.includes(p.id) ? 'active' : ''}`}
                  onClick={() => togglePlace(p.id)}
                  style={selectedPlaces.includes(p.id) ? {} : { borderColor: p.color + '60', color: p.color }}
                >
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: selectedPlaces.includes(p.id) ? 'var(--paper)' : p.color,
                    display: 'inline-block',
                  }} />
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!title.trim() || saving}
          >
            {saving ? 'Saving…' : editTask ? 'Save changes' : 'Add task'}
          </button>
        </div>
      </div>
    </div>
  );
}
