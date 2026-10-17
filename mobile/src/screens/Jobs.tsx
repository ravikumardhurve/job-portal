import React, { useState } from 'react';
import { FlatList, Pressable, RefreshControl, Share, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { API_URL, errorMessage } from '../api';
import { useSession } from '../session';
import type { Job, Page as Paged, Application, SavedJob } from '../types';
import { Badge, Button, Card, Chips, Empty, Field, Heading, Loading, Notice, Page, colors, human, money, styles, useRemote } from '../ui';

export function JobsScreen({ openJob, saved = false, signIn, initialCity = '' }: { openJob: (job: Job) => void; saved?: boolean; signIn: () => void; initialCity?: string }) {
  const { identity } = useSession();
  const [draft, setDraft] = useState(''); const [cityDraft, setCityDraft] = useState(initialCity);
  const [filter, setFilter] = useState({ q: '', city: initialCity, page: 1, type: 'ALL' });
  const query = `jobs?q=${encodeURIComponent(filter.q)}&city=${encodeURIComponent(filter.city)}&page=${filter.page}${filter.type === 'ALL' ? '' : `&employmentType=${filter.type}`}`;
  if (saved && identity?.kind !== 'candidate') return <Page><Empty title="Your shortlist starts here" text="Sign in as a candidate to keep interesting jobs in one place." /><Button label="Sign in" onPress={signIn} /></Page>;
  return <JobResults key={saved ? 'saved' : 'jobs'} path={saved ? 'candidate/saved' : query} saved={saved} openJob={openJob} header={<>
    <Heading eyebrow={saved ? 'YOUR SHORTLIST' : 'WORK, CLOSER TO HOME'} title={saved ? 'Saved jobs' : 'Find your next role.'} subtitle={saved ? 'Opportunities you want to come back to.' : 'Local opportunities. A fresh start.'} />
    {!saved && <><Card><Field label="Search jobs" placeholder="Role, company or keyword" value={draft} onChangeText={setDraft} returnKeyType="search" onSubmitEditing={() => setFilter(f => ({ ...f, q: draft, city: cityDraft, page: 1 }))} /><View style={[styles.row, { alignItems: 'flex-end' }]}><View style={{ flex: 1 }}><Field label="City" placeholder="Any city" value={cityDraft} onChangeText={setCityDraft} /></View><Button label="Search" onPress={() => setFilter(f => ({ ...f, q: draft, city: cityDraft, page: 1 }))} /></View></Card><Chips values={['ALL', 'FULL_TIME', 'PART_TIME', 'CONTRACT']} selected={filter.type} onSelect={type => setFilter(f => ({ ...f, type, page: 1 }))} /></>}
  </>} page={filter.page} changePage={page => setFilter(f => ({ ...f, page }))} />;
}

function JobResults({ path, saved, openJob, header, page, changePage }: { path: string; saved: boolean; openJob: (job: Job) => void; header: React.ReactNode; page: number; changePage: (page: number) => void }) {
  const result = useRemote<Paged<Job> | { data: SavedJob[] }>(path);
  const rows: Job[] = !result.data ? [] : saved ? (result.data.data as SavedJob[]).flatMap(s => s.job ? [s.job] : []) : result.data.data as Job[];
  const total = result.data && 'total' in result.data ? result.data.total : rows.length;
  return <FlatList data={result.loading || result.error ? [] : rows} keyExtractor={item => item.id} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={result.loading} onRefresh={result.refresh} tintColor={colors.blue} />} ListHeaderComponent={<View style={{ gap: 18 }}>{header}<View style={[styles.row, { justifyContent: 'space-between' }]}><Text style={styles.subheading}>{saved ? 'Your saved opportunities' : 'Available opportunities'}</Text><Text style={styles.muted}>{result.loading ? '…' : total}</Text></View></View>} renderItem={({ item }) => <JobCard job={item} onPress={() => openJob(item)} />} ItemSeparatorComponent={() => <View style={{ height: 12 }} />} ListEmptyComponent={result.loading ? <Loading /> : <Empty title={result.error ? 'Could not load jobs' : 'No jobs here yet'} text={result.error || 'Try another search or check back for new opportunities.'} retry={result.error ? result.refresh : undefined} />} ListFooterComponent={!saved && !result.loading && !result.error && total > 12 ? <View style={[styles.row, { justifyContent: 'space-between', marginTop: 18 }]}><Button label="Previous" secondary disabled={page === 1} onPress={() => changePage(page - 1)} /><Text style={styles.muted}>{page} / {Math.ceil(total / 12)}</Text><Button label="Next" secondary disabled={page * 12 >= total} onPress={() => changePage(page + 1)} /></View> : null} />;
}

