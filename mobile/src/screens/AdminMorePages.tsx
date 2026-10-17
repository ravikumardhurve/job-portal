import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Alert } from '../alert';
import { errorMessage } from '../api';
import { useSession } from '../session';
import { Button, Card, Chips, Field, Heading, Loading, Notice, Page, colors, human, styles, useRemote } from '../ui';

// Local contracts keep this extension independent of shared navigation/types edits.
type Row = Record<string, unknown>;
type Result = { data: Row[]; total: number; page: number; pageSize: number; columns?: string[]; limit?: number };
type Spec = { key: string; label: string; required?: boolean; multiline?: boolean; password?: boolean; number?: boolean; choices?: readonly string[]; max?: number };
type Values = Record<string, string>;
type Navigate = (page: string) => void;
const verticals = ['RECRUITMENT', 'SECURITY', 'BABY_CARE', 'HOUSEKEEPING', 'PEST_CONTROL'];
const verification = ['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'BLOCKED'];
const availability = ['AVAILABLE', 'INTERVIEWING', 'SELECTED', 'WORKING', 'NOT_AVAILABLE'];
const text = (value: unknown): string => value == null ? '' : Array.isArray(value) ? value.map(text).join(', ') : typeof value === 'object' ? '' : String(value);
const label = (key: string) => human(key.replace(/([a-z])([A-Z])/g, '$1 $2'));
const titles: Record<string, string> = { reports: 'Reports', reviews: 'Review moderation', 'audit-logs': 'Audit logs', team: 'Team management', account: 'My account', 'privacy-requests': 'Privacy requests', settings: 'Site settings', 'job-edit': 'Edit job', 'interview-schedule': 'Schedule interview', 'candidate-verify': 'Candidate verification' };

function Table({ rows, columns, onSelect, action = 'Manage' }: { rows: Row[]; columns: string[]; onSelect?: (row: Row) => void; action?: string }) {
  if (!rows.length) return <Notice text="No matching records." />;
  const width = (key: string) => ['comment', 'reason', 'resolutionNote'].includes(key) ? 290 : key === 'rating' ? 75 : 180;
  return <ScrollView horizontal keyboardShouldPersistTaps="handled" accessibilityLabel="Records table; scroll horizontally for more columns" showsHorizontalScrollIndicator>
    <View style={local.table}>
      <View style={[local.tableRow, { backgroundColor: colors.soft }]}>{columns.map(key => <Text key={key} accessibilityRole="header" style={[local.cell, styles.label, { width: width(key) }]}>{label(key)}</Text>)}{onSelect && <Text style={[local.cell, styles.label, { width: 125 }]}>Action</Text>}</View>
      {rows.map((row, index) => <View key={text(row.id) || `${text(row.createdAt)}-${index}`} style={local.tableRow}>
        {columns.map(key => <Text key={key} selectable numberOfLines={3} style={[local.cell, { width: width(key) }]}>{text(row[key]) || '—'}</Text>)}
        {onSelect && <View style={{ width: 125, padding: 5 }}><Button label={action} secondary onPress={() => onSelect(row)} /></View>}
      </View>)}
    </View>
  </ScrollView>;
}

function Pager({ result, page, setPage }: { result: Result; page: number; setPage: (page: number) => void }) {
  return <View style={{ gap: 10 }}><View style={[styles.row, { justifyContent: 'space-between' }]}><Button label="Previous" secondary disabled={page <= 1} onPress={() => setPage(page - 1)} /><Text style={styles.muted}>{page} / {Math.max(1, Math.ceil(result.total / result.pageSize))} · {result.total} rows</Text><Button label="Next" secondary disabled={page * result.pageSize >= result.total} onPress={() => setPage(page + 1)} /></View>{result.limit && <Text style={styles.muted}>Latest {result.limit} matching records maximum, as in the web workspace.</Text>}</View>;
}

function Form({ fields, initial, submit, submitLabel = 'Save changes', confirm, onSaved }: { fields: Spec[]; initial: Values; submit: (values: Values) => Promise<void>; submitLabel?: string; confirm?: string; onSaved?: () => void }) {
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  async function save() {
    setBusy(true); setError(''); setSuccess('');
    try {
      for (const field of fields) {
        const value = values[field.key] ?? '';
        if (field.required && !value.trim()) throw new Error(`${field.label} is required.`);
        if (field.number && value.trim() && (!Number.isFinite(Number(value)) || Number(value) < 0)) throw new Error(`Enter a valid ${field.label.toLowerCase()}.`);
      }
      await submit(values);
      setSuccess('Saved successfully.');
      // Never leave credentials in a successfully submitted form.
      setValues(current => Object.fromEntries(Object.entries(current).map(([key, value]) => [key, fields.find(field => field.key === key)?.password ? '' : value])));
      onSaved?.();
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <Card>{fields.map(field => field.choices ? <View key={field.key} style={{ gap: 8 }}><Text style={styles.label}>{field.label}{field.required ? ' *' : ''}</Text><Chips values={field.choices} selected={values[field.key] ?? field.choices[0]} onSelect={value => { if (!busy) { setSuccess(''); setValues(current => ({ ...current, [field.key]: value })); } }} /></View> : <Field key={field.key} label={`${field.label}${field.required ? ' *' : ''}`} value={values[field.key] ?? ''} onChangeText={value => { setSuccess(''); setValues(current => ({ ...current, [field.key]: value })); }} editable={!busy} multiline={field.multiline} secureTextEntry={field.password} autoCapitalize="none" autoCorrect={false} keyboardType={field.number ? 'decimal-pad' : field.key.toLowerCase().includes('email') ? 'email-address' : 'default'} maxLength={field.max ?? (field.multiline ? 5000 : 300)} />)}<Notice text={error} error /><Notice text={success} /><Button label={submitLabel} busy={busy} onPress={() => confirm ? Alert.alert('Confirm change', confirm, [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', onPress: () => void save() }]) : void save()} /></Card>;
}

function useFilters() {
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState({ q: '', from: '', to: '', type: 'jobs', status: 'ALL', action: '' });
  const [applied, setApplied] = useState(draft);
  const apply = () => { setPage(1); setApplied({ ...draft }); };
  return { page, setPage, draft, setDraft, applied, apply };
}
function query(values: Record<string, string | number>) {
  return Object.entries(values).filter(([, value]) => value !== '' && value !== 'ALL').map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&');
}

function DataPage({ section }: { section: 'reports' | 'reviews' | 'audit-logs' | 'team' | 'privacy-requests' }) {
  const filters = useFilters();
  const { page, setPage, draft, setDraft, applied, apply } = filters;
  const { api } = useSession();
  const [selected, setSelected] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');
  const parameters: Record<string, string> = section === 'reports' ? { type: applied.type, from: applied.from, to: applied.to } : section === 'audit-logs' ? { q: applied.q, action: applied.action, from: applied.from, to: applied.to } : section === 'reviews' ? { status: applied.status } : {};
  const remote = useRemote<Result>(`admin/${section}?${query({ ...parameters, page })}`);
  const done = () => { setSelected(null); setCreating(false); setMessage('Changes saved.'); remote.refresh(); };
  const patch = async (body: Row) => { await api(`admin/${section}/${encodeURIComponent(text(selected?.id))}`, { method: 'PATCH', body }); };
  if (creating) return <><Button label="Back to team" secondary onPress={() => setCreating(false)} /><Form fields={[{ key: 'name', label: 'Name', required: true, max: 100 }, { key: 'email', label: 'Email', required: true, max: 254 }, { key: 'password', label: 'Initial password (10+ characters, up to 72 UTF-8 bytes)', password: true, required: true }, { key: 'businessVertical', label: 'Business field', choices: verticals }]} initial={{ name: '', email: '', password: '', businessVertical: 'RECRUITMENT' }} submit={async values => { await api('admin/team', { method: 'POST', body: values }); }} submitLabel="Create partner admin" onSaved={done} /></>;
  if (selected) {
    const terminal = ['COMPLETED', 'CANCELLED'].includes(text(selected.status));
    return <><Button label="Back to table" secondary onPress={() => setSelected(null)} /><Card>{Object.entries(selected).map(([key, value]) => <View key={key}><Text style={styles.label}>{label(key)}</Text><Text selectable style={styles.muted}>{text(value) || '—'}</Text></View>)}</Card>
      {section === 'reviews' && <Form key={text(selected.id)} fields={[{ key: 'status', label: 'Moderation decision', choices: ['APPROVED', 'REJECTED'] }]} initial={{ status: selected.status === 'REJECTED' ? 'REJECTED' : 'APPROVED' }} submit={patch} confirm="Apply this moderation decision? Approved reviews may appear on the public website." onSaved={done} />}
      {section === 'team' && (selected.role === 'SUPER_ADMIN' ? <Notice text="Super admin status cannot be changed." /> : <Form fields={[{ key: 'status', label: 'Account status', choices: ['ACTIVE', 'SUSPENDED'] }]} initial={{ status: text(selected.status) }} submit={patch} confirm="Change this admin account's access? Suspension prevents further authenticated requests." onSaved={done} />)}
      {section === 'privacy-requests' && (terminal ? <Notice text="This request is closed." /> : <Form fields={[{ key: 'status', label: 'Review decision', choices: ['IN_REVIEW', 'REJECTED'] }, { key: 'resolutionNote', label: 'Resolution note (required for rejection)', multiline: true, max: 500 }]} initial={{ status: selected.status === 'REJECTED' ? 'REJECTED' : 'IN_REVIEW', resolutionNote: text(selected.resolutionNote) }} submit={patch} confirm="Save this privacy request decision?" onSaved={done} />)}
    </>;
  }
  const columns: Record<typeof section, string[]> = { reports: remote.data?.columns ?? [], reviews: ['customerName', 'serviceSlug', 'rating', 'comment', 'status', 'createdAt'], 'audit-logs': ['createdAt', 'actorName', 'action', 'targetType', 'targetId'], team: ['name', 'email', 'role', 'businessVerticals', 'status', 'lastLoginAt'], 'privacy-requests': ['id', 'candidateName', 'status', 'reason', 'resolutionNote', 'createdAt'] };
  return <>
    {section === 'reports' && <Chips values={['jobs', 'applications', 'candidates', 'service-requests']} selected={draft.type} onSelect={type => setDraft(value => ({ ...value, type }))} />}
    {section === 'reviews' && <Chips values={['ALL', 'PENDING', 'APPROVED', 'REJECTED']} selected={draft.status} onSelect={status => setDraft(value => ({ ...value, status }))} />}
    {section === 'audit-logs' && <><Field label="Search actor, action or target" value={draft.q} maxLength={100} onChangeText={q => setDraft(value => ({ ...value, q }))} /><Field label="Exact action (optional)" value={draft.action} maxLength={100} onChangeText={action => setDraft(value => ({ ...value, action }))} /></>}
    {(section === 'reports' || section === 'audit-logs') && <><Text style={styles.muted}>Optional date range, inclusive UTC dates.</Text><Field label="From (YYYY-MM-DD)" value={draft.from} maxLength={10} onChangeText={from => setDraft(value => ({ ...value, from }))} /><Field label="To (YYYY-MM-DD)" value={draft.to} maxLength={10} onChangeText={to => setDraft(value => ({ ...value, to }))} /></>}
    {['reports', 'reviews', 'audit-logs'].includes(section) && <Button label="Apply filters" secondary onPress={apply} />}
    {section === 'team' && <Button label="Create partner admin" onPress={() => { setMessage(''); setCreating(true); }} />}
    {section === 'privacy-requests' && <Notice text="Review or reject deletion requests here. Secure deletion completion is available in the web workspace." />}
    {section === 'reports' && <Text style={styles.muted}>Live, scoped report preview. Scroll across for all columns. CSV export remains available in the web workspace.</Text>}
    <Notice text={message} /><Notice text={remote.error} error />
    <Button label="Refresh" secondary disabled={remote.loading} onPress={remote.refresh} />
    {remote.loading ? <Loading /> : !remote.error && remote.data && <><Table rows={remote.data.data} columns={columns[section]} onSelect={['reviews', 'team', 'privacy-requests'].includes(section) ? row => { setMessage(''); setSelected(row); } : undefined} /><Pager result={remote.data} page={page} setPage={setPage} /></>}
  </>;
}

const settingsKeys = ['companyName', 'tagline', 'homeAnnouncementText', 'homeHeroBadge', 'homeHeroTitle', 'homeHeroHighlight', 'homeHeroDescription', 'homeServicesTitle', 'homeServicesDescription', 'homeJobsTitle', 'homeJobsDescription', 'homeCtaTitle', 'homeCtaDescription', 'metaTitle', 'metaDescription', 'phone', 'whatsapp', 'email', 'address', 'city', 'state', 'workingHours', 'facebookUrl', 'instagramUrl', 'googleBusinessProfileUrl', 'gstNumber'];
function Settings() {
  const remote = useRemote<{ data: Row }>('admin/settings');
  const { api } = useSession();
  if (remote.loading) return <Loading />;
  if (remote.error || !remote.data) return <><Notice text={remote.error} error /><Button label="Retry" onPress={remote.refresh} /></>;
  return <><Notice text="Edit website copy and contact information. Logo, banner and gallery uploads are managed in the web workspace." /><Form fields={settingsKeys.map(key => ({ key, label: label(key), required: key === 'companyName', multiline: key.includes('Description') || key === 'address', max: key.includes('Description') || key === 'address' ? 1500 : 300 }))} initial={Object.fromEntries(settingsKeys.map(key => [key, text(remote.data!.data[key])]))} submit={async values => {
    const changed = Object.fromEntries(Object.entries(values).filter(([key, value]) => value !== text(remote.data!.data[key])));
    if (!Object.keys(changed).length) throw new Error('No changes to save.');
    await api('admin/settings', { method: 'POST', body: changed });
  }} confirm="Publish these website text and contact changes?" onSaved={remote.refresh} /></>;
}

function Account() {
  const { identity, api, refreshIdentity } = useSession();
  const user = identity?.kind === 'admin' ? identity.user : null;
  return <><Card><Text style={styles.subheading}>{user?.name}</Text><Text selectable style={styles.muted}>{user?.email}</Text><Text style={styles.muted}>{human(user?.role)}</Text><Text style={styles.muted}>{['ADMIN', 'SUPER_ADMIN'].includes(user?.role ?? '') ? 'All business fields' : user?.businessVerticals.map(human).join(', ')}</Text></Card><Notice text="Changing your password expires all mobile sessions. Sign in again with your new password." /><Form fields={[{ key: 'currentPassword', label: 'Current password', password: true, required: true }, { key: 'newPassword', label: 'New password (10+ characters, up to 72 UTF-8 bytes)', password: true, required: true }, { key: 'confirmation', label: 'Confirm new password', password: true, required: true }]} initial={{ currentPassword: '', newPassword: '', confirmation: '' }} submitLabel="Change password" confirm="Change your password and expire all mobile sessions?" submit={async values => {
    if (values.newPassword !== values.confirmation) throw new Error('New passwords do not match.');
    if (values.newPassword.length < 10) throw new Error('Use at least 10 characters.');
    await api('admin/account/password', { method: 'PATCH', body: { currentPassword: values.currentPassword, newPassword: values.newPassword } });
    // The expected 401 clears the old bearer from the existing session provider.
    try { await refreshIdentity(); } catch { /* Password succeeded; offline refresh must not imply it failed. */ }
  }} /></>;
}

function Selector({ section, navigate }: { section: 'job-edit' | 'candidate-verify' | 'interview-schedule'; navigate: Navigate }) {
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState('');
  const [q, setQ] = useState('');
  const endpoint = section === 'job-edit' ? 'jobs' : section === 'candidate-verify' ? 'candidates' : 'interview-schedule';
  const remote = useRemote<Result>(`admin/${endpoint}?${query({ page, q })}`);
  return <><Text style={styles.muted}>{section === 'interview-schedule' ? 'Select a shortlisted application. Search by application, candidate or job ID.' : 'Select a record to load its current details.'}</Text><Field label="Search" value={draft} maxLength={100} onChangeText={setDraft} onSubmitEditing={() => { setPage(1); setQ(draft); }} /><Button label="Search" secondary onPress={() => { setPage(1); setQ(draft); }} /><Notice text={remote.error} error /><Button label="Refresh" secondary disabled={remote.loading} onPress={remote.refresh} />{remote.loading ? <Loading /> : !remote.error && remote.data && <><Table rows={remote.data.data} columns={section === 'interview-schedule' ? ['id', 'candidateId', 'jobId', 'status'] : ['id', 'title', 'subtitle', 'status']} action="Select" onSelect={row => navigate(`${section}:${text(row.id)}`)} /><Pager result={remote.data} page={page} setPage={setPage} /></>}</>;
}

const jobFields: Spec[] = [
  ...['title', 'company', 'category', 'city', 'district'].map(key => ({ key, label: label(key), required: true })),
  ...['salaryMin', 'salaryMax', 'vacancies'].map(key => ({ key, label: label(key), required: true, number: true })),
  { key: 'employmentType', label: 'Employment type', choices: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY'] },
  { key: 'businessVertical', label: 'Business field', choices: verticals },
  { key: 'description', label: 'Description', multiline: true },
  { key: 'jobRole', label: 'Job role' }, { key: 'qualification', label: 'Qualification' },
  { key: 'minExperience', label: 'Minimum experience (years)', number: true }, { key: 'maxExperience', label: 'Maximum experience (years)', number: true },
  { key: 'shift', label: 'Shift', choices: ['UNSPECIFIED', 'DAY', 'NIGHT', 'ROTATIONAL'] },
  { key: 'applicationDeadline', label: 'Application deadline (YYYY-MM-DD)', max: 10 },
  { key: 'benefits', label: 'Benefits (one per line)', multiline: true },
  { key: 'urgent', label: 'Urgent hiring', choices: ['NO', 'YES'] }, { key: 'publishNow', label: 'Publish when saving', choices: ['NO', 'YES'] },
];
function JobEditor({ row, id }: { row: Row; id: string }) {
  const { api, identity } = useSession();
  const role = identity?.kind === 'admin' ? identity.user.role : '';
  const [message, setMessage] = useState('');
  const fields = jobFields.filter(field => field.key !== 'businessVertical' || ['ADMIN', 'SUPER_ADMIN'].includes(role));
  const initial = Object.fromEntries(jobFields.map(field => [field.key, field.key === 'benefits' ? (Array.isArray(row.benefits) ? row.benefits.map(text).join('\n') : '') : field.key === 'urgent' ? row.urgent ? 'YES' : 'NO' : field.key === 'publishNow' ? 'NO' : field.key === 'shift' ? text(row.shift) || 'UNSPECIFIED' : field.key === 'businessVertical' ? text(row.businessVertical) || 'RECRUITMENT' : text(row[field.key])]));
  return <><Text style={styles.muted}>{id} · Current status: {text(row.status)}. Blank experience values and an unspecified shift preserve existing values.</Text><Notice text={message} /><Form fields={fields} initial={initial} confirm="Save these job details with the selected publishing option?" submit={async values => {
    const body: Row = { ...values, salaryMin: Number(values.salaryMin), salaryMax: Number(values.salaryMax), vacancies: Number(values.vacancies), urgent: values.urgent === 'YES', publishNow: values.publishNow === 'YES', benefits: values.benefits.split('\n').map(value => value.trim()).filter(Boolean) };
    for (const key of ['minExperience', 'maxExperience']) { if (values[key].trim()) body[key] = Number(values[key]); else delete body[key]; }
    if (values.shift === 'UNSPECIFIED') delete body.shift;
    if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) delete body.businessVertical;
    const response = await api<{ data: Row }>(`admin/job-edit/${encodeURIComponent(id)}`, { method: 'PATCH', body });
    setMessage(`Job saved. Status: ${human(text(response.data.status))}.`);
  }} /></>;
}

function CandidateEditor({ row, id }: { row: Row; id: string }) {
  const { api } = useSession();
  const [documents, setDocuments] = useState<Row[]>(Array.isArray(row.documents) ? row.documents as Row[] : []);
  const [selected, setSelected] = useState<Row | null>(null);
  return <><Card><Text style={styles.subheading}>{text(row.fullName)}</Text><Text selectable style={styles.muted}>{text(row.mobile)} · {text(row.email)}</Text><Text style={styles.muted}>{text(row.city)} · {text(row.profileCompletion)}% profile complete</Text></Card><Text style={styles.subheading}>Document verification</Text><Table rows={documents} columns={['type', 'status', 'rejectionReason']} onSelect={setSelected} action="Review" />{selected && <DocumentReview key={text(selected.type)} id={id} document={selected} close={() => setSelected(null)} saved={updated => { setDocuments(current => current.map(doc => doc.type === updated.type ? updated : doc)); setSelected(null); }} />}<Text style={styles.subheading}>Candidate operational status</Text><Form fields={[{ key: 'verificationStatus', label: 'Verification', choices: verification }, { key: 'availability', label: 'Availability', choices: availability }, { key: 'blockReason', label: 'Block reason (required when blocked)', multiline: true, max: 500 }, { key: 'adminNotes', label: 'Internal notes', multiline: true, max: 2000 }]} initial={{ verificationStatus: text(row.verificationStatus), availability: text(row.availability) || 'AVAILABLE', blockReason: text(row.blockReason), adminNotes: text(row.adminNotes) }} confirm="Update this candidate's operational status? Blocking prevents candidate sign-in." submit={async values => { await api(`admin/candidate-verify/${encodeURIComponent(id)}`, { method: 'PATCH', body: values }); }} /></>;
}

function DocumentReview({ id, document, close, saved }: { id: string; document: Row; close: () => void; saved: (row: Row) => void }) {
  const { api } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const path = `admin/candidate-verify/${encodeURIComponent(id)}/documents/${encodeURIComponent(text(document.type))}`;
  async function open() {
    setBusy(true); setError('');
    try {
      const result = await api<{ data: { url: string } }>(`${path}/download`, { method: 'POST' });
      if (!/^https:\/\//i.test(result.data.url)) throw new Error('Invalid private download link.');
      await Linking.openURL(result.data.url);
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <><Text style={styles.subheading}>{human(text(document.type))}</Text><Text style={styles.muted}>Open the private file to review it. Access is logged, and private download links expire after five minutes.</Text><Notice text={error} error /><Button label="Open private document" secondary busy={busy} onPress={() => void open()} /><Form fields={[{ key: 'status', label: 'Document decision', choices: ['PENDING', 'VERIFIED', 'REJECTED'] }, { key: 'rejectionReason', label: 'Rejection reason (required when rejected)', multiline: true, max: 500 }]} initial={{ status: text(document.status), rejectionReason: text(document.rejectionReason) }} confirm="Save this document verification decision?" submit={async values => {
    if (values.status === 'REJECTED' && !values.rejectionReason.trim()) throw new Error('A rejection reason is required.');
    const result = await api<{ data: Row }>(path, { method: 'PATCH', body: values });
    saved(result.data);
  }} /><Button label="Close document review" secondary onPress={close} /></>;
}

function Schedule({ row, id, navigate }: { row: Row; id: string; navigate: Navigate }) {
  const { api } = useSession();
  const [created, setCreated] = useState('');
  if (created) return <><Notice text={`Interview ${created} scheduled successfully.`} /><Button label="Schedule another" onPress={() => navigate('interview-schedule')} /><Button label="View interviews" secondary onPress={() => navigate('interviews')} /></>;
  return <><Card><Text style={styles.subheading}>{id}</Text><Text selectable style={styles.muted}>Candidate: {text(row.candidateId)}{ '\n' }Job: {text(row.jobId)}</Text></Card><Text style={styles.muted}>Enter local date and 24-hour time. Scheduling uses India time (UTC+05:30).</Text><Form fields={[{ key: 'day', label: 'Date (YYYY-MM-DD)', required: true, max: 10 }, { key: 'time', label: 'Time (HH:mm, India time)', required: true, max: 5 }, { key: 'mode', label: 'Mode', choices: ['OFFLINE', 'PHONE', 'VIDEO'] }, { key: 'address', label: 'Address (required for offline)', multiline: true, max: 500 }, { key: 'meetingLink', label: 'HTTPS meeting link (required for video)', max: 1000 }, { key: 'contactPerson', label: 'Contact person', max: 100 }, { key: 'contactMobile', label: 'Contact number (required for phone)', max: 30 }, { key: 'instructions', label: 'Candidate instructions', multiline: true, max: 2000 }]} initial={{ day: '', time: '', mode: 'OFFLINE', address: '', meetingLink: '', contactPerson: '', contactMobile: '', instructions: '' }} submitLabel="Schedule interview" confirm="Schedule this interview and update the shortlisted application?" submit={async values => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.day) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(values.time)) throw new Error('Enter date as YYYY-MM-DD and time as HH:mm.');
    const { day, time, ...details } = values;
    const response = await api<{ data: { id: string } }>('admin/interview-schedule', { method: 'POST', body: { ...details, applicationId: id, scheduledAt: `${day}T${time}:00+05:30` } });
    setCreated(response.data.id);
  }} /></>;
}

function Detail({ section, id, navigate }: { section: 'job-edit' | 'candidate-verify' | 'interview-schedule'; id: string; navigate: Navigate }) {
  const remote = useRemote<{ data: Row }>(`admin/${section}/${encodeURIComponent(id)}`);
  if (remote.loading) return <Loading />;
  if (remote.error || !remote.data) return <><Notice text={remote.error} error /><Button label="Retry" onPress={remote.refresh} /></>;
  return section === 'job-edit' ? <JobEditor row={remote.data.data} id={id} /> : section === 'candidate-verify' ? <CandidateEditor row={remote.data.data} id={id} /> : <Schedule row={remote.data.data} id={id} navigate={navigate} />;
}

/** Supported IDs are the keys in titles, optionally job-edit:ID,
 * candidate-verify:ID or interview-schedule:APPLICATION_ID.
 */
export function AdminPage({ page, navigate }: { page: string; navigate: Navigate }) {
  return <AdminPageContent key={page} page={page} navigate={navigate} />;
}
function AdminPageContent({ page, navigate }: { page: string; navigate: Navigate }) {
  const { identity } = useSession();
  const [section, id] = page.split(':');
  const role = identity?.kind === 'admin' ? identity.user.role : '';
  const allowed = role && (['team', 'audit-logs'].includes(section) ? role === 'SUPER_ADMIN' : ['reviews', 'privacy-requests', 'settings'].includes(section) ? ['ADMIN', 'SUPER_ADMIN'].includes(role) : true);
  return <Page><Button label={id ? 'Back to selection' : 'Back to more'} secondary onPress={() => navigate(id ? section : 'more')} /><Heading eyebrow="ADMIN WORKSPACE" title={titles[section] ?? 'Page not found'} />{!allowed ? <Notice text="Your account does not have access to this page." error /> : ['reports', 'reviews', 'audit-logs', 'team', 'privacy-requests'].includes(section) ? <DataPage section={section as 'reports' | 'reviews' | 'audit-logs' | 'team' | 'privacy-requests'} /> : section === 'account' ? <Account /> : section === 'settings' ? <Settings /> : section === 'job-edit' || section === 'candidate-verify' || section === 'interview-schedule' ? id ? <Detail section={section} id={id} navigate={navigate} /> : <Selector section={section} navigate={navigate} /> : <Notice text="This admin page is not available." />}</Page>;
}

const local = StyleSheet.create({
  table: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, overflow: 'hidden', backgroundColor: '#fff' },
  tableRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  cell: { paddingHorizontal: 10, paddingVertical: 9, fontSize: 12, lineHeight: 17, color: colors.navy },
});
