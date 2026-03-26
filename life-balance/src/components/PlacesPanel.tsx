import { useState } from 'react';
import { useStore } from '../store';
import { Place } from '../types';

const COLORS = [
  '#7F77DD', '#1D9E75', '#D85A30', '#BA7517',
  '#378ADD', '#639922', '#D4537E', '#888780',
];

interface PlaceFormProps {
  editPlace?: Place;
  onClose: () => void;
}

function PlaceForm({ editPlace, onClose }: PlaceFormProps) {
  const { addPlace, updatePlace } = useStore();
  const [name, setName] = useState(editPlace?.name ?? '');
  const [color, setColor] = useState(editPlace?.color ?? COLORS[0]);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) return;
    setSaving(true);
    if (editPlace) {
      await updatePlace(editPlace.id, { name: name.trim(), color });
    } else {
      await addPlace({ name: name.trim(), color, isOpen: true });
    }
    setSaving(false);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 360 }}>
        <h2>{editPlace ? 'Edit place' : 'Add place'}</h2>

        <div className="form-field">
          <label className="form-label">Name</label>
          <input
            className="form-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Work, Home, Not Working…"
            autoFocus
          />
        </div>

        <div className="form-field">
          <label className="form-label">Color</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{
                  width: 28, height: 28,
                  borderRadius: '50%',
                  background: c,
                  border: color === c ? `3px solid var(--ink)` : '3px solid transparent',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              />
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!name.trim() || saving}
          >
            {saving ? 'Saving…' : editPlace ? 'Save' : 'Add place'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PlacesPanel() {
  const { places, deletePlace, activePlaceIds, setActivePlaces } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editingPlace, setEditingPlace] = useState<Place | undefined>();

  function togglePlace(id: string) {
    setActivePlaces(
      activePlaceIds.includes(id)
        ? activePlaceIds.filter(p => p !== id)
        : [...activePlaceIds, id]
    );
  }

  function handleDelete(place: Place) {
    if (confirm(`Delete place "${place.name}"?`)) {
      deletePlace(place.id);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
            Active filter: {activePlaceIds.length === 0 ? 'none (showing all)' : `${activePlaceIds.length} place(s)`}
          </div>
        </div>
        <button className="btn" onClick={() => setShowForm(true)}>+ Add place</button>
      </div>

      {places.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">◎</div>
          <div className="empty-title">No places yet</div>
          <div className="empty-sub">
            Places filter your task queue.<br />
            Try "Work", "Home", "Anywhere".
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {places.map(place => {
            const isActive = activePlaceIds.includes(place.id);
            return (
              <div
                key={place.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 'var(--radius)',
                  border: `1px solid ${isActive ? place.color + '60' : 'var(--rule)'}`,
                  background: isActive ? place.color + '10' : 'var(--paper)',
                  transition: 'all 0.18s',
                }}
              >
                <span style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: place.color, flexShrink: 0,
                }} />

                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  flex: 1,
                  color: 'var(--ink)',
                }}>
                  {place.name}
                </span>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button
                    className="btn btn-sm"
                    style={isActive ? { background: place.color, color: 'white', borderColor: place.color } : {}}
                    onClick={() => togglePlace(place.id)}
                  >
                    {isActive ? 'Active' : 'Set active'}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => { setEditingPlace(place); setShowForm(false); }}
                  >
                    ✎
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--red)' }}
                    onClick={() => handleDelete(place)}
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Explanation */}
      <div style={{
        marginTop: 24,
        padding: '14px 16px',
        background: 'var(--paper-2)',
        border: '1px solid var(--rule)',
        borderRadius: 'var(--radius)',
        fontSize: 12,
        color: 'var(--ink-3)',
        lineHeight: 1.6,
        fontFamily: 'var(--font-mono)',
      }}>
        <strong style={{ color: 'var(--ink-2)', display: 'block', marginBottom: 4 }}>About places</strong>
        Places are context filters — they can be physical locations or states of mind.
        "Not Working", "Deep Focus", and "Client Site" are all valid places.
        When a place is active, only tasks assigned to that place will appear in your queue.
        Tasks with no place assigned are always visible.
      </div>

      {showForm && <PlaceForm onClose={() => setShowForm(false)} />}
      {editingPlace && (
        <PlaceForm
          editPlace={editingPlace}
          onClose={() => setEditingPlace(undefined)}
        />
      )}
    </div>
  );
}
