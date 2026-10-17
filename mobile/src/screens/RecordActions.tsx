import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Alert } from '../alert';
import { errorMessage } from '../api';
import { useSession } from '../session';
import type { Section } from '../types';
import { Badge, Button, Card, Empty, Field, Loading, Notice, colors, human, styles, useRemote } from '../ui';

type RecordSection = Extract<Section, 'applications' | 'interviews' | 'services' | 'requirements'>;
export type RecordActionsProps = { section: Section; id: string; done: () => void };
type RecordData = { id: string; status: string; statusHistory?: { status: string; at: string }[]; [key: string]: unknown };
type Result = { data: RecordData; statuses: string[] };
type FieldSpec = { key: string; label: string; max: number; multiline?: boolean };
const fields: Record<RecordSection, FieldSpec[]> = {
  applications: [],
  interviews: [
    { key: 'contactPerson', label: 'Contact person', max: 120 },
    { key: 'contactMobile', label: 'Contact mobile', max: 30 },
    { key: 'address', label: 'Interview address', max: 500, multiline: true },
    { key: 'meetingLink', label: 'HTTPS meeting link', max: 2000 },
    { key: 'instructions', label: 'Candidate instructions', max: 2000, multiline: true },
    { key: 'internalNotes', label: 'Internal notes', max: 2000, multiline: true },
    { key: 'cancelReason', label: 'Cancellation reason', max: 500, multiline: true },
  ],
  services: [
    { key: 'assignedStaff', label: 'Assigned staff', max: 120 },
    { key: 'assignedVendor', label: 'Assigned vendor', max: 120 },
    { key: 'internalNotes', label: 'Internal notes', max: 2000, multiline: true },
  ],
  requirements: [
    { key: 'assignedTo', label: 'Assigned to', max: 120 },
    { key: 'internalNotes', label: 'Internal notes', max: 2000, multiline: true },
  ],
};
const value = (record: RecordData, key: string) => typeof record[key] === 'string' ? record[key] as string : '';
const timeKey = (section: RecordSection) => section === 'requirements' ? 'nextFollowUpAt' : 'scheduledAt';

// Legacy web datetime-local values have no offset. Treat those as portal-local IST.
function inIST(raw: string) {
  if (!raw) return '';
  const explicit = /(?:Z|[+-]\d{2}:\d{2})$/i.test(raw);
  const time = Date.parse(explicit ? raw : `${raw}+05:30`);
  return Number.isFinite(time) ? new Date(time + 330 * 60000).toISOString().slice(0, 16) : raw;
}
function fromIST(raw: string, required: boolean) {
  if (!raw && !required) return '';
  if (!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(raw)) throw new Error('Enter a date as YYYY-MM-DD and time as HH:mm (24-hour IST).');
  const result = `${raw}:00+05:30`;
  if (inIST(result) !== raw) throw new Error('Enter a real calendar date and time.');
  return result;
}
function initialForm(section: RecordSection, record: RecordData) {
  const form: Record<string, string> = { status: record.status };
  for (const field of fields[section]) form[field.key] = value(record, field.key);
  if (section === 'interviews') form.mode = value(record, 'mode');
  if (section !== 'applications') form[timeKey(section)] = inIST(value(record, timeKey(section)));
  return form;
}
function changes(section: RecordSection, original: Record<string, string>, form: Record<string, string>) {
  const patch: Record<string, string | boolean> = {};
  for (const key of Object.keys(original)) {
    if (form[key] === original[key]) continue;
    patch[key] = key === 'scheduledAt' || key === 'nextFollowUpAt' ? fromIST(form[key], section === 'interviews') : form[key].trim();
  }
  if (section === 'interviews' && form.status === 'CANCELLED' && !form.cancelReason.trim()) throw new Error('Enter a cancellation reason.');
  if (section === 'interviews' && patch.scheduledAt) {
    if (Date.parse(String(patch.scheduledAt)) <= Date.now()) throw new Error('Choose a future interview date and time.');
    if (patch.status && patch.status !== 'RESCHEDULED') throw new Error('Save rescheduling separately from an outcome or cancellation.');
  }
  return patch;
}

/** Embedded inside the existing RecordDetail scroll container; success refreshes/closes via done. */
export function RecordActions({ section, id, done }: RecordActionsProps) {
  if (section === 'jobs' || section === 'candidates') return null;
  return <RecordLoader key={`${section}:${id}`} section={section} id={id} done={done} />;
}
function RecordLoader({ section, id, done }: { section: RecordSection; id: string; done: () => void }) {
  const path = `admin/records/${section}/${encodeURIComponent(id)}`;
  const result = useRemote<Result>(path);
  if (result.loading) return <Loading />;
  if (result.error || !result.data) return <Empty title="Record unavailable" text={result.error || 'Please retry.'} retry={result.refresh} />;
  return <RecordForm section={section} path={path} result={result.data} done={done} />;
}

function Choice({ label, values, selected, disabled, onChange }: { label: string; values: string[]; selected: string; disabled: boolean; onChange: (value: string) => void }) {
  return <View style={{ gap: 8 }}><Text style={styles.label}>{label}</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{values.map(item => <Pressable key={item} accessibilityRole="radio" accessibilityLabel={`${label}: ${human(item)}`} accessibilityState={{ selected: selected === item, disabled }} disabled={disabled} onPress={() => onChange(item)} style={[styles.chip, selected === item && styles.selectedChip, disabled && { opacity: 0.6 }]}><Text style={[styles.chipText, selected === item && { color: '#fff' }]}>{human(item)}</Text></Pressable>)}</View></View>;
}

