import React, { useRef, useState } from 'react';
import { Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { API_URL, errorMessage } from '../api';
import { useSession } from '../session';
import { Button, Card, Empty, Field, Heading, Loading, Notice, Page, colors, human, money, styles, useRemote } from '../ui';

export type PublicScreenProps = { page: string; navigate: (page: string) => void; signIn: () => void; onBack?: () => void };
type Faq = { question: string; answer: string };
type Document = { eyebrow: string; title: string; description: string; updatedAt?: string; sections: { title: string; paragraphs: string[] }[]; faqs?: Faq[] };
type Settings = {
  companyName: string; tagline?: string; phone?: string; whatsapp?: string; email?: string;
  address?: string; city?: string; state?: string; workingHours?: string; googleBusinessProfileUrl?: string;
  homeAnnouncementText?: string; homeHeroBadge: string; homeHeroTitle: string; homeHeroHighlight: string;
  homeHeroDescription: string; homeServicesTitle: string; homeServicesDescription: string;
  homeJobsTitle: string; homeJobsDescription: string; homeCtaTitle: string; homeCtaDescription: string;
};
type ServiceSummary = { slug: string; shortTitle: string; summary: string; serviceType?: string };
type PublicContent = { settings: Settings; documents: Record<string, Document>; cities: { name: string; description: string }[]; services: ServiceSummary[] };
type HomeContent = {
  stats: { activeJobs: number; candidateCount: number; employerCount: number; serviceClientCount: number };
  categories: { category: string; count: number }[];
  jobs: { id: string; title: string; company: string; city: string; employmentType: string; salaryMin: number; salaryMax: number }[];
};
type ServiceDetail = ServiceSummary & {
  eyebrow: string; title: string; description: string; heroImage: string;
  primaryHref: string; primaryLabel: string; secondaryHref: string; secondaryLabel: string;
  highlights: { value: string; label: string }[]; included: { title: string; text: string }[]; process: string[];
  gallery: { src: string; caption: string }[]; faqs: Faq[]; searchHeading: string; searchParagraphs: string[]; localNeeds: string[];
  reviews: { id: string; customerName: string; city?: string; rating: number; comment: string; createdAt: string }[];
};
type Icon = React.ComponentProps<typeof Feather>['name'];
const serviceIcons: Record<string, Icon> = { 'job-placement': 'briefcase', 'security-services': 'shield', 'baby-care': 'heart', housekeeping: 'home', 'pest-control': 'sun' };
const serviceTones: Record<string, string> = { 'job-placement': '#fff0e8', 'security-services': '#eef2ff', 'baby-care': '#f5efff', housekeeping: '#eaf6ee', 'pest-control': '#fff8da' };

// Navigation belongs to App. Only agreed public route IDs are emitted here.
function nativeRoute(href: string) {
  const [path, query = ''] = href.split('?');
  if (path === '/services/request') {
    const service = new URLSearchParams(query).get('service');
    return service && ['SECURITY', 'BABY_CARE', 'CARETAKER', 'HOUSEKEEPING', 'PEST_CONTROL', 'MANPOWER', 'OTHER'].includes(service) ? `service-request:${service}` : 'service-request';
  }
  if (path === '/employer/requirement') return 'employer';
  if (path.startsWith('/services/')) return `service:${path.slice('/services/'.length)}`;
  if (path === '/privacy') return 'privacy-policy';
  return path === '/jobs' ? 'jobs' : path === '/contact' ? 'contact' : 'home';
}

function Tile({ title, text, icon, onPress, tone = colors.soft }: { title: string; text?: string; icon: Icon; onPress: () => void; tone?: string }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [local.tile, pressed && { opacity: 0.7 }]}>
    <View style={[local.icon, { backgroundColor: tone }]}><Feather name={icon} size={21} color={colors.blue} /></View>
    <View style={{ flex: 1, gap: 4 }}><Text style={styles.subheading}>{title}</Text>{text && <Text style={styles.muted}>{text}</Text>}</View>
    <Feather name="arrow-up-right" size={17} color={colors.muted} />
  </Pressable>;
}

