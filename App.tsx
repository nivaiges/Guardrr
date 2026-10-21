import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { msPerCount } from './src/engine';

const DEFAULT_BPM = 120;
const DEFAULT_PHRASE_LENGTH = 16;

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Guardrr</Text>
      <Text style={styles.subtitle}>Colorguard toss practice</Text>
      <Text style={styles.info}>
        {DEFAULT_BPM} BPM · {DEFAULT_PHRASE_LENGTH}-count phrase ·{' '}
        {Math.round(msPerCount(DEFAULT_BPM))} ms per count
      </Text>
      <Text style={styles.note}>Metronome and toss calls coming soon.</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: { fontSize: 40, fontWeight: '700' },
  subtitle: { fontSize: 18, marginTop: 4, color: '#444' },
  info: { fontSize: 16, marginTop: 24 },
  note: { fontSize: 14, marginTop: 8, color: '#888' },
});
