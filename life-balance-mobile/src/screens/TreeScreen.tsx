import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useStore } from '../store';
import { Task } from '../types';
import { getChildren, assignTliColors } from '../engine';
import { Colors, Fonts, Spacing, Radius, Common } from '../theme';
import type { RootStackParamList } from '../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ─── Tree node ─────────────────────────────────────────────────────────────────

interface NodeProps {
  task: Task;
  allTasks: Task[];
  depth: number;
  colorMap: Record<string, string>;
  tliId: string;
}

function TreeNode({ task, allTasks, depth, colorMap, tliId }: NodeProps) {
  const navigation = useNavigation<Nav>();
  const { completeTask, reopenTask, deleteTask } = useStore();
  const [expanded, setExpanded] = useState(true);

  const children = getChildren(task.id, allTasks);
  const completedChildren = allTasks.filter(t => t.parentId === task.id && !!t.completedAt);
  const hasChildren = children.length > 0 || completedChildren.length > 0;
  const isTli = depth === 0;
  const color = colorMap[tliId] ?? '#888';

  function handleLongPress() {
    Alert.alert(task.title, undefined, [
      { text: task.completedAt ? 'Reopen' : 'Complete', onPress: () => task.completedAt ? reopenTask(task.id) : completeTask(task.id) },
      { text: 'Edit', onPress: () => navigation.navigate('TaskForm', { taskId: task.id }) },
      { text: 'Add subtask', onPress: () => navigation.navigate('TaskForm', { parentId: task.id }) },
      { text: 'Delete', style: 'destructive', onPress: () => {
        Alert.alert('Delete', `Delete "${task.title}" and all subtasks?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => deleteTask(task.id) },
        ]);
      }},
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <View>
      <TouchableOpacity
        style={[styles.nodeRow, { paddingLeft: Spacing.lg + depth * 18 }]}
        onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
        onLongPress={handleLongPress}
        activeOpacity={0.7}
      >
        {/* Expand toggle */}
        <TouchableOpacity
          style={styles.expandBtn}
          onPress={() => setExpanded(!expanded)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {hasChildren ? (
            <Text style={styles.expandIcon}>{expanded ? '▾' : '▸'}</Text>
          ) : (
            <View style={styles.expandSpacer} />
          )}
        </TouchableOpacity>

        {/* Color dot */}
        <View style={[
          styles.dot,
          isTli
            ? { backgroundColor: color }
            : { borderWidth: 1.5, borderColor: color + '80', backgroundColor: 'transparent' }
        ]} />

        {/* Title */}
        <Text
          style={[
            styles.nodeTitle,
            isTli && styles.nodeTitleTli,
            task.completedAt && styles.nodeTitleDone,
          ]}
          numberOfLines={1}
        >
          {task.completedAt ? '✓ ' : ''}{task.title}
        </Text>

        {/* Importance for TLIs */}
        {isTli && (
          <Text style={styles.impLabel}>{Math.round(task.importance * 100)}%</Text>
        )}

        {/* Deadline indicator */}
        {task.deadline && !task.completedAt && (
          <Text style={[styles.deadlineFlag, { color: new Date(task.deadline) < new Date() ? Colors.red : Colors.amber }]}>
            {new Date(task.deadline) < new Date() ? '!' : '↓'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Children */}
      {expanded && (
        <View>
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

          {/* Completed children summary */}
          {completedChildren.length > 0 && (
            <CompletedGroup
              tasks={completedChildren}
              allTasks={allTasks}
              depth={depth + 1}
              colorMap={colorMap}
              tliId={tliId}
            />
          )}

          {/* Add subtask */}
          <TouchableOpacity
            style={[styles.addRow, { paddingLeft: Spacing.lg + (depth + 1) * 18 }]}
            onPress={() => navigation.navigate('TaskForm', { parentId: task.id })}
          >
            <Text style={styles.addText}>+ Add subtask</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Completed group ───────────────────────────────────────────────────────────

function CompletedGroup({ tasks, allTasks, depth, colorMap, tliId }: NodeProps & { tasks: Task[] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View>
      <TouchableOpacity
        style={[styles.addRow, { paddingLeft: Spacing.lg + depth * 18 }]}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={[styles.addText, { color: Colors.ink4 }]}>
          {expanded ? '▾' : '▸'} {tasks.length} completed
        </Text>
      </TouchableOpacity>
      {expanded && tasks.map(t => (
        <TreeNode key={t.id} task={t} allTasks={allTasks} depth={depth} colorMap={colorMap} tliId={tliId} />
      ))}
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function TreeScreen() {
  const navigation = useNavigation<Nav>();
  const { tasks } = useStore();

  const incomplete = tasks.filter(t => !t.completedAt);
  const tlis = incomplete.filter(t => t.parentId === null);
  const colorMap = assignTliColors(tlis);
  const completedTlis = tasks.filter(t => t.parentId === null && !!t.completedAt);

  return (
    <SafeAreaView style={Common.screen} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Goal tree</Text>
          <Text style={styles.headerSub}>All goals and their tasks</Text>
        </View>
        <TouchableOpacity
          style={Common.btnPrimary}
          onPress={() => navigation.navigate('TaskForm', { parentId: null })}
        >
          <Text style={Common.btnPrimaryText}>+ Goal</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingVertical: Spacing.md, paddingBottom: 32 }}>
        {tlis.length === 0 ? (
          <View style={Common.empty}>
            <Text style={{ fontSize: 32, opacity: 0.3, marginBottom: Spacing.sm }}>◎</Text>
            <Text style={Common.emptyTitle}>No goals yet</Text>
            <Text style={Common.emptySub}>Tap "+ Goal" to add your first top-level goal.</Text>
          </View>
        ) : (
          tlis.map(tli => (
            <TreeNode
              key={tli.id}
              task={tli}
              allTasks={tasks}
              depth={0}
              colorMap={colorMap}
              tliId={tli.id}
            />
          ))
        )}

        {completedTlis.length > 0 && (
          <CompletedGroup
            task={completedTlis[0]}
            tasks={completedTlis}
            allTasks={tasks}
            depth={0}
            colorMap={assignTliColors(completedTlis)}
            tliId={''}
          />
        )}

        <TouchableOpacity
          style={[styles.addRow, { marginTop: Spacing.sm, paddingLeft: Spacing.lg }]}
          onPress={() => navigation.navigate('TaskForm', { parentId: null })}
        >
          <Text style={styles.addText}>+ Add top-level goal</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.rule,
  },
  headerTitle: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.ink,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.ink4,
    marginTop: 1,
  },
  nodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingRight: Spacing.lg,
    gap: 6,
  },
  expandBtn: {
    width: 16,
    alignItems: 'center',
  },
  expandIcon: {
    fontSize: 9,
    color: Colors.ink4,
  },
  expandSpacer: {
    width: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  nodeTitle: {
    flex: 1,
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.ink,
  },
  nodeTitleTli: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: Fonts.monoMedium,
  },
  nodeTitleDone: {
    color: Colors.ink4,
    textDecorationLine: 'line-through',
  },
  impLabel: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.ink4,
  },
  deadlineFlag: {
    fontFamily: Fonts.mono,
    fontSize: 11,
  },
  addRow: {
    paddingVertical: 6,
    paddingRight: Spacing.lg,
  },
  addText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.teal,
  },
});