function Footer({ settings, navigate }: { settings: Settings; navigate: PublicScreenProps['navigate'] }) {
  return <View style={local.footer}>
    <Text style={styles.subheading}>{settings.companyName}</Text>{settings.tagline && <Text style={styles.muted}>{settings.tagline}</Text>}
    <View style={local.wrap}>{[['home', 'Home'], ['services', 'Services'], ['about', 'About'], ['contact', 'Contact'], ['locations', 'Locations'], ['privacy-policy', 'Privacy'], ['terms', 'Terms']].map(([id, label]) => <Pressable key={id} accessibilityRole="button" onPress={() => navigate(id)} style={local.footerLink}><Text style={local.linkText}>{label}</Text></Pressable>)}</View>
    <Text style={local.caption}>© {new Date().getFullYear()} {settings.companyName}</Text>
  </View>;
}

function Faqs({ items }: { items?: Faq[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!items?.length) return null;
  return <View style={{ gap: 10 }}><Heading eyebrow="GOOD TO KNOW" title="A little more clarity." />{items.map(item => <Card key={item.question}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open === item.question }} onPress={() => setOpen(open === item.question ? null : item.question)} style={local.faqButton}>
      <Text style={[styles.label, { flex: 1, lineHeight: 20 }]}>{item.question}</Text><Feather name={open === item.question ? 'minus' : 'plus'} size={18} color={colors.blue} />
    </Pressable>{open === item.question && <Text style={styles.muted}>{item.answer}</Text>}
  </Card>)}</View>;
}

function Sections({ document }: { document: Document }) {
  return <>{document.updatedAt && <Text style={local.caption}>Effective and last updated: {document.updatedAt}</Text>}{document.sections.map(section => <Card key={section.title}>
    <Text accessibilityRole="header" style={styles.subheading}>{section.title}</Text>{section.paragraphs.map((paragraph, index) => <Text key={index} selectable style={styles.muted}>{paragraph}</Text>)}
  </Card>)}</>;
}

function Journeys({ navigate, signIn }: Pick<PublicScreenProps, 'navigate' | 'signIn'>) {
  const { identity } = useSession();
  return <View style={{ gap: 10 }}>
    <Tile title="Find your next role" text="Browse salary, location and published vacancies." icon="briefcase" onPress={() => navigate('jobs')} />
    <Tile title="Build your team" text="Share a private staffing requirement for review." icon="users" tone="#fff0e8" onPress={() => navigate('employer')} />
    <Tile title="Find everyday support" text="Security, care, housekeeping and pest control." icon="heart" tone="#f5efff" onPress={() => navigate('service-request')} />
    {!identity && <Button label="Create a profile / sign in" secondary onPress={signIn} />}
  </View>;
}

export function HomeScreen(props: PublicScreenProps) {
  const content = useRemote<{ data: PublicContent }>('public/content');
  if (content.loading) return <Page><Loading /></Page>;
  if (content.error || !content.data) return <Page><Empty title="Could not load the home page" text={content.error || 'Please try again.'} retry={content.refresh} /></Page>;
  return <HomeContentView content={content.data.data} {...props} />;
}

