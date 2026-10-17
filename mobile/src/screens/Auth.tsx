import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { errorMessage, request } from '../api';
import { PublicScreen } from './Public';
import { useSession } from '../session';
import type { AuthResult } from '../types';
import { Button, Card, Chips, Field, Heading, Notice, Page, colors, styles } from '../ui';

export function AuthScreen({ onDone, onNavigate, initialKind = 'candidate', initialRegister = false }: { onDone: () => void; onNavigate: (page: string) => void; initialKind?: 'candidate' | 'admin'; initialRegister?: boolean }) {
  const { signIn } = useSession();
  const [kind, setKind] = useState<'candidate' | 'admin'>(initialKind);
  const [register, setRegister] = useState(initialRegister);
  const [form, setForm] = useState({ identity: '', password: '', fullName: '', email: '', city: '' });
  const [consent, setConsent] = useState(false); const [adult, setAdult] = useState(false);
  const [visible, setVisible] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [policy, setPolicy] = useState<string | null>(null);
  const pendingRequest = useRef<AbortController | null>(null);
  useEffect(() => () => { pendingRequest.current?.abort(); }, []);
  const edit = (key: keyof typeof form) => (value: string) => setForm(previous => ({ ...previous, [key]: value }));
  async function submit() {
    if (pendingRequest.current) return;
    const controller = new AbortController();
    pendingRequest.current = controller;
    setBusy(true); setError('');
    try {
      if (!form.identity.trim() || !form.password) throw new Error('Enter your login details.');
      const body = register ? { fullName: form.fullName, mobile: form.identity, email: form.email, city: form.city, password: form.password, isAdult: adult, privacyConsent: consent, termsAccepted: consent } : { kind, identity: form.identity, password: form.password };
      const result = await request<{ data: AuthResult }>(register ? 'auth/register' : 'auth/login', { method: 'POST', body, signal: controller.signal });
      if (controller.signal.aborted) return;
      await signIn(result.data); onDone();
    } catch (e) { if (!controller.signal.aborted) setError(errorMessage(e)); } finally { if (pendingRequest.current === controller) pendingRequest.current = null; if (!controller.signal.aborted) setBusy(false); }
  }
  const openPolicy = (path: string) => setPolicy(path === 'privacy' ? 'privacy-policy' : 'terms');
  return <Page>
    <Modal visible={!!policy} animationType="slide" onRequestClose={() => setPolicy(null)}><SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}><View style={{ padding: 14 }}><Button label="Back to registration" secondary onPress={() => setPolicy(null)} /></View>{policy && <PublicScreen page={policy} navigate={page => { if (page === 'privacy-policy' || page === 'terms') setPolicy(page); else { setPolicy(null); onNavigate(page); } }} signIn={() => setPolicy(null)} />}</SafeAreaView></Modal>
    <View style={{ width: 60, height: 60, borderRadius: 19, backgroundColor: colors.blue, justifyContent: 'center', alignItems: 'center' }}><Feather name="briefcase" size={28} color="white" /></View>
    <Heading eyebrow="YOUR NEXT CHAPTER" title={register ? 'Let’s get you started.' : 'Welcome back.'} subtitle="One account. More opportunities. Your CG Job Care portal, now in your pocket." />
    <Chips values={['candidate', 'admin'] as const} selected={kind} onSelect={value => { if (busy) return; setKind(value); setRegister(false); setError(''); setForm({ identity: '', password: '', fullName: '', email: '', city: '' }); }} />
    <Card>
      {register && <Field label="Full name" value={form.fullName} onChangeText={edit('fullName')} autoComplete="name" />}
      <Field label={kind === 'admin' ? 'Admin email' : 'Mobile number'} value={form.identity} onChangeText={edit('identity')} keyboardType={kind === 'admin' ? 'email-address' : 'phone-pad'} autoCapitalize="none" autoCorrect={false} maxLength={kind === 'candidate' ? 10 : 150} autoComplete={kind === 'admin' ? 'email' : 'tel'} />
      {register && <><Field label="Email address" value={form.email} onChangeText={edit('email')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" /><Field label="City" value={form.city} onChangeText={edit('city')} placeholder="Raipur" /></>}
      <Field label="Password" value={form.password} onChangeText={edit('password')} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} autoComplete={register ? 'new-password' : 'current-password'} />
      <Pressable accessibilityRole="button" onPress={() => setVisible(!visible)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.blue, fontSize: 12 }}>{visible ? 'Hide password' : 'Show password'}</Text></Pressable>
      {register && <>
        <Check checked={adult} onChange={() => setAdult(!adult)} label="I am 18 years old or above." />
        <Check checked={consent} onChange={() => setConsent(!consent)} label="I accept the Privacy Policy and Terms." />
        <View style={styles.row}><Button label="Privacy Policy" secondary onPress={() => void openPolicy('privacy')} /><Button label="Terms" secondary onPress={() => void openPolicy('terms')} /></View>
      </>}
      <Notice text={error} error />
      <Button label={register ? 'Create my account' : kind === 'admin' ? 'Open admin workspace' : 'Sign in'} onPress={() => void submit()} busy={busy} />
    </Card>
    {kind === 'candidate' && <Button label={register ? 'Already registered? Sign in' : 'New here? Create an account'} secondary disabled={busy} onPress={() => { setRegister(!register); setError(''); }} />}
    {kind === 'admin' && <Text style={styles.muted}>Use your existing portal admin or partner credentials. Access is limited to your assigned business field.</Text>}
  </Page>;
}
function Check({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) { return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onChange} style={[styles.row, { minHeight: 44 }]}><Feather name={checked ? 'check-square' : 'square'} size={22} color={colors.blue} /><Text style={[styles.muted, { flex: 1 }]}>{label}</Text></Pressable>; }