export function JobCard({ job, onPress }: { job: Job; onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`View ${job.title} at ${job.company}`}><Card>
    <View style={[styles.row, { alignItems: 'flex-start' }]}><View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' }}><Feather name="briefcase" size={20} color={colors.blue} /></View><View style={{ flex: 1, gap: 4 }}><Text style={styles.subheading}>{job.title}</Text><Text style={styles.muted}>{job.company}</Text></View><Feather name="arrow-up-right" size={19} color={colors.muted} /></View>
    <View style={styles.row}><Feather name="map-pin" size={13} color={colors.muted} /><Text style={styles.muted}>{job.city} · {human(job.employmentType)}</Text></View>
    <View style={[styles.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}><Text style={{ color: colors.navy, fontSize: 15, fontWeight: '800' }}>{money(job.salaryMin)} – {money(job.salaryMax)}<Text style={{ fontSize: 10, fontWeight: '400', color: colors.muted }}> / month</Text></Text>{job.urgent && <Badge value="URGENT" />}</View>
  </Card></Pressable>;
}

export function JobDetail({ job: initial, signIn, profile }: { job: Job; signIn: () => void; profile: () => void }) {
  const { identity, api } = useSession();
  const result = useRemote<{ data: Job }>(`jobs/${encodeURIComponent(initial.id)}`);
  const job = result.data?.data ?? initial;
  const [busy, setBusy] = useState(''); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const [applied, setApplied] = useState(false); const [saved, setSaved] = useState(false);
  React.useEffect(() => {
    if (identity?.kind !== 'candidate') return;
    let active = true;
    Promise.all([api<{ data: Application[] }>('candidate/applications'), api<{ data: SavedJob[] }>('candidate/saved')]).then(([a, s]) => { if (active) { setApplied(a.data.some(row => row.jobId === job.id)); setSaved(s.data.some(row => row.jobId === job.id)); } }).catch(e => { if (active) setError(errorMessage(e)); });
    return () => { active = false; };
  }, [api, identity?.kind, job.id]);
  async function action(kind: 'apply' | 'save') {
    if (!identity) { signIn(); return; }
    if (busy) return;
    setBusy(kind); setError(''); setMessage('');
    try {
      await api(`candidate/${kind === 'apply' ? 'applications' : 'saved'}`, { method: kind === 'save' && saved ? 'DELETE' : 'POST', body: { jobId: job.id } });
      if (kind === 'apply') { setApplied(true); setMessage('Application submitted. Track it in Activity.'); } else { setSaved(!saved); setMessage(saved ? 'Removed from saved jobs.' : 'Job saved.'); }
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(''); }
  }
  return <View style={{ flex: 1 }}><Page>
    <Heading eyebrow={job.category.toUpperCase()} title={job.title} subtitle={`${job.company} · ${job.city}`} />
    {result.loading && <Loading />}
    <Notice text={result.error || error} error /><Notice text={message} />
    <Card style={{ backgroundColor: colors.navy, borderColor: colors.navy }}><Text style={{ color: '#cbd4f2', fontSize: 12 }}>MONTHLY SALARY</Text><Text style={{ color: '#fff', fontSize: 26, fontWeight: '800' }}>{money(job.salaryMin)} – {money(job.salaryMax)}</Text><Text style={{ color: '#cbd4f2', fontSize: 13 }}>{human(job.employmentType)} · {job.vacancies} openings</Text></Card>
    <Card><Text style={styles.subheading}>About this role</Text><Text style={styles.muted}>{job.description || 'Contact the recruitment team for more details about this opportunity.'}</Text>{job.qualification && <Text style={styles.muted}>Qualification: {job.qualification}</Text>}{job.shift && <Text style={styles.muted}>Shift: {human(job.shift)}</Text>}{job.applicationDeadline && <Text style={styles.muted}>Apply by: {job.applicationDeadline}</Text>}{job.benefits?.map(benefit => <Text key={benefit} style={styles.muted}>✓ {benefit}</Text>)}</Card>
    {identity?.kind === 'candidate' && identity.user.profileCompletion < 55 && <Card><Text style={styles.subheading}>One more step before applying</Text><Text style={styles.muted}>Your profile is {identity.user.profileCompletion}% complete. Add your address and preferred role to reach 55%.</Text><Button label="Complete my profile" secondary onPress={profile} /></Card>}
    <Button label="Share this opportunity" secondary onPress={() => { void Share.share({ message: `${job.title} at ${job.company}\n${API_URL}/jobs/${job.id}` }).catch(e => setError(errorMessage(e))); }} />
  </Page><View style={[styles.row, { padding: 14, backgroundColor: '#fff', borderTopWidth: 1, borderColor: colors.border }]}><View style={{ flex: 1 }}><Button label={applied ? 'Applied ✓' : 'Apply now →'} disabled={applied || !!result.error || result.loading || !!busy} busy={busy === 'apply'} onPress={() => void action('apply')} /></View><Button label={saved ? 'Unsave' : 'Save'} secondary disabled={!!busy || !!result.error || result.loading} busy={busy === 'save'} onPress={() => void action('save')} /></View></View>;
}