function HomeContentView({ content, navigate, signIn }: PublicScreenProps & { content: PublicContent }) {
  const { settings: s } = content;
  return <Page>
    <View style={local.hero}><Text style={local.heroEyebrow}>{s.homeHeroBadge}</Text><Text accessibilityRole="header" style={local.heroTitle}>{s.homeHeroTitle}{'\n'}<Text style={{ color: '#aebcff' }}>{s.homeHeroHighlight}</Text></Text><Text style={local.heroBody}>{s.homeHeroDescription}</Text><Button label="Find a job →" onPress={() => navigate('jobs')} /><Button label="Explore services" secondary onPress={() => navigate('services')} /></View>
    {s.homeAnnouncementText && <Notice text={s.homeAnnouncementText} />}
    <Heading eyebrow="WHAT WE DO" title={s.homeServicesTitle} subtitle={s.homeServicesDescription} />
    <ServiceTiles services={content.services} navigate={navigate} />
    <HomeLive settings={s} navigate={navigate} />
    <Heading eyebrow="SIMPLE & EASY" title="From requirement to solution." subtitle="No complicated process. Tell us what you need and we'll help you take the next step." />
    <Card>{[['Choose', "Select whether you're looking for a job or professional service."], ['Tell us your need', 'Share your location, requirement and preferred time.'], ['Get matched', 'Find the appropriate job opportunity or service professional.'], ["You're ready", 'Apply for the job or confirm your service booking.']].map(([title, text], index) => <View key={title} style={local.step}><Text style={local.stepNumber}>{String(index + 1).padStart(2, '0')}</Text><View style={{ flex: 1 }}><Text style={styles.label}>{title}</Text><Text style={styles.muted}>{text}</Text></View></View>)}</Card>
    <Heading eyebrow="READY TO START?" title={s.homeCtaTitle} subtitle={s.homeCtaDescription} /><Journeys navigate={navigate} signIn={signIn} />
    <Footer settings={s} navigate={navigate} />
  </Page>;
}

function HomeLive({ settings: s, navigate }: { settings: Settings; navigate: PublicScreenProps['navigate'] }) {
  const result = useRemote<{ data: HomeContent }>('public/home');
  if (result.loading) return <Loading />;
  if (result.error || !result.data) return <Empty title="Live opportunities unavailable" text={result.error || 'Please try again.'} retry={result.refresh} />;
  const { stats, jobs, categories } = result.data.data;
  return <>
    <View style={local.wrap}>{[[stats.activeJobs, 'Active jobs'], [stats.candidateCount, 'Registered candidates'], [stats.employerCount, 'Hiring requirements'], [stats.serviceClientCount, 'Service requests']].map(([value, label]) => <View key={label} style={local.stat}><Text style={local.statValue}>{Number(value).toLocaleString('en-IN')}</Text><Text style={local.caption}>{label}</Text></View>)}</View>
    <Heading eyebrow="CAREER OPPORTUNITIES" title={s.homeJobsTitle} subtitle={s.homeJobsDescription} />
    {jobs.length ? jobs.map(job => <Pressable key={job.id} accessibilityRole="button" accessibilityLabel={`View ${job.title} at ${job.company}`} onPress={() => navigate(`job:${job.id}`)}><Card><View style={styles.row}><Feather name="briefcase" size={18} color={colors.blue} /><Text style={[styles.subheading, { flex: 1 }]}>{job.title}</Text><Feather name="arrow-up-right" size={17} color={colors.blue} /></View><Text style={styles.muted}>{job.company} · {job.city} · {human(job.employmentType)}</Text><Text style={local.salary}>{money(job.salaryMin)} – {money(job.salaryMax)}</Text><Text style={local.linkText}>View opportunity →</Text></Card></Pressable>) : <Empty title="New opportunities are on their way" text="Published jobs will appear here. Keep your candidate profile ready." />}
    {!!categories.length && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{categories.map(item => <View key={item.category} style={styles.chip}><Text style={styles.chipText}>{item.category} · {item.count}</Text></View>)}</ScrollView>}
    <Button label="Browse all jobs" secondary onPress={() => navigate('jobs')} />
  </>;
}

export function PublicScreen(props: PublicScreenProps) {
  // Key resets local form/search/FAQ state and prevents old content flashing when
  // the parent changes pages while retaining the PublicScreen component.
  if (props.page === 'home') return <HomeScreen {...props} />;
  if (props.page.startsWith('service:')) return <ServicePage key={props.page} {...props} slug={props.page.slice('service:'.length)} />;
  return <ContentPage key={props.page} {...props} />;
}

