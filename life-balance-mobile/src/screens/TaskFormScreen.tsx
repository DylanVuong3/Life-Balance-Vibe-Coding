import React, { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Switch, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Slider from '@react-native-community/slider';

import { useStore } from '../store';
import { EffortSize, Task } from '../types';
import { Colors, Fonts, Spacing, Radius, Common } from '../theme';
import type { RootStackParamList } from '../navigation';

type Nav   = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'TaskForm'>;

const EFFORT_OPTIONS: { value: EffortSize; label: string; sub: string }[] = [
  { value: 'tiny',   label: 'Tiny',   sub: '~15 min' },
  { value: 'small',  label: 'Small',  sub: '~30 min' },
  { value: 'medium', label: 'Medium', sub: '~1 hour' },
  { value: 'large',  label: 'Large',  sub: '~2 hours' },
  { value: 'huge',   label: 'Huge',   sub: '4+ hours' },
];

// ─── Field components ──────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: string }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.sectionCard}>{children}</View>;
}

// Simple date input — text field accepting YYYY-MM-DD
function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChange}
      placeholder="YYYY-MM-DD"
      placeholderTextColor={Colors.ink4}
      keyboardType="numbers-and-punctuation"
      maxLength={10}
    />
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function TaskFormScreen() {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<Route>();
  const { taskId, parentId } = route.params ?? {};

  const { tasks, places, addTask, updateTask } = useStore();

  // Determine if editing an existing task
  const editTask: Task | undefined = taskId ? tasks.find(t => t.id === taskId) : undefined;
  const parentTask = parentId ? tasks.find(t => t.id === parentId) : null;

  const [title,      setTitle]      = useState(editTask?.title ?? '');
  const [notes,      setNotes]      = useState(editTask?.notes ?? '');
  const [importance, setImportance] = useState(editTask?.importance ?? 0.7);
  const [effortSize, setEffortSize] = useState<EffortSize>(editTask?.effortSize ?? 'small');
  const [repeating,  setRepeating]  = useState(editTask?.repeating ?? false);
  const [repeatDays, setRepeatDays] = useState(String(editTask?.repeatDays ?? 7));
  const [deadline,   setDeadline]   = useState(editTask?.deadline?.split('T')[0] ?? '');
  const [selPlaces,  setSelPlaces]  = useState<string[]>(editTask?.placeIds ?? []);
  const [saving,     setSaving]     = useState(false);

  function togglePlace(id: string) {
    setSelPlaces(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Title required', 'Please enter a title for this task.');
      return;
    }
    setSaving(true);

    const data = {
      parentId:   editTask?.parentId ?? (parentId ?? null),
      title:      title.trim(),
      notes,
      importance,
      effortSize,
      repeating,
      repeatDays: repeating ? (parseInt(repeatDays, 10) || 7) : undefined,
      deadline:   deadline || undefined,
      placeIds:   selPlaces,
    };

    if (editTask) {
      await updateTask(editTask.id, data);
    } else {
      await addTask(data);
    }

    setSaving(false);
    navigation.goBack();
  }

  return (
    <SafeAreaView style={Common.screen} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Parent context */}
        {parentTask && (
          <View style={styles.parentContext}>
            <Text style={styles.parentContextText}>Subtask of: </Text>
            <Text style={[styles.parentContextText, { color: Colors.ink2 }]}>{parentTask.title}</Text>
          </View>
        )}

        {/* Title */}
        <SectionCard>
          <FieldLabel>Title</FieldLabel>
          <TextInput
            style={[styles.input, styles.titleInput]}
            value={title}
            onChangeText={setTitle}
            placeholder="What needs doing?"
            placeholderTextColor={Colors.ink4}
            autoFocus={!editTask}
            multiline
          />
        </SectionCard>

        {/* Notes */}
        <SectionCard>
          <FieldLabel>Notes</FieldLabel>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Context, links, or details…"
            placeholderTextColor={Colors.ink4}
            multiline
            textAlignVertical="top"
          />
        </SectionCard>

        {/* Importance */}
        <SectionCard>
          <View style={styles.sliderHeader}>
            <FieldLabel>Importance</FieldLabel>
            <Text style={styles.sliderValue}>{Math.round(importance * 100)}%</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0.1}
            maximumValue={1}
            step={0.05}
            value={importance}
            onValueChange={setImportance}
            minimumTrackTintColor={Colors.ink}
            maximumTrackTintColor={Colors.rule}
            thumbTintColor={Colors.ink}
          />
          <View style={styles.sliderTicks}>
            <Text style={styles.sliderTickLabel}>Low</Text>
            <Text style={styles.sliderTickLabel}>Medium</Text>
            <Text style={styles.sliderTickLabel}>High</Text>
          </View>
        </SectionCard>

        {/* Effort */}
        <SectionCard>
          <FieldLabel>Effort</FieldLabel>
          <View style={styles.effortGrid}>
            {EFFORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.effortBtn, effortSize === opt.value && styles.effortBtnActive]}
                onPress={() => setEffortSize(opt.value)}
              >
                <Text style={[styles.effortLabel, effortSize === opt.value && styles.effortLabelActive]}>
                  {opt.label}
                </Text>
                <Text style={[styles.effortSub, effortSize === opt.value && { color: Colors.paper }]}>
                  {opt.sub}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </SectionCard>

        {/* Deadline */}
        <SectionCard>
          <FieldLabel>Deadline (optional)</FieldLabel>
          <DateInput value={deadline} onChange={setDeadline} />
          {deadline ? (
            <TouchableOpacity onPress={() => setDeadline('')} style={{ marginTop: Spacing.sm }}>
              <Text style={{ fontFamily: Fonts.mono, fontSize: 12, color: Colors.red }}>
                × Clear deadline
              </Text>
            </TouchableOpacity>
          ) : null}
        </SectionCard>

        {/* Repeating */}
        <SectionCard>
          <View style={styles.switchRow}>
            <View>
              <FieldLabel>Repeating task</FieldLabel>
              <Text style={styles.switchSub}>Task reappears after completion</Text>
            </View>
            <Switch
              value={repeating}
              onValueChange={setRepeating}
              trackColor={{ false: Colors.rule, true: Colors.ink }}
              thumbColor={Colors.paper}
            />
          </View>
          {repeating && (
            <View style={[styles.switchRow, { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.rule }]}>
              <Text style={{ fontFamily: Fonts.mono, fontSize: 13, color: Colors.ink2 }}>
                Repeat every
              </Text>
              <View style={styles.repeatDaysRow}>
                <TextInput
                  style={styles.repeatDaysInput}
                  value={repeatDays}
                  onChangeText={setRepeatDays}
                  keyboardType="number-pad"
                  maxLength={3}
                />
                <Text style={{ fontFamily: Fonts.mono, fontSize: 13, color: Colors.ink2 }}>
                  days
                </Text>
              </View>
            </View>
          )}
        </SectionCard>

        {/* Places */}
        {places.length > 0 && (
          <SectionCard>
            <FieldLabel>Places (optional)</FieldLabel>
            <Text style={styles.placesHint}>
              Restrict this task to specific contexts
            </Text>
            <View style={styles.placesRow}>
              {places.map(p => {
                const active = selPlaces.includes(p.id);
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.placeChip,
                      active && { backgroundColor: p.color, borderColor: p.color },
                    ]}
                    onPress={() => togglePlace(p.id)}
                  >
                    <View style={[styles.placeChipDot, { backgroundColor: active ? Colors.paper : p.color }]} />
                    <Text style={[styles.placeChipText, active && { color: Colors.paper }]}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </SectionCard>
        )}
      </ScrollView>

      {/* Save bar */}
      <View style={styles.saveBar}>
        <TouchableOpacity
          style={[Common.btnSecondary, { flex: 1 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={Common.btnSecondaryText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[Common.btnPrimary, { flex: 2 }, (!title.trim() || saving) && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={!title.trim() || saving}
        >
          <Text style={Common.btnPrimaryText}>
            {saving ? 'Saving…' : editTask ? 'Save changes' : 'Add task'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: 12,
  },
  parentContext: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.paper2,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.rule,
  },
  parentContextText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.ink4,
  },
  sectionCard: {
    backgroundColor: Colors.paper,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.rule,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  fieldLabel: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.ink4,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  input: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    color: Colors.ink,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.rule,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.paper2,
  },
  titleInput: {
    fontSize: 15,
    fontFamily: Fonts.monoMedium,
    minHeight: 44,
  },
  notesInput: {
    fontFamily: Fonts.body,
    fontSize: 14,
    minHeight: 80,
    paddingTop: Spacing.sm,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderValue: {
    fontFamily: Fonts.monoMedium,
    fontSize: 16,
    color: Colors.ink,
  },
  slider: {
    width: '100%',
    height: 36,
  },
  sliderTicks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -Spacing.sm,
  },
  sliderTickLabel: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.ink4,
  },
  effortGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  effortBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.rule,
    backgroundColor: Colors.paper2,
    alignItems: 'center',
    minWidth: 70,
  },
  effortBtnActive: {
    backgroundColor: Colors.ink,
    borderColor: Colors.ink,
  },
  effortLabel: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    color: Colors.ink,
  },
  effortLabelActive: {
    color: Colors.paper,
  },
  effortSub: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.ink4,
    marginTop: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  switchSub: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.ink4,
    marginTop: 2,
  },
  repeatDaysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  repeatDaysInput: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    color: Colors.ink,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.rule,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    backgroundColor: Colors.paper2,
    width: 56,
    textAlign: 'center',
  },
  placesHint: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.ink4,
    marginTop: -Spacing.xs,
  },
  placesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  placeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.rule,
    backgroundColor: Colors.paper2,
  },
  placeChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  placeChipText: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.ink3,
  },
  saveBar: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.rule,
    backgroundColor: Colors.paper,
  },
});
