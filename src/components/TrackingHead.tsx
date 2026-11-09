import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useTrackingSettings } from "@/hooks/useTrackingSettings";
import { useTracking } from "@/hooks/useTracking";

declare global {
  interface Window {
    dataLayer: any[];
  }
}

const TrackingHead = () => {
  const { data: settings } = useTrackingSettings();
  const { trackEvent } = useTracking();
  const injectedRef = useRef(false);
  const location = useLocation();

  // Inject GTM + GA4 scripts once when settings load
  useEffect(() => {
    if (injectedRef.current || !settings) return;
    const hasGtm = !!settings.gtm_id;
    const hasGa4 = !!settings.ga4_id;
    if (!hasGtm && !hasGa4) return;
    injectedRef.current = true;

    // GTM
    if (hasGtm) {
      const gtmId = settings.gtm_id;
      const script = document.createElement("script");
      script.innerHTML = `
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${gtmId}');
      `;
      document.head.appendChild(script);

      const noscript = document.createElement("noscript");
      const iframe = document.createElement("iframe");
      iframe.src = `https://www.googletagmanager.com/ns.html?id=${gtmId}`;
      iframe.height = "0";
      iframe.width = "0";
      iframe.style.display = "none";
      iframe.style.visibility = "hidden";
      noscript.appendChild(iframe);
      document.body.insertBefore(noscript, document.body.firstChild);
    }

    // GA4 (gtag.js) — direct injection so Google can detect it
    if (hasGa4) {
      const ga4Id = settings.ga4_id;
      const gtagScript = document.createElement("script");
      gtagScript.async = true;
      gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${ga4Id}`;
      document.head.appendChild(gtagScript);

      const inlineScript = document.createElement("script");
      inlineScript.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${ga4Id}');
      `;
      document.head.appendChild(inlineScript);
    }
  }, [settings]);

  // Track page views on route change — dataLayer + CAPI
  // Skip admin (/admin) and developer (/dev) panel routes
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith("/admin") || path.startsWith("/dev")) return;

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "page_view",
      page_path: path + location.search,
      page_title: document.title,
    });

    // Defer CAPI page_view so it doesn't compete with content loading
    const timer = setTimeout(() => {
      trackEvent("page_view", {
        page_path: path + location.search,
        page_title: document.title,
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [location.pathname, location.search, trackEvent]);

  return null;
};

export default TrackingHead;
