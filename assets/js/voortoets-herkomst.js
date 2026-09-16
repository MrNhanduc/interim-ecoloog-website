/*
 * Herkomstregistratie voor het offerteformulier op /voortoets/
 * De Interim Ecoloog B.V.
 *
 * Geen cookies. Geen localStorage. Geen sessionStorage. Geen externe scripts.
 * Er wordt niets op het apparaat van de bezoeker opgeslagen.
 *
 * Dit kan zonder opslag omdat de teller en het formulier op dezelfde pagina
 * staan: de URL waarmee de bezoeker binnenkwam is bij het versturen nog gewoon
 * beschikbaar. Daarom is er geen toestemming en geen cookiebanner nodig.
 */
(function () {
  'use strict';

  var FORM_ID = 'vt-formulier';

  function zetVeld(form, naam, waarde) {
    if (!waarde) return;
    var el = form.querySelector('input[name="' + naam + '"]');
    if (!el) {
      el = document.createElement('input');
      el.type = 'hidden';
      el.name = naam;
      form.appendChild(el);
    }
    el.value = String(waarde).slice(0, 300);
  }

  function herkomstUitReferrer() {
    var r = document.referrer;
    if (!r) return 'direct of onbekend';
    try {
      var h = new URL(r).hostname.replace(/^www\./, '');
      if (h === location.hostname) return '';
      if (/google\./.test(h))     return 'Google (organisch)';
      if (/bing\./.test(h))       return 'Bing';
      if (/duckduckgo\./.test(h)) return 'DuckDuckGo';
      if (/linkedin\./.test(h))   return 'LinkedIn';
      return h;
    } catch (e) {
      return '';
    }
  }

  function init() {
    var form = document.getElementById(FORM_ID);
    if (!form) return;

    var p = new URLSearchParams(window.location.search);

    var gclid = p.get('gclid') || '';
    var bron  = p.get('bron') || p.get('utm_source') || '';

    var viaAds = !!gclid || bron === 'ads';

    zetVeld(form, 'herkomst',
      viaAds ? 'Google Ads' : (herkomstUitReferrer() || 'direct of onbekend'));

    if (viaAds) {
      zetVeld(form, 'ads_zoekwoord', p.get('kw'));
      zetVeld(form, 'ads_matchtype', p.get('mt'));
      zetVeld(form, 'ads_campagne',  p.get('cmp'));
      zetVeld(form, 'ads_groep',     p.get('ag'));
      zetVeld(form, 'ads_gclid',     gclid);
    }

    zetVeld(form, 'landingsurl',
      window.location.pathname + window.location.search);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