function ContentPage({ page, navigate, signIn, onBack }: PublicScreenProps) {
  const result = useRemote<{ data: PublicContent }>('public/content');
  const [policy, setPolicy] = useState<'privacy-policy' | 'terms' | null>(null);
  const back = <Back label={onBack ? 'Back' : 'Home'} onPress={onBack ?? (() => navigate('home'))} />;
  if (result.loading) return <Page>{back}<Loading /></Page>;
  if (result.error || !result.data) return <Page>{back}<Empty title="Could not load this page" text={result.error || 'Please try again.'} retry={result.refresh} /></Page>;
  const content = result.data.data;
  const document = content.documents[page];
  const navigateFooter = (destination: string) => {
    if (page === 'employer' && (destination === 'privacy-policy' || destination === 'terms')) setPolicy(destination);
    else navigate(destination);
  };
  return <><Page>
    {back}
    {page === 'services' ? <><Heading eyebrow="CARE FOR EVERYDAY LIFE" title="The right people. For every need." subtitle="A safer workplace, a cleaner home, a little extra care. Find the service you need, all in one place." /><ServiceTiles services={content.services} navigate={navigate} /><Notice text="Share your requirement. Our team confirms scope, availability and the next steps." /><Button label="Request a service" onPress={() => navigate('service-request')} /><Button label="Hire staff" secondary onPress={() => navigate('employer')} /></>
      : page === 'employer' ? <EmployerForm openPolicy={() => setPolicy('privacy-policy')} />
      : document ? <>
        <Heading eyebrow={document.eyebrow} title={document.title} subtitle={document.description} />
        {page === 'contact' && <><ContactDetails settings={content.settings} /><Journeys navigate={navigate} signIn={signIn} /></>}
        {page === 'locations' && <CityDirectory cities={content.cities} navigate={navigate} />}
        <Sections document={document} />
        {page === 'about' && <><Journeys navigate={navigate} signIn={signIn} /><ServiceTiles services={content.services} navigate={navigate} /><Button label="Explore our coverage" secondary onPress={() => navigate('locations')} /></>}
        <Faqs items={document.faqs} />
        {(page === 'locations' || page === 'about') && <Button label="Talk to our team" onPress={() => navigate('contact')} />}
        {(page === 'privacy-policy' || page === 'terms') && <Button label="Contact us" secondary onPress={() => navigate('contact')} />}
      </> : <Empty title="Page not found" text="Choose Home or Services to continue." />}
    <Footer settings={content.settings} navigate={navigateFooter} />
  </Page>
    <Modal visible={policy !== null} animationType="slide" onRequestClose={() => setPolicy(null)}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
        <View style={{ paddingHorizontal: 18, paddingVertical: 8 }}><Button label="Back to requirement" secondary onPress={() => setPolicy(null)} /></View>
        {policy && <Page key={policy}>
          <Heading eyebrow={content.documents[policy].eyebrow} title={content.documents[policy].title} subtitle={content.documents[policy].description} />
          <Sections document={content.documents[policy]} />
          <Button label={policy === 'privacy-policy' ? 'Terms and Conditions' : 'Privacy Policy'} secondary onPress={() => setPolicy(policy === 'privacy-policy' ? 'terms' : 'privacy-policy')} />
        </Page>}
      </SafeAreaView>
    </Modal>
  </>;
}