function DateFields({ label, raw, disabled, optional, onChange }: { label: string; raw: string; disabled: boolean; optional: boolean; onChange: (raw: string) => void }) {
  const [date = '', time = ''] = raw.split('T');
  return <View style={{ gap: 8 }}><Text style={styles.label}>{label} · IST (UTC+05:30)</Text>
    <Field label={`${label} date (YYYY-MM-DD)`} placeholder="2026-12-31" value={date} maxLength={10} autoCapitalize="none" editable={!disabled} onChangeText={next => onChange(`${next}T${time}`)} />
    <Field label={`${label} time (HH:mm, 24-hour)`} placeholder="14:30" value={time} maxLength={5} autoCapitalize="none" editable={!disabled} onChangeText={next => onChange(`${date}T${next}`)} />
    {optional && !!raw && <Button label={`Clear ${label.toLowerCase()}`} secondary disabled={disabled} onPress={() => onChange('')} />}
  </View>;
}

function RecordForm({ section, path, result, done }: { section: RecordSection; path: string; result: Result; done: () => void }) {
  const { api } = useSession();
  const [original] = useState(() => initialForm(section, result.data));
  const [form, setForm] = useState(original);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const saving = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const edit = (key: string, next: string) => setForm(current => ({ ...current, [key]: next }));
  const dirty = Object.keys(original).some(key => form[key] !== original[key]);
  async function persist(patch: Record<string, string | boolean>) {
    if (saving.current || !mounted.current) return;
    saving.current = true; setBusy(true); setError('');
    try { await api<Result>(path, { method: 'PATCH', body: patch }); if (mounted.current) done(); }
    catch (cause) { if (mounted.current) setError(errorMessage(cause)); }
    finally { saving.current = false; if (mounted.current) setBusy(false); }
  }
  function save() {
    if (saving.current) return;
    setError('');
    try {
      const patch = changes(section, original, form);
      if (!Object.keys(patch).length) return;
      const destructive = typeof patch.status === 'string' && ['CANCELLED', 'REJECTED', 'WITHDRAWN', 'CLOSED', 'NO_SHOW'].includes(patch.status);
      const rescheduling = section === 'interviews' && !!patch.scheduledAt;
      if (destructive || rescheduling) {
        Alert.alert(rescheduling ? 'Reschedule interview?' : `${human(String(patch.status))}?`, rescheduling ? `Move this interview to ${form.scheduledAt.replace('T', ' ')} IST?` : `Save ${human(String(patch.status)).toLowerCase()} for ${result.data.id}?${section === 'interviews' && patch.status === 'REJECTED' ? ' The linked application will also be rejected.' : ''}`, [
          { text: 'Keep editing', style: 'cancel' },
          { text: 'Confirm and save', style: destructive ? 'destructive' : 'default', onPress: () => void persist({ ...patch, confirmed: true }) },
        ]);
      } else void persist(patch);
    } catch (cause) { setError(errorMessage(cause)); }
  }
  return <View style={{ gap: 14 }}>
    <Card><Text style={styles.subheading}>Manage {human(section)}</Text><Badge value={result.data.status} />
      {['candidateId', 'jobId', 'applicationId', 'customerName', 'mobile', 'company', 'contactName', 'contactEmail', 'jobTitle', 'city', 'serviceType', 'staffRequired', 'candidatesRequired'].map(key => {
        const content = result.data[key];
        return typeof content === 'string' || typeof content === 'number' ? <Text key={key} selectable style={styles.muted}>{key.replace(/([A-Z])/g, ' $1')}: {String(content)}</Text> : null;
      })}
      {section === 'services' && !!value(result.data, 'address') && <Text selectable style={styles.muted}>Address: {value(result.data, 'address')}</Text>}
    </Card>
    <Choice label="Status" values={result.statuses} selected={form.status} disabled={busy} onChange={next => edit('status', next)} />
    {section === 'interviews' && <><Notice text="Changing the date/time reschedules the interview. Completed, selected and rejected outcomes also update its application." /><Choice label="Interview mode" values={['OFFLINE', 'PHONE', 'VIDEO']} selected={form.mode} disabled={busy} onChange={next => edit('mode', next)} /></>}
    {section !== 'applications' && <DateFields label={section === 'requirements' ? 'Next follow-up' : section === 'services' ? 'Service schedule' : 'Interview schedule'} raw={form[timeKey(section)]} disabled={busy} optional={section !== 'interviews'} onChange={next => edit(timeKey(section), next)} />}
    {fields[section].filter(field => field.key !== 'cancelReason' || form.status === 'CANCELLED').map(field => <Field key={field.key} label={`${field.label}${field.key === 'internalNotes' ? ' (staff only)' : ''}`} value={form[field.key]} onChangeText={next => edit(field.key, next)} editable={!busy} maxLength={field.max} multiline={field.multiline} autoCapitalize={field.key === 'meetingLink' ? 'none' : 'sentences'} autoCorrect={field.key !== 'meetingLink'} keyboardType={field.key === 'contactMobile' ? 'phone-pad' : field.key === 'meetingLink' ? 'url' : 'default'} />)}
    <Notice text={error} error />
    <Button label="Save changes" busy={busy} disabled={!dirty} onPress={save} />
    {section === 'applications' && <Card><Text style={styles.subheading}>Application timeline</Text><Text style={styles.muted}>Application notes are not supported by the portal. Status changes are saved to the candidate timeline.</Text>{result.data.statusHistory?.map((entry, index) => <View key={`${entry.at}:${index}`} style={{ borderLeftWidth: 2, borderLeftColor: colors.blue, paddingLeft: 10 }}><Text style={styles.label}>{human(entry.status)}</Text><Text style={styles.muted}>{inIST(entry.at).replace('T', ' ')} IST</Text></View>)}</Card>}
  </View>;
}
