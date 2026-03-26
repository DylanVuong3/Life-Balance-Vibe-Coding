import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useStore } from '../store';
import { Place } from '../types';
import { Colors, Fonts, Spacing, Radius, Common } from '../theme';

const PLACE_COLORS = [
  '#7F77DD', '#1D9E75', '#D85A30', '#BA7517',
  '#378ADD', '#639922', '#D4537E', '#888780',
];

// ─── Inline color picker ───────────────────────────────────────────────────────

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <View style={styles.colorRow}>
      {PLACE_COLORS.map(c => (
        <TouchableOpacity
          key={c}
          onPress={() => onChange(c)}
          style={[
            styles.colorSwatch,
            { backgroundColor: c },
            value === c && styles.colorSwatchActive,
          ]}
        />
      ))}
    </View>
  );
}

// ─── Inline add / edit form ────────────────────────────────────────────────────

import { TextInput } from 'react-native';

interface PlaceFormProps {
  initial?: Place;
  onSave: (name: string, color: string) => void;
  onCancel: () => void;
}

function PlaceForm({ initial, onSave, onCancel }: PlaceFormProps) {
  const [name, setName]   = useState(initial?.name  ?? '');
  const [color, setColor] = useState(initial?.color ?? PLACE_COLORS[0]);

  return (
    <View style={styles.form}>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Place name — e.g. Work, Home, Anywhere…"
        placeholderTextColor={Colors.ink4}
        autoFocus
      />
      <ColorPicker value={color} onChange={setColor} />
      <View style={styles.formBtns}>
        <TouchableOpacity style={Common.btnSecondary} onPress={onCancel}>
          <Text style={Common.btnSecondaryText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[Common.btnPrimary, { flex: 1 }]}
          onPress={() => name.trim() && onSave(name.trim(), color)}
        >
          <Text style={Common.btnPrimaryText}>{initial ? 'Save' : 'Add place'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function PlacesScreen() {
  const { places, addPlace, updatePlace, deletePlace, activePlaceIds, setActivePlaces } = useStore();
  const [showAdd, setShowAdd]     = useState(false);
  const [editing, setEditing]     = useState<Place | null>(null);

  function toggleActive(id: string) {
    setActivePlaces(
      activePlaceIds.includes(id)
        ? activePlaceIds.filter(p => p !== id)
        : [...activePlaceIds, id],
    );
  }

  function handleDelete(place: Place) {
    Alert.alert(
      'Delete place',
      `Remove "${place.name}"? Tasks assigned here won't be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deletePlace(place.id) },
      ],
    );
  }

  return (
    <SafeAreaView style={Common.screen} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Places</Text>
          <Text style={styles.headerSub}>Context filters for your queue</Text>
        </View>
        {!showAdd && !editing && (
          <TouchableOpacity style={Common.btnPrimary} onPress={() => setShowAdd(true)}>
            <Text style={Common.btnPrimaryText}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Inline add form */}
        {showAdd && (
          <PlaceForm
            onSave={async (name, color) => {
              await addPlace({ name, color, isOpen: true });
              setShowAdd(false);
            }}
            onCancel={() => setShowAdd(false)}
          />
        )}

        {/* Active filter banner */}
        {activePlaceIds.length > 0 && (
          <View style={styles.filterBanner}>
            <Text style={styles.filterBannerText}>
              Queue filtered to: {places.filter(p => activePlaceIds.includes(p.id)).map(p => p.name).join(', ')}
            </Text>
            <TouchableOpacity onPress={() => setActivePlaces([])}>
              <Text style={styles.filterClear}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Place list */}
        {places.length === 0 && !showAdd ? (
          <View style={Common.empty}>
            <Text style={{ fontSize: 32, opacity: 0.3, marginBottom: Spacing.sm }}>◎</Text>
            <Text style={Common.emptyTitle}>No places yet</Text>
            <Text style={Common.emptySub}>
              Places filter your queue.{'\n'}Try "Work", "Home", or "Not Working".
            </Text>
          </View>
        ) : (
          places.map(place => (
            <View key={place.id}>
              {/* Edit form inline */}
              {editing?.id === place.id ? (
                <PlaceForm
                  initial={place}
                  onSave={async (name, color) => {
                    await updatePlace(place.id, { name, color });
                    setEditing(null);
                  }}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <View style={[
                  styles.placeRow,
                  activePlaceIds.includes(place.id) && {
                    borderColor: place.color + '60',
                    backgroundColor: place.color + '0C',
                  },
                ]}>
                  {/* Left: dot + name */}
                  <View style={[styles.placeDot, { backgroundColor: place.color }]} />
                  <View style={styles.placeInfo}>
                    <Text style={styles.placeName}>{place.name}</Text>
                    <Text style={styles.placeStatus}>
                      {activePlaceIds.includes(place.id) ? 'Active filter' : 'Inactive'}
                    </Text>
                  </View>

                  {/* Toggle */}
                  <Switch
                    value={activePlaceIds.includes(place.id)}
                    onValueChange={() => toggleActive(place.id)}
                    trackColor={{ false: Colors.rule, true: place.color }}
                    thumbColor={Colors.paper}
                    style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                  />

                  {/* Edit / delete */}
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => setEditing(place)}
                  >
                    <Text style={styles.iconBtnText}>✎</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => handleDelete(place)}
                  >
                    <Text style={[styles.iconBtnText, { color: Colors.red }]}>×</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}

        {/* Explainer */}
        <View style={[Common.cardSecondary, { marginTop: Spacing.xl }]}>
          <Text style={[Common.label, { marginBottom: Spacing.sm }]}>About places</Text>
          <Text style={Common.bodyText}>
            Places are context filters — they can be physical locations or states of mind.
            "Not Working", "Deep Focus", and "Client Site" are all valid.
            {'\n\n'}
            When a place is active, only tasks assigned to it appear in your queue.
            Tasks with no place assigned are always visible.
          </Text>
        </View>
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
  content: {
    padding: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: 40,
  },
  filterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.paper2,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.rule,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  filterBannerText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.ink3,
    flex: 1,
  },
  filterClear: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.teal,
    marginLeft: Spacing.md,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.paper,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.rule,
  },
  placeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    flexShrink: 0,
  },
  placeInfo: {
    flex: 1,
    gap: 2,
  },
  placeName: {
    fontFamily: Fonts.monoMedium,
    fontSize: 13,
    color: Colors.ink,
  },
  placeStatus: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.ink4,
  },
  iconBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: {
    fontSize: 16,
    color: Colors.ink3,
  },
  // Form
  form: {
    backgroundColor: Colors.paper2,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.rule,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  input: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    color: Colors.ink,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.rule,
    borderRadius: Radius.md,
    padding: Spacing.md,
    backgroundColor: Colors.paper,
  },
  colorRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  colorSwatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  colorSwatchActive: {
    borderWidth: 3,
    borderColor: Colors.ink,
  },
  formBtns: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});