function Back({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={local.back}><Feather name="arrow-left" size={18} color={colors.blue} /><Text style={local.linkText}>{label}</Text></Pressable>;
}

function ServiceTiles({ services, navigate }: { services: ServiceSummary[]; navigate: PublicScreenProps['navigate'] }) {
  return <View style={{ gap: 10 }}>{services.map(service => <Tile key={service.slug} title={service.shortTitle} text={service.summary} icon={serviceIcons[service.slug] || 'grid'} tone={serviceTones[service.slug]} onPress={() => navigate(`service:${service.slug}`)} />)}</View>;
}

function ContactDetails({ settings: s }: { settings: Settings }) {
  const [error, setError] = useState('');
  const whatsapp = s.whatsapp?.replace(/[^0-9]/g, '');
  const location = [s.address, s.city, s.state].filter(Boolean).join(', ');
  async function open(url: string) {
    setError('');
    try {
      if (!/^(https?:\/\/|tel:|mailto:)/i.test(url)) throw new Error('This contact link is unavailable.');
      await Linking.openURL(url);
    } catch { setError('Could not open this contact option. Please use the contact details shown or choose another option.'); }
  }
  return <>
    {!!s.phone && <Tile title="Give us a call" text={s.phone} icon="phone" onPress={() => void open(`tel:${s.phone!.replace(/[^+0-9]/g, '')}`)} />}
    {!!whatsapp && <Tile title="Start a WhatsApp chat" text="Share your city and what you need." icon="message-circle" tone="#eaf6ee" onPress={() => void open(`https://wa.me/${whatsapp}`)} />}
    {!!s.email && <Tile title="Write to us" text={s.email} icon="mail" onPress={() => void open(`mailto:${s.email}`)} />}
    {!s.phone && !whatsapp && !s.email && <Notice text="Our direct contact details are being updated. You can still send a staffing or service requirement, or browse current jobs." />}
    <Notice text={error} error />
    <Card><Text style={styles.subheading}>{s.companyName}</Text><Text selectable style={styles.muted}>{location || 'Service area: Raipur & Chhattisgarh'}</Text>{s.workingHours && <Text style={styles.muted}>{s.workingHours}</Text>}{s.googleBusinessProfileUrl && <Button label="View our Google profile" secondary onPress={() => void open(s.googleBusinessProfileUrl!)} />}<Text style={local.caption}>{s.address ? 'Please confirm the location and a suitable time with our team before planning a visit.' : 'Exact service availability is confirmed after reviewing your location and requirement.'}</Text></Card>
  </>;
}

function CityDirectory({ cities, navigate }: { cities: PublicContent['cities']; navigate: PublicScreenProps['navigate'] }) {
  const [query, setQuery] = useState('');
  const visible = cities.filter(city => city.name.toLowerCase().includes(query.trim().toLowerCase()));
  return <>
    <Field label="Search your city" value={query} onChangeText={setQuery} placeholder="Raipur, Bhilai, Bilaspur…" autoCorrect={false} />
    <Text accessibilityLiveRegion="polite" style={local.caption}>{visible.length} of {cities.length} enquiry locations</Text>
    {visible.map(city => <Card key={city.name}><View style={styles.row}><Feather name="map-pin" size={19} color={colors.blue} /><Text style={styles.subheading}>{city.name}</Text></View><Text style={styles.muted}>{city.description}</Text><View style={local.wrap}><Button label="Find jobs" secondary onPress={() => navigate(`jobs:${encodeURIComponent(city.name)}`)} /><Button label="Request service" secondary onPress={() => navigate('service-request')} /></View></Card>)}
    {!visible.length && <Empty title="No matching city in this directory" text="Try another spelling or ask our team about your area. You can still share a requirement for a location not listed here." retry={() => setQuery('')} />}
    {!!query && <Button label="Show all locations" secondary onPress={() => setQuery('')} />}
  </>;
}

const employerFields = [
  { key: 'company', label: 'Company name', max: 150 }, { key: 'contactName', label: 'Contact person', max: 150 },
  { key: 'mobile', label: 'Mobile number', max: 30 }, { key: 'contactEmail', label: 'Email for updates (optional)', max: 254 },
  { key: 'jobTitle', label: 'Job title', max: 150 }, { key: 'category', label: 'Job category', max: 150 },
  { key: 'candidatesRequired', label: 'Candidates required', max: 9 }, { key: 'city', label: 'Job city', max: 100 },
] as const;
type EmployerField = typeof employerFields[number]['key'];
const blankEmployer: Record<EmployerField, string> = { company: '', contactName: '', mobile: '', contactEmail: '', jobTitle: '', category: '', candidatesRequired: '', city: '' };

function EmployerForm({ openPolicy }: { openPolicy: () => void }) {
  const { api } = useSession();
  const [form, setForm] = useState(blankEmployer);
  const [busy, setBusy] = useState(false); const pending = useRef(false);
  const [error, setError] = useState(''); const [receipt, setReceipt] = useState<{ id: string; message: string }>();
  async function submit() {
    if (pending.current) return;
    setError('');
    const missing = employerFields.find(f => f.key !== 'contactEmail' && !form[f.key].trim());
    if (missing) { setError(`Please enter ${missing.label.toLowerCase()}.`); return; }
    const count = Number(form.candidatesRequired);
    if (!/^\d+$/.test(form.candidatesRequired.trim()) || !Number.isSafeInteger(count) || count < 1) { setError('Candidates required must be a positive whole number.'); return; }
    if (form.contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim())) { setError('Please enter a valid email address.'); return; }
    pending.current = true; setBusy(true);
    try {
      const body = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]));
      const result = await api<{ data: { id: string }; message: string }>('public/employer', { method: 'POST', body: { ...body, candidatesRequired: count } });
      setReceipt({ id: result.data.id, message: result.message }); setForm(blankEmployer);
    } catch (e) { setError(errorMessage(e)); } finally { pending.current = false; setBusy(false); }
  }
  return <>
    <Heading eyebrow="EMPLOYER REQUIREMENT" title="Tell us who you need." subtitle="Your requirement is reviewed by our recruitment team before any public job posting is created." />
    {receipt ? <Card><View style={local.icon}><Feather name="check-circle" size={24} color={colors.green} /></View><Text style={styles.subheading}>Requirement received</Text><Notice text={receipt.message} /><Text selectable style={styles.muted}>Reference: {receipt.id}</Text><Button label="Submit another requirement" secondary onPress={() => setReceipt(undefined)} /></Card> : <Card>
      <Text style={local.caption}>All fields are required except email.</Text>
      {employerFields.map(field => <Field key={field.key} label={field.label} value={form[field.key]} onChangeText={value => setForm(current => ({ ...current, [field.key]: value }))} maxLength={field.max} editable={!busy} keyboardType={field.key === 'mobile' ? 'phone-pad' : field.key === 'contactEmail' ? 'email-address' : field.key === 'candidatesRequired' ? 'number-pad' : 'default'} autoCapitalize={field.key === 'contactEmail' ? 'none' : 'words'} autoCorrect={field.key !== 'contactEmail'} />)}
      <Notice text={error} error /><Button label="Submit requirement" busy={busy} onPress={() => void submit()} />
      <Text style={local.caption}>Your contact and requirement details are used to review and coordinate this request.</Text>
      <Button label="Read our privacy policy" secondary onPress={openPolicy} />
    </Card>}
  </>;
}

