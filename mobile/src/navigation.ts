export type NavItem = { id: string; label: string; icon: 'home' | 'search' | 'grid' | 'users' | 'map-pin' | 'info' | 'phone' | 'shield' | 'file-text' | 'briefcase' | 'bookmark' | 'calendar' | 'user' | 'bell' | 'folder' | 'bar-chart-2' | 'star' | 'clock' | 'settings' | 'lock' | 'inbox' };
export const publicPages: NavItem[] = [
  { id: 'home', label: 'Home', icon: 'home' }, { id: 'jobs', label: 'Find jobs', icon: 'search' },
  { id: 'services', label: 'Our services', icon: 'grid' }, { id: 'service-request', label: 'Request a service', icon: 'inbox' },
  { id: 'employer', label: 'Hire staff', icon: 'users' }, { id: 'locations', label: 'Locations', icon: 'map-pin' },
  { id: 'about', label: 'About us', icon: 'info' }, { id: 'contact', label: 'Contact & support', icon: 'phone' },
  { id: 'privacy-policy', label: 'Privacy policy', icon: 'shield' }, { id: 'terms', label: 'Terms & conditions', icon: 'file-text' },
];
export const candidatePages: NavItem[] = [
  { id: 'dashboard', label: 'My dashboard', icon: 'home' }, { id: 'applications', label: 'My applications', icon: 'briefcase' },
  { id: 'saved', label: 'Saved jobs', icon: 'bookmark' }, { id: 'interviews', label: 'My interviews', icon: 'calendar' },
  { id: 'profile-edit', label: 'Complete profile', icon: 'user' }, { id: 'documents', label: 'My documents', icon: 'folder' },
  { id: 'notifications', label: 'Notifications', icon: 'bell' }, { id: 'privacy', label: 'My data & privacy', icon: 'lock' },
];
export const adminPages: NavItem[] = [
  { id: 'overview', label: 'Dashboard', icon: 'home' }, { id: 'jobs', label: 'Manage jobs', icon: 'briefcase' },
  { id: 'applications', label: 'Applications', icon: 'inbox' }, { id: 'candidates', label: 'Candidates', icon: 'users' },
  { id: 'interviews', label: 'Interviews', icon: 'calendar' }, { id: 'services', label: 'Service requests', icon: 'grid' },
  { id: 'requirements', label: 'Employer requirements', icon: 'file-text' }, { id: 'reports', label: 'Reports', icon: 'bar-chart-2' },
  { id: 'reviews', label: 'Service reviews', icon: 'star' }, { id: 'audit-logs', label: 'Activity log', icon: 'clock' },
  { id: 'privacy-requests', label: 'Privacy requests', icon: 'shield' }, { id: 'team', label: 'Team & permissions', icon: 'users' },
  { id: 'settings', label: 'Website settings', icon: 'settings' }, { id: 'assets', label: 'Banners & service gallery', icon: 'grid' }, { id: 'account', label: 'My account', icon: 'lock' },
];
export function pageTitle(page: string, admin: boolean) {
  const base = page.split(':')[0];
  const details: Record<string, string> = { menu: 'All pages', job: 'Job details', service: 'Service details', 'job-edit': 'Edit job', 'interview-schedule': 'Schedule interview', 'candidate-verify': 'Candidate verification' };
  return details[base] ?? (admin ? adminPages : [...candidatePages, ...publicPages]).find(item => item.id === base)?.label ?? 'CG Job Care';
}
export function pushPage(stack: string[], next: string): string[] { return stack[stack.length - 1] === next ? stack : [...stack, next]; }
