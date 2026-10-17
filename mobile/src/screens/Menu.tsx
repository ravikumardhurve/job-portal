import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useSession } from '../session';
import { Alert } from '../alert';
import { errorMessage } from '../api';
import { adminPages, candidatePages, publicPages, type NavItem } from '../navigation';
import { Button, Card, Heading, Notice, Page, colors, styles } from '../ui';

export function AllPages({ navigate, login }: { navigate: (page: string) => void; login: (kind: 'candidate' | 'admin', register?: boolean) => void }) {
  const { identity, signOut } = useSession();
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const group = (title: string, items: NavItem[]) => <View style={{ gap: 10 }}><Text style={styles.eyebrow}>{title}</Text><Card style={{ padding: 0, gap: 0, overflow: 'hidden' }}>{items.map((item, index) => <Pressable key={item.id} accessibilityRole="button" onPress={() => navigate(item.id)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, minHeight: 52, gap: 12, borderTopWidth: index ? 1 : 0, borderColor: colors.border, backgroundColor: pressed ? colors.soft : '#fff' })}><Feather name={item.icon} size={18} color={colors.blue} /><Text style={{ flex: 1, color: colors.navy, fontSize: 13, fontWeight: '600' }}>{item.label}</Text><Feather name="chevron-right" size={16} color={colors.muted} /></Pressable>)}</Card></View>;
  const allowed = adminPages.filter(item => {
    const role = identity?.kind === 'admin' ? identity.user.role : '';
    if (['team', 'audit-logs'].includes(item.id)) return role === 'SUPER_ADMIN';
    if (['settings', 'assets', 'privacy-requests', 'reviews'].includes(item.id)) return role === 'ADMIN' || role === 'SUPER_ADMIN';
    return true;
  });
  async function logout() { setBusy(true); setError(''); try { await signOut(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); } }
  return <Page><Heading eyebrow="EVERYTHING IN ONE PLACE" title="Your workspace." subtitle="Choose a page to get started." />
    {identity?.kind === 'admin' ? group('Administration', allowed) : <>{group('Candidate workspace', candidatePages)}{group('Explore CG Job Care', publicPages)}</>}
    {!identity ? <Card><Text style={styles.subheading}>Join the right workspace</Text><Button label="Candidate sign in" onPress={() => login('candidate')} /><Button label="Create candidate account" secondary onPress={() => login('candidate', true)} /><Button label="Admin / Partner sign in" secondary onPress={() => login('admin')} /></Card> : <><Notice text={error} error /><Button label="Sign out" secondary busy={busy} onPress={() => Alert.alert('Sign out?', 'Your app session will be revoked.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', onPress: () => void logout() }])} /></>}
  </Page>;
}
