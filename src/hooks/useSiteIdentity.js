import { useEffect, useState } from 'react';

const API_BASE_URL = 'https://api-inventory.isavralabel.com/wedding-app/api';
const DEFAULT_APP_NAME = 'Chekusphoto';
const DEFAULT_COMPANY_NAME = 'PT Chekusphoto';
const DEFAULT_APP_INITIAL = 'C';

const normalizeInitial = (value) => {
  if (!value) return '';
  const cleaned = String(value).trim();
  if (!cleaned) return '';
  return cleaned.slice(0, 2).toUpperCase();
};

const deriveInitialFromName = (appName) => {
  const words = String(appName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  if (words.length === 1) {
    return words[0][0].toUpperCase();
  }
  return DEFAULT_APP_INITIAL;
};

const buildIdentity = (data) => {
  const appName = String(data?.title || '').trim() || DEFAULT_APP_NAME;
  const companyName = String(data?.subtitle || '').trim() || DEFAULT_COMPANY_NAME;
  const appInitial = normalizeInitial(data?.button_text) || deriveInitialFromName(appName);
  const logoUrl = String(data?.image_url || '').trim();

  return {
    appName,
    companyName,
    appInitial,
    logoUrl,
  };
};

const defaultIdentity = buildIdentity(null);

export const replaceBrandTokens = (text, identity = defaultIdentity) => {
  const source = String(text || '');
  return source
    .replace(/PT User Wedding Organizer/g, identity.companyName)
    .replace(/User Wedding Organizer/g, identity.companyName)
    .replace(/User Wedding/g, identity.appName)
    .replace(/PT Chekusphoto/g, identity.companyName)
    .replace(/Chekusphoto/g, identity.appName);
};

export const useSiteIdentity = () => {
  const [identity, setIdentity] = useState(defaultIdentity);

  useEffect(() => {
    let cancelled = false;

    const fetchIdentity = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/content-sections/site_identity`);
        if (!response.ok) return;

        const data = await response.json();
        if (!cancelled) {
          setIdentity(buildIdentity(data));
        }
      } catch (error) {
        console.error('Error fetching site identity:', error);
      }
    };

    fetchIdentity();

    return () => {
      cancelled = true;
    };
  }, []);

  return identity;
};
