import { useState } from 'react';
import { Task } from '../types';
import { useStore } from '../store';
import { getChildren, assignTliColors } from '../engine';
import TaskForm from './TaskForm';

// ─── Individual tree node ──────────────────────────────────────────────────────

interface NodeProps {
  task: Task;
  allTasks: Task[];
  depth: number;
  colorMap: Record<string, string>;
  tliId: string;
}

function TreeNode({ task, allTasks, depth, colorMap, tliId }: NodeProps) {
  const { selectTask, selectedTaskId, deleteTask, completeTask, reopenTask } = useStore();
  const [expanded, setExpanded] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  const children = getChildren(task.id, allTasks);
  const completedChildren = allTasks.filter(t => t.parentId === task.id && t.completedAt);
  const hasChildren = children.length > 0 || completedChildren.length > 0;
  const isTli = depth === 0;
  const color = colorMap[tliId] ?? '#888';
  const isSelected = selectedTaskId === task.id;

  function handleDelete() {
    if (confirm(`Delete "${task.title}" and all its subtasks?`)) {
      deleteTask(task.id);
    }
  }

  return (
    <div className="tree-node">
      <div
        className={`tree-row${isSelected ? ' selected' : ''}`}
        onClick={() => selectTask(task.id)}
      >
        {/* Expand/collapse toggle */}
        <button
          className="tree-expand"
          onClick={e => { e.stopPropagation(); setExpanded(!expanded); }}
          style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
        >
          {expanded ? '▾' : '▸'}
        </button>

        {/* Color dot */}
        <span
          className="tree-dot"
          style={{
            background: isTli ? color : 'transparent',
            border: isTli ? 'none' : `1.5px solid ${color}60`,
          }}
        />

        {/* Title */}
        <span className={`tree-title${isTli ? ' tli' : ''}${task.completedAt ? ' completed' : ''}`}>
          {task.title}
        </span>

        {/* Importance */}
        {isTli && (
          <span className="tree-imp">
            {Math.round(task.importance * 100)}%
          </span>
        )}

        {/* Deadline indicator */}
        {task.deadline && !task.completedAt && (
          <span style={{ fontSize: 10, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>
            {new Date(task.deadline) < new Date() ? '!' : '↓'}
          </span>
        )}

        {/* Action buttons (show on row hover) */}
        <div className="tree-actions" onClick={e => e.stopPropagation()}>
          <button
            className="btn btn-ghost btn-sm"
            title={task.completedAt ? 'Reopen' : 'Complete'}
            onClick={() => task.completedAt ? reopenTask(task.id) : completeTask(task.id)}
          >
            {task.completedAt ? '↩' : '✓'}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            title="Add subtask"
            onClick={() => setShowAddForm(true)}
          >
            +
          </button>
          <button
            className="btn btn-ghost btn-sm"
            title="Edit"
            onClick={() => setShowEditForm(true)}
          >
            ✎
          </button>
          <button
            className="btn btn-ghost btn-sm"
            title="Delete"
            onClick={handleDelete}
          >
            ×
          </button>
        </div>
      </div>

      {/* Recursive children */}
      {expanded && hasChildren && (
        <div className="tree-children">
          {children.map(child => (
            <TreeNode
              key={child.id}
              task={child}
              allTasks={allTasks}
              depth={depth + 1}
              colorMap={colorMap}
              tliId={tliId}
            />
          ))}

          {/* Completed children (collapsed by default) */}
          {completedChildren.length > 0 && (
            <CompletedGroup
              tasks={completedChildren}
              allTasks={allTasks}
              depth={depth + 1}
              colorMap={colorMap}
              tliId={tliId}
            />
          )}

          {/* Add subtask inline row */}
          <div
            className="add-task-row"
            onClick={() => setShowAddForm(true)}
          >
            <span>+</span>
            <span>Add subtask</span>
          </div>
        </div>
      )}

      {showAddForm && (
        <TaskForm parentId={task.id} onClose={() => setShowAddForm(false)} />
      )}
      {showEditForm && (
        <TaskForm editTask={task} parentId={task.parentId} onClose={() => setShowEditForm(false)} />
      )}
    </div>
  );
}

// ─── Collapsed completed tasks group ─────────────────────────────────────────

function CompletedGroup({
  tasks, allTasks, depth, colorMap, tliId,
}: { tasks: Task[]; allTasks: Task[]; depth: number; colorMap: Record<string, string>; tliId: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <div
        className="add-task-row"
        onClick={() => setExpanded(!expanded)}
        style={{ color: 'var(--ink-4)' }}
      >
        <span>{expanded ? '▾' : '▸'}</span>
        <span>{tasks.length} completed</span>
      </div>
      {expanded && tasks.map(t => (
        <TreeNode
          key={t.id}
          task={t}
          allTasks={allTasks}
          depth={depth}
          colorMap={colorMap}
          tliId={tliId}
        />
      ))}
    </div>
  );
}

// ─── Tree root ─────────────────────────────────────────────────────────────────

export default function TaskTree() {
  const { tasks } = useStore();
  const [showAddTli, setShowAddTli] = useState(false);

  const incomplete = tasks.filter(t => !t.completedAt);
  const tlis = incomplete.filter(t => t.parentId === null);
  const colorMap = assignTliColors(tlis);

  // Show completed TLIs in a collapsed group
  const completedTlis = tasks.filter(t => t.parentId === null && t.completedAt);

  return (
    <div className="tree-root">
      {tlis.length === 0 && (
        <div className="empty">
          <div className="empty-icon">◎</div>
          <div className="empty-title">No goals yet</div>
          <div className="empty-sub">Add your first top-level goal to get started.</div>
        </div>
      )}

      {tlis.map(tli => (
        <TreeNode
          key={tli.id}
          task={tli}
          allTasks={tasks}
          depth={0}
          colorMap={colorMap}
          tliId={tli.id}
        />
      ))}

      {completedTlis.length > 0 && (
        <CompletedGroup
          tasks={completedTlis}
          allTasks={tasks}
          depth={0}
          colorMap={assignTliColors(completedTlis)}
          tliId={''}
        />
      )}

      {/* Add TLI button */}
      <div
        className="add-task-row"
        style={{ marginTop: 8, fontFamily: 'var(--font-body)' }}
        onClick={() => setShowAddTli(true)}
      >
        <span>+</span>
        <span>Add top-level goal</span>
      </div>

      {showAddTli && (
        <TaskForm parentId={null} onClose={() => setShowAddTli(false)} />
      )}
    </div>
  );
}
