import { useEffect } from 'react';
import { replaceBrandTokens, useSiteIdentity } from '../hooks/useSiteIdentity';

const SiteIdentitySync = () => {
  const identity = useSiteIdentity();

  useEffect(() => {
    const syncBrandTokens = () => {
      const nextTitle = replaceBrandTokens(document.title, identity);
      if (nextTitle !== document.title) {
        document.title = nextTitle;
      }

      const metaSelectors = [
        'meta[name="description"]',
        'meta[property="og:title"]',
        'meta[property="og:description"]',
        'meta[name="twitter:title"]',
        'meta[name="twitter:description"]',
      ];

      metaSelectors.forEach((selector) => {
        const element = document.querySelector(selector);
        if (!element) return;

        const currentContent = element.getAttribute('content');
        if (!currentContent) return;

        const nextContent = replaceBrandTokens(currentContent, identity);
        if (nextContent !== currentContent) {
          element.setAttribute('content', nextContent);
        }
      });
    };

    syncBrandTokens();

    const observer = new MutationObserver(() => {
      syncBrandTokens();
    });

    observer.observe(document.head, { childList: true, subtree: true, characterData: true });

    return () => {
      observer.disconnect();
    };
  }, [identity]);

  return null;
};

export default SiteIdentitySync;
