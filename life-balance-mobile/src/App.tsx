import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: string | null }
> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) {
    return { error: e.message + '\n' + e.stack };
  }
  render() {
    if (this.state.error) {
      return (
        <SafeAreaView style={s.errorBox}>
          <Text style={s.errorTitle}>Error</Text>
          <ScrollView>
            <Text style={s.errorText}>{this.state.error}</Text>
          </ScrollView>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

function InnerApp() {
  const [step, setStep]   = useState('starting…');
  const [error, setError] = useState<string | null>(null);
  const [Nav, setNav]     = useState<React.ComponentType | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setStep('seeding…');
        const { seedIfEmpty } = await import('./seed');
        await seedIfEmpty();

        setStep('loading…');
        const { useStore } = await import('./store');
        await useStore.getState().loadAll();

        setStep('ready');
        const mod = await import('./navigation');
        setNav(() => mod.default);
      } catch (e: any) {
        setError(String(e?.message ?? e));
      }
    })();
  }, []);

  if (error) {
    return (
      <SafeAreaView style={s.errorBox}>
        <Text style={s.errorTitle}>Boot error</Text>
        <ScrollView>
          <Text style={s.errorText}>{error}</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!Nav) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator color="#78716c" size="large" />
        <Text style={[s.stepText, { marginTop: 12 }]}>{step}</Text>
      </SafeAreaView>
    );
  }

  return <Nav />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <InnerApp />
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({
  center:     { flex: 1, backgroundColor: '#faf8f4', alignItems: 'center', justifyContent: 'center' },
  stepText:   { fontSize: 14, color: '#78716c' },
  errorBox:   { flex: 1, backgroundColor: '#fee2e2', padding: 20 },
  errorTitle: { fontSize: 16, fontWeight: '700', color: '#b91c1c', marginBottom: 10 },
  errorText:  { fontSize: 11, color: '#7f1d1d', fontFamily: 'monospace' },
});
