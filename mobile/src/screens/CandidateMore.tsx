import React, { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Share, Switch, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from '../alert';
import { errorMessage } from '../api';
import { useSession } from '../session';
import type { Candidate, Interview, Job } from '../types';
import { Badge, Button, Card, Chips, Empty, Field, Heading, Loading, Notice, Page, colors, date, human, styles, useRemote } from '../ui';

type Navigate = (page: string) => void;
type Address = { line1?: string; state?: string; district?: string; city?: string; pincode?: string; sameAsCurrent?: boolean };
type Preference = { category?: string; role?: string; location?: string; expectedSalaryMin?: number; expectedSalaryMax?: number; jobType?: string; shift?: string; immediateJoining?: boolean };
type Profile = Candidate & { permanentAddress?: Address; currentAddress?: Address; jobPreference?: Preference; experienceType?: string; totalExperienceYears?: number; resumeUploaded?: boolean; identityDocumentsUploaded?: boolean; availability?: string };
type Education = { qualification?: string; course?: string; specialization?: string; institution?: string; passingYear?: string; percentage?: string };
type Experience = { company?: string; jobRole?: string; salary?: string; startDate?: string; endDate?: string; responsibilities?: string };
type FullProfile = { candidate: Profile; education: Education | null; experience: Experience | null };
type DocumentRow = { type: string; status: string; rejectionReason?: string; createdAt: string; updatedAt?: string; retentionReviewAt?: string };
type DocumentData = { documents: DocumentRow[]; rules: Record<string, { mimeTypes: string[]; maxSizeBytes: number }>; consent: { accepted: boolean; acceptedAt?: string; version: string } };
type PrivacyRequest = { id: string; status: string; reason?: string; createdAt: string; updatedAt?: string };
type Privacy = { consents?: { privacyPolicyVersion?: string; privacyAcceptedAt?: string; termsVersion?: string; termsAcceptedAt?: string; documentProcessingVersion?: string; documentProcessingAcceptedAt?: string }; accountCreatedAt: string; retentionReviewAt?: string; latestRequest: PrivacyRequest | null; currentVersions: { privacyPolicy: string; terms: string } };
type Notification = { id: string; title: string; message: string; read: boolean; createdAt: string };
const qualifications = ['Below 8th', '8th Pass', '10th Pass', '12th Pass', 'ITI', 'Diploma', 'Graduate', 'Post Graduate', 'Other'];
const documentLabels: Record<string, string> = { RESUME: 'Resume', AADHAAR_FRONT: 'Aadhaar front', AADHAAR_BACK: 'Aadhaar back', PAN: 'PAN card', PHOTO: 'Photograph', POLICE_VERIFICATION: 'Police verification', EXPERIENCE_CERTIFICATE: 'Experience certificate', EDUCATION_CERTIFICATE: 'Education certificate', OTHER: 'Other document' };

// A synchronous lock also prevents double taps before React renders the busy state.
function useAction() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  async function run(task: () => Promise<void>, success = '') {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try { await task(); setMessage(success); } catch (e) { setError(errorMessage(e)); }
    finally { lock.current = false; setBusy(false); }
  }
  return { busy, error, message, run };
}
function Feedback({ action }: { action: ReturnType<typeof useAction> }) { return <><Notice text={action.error} error /><Notice text={action.message} /></>; }
function Toggle({ label, value, onChange, disabled }: { label: string; value: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return <View style={styles.row}><Switch accessibilityLabel={label} value={value} onValueChange={onChange} disabled={disabled} trackColor={{ true: colors.blue }} /><Text style={[styles.muted, { flex: 1 }]}>{label}</Text></View>;
}
function Choice({ label, values, value, onChange }: { label: string; values: string[]; value: string; onChange: (value: string) => void }) { return <View style={{ gap: 8 }}><Text style={styles.label}>{label}</Text><Chips values={values} selected={value} onSelect={onChange} /></View>; }
function optionalNumber(value: string, label: string, max: number) {
  if (!value.trim()) return undefined;
  const n = Number(value);
  if (!/^\d+(\.\d+)?$/.test(value.trim()) || !Number.isFinite(n) || n < 0 || n > max) throw new Error(`Enter a valid ${label}.`);
  return n;
}
function Remote<T>({ path, children }: { path: string; children: (data: T, refresh: () => void) => React.ReactNode }) {
  const result = useRemote<{ data: T }>(path);
  if (result.loading) return <Loading />;
  if (result.error) return <Empty title="Could not load this page" text={result.error} retry={result.refresh} />;
  if (!result.data) return <Empty title="Data unavailable" text="Please retry." retry={result.refresh} />;
  return <>{children(result.data.data, result.refresh)}</>;
}

export function CandidatePage({ page, navigate, signIn }: { page: string; navigate: (page: string) => void; signIn: () => void }) {
  const { identity } = useSession();
  if (identity?.kind !== 'candidate') return <Page><Heading title="Your candidate account" subtitle="Sign in to manage your profile, documents and opportunities." /><Button label="Sign in / Create account" onPress={signIn} /></Page>;
  return <CandidateContent key={`${identity.user.id}:${page}`} page={page} navigate={navigate} />;
}
function CandidateContent({ page, navigate }: { page: string; navigate: Navigate }) {
  const titles: Record<string, string> = { dashboard: 'Your next move.', 'profile-edit': 'Build your profile.', documents: 'Your private documents.', notifications: 'Your updates.', privacy: 'Your data. Your choices.' };
  return <Page><Heading eyebrow="CANDIDATE WORKSPACE" title={titles[page] ?? 'Page unavailable'} />
    {page === 'dashboard' && <Remote<DashboardData> path="candidate/dashboard">{(data, refresh) => <Dashboard data={data} refresh={refresh} navigate={navigate} />}</Remote>}
    {page === 'profile-edit' && <Remote<FullProfile> path="candidate/profile-edit">{data => <ProfileEditor initial={data} navigate={navigate} />}</Remote>}
    {page === 'documents' && <Remote<DocumentData> path="candidate/documents">{(data, refresh) => <Documents initial={data} refresh={refresh} navigate={navigate} />}</Remote>}
    {page === 'notifications' && <Remote<Notification[]> path="candidate/notifications">{(data, refresh) => <Notifications initial={data} refresh={refresh} />}</Remote>}
    {page === 'privacy' && <Remote<Privacy> path="candidate/privacy">{(data, refresh) => <PrivacyCenter initial={data} refresh={refresh} navigate={navigate} />}</Remote>}
    {!titles[page] && <Empty title="Unknown candidate page" text="Open your profile or browse current opportunities." />}
  </Page>;
}
type DashboardData = { candidate: Profile; counts: { applications: number; interviews: number; saved: number; unread: number }; nextInterview: Interview | null; applications: { id: string; status: string; appliedAt: string; job: Job | null }[] };
function Readiness({ candidate }: { candidate: Profile }) {
  const completion = Math.max(0, Math.min(100, candidate.profileCompletion));
  return <Card><Text style={styles.subheading}>Profile readiness</Text><Badge value={candidate.verificationStatus} /><Text style={[styles.title, { color: colors.blue }]}>{completion}%</Text><View accessibilityRole="progressbar" accessibilityLabel="Profile completion" accessibilityValue={{ min: 0, max: 100, now: completion }} style={{ height: 8, borderRadius: 8, backgroundColor: colors.soft }}><View style={{ height: 8, borderRadius: 8, width: `${completion}%`, backgroundColor: colors.blue }} /></View><Text style={styles.muted}>Applications require 55% profile completion. Add your address, preferred role, education and documents.</Text></Card>;
}
function Dashboard({ data, refresh, navigate }: { data: DashboardData; refresh: () => void; navigate: Navigate }) {
  const { signOut } = useSession(); const action = useAction();
  return <><Heading title={`Hello, ${data.candidate.fullName.split(' ')[0]}.`} subtitle={data.candidate.availability ? `Availability: ${human(data.candidate.availability)}` : 'Choose your next opportunity.'} /><Button label="Refresh dashboard" secondary onPress={refresh} /><Readiness candidate={data.candidate} />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{([['applications', 'Applications', data.counts.applications], ['interviews', 'Upcoming interviews', data.counts.interviews], ['saved', 'Saved jobs', data.counts.saved], ['notifications', 'Unread updates', data.counts.unread]] as const).map(([page, label, count]) => <Card key={page} style={{ flexGrow: 1, flexBasis: '45%' }}><Text style={styles.title}>{count}</Text><Button label={label} secondary onPress={() => navigate(page)} /></Card>)}</View>
    <Card><Text style={styles.subheading}>Next interview</Text>{data.nextInterview ? <><Text style={styles.subheading}>{data.nextInterview.job?.title ?? 'Interview'}</Text><Text style={styles.muted}>{date(data.nextInterview.scheduledAt)} IST · {human(data.nextInterview.mode)}</Text><Badge value={data.nextInterview.status} /><Button label="View interview details" onPress={() => navigate('interviews')} /></> : <Text style={styles.muted}>No upcoming interview is scheduled. Interview details will appear here when the team schedules one.</Text>}</Card>
    <Card><Text style={styles.subheading}>Recent applications</Text>{data.applications.length ? data.applications.map(a => <View key={a.id} style={{ gap: 6, paddingVertical: 8 }}><Text style={styles.label}>{a.job?.title ?? a.id}</Text><Text style={styles.muted}>{a.job?.company} · {date(a.appliedAt)}</Text><Badge value={a.status} /></View>) : <Text style={styles.muted}>You have not applied yet. Browse published jobs to get started.</Text>}<Button label="Browse jobs" onPress={() => navigate('jobs')} /></Card>
    <Card><Text style={styles.subheading}>Manage your account</Text>{[['profile-edit', 'Edit full profile'], ['documents', 'Manage documents'], ['notifications', 'Read notifications'], ['privacy', 'Privacy and data controls']].map(([page, label]) => <Button key={page} label={label} secondary onPress={() => navigate(page)} />)}</Card><Feedback action={action} /><Button label="Sign out" secondary busy={action.busy} onPress={() => Alert.alert('Sign out?', 'This device’s mobile session will be revoked.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', onPress: () => void action.run(signOut) }])} /></>;
}
function ProfileEditor({ initial, navigate }: { initial: FullProfile; navigate: Navigate }) {
  const [candidate, setCandidate] = useState(initial.candidate);
  return <><Readiness candidate={candidate} /><Text style={styles.muted}>Save each section separately. Fields marked * are required.</Text><BasicForm candidate={candidate} saved={setCandidate} /><EducationForm initial={initial.education} saved={setCandidate} /><ExperienceForm candidate={candidate} initial={initial.experience} saved={setCandidate} /><AddressForm candidate={candidate} saved={setCandidate} /><PreferenceForm candidate={candidate} saved={setCandidate} /><Button label="Manage private documents" onPress={() => navigate('documents')} /><Button label="Privacy and data controls" secondary onPress={() => navigate('privacy')} /></>;
}
type SaveProps = { saved: (candidate: Profile) => void };
function useSave(saved: SaveProps['saved']) {
  const { api, refreshIdentity } = useSession(); const action = useAction();
  function save(path: string, body: () => unknown, method: 'POST' | 'PATCH' = 'POST') {
    void action.run(async () => { const result = await api<{ data: Profile }>(`candidate/${path}`, { method, body: body() }); saved(result.data); await refreshIdentity().catch(() => undefined); }, 'Section saved.');
  }
  return { action, save };
}
function BasicForm({ candidate, saved }: { candidate: Profile } & SaveProps) {
  const [email, setEmail] = useState(candidate.email ?? ''); const { action, save } = useSave(saved);
  return <Card><Text style={styles.subheading}>Basic details</Text><Text style={styles.muted}>{candidate.fullName}{'\n'}Registered mobile: {candidate.mobile}</Text><Text style={styles.muted}>Name and registered mobile are account identifiers. Contact the team for corrections.</Text><Field label="Email *" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" maxLength={254} editable={!action.busy} /><Feedback action={action} /><Button label="Save email" busy={action.busy} onPress={() => save('profile-edit', () => { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('Enter a valid email address.'); return { email: email.trim() }; }, 'PATCH')} /></Card>;
}
function EducationForm({ initial, saved }: { initial: Education | null } & SaveProps) {
  const [form, setForm] = useState<Education>(initial ?? {}); const { action, save } = useSave(saved);
  return <Card><Text style={styles.subheading}>Education</Text><View pointerEvents={action.busy ? 'none' : 'auto'} style={{ gap: 12 }}><Choice label="Highest qualification *" values={qualifications} value={form.qualification ?? ''} onChange={value => setForm(f => ({ ...f, qualification: value }))} />{([['course', 'Course', 150], ['specialization', 'Specialization', 150], ['institution', 'School / college / university', 250], ['passingYear', 'Passing year (YYYY)', 4], ['percentage', 'Marks / percentage / grade', 40]] as const).map(([key, label, max]) => <Field key={key} label={label} value={form[key] ?? ''} onChangeText={value => setForm(f => ({ ...f, [key]: value }))} maxLength={max} keyboardType={key === 'passingYear' ? 'number-pad' : 'default'} />)}</View><Feedback action={action} /><Button label="Save education" busy={action.busy} onPress={() => save('education', () => { if (!form.qualification) throw new Error('Select your highest qualification.'); return form; })} /></Card>;
}
function ExperienceForm({ candidate, initial, saved }: { candidate: Profile; initial: Experience | null } & SaveProps) {
  const [kind, setKind] = useState(candidate.experienceType ?? ''), [years, setYears] = useState(candidate.totalExperienceYears?.toString() ?? '');
  const [form, setForm] = useState<Experience>(initial ?? {}); const { action, save } = useSave(saved);
  return <Card><Text style={styles.subheading}>Experience</Text><View pointerEvents={action.busy ? 'none' : 'auto'} style={{ gap: 12 }}><Choice label="Experience level *" values={['FRESHER', 'EXPERIENCED']} value={kind} onChange={setKind} />{kind === 'EXPERIENCED' && <><Field label="Total experience (years)" value={years} onChangeText={setYears} keyboardType="decimal-pad" maxLength={5} />{([['company', 'Current / last company', 250], ['jobRole', 'Current / last role', 150], ['salary', 'Current / last salary', 80], ['startDate', 'Start date (YYYY-MM-DD)', 10], ['endDate', 'End date (YYYY-MM-DD; blank if current)', 10], ['responsibilities', 'Responsibilities', 3000]] as const).map(([key, label, max]) => <Field key={key} label={label} value={form[key] ?? ''} onChangeText={value => setForm(f => ({ ...f, [key]: value }))} maxLength={max} multiline={key === 'responsibilities'} />)}</>}</View><Feedback action={action} /><Button label="Save experience" busy={action.busy} onPress={() => save('experience', () => { if (!kind) throw new Error('Select fresher or experienced.'); return kind === 'FRESHER' ? { experienceType: kind, totalExperienceYears: 0 } : { ...form, experienceType: kind, totalExperienceYears: optionalNumber(years, 'experience in years', 80) }; })} /></Card>;
}
function AddressFields({ label, value, change }: { label: string; value: Address; change: (value: Address) => void }) {
  return <>{([['line1', 'Address line', 300], ['city', 'City / town *', 100], ['state', 'State', 100], ['district', 'District', 100], ['pincode', 'Pincode', 6]] as const).map(([key, name, max]) => <Field key={key} label={`${label}: ${name}`} value={value[key] ?? ''} onChangeText={text => change({ ...value, [key]: text })} maxLength={max} keyboardType={key === 'pincode' ? 'number-pad' : 'default'} />)}</>;
}
function AddressForm({ candidate, saved }: { candidate: Profile } & SaveProps) {
  const [current, setCurrent] = useState<Address>(candidate.currentAddress ?? { city: candidate.city ?? '' }), [permanent, setPermanent] = useState<Address>(candidate.permanentAddress ?? {});
  const [same, setSame] = useState(candidate.permanentAddress?.sameAsCurrent ?? false); const { action, save } = useSave(saved);
  return <Card><Text style={styles.subheading}>Address</Text><View pointerEvents={action.busy ? 'none' : 'auto'} style={{ gap: 12 }}><AddressFields label="Current" value={current} change={setCurrent} /><Toggle label="Permanent address is the same as current" value={same} onChange={setSame} />{!same && <AddressFields label="Permanent" value={permanent} change={setPermanent} />}</View><Feedback action={action} /><Button label="Save addresses" busy={action.busy} onPress={() => save('address', () => { for (const address of same ? [current] : [current, permanent]) { if (!address.city || address.city.trim().length < 2) throw new Error('Enter a city for each address.'); if (address.pincode && !/^[1-9]\d{5}$/.test(address.pincode)) throw new Error('Enter a valid six-digit pincode.'); } return { currentAddress: current, permanentAddress: { ...(same ? current : permanent), sameAsCurrent: same } }; })} /></Card>;
}
function PreferenceForm({ candidate, saved }: { candidate: Profile } & SaveProps) {
  const [form, setForm] = useState<Preference>(candidate.jobPreference ?? { role: candidate.preferredRole ?? '' });
  const [min, setMin] = useState(form.expectedSalaryMin?.toString() ?? ''), [max, setMax] = useState(form.expectedSalaryMax?.toString() ?? ''); const { action, save } = useSave(saved);
  return <Card><Text style={styles.subheading}>Job preference</Text><View pointerEvents={action.busy ? 'none' : 'auto'} style={{ gap: 12 }}>{([['category', 'Preferred category'], ['role', 'Preferred role *'], ['location', 'Preferred location']] as const).map(([key, label]) => <Field key={key} label={label} value={form[key] ?? ''} onChangeText={value => setForm(f => ({ ...f, [key]: value }))} maxLength={150} />)}<Field label="Minimum expected salary (INR / month)" value={min} onChangeText={setMin} keyboardType="decimal-pad" maxLength={12} /><Field label="Maximum expected salary (INR / month)" value={max} onChangeText={setMax} keyboardType="decimal-pad" maxLength={12} /><Choice label="Job type" values={['ANY', 'FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY']} value={form.jobType || 'ANY'} onChange={value => setForm(f => ({ ...f, jobType: value === 'ANY' ? '' : value }))} /><Choice label="Shift" values={['ANY', 'DAY', 'NIGHT', 'ROTATIONAL']} value={form.shift || 'ANY'} onChange={value => setForm(f => ({ ...f, shift: value === 'ANY' ? '' : value }))} /><Toggle label="Available for immediate joining" value={form.immediateJoining ?? false} onChange={value => setForm(f => ({ ...f, immediateJoining: value }))} /></View><Feedback action={action} /><Button label="Save job preference" busy={action.busy} onPress={() => save('job-preference', () => { if (!form.role || form.role.trim().length < 2) throw new Error('Enter a preferred role.'); const expectedSalaryMin = optionalNumber(min, 'minimum salary', 100000000), expectedSalaryMax = optionalNumber(max, 'maximum salary', 100000000); if (expectedSalaryMin !== undefined && expectedSalaryMax !== undefined && expectedSalaryMax < expectedSalaryMin) throw new Error('Maximum salary must be at least the minimum.'); return { ...form, expectedSalaryMin, expectedSalaryMax }; })} /></Card>;
}

