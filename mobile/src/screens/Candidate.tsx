import React, { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { Alert } from '../alert';
import Feather from '@expo/vector-icons/Feather';
import { errorMessage } from '../api';
import { useSession } from '../session';
import type { Application, Interview, Job } from '../types';
import { Badge, Button, Card, Chips, Empty, Field, Heading, Loading, Notice, Page, colors, date, human, styles, useRemote } from '../ui';

export function ActivityScreen({ openJob, signIn, initialTab = 'applications' }: { openJob: (job: Job) => void; signIn: () => void; initialTab?: string }) {
  const { identity } = useSession();
  const [tab, setTab] = useState(initialTab);
  if (identity?.kind !== 'candidate') return <Gate signIn={signIn} />;
  return <Page><Heading eyebrow="YOUR PROGRESS" title="Every step, in one place." subtitle="Applications and interview updates from the team." /><Chips values={['applications', 'interviews']} selected={tab} onSelect={setTab} /><ActivityList key={tab} tab={tab} openJob={openJob} /></Page>;
}
function ActivityList({ tab, openJob }: { tab: string; openJob: (job: Job) => void }) {
  const result = useRemote<{ data: (Application & Partial<Interview>)[] }>(`candidate/${tab}`);
  if (result.loading) return <Loading />;
  if (result.error) return <Empty title="Could not load updates" text={result.error} retry={result.refresh} />;
  return <><Button label="Refresh updates" secondary onPress={result.refresh} />{!result.data?.data.length && <Empty title={tab === 'applications' ? 'Your next opportunity is waiting' : 'No interviews yet'} text={tab === 'applications' ? 'Browse jobs and apply. Your progress will appear here.' : 'The team will post your interview details here when scheduled.'} />}{result.data?.data.map(row => <Card key={row.id}>
    <View style={[styles.row, { justifyContent: 'space-between' }]}><Text style={styles.eyebrow}>{row.id}</Text><Badge value={row.status} /></View>
    <Text style={styles.subheading}>{row.job?.title ?? 'Opportunity details unavailable'}</Text><Text style={styles.muted}>{row.job?.company}</Text>
    {tab === 'interviews' ? <>
      <Text style={{ color: colors.blue, fontWeight: '700', fontSize: 15 }}>{row.scheduledAt ? `${date(row.scheduledAt)} IST` : ''}</Text><Text style={styles.muted}>{human(row.mode)}{row.address ? ` · ${row.address}` : ''}</Text>
      {!!row.instructions && <Notice text={row.instructions} />}
      {!!row.cancelReason && <Notice text={row.cancelReason} error />}
      {!!row.contactPerson && <Text style={styles.muted}>Contact: {row.contactPerson}{row.contactMobile ? ` · ${row.contactMobile}` : ''}</Text>}
      {row.meetingLink && /^https:\/\//i.test(row.meetingLink) && <Button label="Open meeting link" onPress={() => { Alert.alert('Open meeting?', 'This will open the interview link in your browser.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Open', onPress: () => void Linking.openURL(row.meetingLink!).catch(() => Alert.alert('Unable to open link')) }]); }} />}
    </> : <><Text style={styles.muted}>Applied {date(row.appliedAt)} IST</Text>{row.statusHistory?.slice(-3).map((step, index) => <View key={`${step.at}-${index}`} style={styles.row}><View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.blue }} /><Text style={styles.muted}>{human(step.status)} · {date(step.at)}</Text></View>)}</>}
    {row.job && <Button label="View job" secondary onPress={() => openJob(row.job!)} />}
  </Card>)}</>;
}

export function Gate({ signIn }: { signIn: () => void }) { return <Page><Heading eyebrow="YOUR CG JOB CARE ACCOUNT" title="A little closer to your next job." subtitle="Sign in to track applications, manage your profile and save opportunities." /><Button label="Sign in / Create account" onPress={signIn} /></Page>; }

const services = [
  { key: 'SECURITY', name: 'Security staff', icon: 'shield', detail: 'For your home, business and events.', color: '#eef2ff' },
  { key: 'BABY_CARE', name: 'Baby care', icon: 'heart', detail: 'A helping hand for your family.', color: '#fff0e9' },
  { key: 'CARETAKER', name: 'Patient & elder care', icon: 'user-check', detail: 'Thoughtful, everyday support.', color: '#f1e9ff' },
  { key: 'HOUSEKEEPING', name: 'Housekeeping', icon: 'home', detail: 'Cleaner homes and workplaces.', color: '#e6f5ed' },
  { key: 'PEST_CONTROL', name: 'Pest control', icon: 'target', detail: 'Care for a healthier space.', color: '#fff5d5' },
] as const;

export function ServicesScreen({ signIn, initialService }: { signIn: () => void; initialService?: string }) {
  const { identity, api } = useSession();
  const [selected, setSelected] = useState<string>(services.some(service => service.key === initialService) ? initialService! : 'SECURITY');
  const [city, setCity] = useState(identity?.kind === 'candidate' ? identity.user.city ?? '' : '');
  const [address, setAddress] = useState(''); const [staff, setStaff] = useState('1');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [receipt, setReceipt] = useState('');
  async function submit() {
    if (identity?.kind !== 'candidate') { signIn(); return; }
    setBusy(true); setError('');
    try { const result = await api<{ data: { id: string } }>('candidate/services', { method: 'POST', body: { serviceType: selected, city, address, staffRequired: Number(staff) } }); setReceipt(result.data.id); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <Page><Heading eyebrow="PEOPLE YOU CAN COUNT ON" title="A little help. A lot of care." subtitle="Home, family or business—tell us what you need." />
    {services.map(service => <Card key={service.key} style={{ backgroundColor: service.key === selected ? service.color : '#fff', borderColor: service.key === selected ? colors.blue : colors.border }}><View style={styles.row}><Feather name={service.icon} size={23} color={colors.blue} /><View style={{ flex: 1 }}><Text style={styles.subheading}>{service.name}</Text><Text style={styles.muted}>{service.detail}</Text></View></View><Button label={selected === service.key ? 'Selected ✓' : 'Choose service'} secondary onPress={() => { setSelected(service.key); setReceipt(''); }} /></Card>)}
    {receipt ? <Card><Heading title="Request received." subtitle={`Reference: ${receipt}. Our team will contact you on your registered mobile number. This is an enquiry, not a confirmed booking.`} /><Button label="Make another enquiry" secondary onPress={() => setReceipt('')} /></Card> : <Card><Text style={styles.subheading}>Request {human(selected)}</Text><Field label="City" value={city} onChangeText={setCity} /><Field label="Service address" value={address} onChangeText={setAddress} multiline /><Field label="Staff required" value={staff} onChangeText={setStaff} keyboardType="number-pad" /><Text style={styles.muted}>Availability and deployment will be confirmed by our team.</Text><Notice text={error} error /><Button label={identity?.kind === 'candidate' ? 'Send enquiry →' : 'Sign in to enquire'} onPress={() => void submit()} busy={busy} /></Card>}
  </Page>;
}