function ServiceImage({ src, caption }: { src: string; caption: string }) {
  const [failed, setFailed] = useState(false);
  const uri = src.startsWith('/') && !src.startsWith('//') ? `${API_URL}${src}` : /^https?:\/\//i.test(src) ? src : '';
  if (!uri || failed) return <View style={local.imageFallback}><Feather name="image" size={26} color={colors.muted} /><Text style={local.caption}>Image unavailable</Text></View>;
  return <Image source={{ uri }} accessibilityLabel={caption} style={local.image} resizeMode="cover" onError={() => setFailed(true)} />;
}

function ServicePage({ slug, navigate, onBack }: PublicScreenProps & { slug: string }) {
  const result = useRemote<{ data: ServiceDetail }>(`public/services/${encodeURIComponent(slug)}`);
  const back = <Back label={onBack ? 'Back' : 'All services'} onPress={onBack ?? (() => navigate('services'))} />;
  if (result.loading) return <Page>{back}<Loading /></Page>;
  if (result.error || !result.data) return <Page>{back}<Empty title="Could not load this service" text={result.error || 'Please try again.'} retry={result.refresh} /></Page>;
  const s = result.data.data;
  const average = s.reviews.length ? s.reviews.reduce((sum, review) => sum + review.rating, 0) / s.reviews.length : null;
  return <Page>
    {back}
    <Heading eyebrow={s.eyebrow} title={s.title} subtitle={s.summary} />
    <ServiceImage key={s.heroImage} src={s.heroImage} caption={`${s.shortTitle} representative service image`} />
    <View style={local.wrap}>{s.highlights.map(item => <View key={item.label} style={local.highlight}><Text style={local.linkText}>{item.value}</Text><Text style={local.caption}>{item.label}</Text></View>)}</View>
    <Button label={s.primaryLabel} onPress={() => navigate(nativeRoute(s.primaryHref))} /><Button label={s.secondaryLabel} secondary onPress={() => navigate(nativeRoute(s.secondaryHref))} />
    <Notice text="Availability and charges are confirmed after reviewing your requirement." />
    <Heading eyebrow="WHAT YOU GET" title="A clearly defined scope." subtitle={s.description} />
    {s.included.map(item => <Card key={item.title}><View style={styles.row}><Feather name="check-circle" size={17} color={colors.green} /><Text style={[styles.subheading, { flex: 1 }]}>{item.title}</Text></View><Text style={styles.muted}>{item.text}</Text></Card>)}
    <Card><Text style={styles.subheading}>From enquiry to next steps</Text>{s.process.map((step, index) => <View key={step} style={local.step}><Text style={local.stepNumber}>{String(index + 1).padStart(2, '0')}</Text><Text style={[styles.muted, { flex: 1 }]}>{step}</Text></View>)}</Card>
    <Card><Text style={styles.subheading}>{s.searchHeading}</Text>{s.searchParagraphs.map(text => <Text key={text} style={styles.muted}>{text}</Text>)}<Text style={styles.label}>Common requirements we handle</Text>{s.localNeeds.map(text => <Text key={text} style={styles.muted}>• {text}</Text>)}</Card>
    <Button label="Explore our coverage" secondary onPress={() => navigate('locations')} />
    <Heading eyebrow="WORK GALLERY" title="A closer look at our work." />
    {s.gallery.length ? s.gallery.map((photo, index) => <Card key={`${photo.src}-${index}`}><ServiceImage src={photo.src} caption={photo.caption} /><Text style={local.caption}>{photo.caption}</Text></Card>) : <Notice text="Project photos will appear here once published. The service image above is representative, not a completed-project photo." />}
    <Heading eyebrow="CUSTOMER EXPERIENCES" title="Feedback that matters." subtitle={average === null ? 'No approved reviews yet. Reviews are checked before publication.' : `${average.toFixed(1)} / 5 from ${s.reviews.length} approved review${s.reviews.length === 1 ? '' : 's'}`} />
    {s.reviews.map(review => <Card key={review.id}><Text accessibilityLabel={`${review.rating} out of 5 stars`} style={local.rating}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</Text><Text style={styles.muted}>“{review.comment}”</Text><Text style={styles.label}>{review.customerName}</Text><Text style={local.caption}>{[review.city, new Date(review.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })].filter(Boolean).join(' · ')}</Text></Card>)}
    <ReviewForm slug={slug} />
    <Faqs items={s.faqs} />
    <Button label="Talk to our team" secondary onPress={() => navigate('contact')} /><Button label="Explore other services" secondary onPress={() => navigate('services')} />
  </Page>;
}

