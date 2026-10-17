import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { useSession } from './session';
import { errorMessage } from './api';

export const colors = { blue: '#2447e5', navy: '#11182b', muted: '#6b7485', cream: '#f7f6f1', border: '#e5e7ed', soft: '#eef2ff', orange: '#ff6b35', green: '#137d50' };
export const human = (text?: string) => (text ?? '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
export const money = (value: number) => `₹${value.toLocaleString('en-IN')}`;
export const date = (value: string) => new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });

export function Button({ label, onPress, secondary, busy, disabled }: { label: string; onPress: () => void; secondary?: boolean; busy?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || disabled, busy }} disabled={busy || disabled} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondary, (busy || disabled) && { opacity: 0.55 }, pressed && { opacity: 0.8 }]}>{busy ? <ActivityIndicator color={secondary ? colors.blue : '#fff'} /> : <Text style={[styles.buttonText, secondary && { color: colors.blue }]}>{label}</Text>}</Pressable>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={{ gap: 7 }}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor="#8991a0" style={[styles.input, props.multiline && { height: 100, textAlignVertical: 'top', paddingTop: 12 }]} {...props} /></View>;
}
export function Badge({ value }: { value: string }) {
  const good = /PUBLISHED|VERIFIED|SELECTED|COMPLETED|JOINED/.test(value);
  const bad = /REJECTED|CANCELLED|CLOSED|EXPIRED|BLOCKED/.test(value);
  return <View style={[styles.badge, { backgroundColor: good ? '#e6f5ed' : bad ? '#fff0e9' : colors.soft }]}><Text style={{ color: good ? colors.green : bad ? '#9e401f' : colors.blue, fontSize: 11, fontWeight: '700' }}>{human(value)}</Text></View>;
}
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) { return <View style={[styles.card, style]}>{children}</View>; }
export function Page({ children }: { children: React.ReactNode }) { return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>{children}</ScrollView>; }
export function Heading({ title, subtitle, eyebrow }: { title: string; subtitle?: string; eyebrow?: string }) { return <View style={{ gap: 7 }}>{eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}<Text style={styles.title}>{title}</Text>{subtitle && <Text style={styles.muted}>{subtitle}</Text>}</View>; }
export function Notice({ text, error = false }: { text?: string; error?: boolean }) { if (!text) return null; return <Text accessibilityRole={error ? 'alert' : 'text'} accessibilityLiveRegion="polite" style={[styles.notice, error && { color: '#992f24', backgroundColor: '#fff0ec' }]}>{text}</Text>; }
export function Empty({ title, text, retry }: { title: string; text: string; retry?: () => void }) { return <Card><Text style={styles.subheading}>{title}</Text><Text style={styles.muted}>{text}</Text>{retry && <Button label="Try again" secondary onPress={retry} />}</Card>; }
export function Loading() { return <ActivityIndicator color={colors.blue} style={{ padding: 28 }} />; }
export function Chips<T extends string>({ values, selected, onSelect }: { values: readonly T[]; selected: T; onSelect: (value: T) => void }) { return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">{values.map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: selected === value }} onPress={() => onSelect(value)} style={[styles.chip, selected === value && styles.selectedChip]}><Text style={[styles.chipText, selected === value && { color: '#fff' }]}>{human(value)}</Text></Pressable>)}</ScrollView>; }

export function useRemote<T>(path: string) {
  const { api } = useSession();
  const [data, setData] = useState<T>(); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion(n => n + 1), []);
  useEffect(() => {
    let active = true; const controller = new AbortController();
    setLoading(true); setError('');
    api<T>(path, { signal: controller.signal }).then(result => { if (active) setData(result); }).catch(e => { if (active) setError(errorMessage(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [path, version, api]);
  return { data, error, loading, refresh };
}

export const styles = StyleSheet.create({
  page: { padding: 18, paddingBottom: 36, gap: 18 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 17, gap: 12 },
  title: { color: colors.navy, fontSize: 29, fontWeight: '800', letterSpacing: -1 },
  subheading: { color: colors.navy, fontSize: 17, fontWeight: '700' },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 21 },
  eyebrow: { color: colors.blue, fontSize: 10, fontWeight: '800', letterSpacing: 1.8 },
  button: { minHeight: 46, justifyContent: 'center', alignItems: 'center', borderRadius: 12, paddingHorizontal: 17, paddingVertical: 12, backgroundColor: colors.blue },
  secondary: { backgroundColor: colors.soft },
  buttonText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  label: { color: colors.navy, fontSize: 12, fontWeight: '700' },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, color: colors.navy, fontSize: 16 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7 },
  notice: { padding: 13, borderRadius: 12, backgroundColor: colors.soft, color: colors.blue, fontSize: 13, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chip: { paddingHorizontal: 14, minHeight: 44, justifyContent: 'center', borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  selectedChip: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
});
