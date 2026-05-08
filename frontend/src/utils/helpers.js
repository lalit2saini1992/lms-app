import { format, formatDistanceToNow } from 'date-fns';

export const formatDate = (date) => {
  if (!date) return '—';
  return format(new Date(date), 'dd MMM yyyy');
};

export const formatDateTime = (date) => {
  if (!date) return '—';
  return format(new Date(date), 'dd MMM yyyy, hh:mm a');
};

export const timeAgo = (date) => {
  if (!date) return '—';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

export const statusColors = {
  new:             'bg-blue-100 text-blue-700',
  assigned:        'bg-amber-100 text-amber-700',
  in_progress:     'bg-violet-100 text-violet-700',
  interested:      'bg-emerald-100 text-emerald-700',
  not_interested:  'bg-red-100 text-red-600',
  converted:       'bg-green-100 text-green-700',
  lost:            'bg-gray-100 text-gray-500',
};

export const statusLabels = {
  new:             'New',
  assigned:        'Assigned',
  in_progress:     'In Progress',
  interested:      'Interested',
  not_interested:  'Not Interested',
  converted:       'Converted',
  lost:            'Lost',
};

export const roleColors = {
  superadmin: 'bg-red-100 text-red-700',
  admin:      'bg-violet-100 text-violet-700',
  manager:    'bg-blue-100 text-blue-700',
  employee:   'bg-emerald-100 text-emerald-700',
};

export const communicationIcons = {
  call:      '📞',
  whatsapp:  '💬',
  email:     '📧',
  message:   '✉️',
  in_person: '🤝',
  other:     '📝',
};

export const getWhatsAppLink = (phone, message = '') => {
  const cleaned = phone.replace(/\D/g, '');
  const num = cleaned.startsWith('91') ? cleaned : `91${cleaned}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
};

export const getCallLink  = (phone) => `tel:${phone}`;
export const getMailLink  = (email, subject = 'Follow-up') =>
  `mailto:${email}?subject=${encodeURIComponent(subject)}`;