function ReviewForm({ slug }: { slug: string }) {
  const { api } = useSession();
  const [expanded, setExpanded] = useState(false); const [name, setName] = useState(''); const [city, setCity] = useState(''); const [comment, setComment] = useState(''); const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false); const pending = useRef(false); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  async function submit() {
    if (pending.current) return;
    setError(''); setMessage('');
    if (name.trim().length < 2) { setError('Please enter a valid name (2–80 characters).'); return; }
    if (comment.trim().length < 15) { setError('Review must be between 15 and 1000 characters.'); return; }
    pending.current = true; setBusy(true);
    try {
      const result = await api<{ message: string }>('public/reviews', { method: 'POST', body: { serviceSlug: slug, customerName: name.trim(), city: city.trim(), rating, comment: comment.trim() } });
      setMessage(result.message); setName(''); setCity(''); setComment(''); setRating(5); setExpanded(false);
    } catch (e) { setError(errorMessage(e)); } finally { pending.current = false; setBusy(false); }
  }
  return <Card>
    <Text style={styles.subheading}>Share your experience</Text><Text style={styles.muted}>Every review is verified before publication.</Text><Notice text={message} />
    {expanded ? <>
      <Field label="Your name" value={name} onChangeText={setName} maxLength={80} editable={!busy} autoComplete="name" />
      <Field label="City (optional)" value={city} onChangeText={setCity} maxLength={80} editable={!busy} />
      <Text style={styles.label}>Your rating: {rating} / 5</Text>
      <View style={local.wrap}>{[1, 2, 3, 4, 5].map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={`Rate ${value} out of 5 stars`} accessibilityState={{ selected: rating === value, disabled: busy }} disabled={busy} onPress={() => setRating(value)} style={local.starButton}><Text style={[local.rating, { color: value <= rating ? '#9c6600' : colors.muted }]}>{value <= rating ? '★' : '☆'}</Text></Pressable>)}</View>
      <Field label="Your review" value={comment} onChangeText={setComment} maxLength={1000} multiline editable={!busy} />
      <Text style={local.caption}>15–1,000 characters. Please don't include personal contact details.</Text><Notice text={error} error />
      <Button label="Submit review" busy={busy} onPress={() => void submit()} /><Button label="Cancel" secondary disabled={busy} onPress={() => setExpanded(false)} />
    </> : <Button label="Write a review" secondary onPress={() => setExpanded(true)} />}
  </Card>;
}