type UploadSignature = { uploadUrl: string; apiKey: string; timestamp: number; signature: string; publicId: string; deliveryType: 'authenticated'; resourceType: 'image' | 'raw'; overwrite?: false | 'false' };
type PendingUpload = { type: string; publicId: string; resourceType: 'image' | 'raw'; deliveryType: 'authenticated' };
function Documents({ initial, refresh, navigate }: { initial: DocumentData; refresh: () => void; navigate: Navigate }) {
  const { api, refreshIdentity } = useSession(); const action = useAction();
  const [data, setData] = useState(initial), [consent, setConsent] = useState(initial.consent.accepted), [stage, setStage] = useState(''), [pending, setPending] = useState<PendingUpload | null>(null);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; controller.current?.abort(); }; }, []);
  async function reload(signal?: AbortSignal) { if (!mounted.current || signal?.aborted) return; const result = await api<{ data: DocumentData }>('candidate/documents', { signal }); if (!mounted.current || signal?.aborted) return; setData(result.data); await refreshIdentity().catch(() => undefined); }
  async function confirm(upload: PendingUpload, signal?: AbortSignal) {
    if (!mounted.current || signal?.aborted) return;
    setStage('Verifying your private document…');
    await api('candidate/documents/confirm', { method: 'POST', body: upload, signal });
    if (!mounted.current || signal?.aborted) return;
    setPending(null); setStage('Document saved. Updating the list…'); await reload(signal); if (mounted.current && !signal?.aborted) setStage('Document uploaded securely.');
  }
  function upload(type: string) {
    if (!mounted.current) return;
    void action.run(async () => {
      const abort = new AbortController(); controller.current = abort;
      try {
      if (!consent) throw new Error('Accept document processing consent before uploading.');
      // Reselecting abandons the local retry token, never the candidate's saved file.
      // Even cancelling the picker must leave document actions usable again.
      setPending(null);
      const rules = data.rules[type];
      setStage('Choose a document…');
      const picked = await DocumentPicker.getDocumentAsync({ type: rules.mimeTypes, multiple: false, copyToCacheDirectory: true });
      if (abort.signal.aborted) return;
      if (picked.canceled) { setStage(''); return; }
      const asset = picked.assets[0];
      const extensions: Record<string, string> = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };
      const mime = asset.mimeType && asset.mimeType !== 'application/octet-stream' ? asset.mimeType : extensions[asset.name.split('.').pop()?.toLowerCase() ?? ''];
      if (!mime || !rules.mimeTypes.includes(mime)) throw new Error('This file format is not allowed for the selected document.');
      const size = asset.size ?? asset.file?.size;
      if (!size || !Number.isSafeInteger(size) || size > rules.maxSizeBytes) throw new Error(`Choose a non-empty file up to ${rules.maxSizeBytes / 1048576} MB with a readable file size.`);
      setStage('Preparing private upload…');
      const { data: signature } = await api<{ data: UploadSignature }>('candidate/documents/presign', { method: 'POST', body: { type, fileName: asset.name, contentType: mime, fileSize: size, consent: true }, signal: abort.signal });
      if (abort.signal.aborted) return;
      if (!/^https:\/\/api\.cloudinary\.com\/v1_1\/[^/]+\/(image|raw)\/upload$/.test(signature.uploadUrl) || signature.deliveryType !== 'authenticated') throw new Error('The server returned an invalid private upload destination.');
      const form = new FormData();
      if (Platform.OS === 'web' && asset.file) form.append('file', asset.file);
      else form.append('file', { uri: asset.uri, name: asset.name, type: mime } as unknown as Blob);
      form.append('api_key', signature.apiKey); form.append('timestamp', String(signature.timestamp)); form.append('signature', signature.signature); form.append('public_id', signature.publicId); form.append('type', 'authenticated');
      // Forward the exact immutable-upload parameter covered by the server signature.
      if (signature.overwrite !== undefined) {
        if (signature.overwrite !== false && signature.overwrite !== 'false') throw new Error('The server returned an unsafe upload configuration.');
        form.append('overwrite', 'false');
      }
      // Bearer credentials only go to our API. Cloudinary receives its upload signature.
      const timeout = setTimeout(() => abort.abort(), 120000);
      setStage(`Uploading ${asset.name}…`);
      let response: Response;
      try { response = await fetch(signature.uploadUrl, { method: 'POST', body: form, signal: abort.signal, credentials: 'omit' }); }
      catch { setStage(''); throw new Error('Upload was cancelled, timed out or interrupted. Please choose the file again.'); }
      finally { clearTimeout(timeout); }
      if (!response.ok) { setStage(''); throw new Error('Private upload failed. Please try again.'); }
      const uploaded = await response.json() as { public_id?: string; resource_type?: string; type?: string };
      if (abort.signal.aborted) return;
      if (uploaded.public_id !== signature.publicId || uploaded.resource_type !== signature.resourceType || uploaded.type !== 'authenticated') throw new Error('Storage returned an unexpected upload.');
      const next: PendingUpload = { type, publicId: signature.publicId, resourceType: signature.resourceType, deliveryType: 'authenticated' };
      setPending(next); await confirm(next, abort.signal);
      } finally { if (controller.current === abort) controller.current = null; }
    });
  }
  function discardUpload() {
    if (!mounted.current) return;
    void action.run(async () => { controller.current?.abort(); setPending(null); setStage(''); }, 'Upload attempt discarded. You can choose another file or refresh your documents.');
  }
  function download(type: string) { void action.run(async () => { const { data: link } = await api<{ data: { url: string } }>('candidate/documents/download', { method: 'POST', body: { type } }); if (!/^https:\/\//i.test(link.url)) throw new Error('Invalid private download link.'); await Linking.openURL(link.url); }); }
  function remove(type: string) { Alert.alert(`Delete ${documentLabels[type]}?`, 'The private file will be permanently removed. This cannot be undone.', [{ text: 'Keep document', style: 'cancel' }, { text: 'Delete document', style: 'destructive', onPress: () => void action.run(async () => { await api('candidate/documents', { method: 'DELETE', body: { type } }); await reload(); }, 'Document deleted securely.') }]); }
  return <><Card><Text style={styles.subheading}>Private document processing</Text><Text style={styles.muted}>Documents are stored privately for identity, qualification and recruitment verification. You and authorized staff can access them through short-lived signed links.</Text><Toggle label="I consent to private document storage and verification" value={consent} onChange={setConsent} disabled={action.busy} /><Text style={styles.muted}>Consent version: {data.consent.version}{data.consent.acceptedAt ? ` · Accepted ${date(data.consent.acceptedAt)}` : ''}</Text><Button label="Read Privacy Policy" secondary onPress={() => navigate('privacy-policy')} disabled={action.busy} /></Card>
    <Feedback action={action} /><Notice text={action.busy || !action.error ? stage : ''} />{action.busy && controller.current && <Button label="Cancel upload" secondary onPress={() => controller.current?.abort()} />}
    {pending && <Card>
      <Text style={styles.subheading}>Finish verifying {documentLabels[pending.type]}</Text>
      <Text style={styles.muted}>The file reached private storage. Retry confirmation, or choose another file if this one was rejected.</Text>
      <Button label="Retry confirmation" busy={action.busy} onPress={() => void action.run(async () => { if (!mounted.current) return; const abort = new AbortController(); controller.current = abort; try { await confirm(pending, abort.signal); } finally { if (controller.current === abort) controller.current = null; } })} />
      <Button label="Discard attempt and choose another file" secondary disabled={action.busy || !consent} onPress={() => upload(pending.type)} />
      <Button label="Discard upload attempt" secondary disabled={action.busy} onPress={discardUpload} />
      <Text style={styles.muted}>Discarding clears this attempt from the screen; it does not delete a saved document. Refresh afterwards to check whether an interrupted confirmation completed.</Text>
    </Card>}
    <Button label="Refresh documents" secondary disabled={action.busy || !!pending} onPress={refresh} />
    {Object.entries(data.rules).map(([type, rules]) => { const row = data.documents.find(d => d.type === type); return <Card key={type}><Text style={styles.subheading}>{documentLabels[type] ?? human(type)}</Text>{row ? <><Badge value={row.status} /><Text style={styles.muted}>Updated {date(row.updatedAt ?? row.createdAt)}</Text>{row.rejectionReason && <Notice text={row.rejectionReason} error />}{row.retentionReviewAt && <Text style={styles.muted}>Retention review: {date(row.retentionReviewAt)}</Text>}</> : <Text style={styles.muted}>Not uploaded</Text>}<Text style={styles.muted}>{rules.mimeTypes.map(mime => mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? 'DOCX' : mime === 'application/msword' ? 'DOC' : mime.split('/')[1].toUpperCase()).join(', ')} · Up to {rules.maxSizeBytes / 1048576} MB</Text><Button label={row ? `Replace ${documentLabels[type]}` : `Upload ${documentLabels[type]}`} disabled={!consent || action.busy || !!pending} onPress={() => row ? Alert.alert('Replace document?', 'The existing file will be replaced after the new upload is verified.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Choose replacement', onPress: () => upload(type) }]) : upload(type)} />{row && <><Button label="Open private document" secondary disabled={action.busy} onPress={() => download(type)} /><Button label="Delete document" secondary disabled={action.busy || !!pending} onPress={() => remove(type)} /></>}</Card>; })}</>;
}
function Notifications({ initial, refresh }: { initial: Notification[]; refresh: () => void }) {
  const { api } = useSession(); const action = useAction(); const [rows, setRows] = useState(initial), [filter, setFilter] = useState('all');
  const unread = rows.filter(n => !n.read).length, visible = filter === 'unread' ? rows.filter(n => !n.read) : rows;
  function read(id?: string) { void action.run(async () => { await api('candidate/notifications/read', { method: 'POST', body: id ? { notificationId: id } : { all: true } }); setRows(items => items.map(n => !id || n.id === id ? { ...n, read: true } : n)); }); }
  return <><Text style={styles.muted}>{unread} unread in your latest {rows.length} updates.</Text><Chips values={['all', 'unread']} selected={filter} onSelect={setFilter} /><Button label="Refresh notifications" secondary disabled={action.busy} onPress={refresh} /><Button label="Mark all as read" disabled={!unread || action.busy} onPress={() => read()} /><Feedback action={action} />{!visible.length && <Empty title={filter === 'unread' ? 'You’re all caught up' : 'No notifications yet'} text="Updates from the team will appear here." />}{visible.map(n => <Card key={n.id} style={{ borderColor: n.read ? colors.border : colors.blue }}><Text style={styles.eyebrow}>{n.read ? 'READ' : 'UNREAD'} · {date(n.createdAt)}</Text><Text style={styles.subheading}>{n.title}</Text><Text style={styles.muted}>{n.message}</Text>{!n.read && <Button label="Mark as read" secondary disabled={action.busy} onPress={() => read(n.id)} />}</Card>)}</>;
}
function PrivacyCenter({ initial, refresh, navigate }: { initial: Privacy; refresh: () => void; navigate: Navigate }) {
  const { api } = useSession(); const action = useAction(); const [data, setData] = useState(initial);
  const [privacy, setPrivacy] = useState(false), [terms, setTerms] = useState(false), [reason, setReason] = useState(''), [confirmation, setConfirmation] = useState(''), [exportText, setExportText] = useState('');
  const current = data.consents?.privacyPolicyVersion === data.currentVersions.privacyPolicy && data.consents?.termsVersion === data.currentVersions.terms;
  const active = data.latestRequest && ['SUBMITTED', 'IN_REVIEW'].includes(data.latestRequest.status) ? data.latestRequest : null;
  async function reload() { setData((await api<{ data: Privacy }>('candidate/privacy')).data); }
  function policy(path: string) { navigate(path === 'privacy' ? 'privacy-policy' : 'terms'); }
  function exportData() { Alert.alert('Prepare a personal data copy?', 'Your export includes profile, addresses and recruitment information. Share it only with people or apps you trust. Private document files are not included.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Prepare export', onPress: () => void action.run(async () => { const result = await api<{ data: unknown }>('candidate/privacy/export'); setExportText(JSON.stringify(result.data, null, 2)); }, 'Your data copy is ready. Choose Share / save to export it.') }]); }
  function shareExport() { void action.run(async () => {
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob([exportText], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'cg-job-care-personal-data.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else await Share.share({ title: 'CG Job Care personal data', message: exportText }, { dialogTitle: 'Save or share your personal data' });
  }); }
  function deletion() { Alert.alert('Submit account deletion request?', 'Once processed, your profile, education, experience, documents and saved jobs are permanently deleted. Recruitment transaction records may be retained as described in the Privacy Policy. You can cancel while the request is submitted.', [{ text: 'Keep account', style: 'cancel' }, { text: 'Submit request', style: 'destructive', onPress: () => void action.run(async () => { await api('candidate/privacy', { method: 'POST', body: { confirmation, reason } }); setConfirmation(''); setReason(''); setExportText(''); await reload(); }, 'Deletion request submitted. Your account has not yet been deleted.') }]); }
  return <><Feedback action={action} /><Button label="Refresh privacy status" secondary disabled={action.busy} onPress={refresh} /><Card><Text style={styles.subheading}>Consent records</Text><Text style={styles.muted}>Account created: {date(data.accountCreatedAt)}{'\n'}Privacy Policy: {data.consents?.privacyAcceptedAt ? `${data.consents.privacyPolicyVersion} · ${date(data.consents.privacyAcceptedAt)}` : 'Not yet accepted'}{'\n'}Terms: {data.consents?.termsAcceptedAt ? `${data.consents.termsVersion} · ${date(data.consents.termsAcceptedAt)}` : 'Not yet accepted'}{'\n'}Document processing: {data.consents?.documentProcessingAcceptedAt ? `${data.consents.documentProcessingVersion} · ${date(data.consents.documentProcessingAcceptedAt)}` : 'Requested before your first upload'}{'\n'}Retention review: {data.retentionReviewAt ? date(data.retentionReviewAt) : 'According to account needs'}</Text><Button label="Read Privacy Policy" secondary disabled={action.busy} onPress={() => policy('privacy')} /><Button label="Read Terms and Conditions" secondary disabled={action.busy} onPress={() => policy('terms')} />{current ? <Notice text="You have accepted the current Privacy Policy and Terms." /> : <><Toggle label={`I accept the Privacy Policy (${data.currentVersions.privacyPolicy})`} value={privacy} onChange={setPrivacy} disabled={action.busy} /><Toggle label={`I accept the Terms (${data.currentVersions.terms})`} value={terms} onChange={setTerms} disabled={action.busy} /><Button label="Save consent" disabled={!privacy || !terms} busy={action.busy} onPress={() => void action.run(async () => { setData((await api<{ data: Privacy }>('candidate/privacy', { method: 'PATCH', body: { privacyConsent: privacy, termsAccepted: terms } })).data); setPrivacy(false); setTerms(false); }, 'Consent saved.')} /></>}</Card>
    <Card><Text style={styles.subheading}>Export your information</Text><Text style={styles.muted}>Get a JSON copy of your profile, education, experience, document metadata, applications, interviews, saved jobs and privacy requests. Download individual files from Documents.</Text><Button label="Prepare my data export" disabled={action.busy} onPress={exportData} />{!!exportText && <><Notice text="Your personal data copy is ready in this screen’s memory. Sharing opens your device’s app chooser." /><Button label="Share / save data copy" disabled={action.busy} onPress={shareExport} /><Button label="Clear prepared copy" secondary disabled={action.busy} onPress={() => setExportText('')} /></>}</Card>
    <Card style={{ borderColor: '#eac0b7' }}><Text style={styles.subheading}>Delete account and personal data</Text><Text style={styles.muted}>Submitting a request starts a review. When processed, your profile, uploaded documents, education, experience and saved jobs are permanently deleted. Recruitment transaction records may be retained as described in the Privacy Policy.</Text>{data.latestRequest && <><Badge value={data.latestRequest.status} /><Text style={styles.muted}>Request {data.latestRequest.id} · {date(data.latestRequest.createdAt)}</Text>{data.latestRequest.reason && <Text style={styles.muted}>Your reason: {data.latestRequest.reason}</Text>}</>}{active ? <>{active.status === 'SUBMITTED' ? <Button label="Cancel deletion request" secondary disabled={action.busy} onPress={() => Alert.alert('Cancel deletion request?', 'Your account and data will be kept.', [{ text: 'Keep request', style: 'cancel' }, { text: 'Cancel request', onPress: () => void action.run(async () => { await api('candidate/privacy', { method: 'DELETE' }); await reload(); }, 'Deletion request cancelled.') }])} /> : <Notice text="Your request is under review. Contact the team for help; it can no longer be cancelled here." />}</> : <><Field label="Reason (optional, up to 500 characters)" value={reason} onChangeText={setReason} multiline maxLength={500} editable={!action.busy} /><Field label="Type DELETE to confirm" value={confirmation} onChangeText={setConfirmation} autoCapitalize="characters" autoCorrect={false} maxLength={6} editable={!action.busy} /><Button label="Request account deletion" disabled={confirmation !== 'DELETE' || action.busy} onPress={deletion} /></>}</Card></>;
}
