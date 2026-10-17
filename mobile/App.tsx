import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Modal, Platform, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { SessionProvider, useSession } from './src/session';
import { AuthScreen } from './src/screens/Auth';
import { JobDetail, JobsScreen } from './src/screens/Jobs';
import { ActivityScreen, Gate, ServicesScreen } from './src/screens/Candidate';
import { AdminList, AdminOverview } from './src/screens/Admin';
import { HomeScreen, PublicScreen } from './src/screens/Public';
import { CandidatePage } from './src/screens/CandidateMore';
import { AdminPage } from './src/screens/AdminMorePages';
import { AdminAssets } from './src/screens/AdminAssets';
import { AllPages } from './src/screens/Menu';
import { Button, Empty, Loading, Page, colors, useRemote } from './src/ui';
import { candidatePages, pageTitle, publicPages, pushPage } from './src/navigation';
import type { Job, Section } from './src/types';

export default function App() {
  return <SafeAreaProvider><SessionProvider><StatusBar style="dark" /><Workspace /></SessionProvider></SafeAreaProvider>;
}

function Workspace() {
  const { identity, booting, bootError, retry } = useSession();
  const [stack, setStack] = useState(['home']);
  const [job, setJob] = useState<Job | null>(null);
  const [login, setLogin] = useState<{ kind: 'candidate' | 'admin'; register?: boolean } | null>(null);
  const pending = useRef<string | null>(null);
  const previousUser = useRef<string | null>(null);
  const admin = identity?.kind === 'admin';
  const candidate = identity?.kind === 'candidate';
  const current = stack[stack.length - 1];
  const userKey = identity ? `${identity.kind}:${identity.user.id}` : null;
  useEffect(() => {
    if (userKey === previousUser.current) return;
    previousUser.current = userKey;
    const root = admin ? 'overview' : candidate ? 'dashboard' : 'home';
    const destination = !admin && candidate ? pending.current : null;
    setStack(destination && destination !== root ? [root, destination] : [root]);
    if (!destination?.startsWith('job:')) setJob(null);
    pending.current = null;
    setLogin(null);
  }, [userKey, admin, candidate]);
  const navigate = useCallback((page: string) => {
    const aliases: Record<string, string> = { profile: 'profile-edit', activity: 'applications', more: 'menu', 'saved-jobs': 'saved', 'employer-requirement': 'employer' };
    setStack(history => pushPage(history, aliases[page] ?? page));
  }, []);
  const back = useCallback(() => {
    if (login) { setLogin(null); return true; }
    if (stack.length > 1) { setStack(history => history.slice(0, -1)); return true; }
    return false;
  }, [login, stack.length]);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', back);
    return () => subscription.remove();
  }, [back]);
  const signIn = () => { pending.current = current === 'menu' || current === 'home' ? null : current; setLogin({ kind: 'candidate' }); };
  const openJob = (selected: Job) => { setJob(selected); navigate(`job:${selected.id}`); };
  const base = current.split(':')[0];
  let content: React.ReactNode;
  if (booting) content = <Loading />;
  else if (bootError) content = <Page><Empty title="Could not restore your session" text={bootError} retry={retry} /></Page>;
  else if (current === 'menu') content = <AllPages navigate={navigate} login={(kind, register) => { pending.current = null; setLogin({ kind, register }); }} />;
  else if (admin) {
    if (current === 'overview') content = <AdminOverview navigate={navigate} />;
    else if (current === 'assets') content = <AdminAssets />;
    else if (['jobs', 'applications', 'services', 'candidates', 'interviews', 'requirements'].includes(current)) content = <AdminList key={current} section={current as Section} navigate={navigate} />;
    else content = <AdminPage key={current} page={current} navigate={navigate} />;
  } else if (base === 'job') content = job?.id === current.slice(4) ? <JobDetail key={`${job.id}-${userKey}`} job={job} signIn={signIn} profile={() => navigate('profile-edit')} /> : <JobRoute key={`${current}-${userKey}`} id={current.slice(4)} signIn={signIn} profile={() => navigate('profile-edit')} />;
  else if (base === 'jobs' || current === 'saved') content = <JobsScreen key={`${current}-${userKey}`} initialCity={base === 'jobs' ? decodeURIComponent(current.slice(5)) : ''} saved={current === 'saved'} openJob={openJob} signIn={signIn} />;
  else if (current === 'applications' || current === 'interviews') content = <ActivityScreen key={current} initialTab={current} openJob={openJob} signIn={signIn} />;
  else if (base === 'service-request') content = <ServicesScreen key={current} initialService={current.split(':')[1]} signIn={signIn} />;
  else if (candidatePages.some(item => item.id === current)) content = candidate ? <CandidatePage key={current} page={current} navigate={navigate} signIn={signIn} /> : <Gate signIn={signIn} />;
  else if (current === 'home') content = <HomeScreen page={current} navigate={navigate} signIn={signIn} />;
  else if (publicPages.some(item => item.id === current) || base === 'service') content = <PublicScreen key={current} page={current} navigate={navigate} signIn={signIn} onBack={() => { if (!back()) setStack(['home']); }} />;
  else content = <Page><Empty title="Page not found" text="Choose a page from the menu." /><Button label="All pages" onPress={() => navigate('menu')} /></Page>;

  const tabs = admin
    ? [{ id: 'overview', label: 'Overview', icon: 'grid' }, { id: 'jobs', label: 'Jobs', icon: 'briefcase' }, { id: 'applications', label: 'Applicants', icon: 'users' }, { id: 'services', label: 'Requests', icon: 'inbox' }, { id: 'menu', label: 'All pages', icon: 'menu' }] as const
    : [{ id: candidate ? 'dashboard' : 'home', label: candidate ? 'Dashboard' : 'Home', icon: 'home' }, { id: 'jobs', label: 'Jobs', icon: 'search' }, { id: 'services', label: 'Services', icon: 'grid' }, { id: candidate ? 'profile-edit' : 'dashboard', label: 'My account', icon: 'user' }, { id: 'menu', label: 'All pages', icon: 'menu' }] as const;
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, width: '100%', maxWidth: 1000, alignSelf: 'center' }}>
      <View style={{ paddingHorizontal: 12, height: 60, flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: '#fff' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={stack.length > 1 ? 'Go back' : 'Open all pages'} onPress={() => stack.length > 1 ? back() : navigate('menu')} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.soft }}>
          <Feather name={stack.length > 1 ? 'arrow-left' : 'menu'} size={21} color={colors.blue} />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={{ color: colors.navy, fontSize: 15, fontWeight: '800' }}>{pageTitle(current, admin)}</Text><Text style={{ fontSize: 9, color: colors.muted, letterSpacing: 1, marginTop: 3 }}>CG JOB CARE · {admin ? 'ADMIN' : candidate ? 'MY WORKSPACE' : 'JOBS & SERVICES'}</Text></View>
        {!identity && !booting ? <Button label="Sign in" secondary onPress={signIn} /> : identity ? <Pressable accessibilityRole="button" accessibilityLabel="Open account" onPress={() => navigate(admin ? 'account' : 'profile-edit')} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: colors.soft }}><Text style={{ color: colors.blue, fontWeight: '800' }}>{(identity.kind === 'admin' ? identity.user.name : identity.user.fullName).charAt(0)}</Text></Pressable> : null}
      </View>
      <View style={{ flex: 1 }}>{content}</View>
      {!booting && !bootError && <View accessibilityRole="tablist" style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: colors.border, backgroundColor: '#fff', paddingVertical: 5 }}>{tabs.map(item => {
        const active = current === item.id || (item.id === 'jobs' && base === 'job') || (item.id === 'services' && !admin && ['service', 'service-request'].includes(base));
        return <Pressable key={item.id} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: active }} onPress={() => setStack([item.id])} style={{ flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', gap: 4 }}><Feather name={item.icon} size={20} color={active ? colors.blue : colors.muted} /><Text style={{ fontSize: 10, fontWeight: active ? '800' : '500', color: active ? colors.blue : colors.muted }}>{item.label}</Text></Pressable>;
      })}</View>}
      <Modal visible={!!login} animationType="slide" onRequestClose={() => setLogin(null)}><SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}><View style={{ padding: 12 }}><Button label="Back" secondary onPress={() => setLogin(null)} /></View>{login && <AuthScreen key={`${login.kind}-${login.register}`} initialKind={login.kind} initialRegister={login.register} onNavigate={page => { setLogin(null); navigate(page); }} onDone={() => setLogin(null)} />}</KeyboardAvoidingView></SafeAreaView></Modal>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

function JobRoute({ id, signIn, profile }: { id: string; signIn: () => void; profile: () => void }) {
  const result = useRemote<{ data: Job }>(`jobs/${encodeURIComponent(id)}`);
  if (result.loading) return <Loading />;
  if (result.error || !result.data) return <Page><Empty title="Could not open this job" text={result.error || 'The job is no longer available.'} retry={result.refresh} /></Page>;
  return <JobDetail job={result.data.data} signIn={signIn} profile={profile} />;
}
