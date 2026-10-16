import { Bell, Building2, ClipboardList, CreditCard, FileText, Landmark, LayoutDashboard, LifeBuoy, Receipt, Settings, Stethoscope, Users } from 'lucide-react';

export const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Company Profile', path: '/profile', icon: Building2 },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Services', path: '/services', icon: Stethoscope },
      { label: 'Cases / Requests', path: '/cases', icon: ClipboardList },
      { label: 'Patients', path: '/patients', icon: Users },
      { label: 'Documents', path: '/documents', icon: FileText },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Invoices', path: '/invoices', icon: Receipt },
      { label: 'Payments', path: '/payments', icon: CreditCard },
      { label: 'Bank Details', path: '/bank-details', icon: Landmark },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Notifications', path: '/notifications', icon: Bell },
      { label: 'Support', path: '/support', icon: LifeBuoy },
      { label: 'Settings', path: '/settings', icon: Settings },
    ],
  },
];

export const MOBILE_NAV = [
  { label: 'Home', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Cases', path: '/cases', icon: ClipboardList },
  { label: 'Patients', path: '/patients', icon: Users },
  { label: 'Invoices', path: '/invoices', icon: Receipt },
];