const local = StyleSheet.create({
  hero: { borderRadius: 24, backgroundColor: colors.navy, padding: 22, gap: 16 },
  heroEyebrow: { color: '#c5cffb', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  heroTitle: { color: '#fff', fontSize: 33, lineHeight: 40, fontWeight: '800', letterSpacing: -1 },
  heroBody: { color: '#d4d9e7', fontSize: 14, lineHeight: 23 },
  tile: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 18 },
  icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.soft, justifyContent: 'center', alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { minWidth: '45%', flexGrow: 1, flexBasis: '45%', borderRadius: 16, backgroundColor: '#fff', padding: 16, gap: 5, borderWidth: 1, borderColor: colors.border },
  statValue: { fontSize: 25, fontWeight: '800', color: colors.blue },
  caption: { fontSize: 12, color: colors.muted, lineHeight: 19 },
  salary: { fontSize: 16, fontWeight: '800', color: colors.navy },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 13, paddingVertical: 7 },
  stepNumber: { color: colors.blue, fontWeight: '800', fontSize: 16, minWidth: 26 },
  faqButton: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  footer: { gap: 6, borderTopWidth: 1, borderColor: colors.border, paddingTop: 22, marginTop: 8 },
  footerLink: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' },
  linkText: { color: colors.blue, fontSize: 13, fontWeight: '700' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, alignSelf: 'flex-start' },
  highlight: { flexGrow: 1, flexBasis: '28%', padding: 12, gap: 4, backgroundColor: colors.soft, borderRadius: 12 },
  image: { width: '100%', aspectRatio: 1.6, borderRadius: 18, backgroundColor: colors.soft },
  imageFallback: { width: '100%', aspectRatio: 1.6, borderRadius: 18, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center', gap: 10 },
  rating: { color: '#9c6600', fontSize: 22, letterSpacing: 2 },
  starButton: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 10, backgroundColor: '#fff8e9' },
});
