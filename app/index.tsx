import { StyleSheet, Text, View } from 'react-native';

export default function SearchPlaceholderScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Axtarış</Text>
      <Text style={styles.subtitle}>NAS Dizel</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F8FA',
    padding: 24,
  },
  title: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 8,
    color: '#4B5563',
    fontSize: 16,
  },
});
