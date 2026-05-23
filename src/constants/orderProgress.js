export const PHOTO_STATUS_OPTIONS = [
  { value: 'photo_progress', label: 'Progres Photo' },
  { value: 'editing', label: 'Proses Editing' },
  { value: 'draft_album', label: 'Progres Draf Album' },
  { value: 'printing', label: 'Proses Cetak Album' },
  { value: 'shipping', label: 'Pengiriman' },
  { value: 'completed', label: 'Selesai' },
];

export const VIDEO_STATUS_OPTIONS = [
  { value: 'video_progress', label: 'Progres Video' },
  { value: 'processing', label: 'Proses' },
  { value: 'revision', label: 'Proses Revisi' },
  { value: 'completed', label: 'Selesai' },
];

export const REFERENCE_SOURCE_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'google', label: 'Google / Pencarian' },
  { value: 'teman', label: 'Teman / Kerabat' },
  { value: 'lainnya', label: 'Lainnya' },
];

export const formatPhotoStatus = (v) =>
  PHOTO_STATUS_OPTIONS.find((o) => o.value === v)?.label || v;

export const formatVideoStatus = (v) =>
  VIDEO_STATUS_OPTIONS.find((o) => o.value === v)?.label || v;

export const formatReferenceSource = (v) =>
  REFERENCE_SOURCE_OPTIONS.find((o) => o.value === v)?.label || v || '-';
