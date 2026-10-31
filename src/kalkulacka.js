/*!
 * Srovnání e-shopových platforem – kalkulačka nákladů
 * Autor: Pavel Vranka (https://pavelvranka.cz)
 * Verze {{VERSION}}, ceny naposledy ověřeny: {{UPDATED_CZ}}. Všechny ceny bez DPH.
 *
 * Skript nepracuje se vstupy od jiných uživatelů, neposílá žádná data
 * a nenačítá nic z externích zdrojů. Vše běží v prohlížeči návštěvníka.
 */
(function () {
  'use strict';

  var root = document.getElementById('pvk-root');
  if (!root) return;

  var $ = function (id) { return document.getElementById('pvk-' + id); };

  // ---------------------------------------------------------------
  // Ceník (Kč/měs. bez DPH, není-li uvedeno jinak). Při aktualizaci cen
  // upravte hodnoty zde a texty v content.html.
  // ---------------------------------------------------------------
  var PRICE = {
    shopify: { basic: 499, grow: 1370, advanced: 7130 },           // Kč/měs., roční platba
    shopifyPlusEUR: 2100,                                           // €/měs., 3letý kontrakt
    shopifyPlusCapUSD: 40000,                                       // $/měs., strop variabilního poplatku (odhad)
    shoptet: { stBasic: 440, stBusiness: 1490, stProfi: 2490, shoptet: 4690 }, // Kč/měs., −10 % ročně
    shoptetAddonLang: 400,                                          // Kč/měs., cizí jazyky/měny (odhad)
    shoptetSync: 1500,                                              // Kč/měs. na další instanci (odhad)
    shoptetGatewayAddon: 200,                                       // Kč/měs., Comgate/GoPay doplněk
    upgates: { silver: 1035, gold: 1575, platinum: 2925 },          // Kč/měs., roční platba
    shopwareRiseEUR: 600, shopwareEvolveEUR: 2400,                  // €/měs. „od“
    eshopRychle: { startup: 472, business: 952 },                   // Kč/měs., 2letá platba
    simpleshop: { pct: 0.009, fix: 1390, startPct: 0.039 },
    webnode: 739,                                                   // Kč/měs. (odhad)
    wixUSD: { core: 29, business: 39 }                              // $/měs., roční platba
  };

  var GMV_STEPS = [5e4, 1e5, 2e5, 5e5, 1e6, 2e6, 5e6, 1e7, 2e7, 5e7, 1e8, 2e8, 5e8];
  var S = { n: 2, allCosts: false, notes: {} }; // notes: rozbalené poznámky podle id platformy
  var COST_ROWS = 5; // řádků rozpisu nákladů před „Zobrazit vše“

  // apps = placené aplikace €/měs. (odhad), host = hosting €/měs. (odhad, jen self-hosted),
  // maintH = nutná technická údržba h/měs. (odhad, jen self-hosted)
  var P = [
    { id: 'basic', fam: 'shopify', kind: 'saas', api: true, name: 'Shopify Basic', group: 'entry', apps: 100, host: 0, maintH: 0 },
    { id: 'grow', fam: 'shopify', kind: 'saas', api: true, name: 'Shopify Grow', apps: 150, host: 0, maintH: 0 },
    { id: 'advanced', fam: 'shopify', kind: 'saas', api: true, name: 'Shopify Advanced', apps: 200, host: 0, maintH: 0 },
    { id: 'plus', fam: 'shopify', kind: 'saas', api: true, name: 'Shopify Plus', apps: 500, host: 0, maintH: 0 },
    { id: 'stBasic', fam: 'shoptet', kind: 'saas', api: false, name: 'Shoptet Basic', group: 'entry', apps: 40, host: 0, maintH: 0 },
    { id: 'stBusiness', fam: 'shoptet', kind: 'saas', api: false, name: 'Shoptet Business', apps: 60, host: 0, maintH: 0 },
    { id: 'stProfi', fam: 'shoptet', kind: 'saas', api: false, name: 'Shoptet Profi', apps: 60, host: 0, maintH: 0 },
    { id: 'shoptet', fam: 'shoptet', kind: 'saas', api: false, name: 'Shoptet Enterprise', apps: 60, host: 0, maintH: 0 },
    { id: 'premium', fam: 'shoptet', kind: 'saas', api: true, name: 'Shoptet Premium', apps: 100, host: 0, maintH: 0 },
    { id: 'upgates', fam: 'upgates', kind: 'saas', api: true, name: 'Upgates', apps: 60, host: 0, maintH: 0 },
    { id: 'shopware', fam: 'shopware', kind: 'self', api: true, name: 'Shopware 6', apps: 200, host: 350, maintH: 15 },
    { id: 'magento', fam: 'magento', kind: 'self', api: true, name: 'Magento Open Source', apps: 200, host: 450, maintH: 25 },
    { id: 'adobe', fam: 'magento', kind: 'self', api: true, name: 'Adobe Commerce', apps: 200, host: 0, maintH: 15 },
    { id: 'presta', fam: 'presta', kind: 'self', api: true, name: 'PrestaShop', apps: 150, host: 200, maintH: 15 },
    { id: 'erychle', fam: 'erychle', kind: 'start', api: false, name: 'Eshop-rychle', apps: 0, host: 0, maintH: 0 },
    { id: 'simpleshop', fam: 'simpleshop', kind: 'start', api: false, name: 'SimpleShop', apps: 0, host: 0, maintH: 0 },
    { id: 'webnode', fam: 'webnode', kind: 'start', api: false, name: 'Webnode Profi', apps: 0, host: 0, maintH: 0 },
    { id: 'wix', fam: 'wix', kind: 'start', api: true, name: 'Wix (Core / Business)', apps: 30, host: 0, maintH: 0 }
  ];
  var GROUP_LABEL = { entry: 'vstupní tarif' };
  var KIND_LABEL = { saas: 'SaaS', self: 'self-hosted / PaaS', start: 'startovací řešení' };
  var HF = [0.5, 1, 1.6, 2.6]; // násobek hostingu a údržby dle pásma obratu
  var AF = [0.5, 1, 1.5, 2];   // násobek aplikací

  var nf0 = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 0 });
  var nf2 = new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function fmt(v) {
    var a = Math.abs(v);
    if (a < 0.5) return '0 Kč';
    if (a < 1e4) return nf0.format(v) + ' Kč';
    return a >= 1e6 ? nf2.format(v / 1e6) + ' mil. Kč' : nf0.format(v / 1000) + ' tis. Kč';
  }
  function plural(n) { return n === 1 ? 'trh' : n < 5 ? 'trhy' : 'trhů'; }
  function tier(G) { return G < 10e6 ? 0 : G < 100e6 ? 1 : G < 500e6 ? 2 : 3; }
  function num(id, d) { var v = parseFloat($(id).value); return isFinite(v) ? v : d; }
  function radio(name, d) { var r = root.querySelector('input[name="pvk-' + name + '"]:checked'); return r ? r.value : d; }

  function adobeLicUSD(g) {
    if (g < 1e6) return 40000; if (g < 5e6) return 55000; if (g < 10e6) return 80000;
    if (g < 25e6) return 120000; return 190000;
  }
  function upgatesDomains(n) { var s = 0; for (var i = 2; i <= n; i++) s += i <= 5 ? 750 : 350; return s * 12; }

  // est: 'odhad' = nevychází z veřejného ceníku, 'od' = minimální cena
  function calc(p, n, c) {
    var G = c.G, eur = c.eur, usd = c.usd, t = tier(G), dom = c.mode === 'domain', ext = c.gw === 'ext';
    var lic = 0, mkt = 0, notes = [], instances = 1, extraHost = 0, est = {};
    switch (p.id) {
      case 'basic': case 'grow': case 'advanced': {
        lic = PRICE.shopify[p.id] * 12;
        if (n > 1) notes.push('Shopify Markets bez příplatku; více zemí lze řešit i v jednom marketu nebo submarketech.');
        if (ext && n > 1) notes.push('S externí bránou zákazník platí v základní měně obchodu; platba v lokální měně jen se Shopify Payments.');
        break;
      }
      case 'plus': {
        var fixed = PRICE.shopifyPlusEUR * 12 * eur, cap = PRICE.shopifyPlusCapUSD * 12 * usd;
        var varf = Math.min(c.plusPct * G, cap);
        lic = Math.max(fixed, varf);
        if (varf > fixed) { est.lic = 'odhad'; notes.push('Platí variabilní poplatek ' + nf2.format(c.plusPct * 100) + ' % z obratu (víc než fixní ' + PRICE.shopifyPlusEUR + ' €/měs.)' + (varf >= cap ? ', strop 40 000 $/měs.' : '') + '. Přesné podmínky jsou ve smlouvě.'); }
        else notes.push('Fixní ' + PRICE.shopifyPlusEUR + ' €/měs.; variabilní poplatek ' + nf2.format(c.plusPct * 100) + ' % z obratu by se uplatnil nad cca ' + fmt(fixed / c.plusPct) + ' ročně.');
        if (ext && n > 1) notes.push('Externí brána → expansion stores (9 v ceně).');
        break;
      }
      case 'stBasic': case 'stBusiness': case 'stProfi': case 'shoptet': {
        var inst = PRICE.shoptet[p.id] * 0.9 * 12, addon = PRICE.shoptetAddonLang * 12, sync = PRICE.shoptetSync * 12;
        lic = inst;
        if (n > 1) {
          est.mkt = 'odhad';
          if (dom) { mkt = (n - 1) * (inst + addon + sync) + addon; instances = n; notes.push(n + ' samostatné e-shopy + doplněk pro synchronizaci. Každý e-shop se spravuje zvlášť.'); }
          else { mkt = addon; notes.push('Jazykové verze na 1 doméně, doplněk cizí jazyky/měny.'); }
        }
        if (p.id === 'stBasic') notes.push('Limit 100 produktů. Existuje i tarif Free (0 Kč, 10 produktů).');
        if (p.id === 'stBusiness') notes.push('Limit 1 000 produktů.');
        if (p.id === 'stProfi') notes.push('Limit 5 000 produktů.');
        if (p.id === 'shoptet') notes.push('Limit 50 000 produktů.');
        if (p.id !== 'shoptet' && n > 1) notes.push('Cizí jazyky a měny jako placený doplněk; dostupnost na tarifu je potřeba ověřit.');
        if (G >= 200e6) notes.push('Při tomto obratu obvykle přechod na Premium.');
        break;
      }
      case 'premium': {
        lic = c.premBase * 12; est.lic = 'od';
        notes.push('Veřejná je jen vstupní cena, finální je individuální.');
        if (n > 1 && dom) { mkt = (n - 1) * c.premExtra * 12; est.mkt = 'odhad'; notes.push('Cenu za další doménu Shoptet nezveřejňuje.'); }
        else if (n > 1) notes.push('Neomezené jazyky a měny v ceně.');
        break;
      }
      case 'upgates': {
        if (G > 150e6) { lic = c.upExcl * 12; est.lic = 'odhad'; notes.push('Tarif Exclusive, cena individuální.'); }
        else if (G >= 10e6) { lic = PRICE.upgates.platinum * 12; notes.push('Platinum: 50 000 produktů, neomezeně jazyků.'); }
        else if (G >= 1e6) { lic = PRICE.upgates.gold * 12; notes.push('Gold: 5 000 produktů, 5 jazyků.'); }
        else { lic = PRICE.upgates.silver * 12; notes.push('Silver: 1 000 produktů, 2 jazyky.'); }
        if (n > 1 && dom) mkt = upgatesDomains(n);
        break;
      }
      case 'shopware': {
        if (c.b2b) { lic = PRICE.shopwareEvolveEUR * 12 * eur; est.lic = 'od'; notes.push('Evolve (B2B), cena roste s GMV.'); }
        else if (G / eur > 1e6) { lic = PRICE.shopwareRiseEUR * 12 * eur; est.lic = 'od'; notes.push('Rise, cena roste s GMV.'); }
        else notes.push('Community Edition zdarma (do 1 mil. € GMV).');
        est.host = 'odhad';
        notes.push('Počítáno self-hosted; Shopware SaaS má hosting v ceně plánu.');
        break;
      }
      case 'magento': est.host = 'odhad'; notes.push('Bez licence; platíte hosting a nutnou údržbu.'); break;
      case 'adobe': lic = adobeLicUSD(G / usd) * usd; est.lic = 'odhad'; notes.push('Cloud (PaaS) vč. hostingu. Adobe ceny nezveřejňuje, částka podle nezávislých přehledů.'); break;
      case 'presta': est.host = 'odhad'; notes.push('Bez licence, multistore zdarma.'); break;
      case 'erychle': {
        if (G < 1e6) { lic = PRICE.eshopRychle.startup * 12; notes.push('Startup (2letá platba): 20 000 produktů, 5 domén.'); }
        else { lic = PRICE.eshopRychle.business * 12; notes.push('Business (2letá platba): 100 000 produktů, 10 domén.'); }
        if (n > 1) { mkt = (n - 1) * lic; instances = n; est.mkt = 'odhad'; notes.push('Cizí jazyky a měny ceník neuvádí, proto počítáno jako samostatný e-shop na trh.'); }
        break;
      }
      case 'simpleshop': {
        var m = G / 12;
        lic = Math.min(PRICE.simpleshop.startPct * m, PRICE.simpleshop.pct * m + PRICE.simpleshop.fix) * 12;
        notes.push('Poplatek z obratu podle veřejného ceníku: 0,9 % + 1 390 Kč/měs. (do cca 46 tis. Kč/měs. obratu 3,9 %). Strop ani individuální cena pro velký obrat nejsou uvedené.');
        notes.push('Nemá e-shop ani katalog, jen prodejní formuláře vložené do vlastního webu. Započten jen hosting webu, ne jeho tvorba.');
        if (n > 1) notes.push(dom ? 'Každý trh = vlastní web na vlastní doméně s vloženými formuláři.' : 'Jazykové verze řeší vlastní web (např. WordPress + WPML).');
        extraHost = (dom ? n : 1) * c.ssWeb * 12 + (!dom && n > 1 ? 2500 : 0);
        est.host = 'odhad';
        break;
      }
      case 'webnode': {
        lic = PRICE.webnode * 12; est.lic = 'odhad'; notes.push('Nejvyšší tarif, cenu je potřeba ověřit.');
        if (n > 1 && dom) { mkt = (n - 1) * lic; instances = n; est.mkt = 'odhad'; notes.push('Vlastní doména na zemi = další projekt.'); }
        if (n > 1) notes.push('Neomezené jazyky, podle uživatelů ale jen jedna měna.');
        break;
      }
      case 'wix': {
        if (n > 1) { lic = PRICE.wixUSD.business * 12 * usd; notes.push('Business: více měn, Wix Multilingual bez příplatku.'); }
        else { lic = PRICE.wixUSD.core * 12 * usd; notes.push('Core: 1 měna, až 50 000 produktů.'); }
        if (n > 1 && dom) notes.push('Jazyky běží na subdoménách nebo adresářích jednoho webu, vlastní doména na zemi není standard.');
        break;
      }
    }
    var host = p.host * eur * 12 * HF[t] * (1 + (p.host ? 0.05 * (n - 1) : 0)) + extraHost;
    var apps = p.apps * eur * 12 * AF[t] * instances;
    var maint = p.maintH * HF[t] * c.rate * 12;
    var total = lic + mkt + host + (c.incApps ? apps : 0) + (c.incMaint ? maint : 0);
    var anyEst = !!(est.lic || est.mkt || est.host) || (c.incApps && apps > 0) || (c.incMaint && maint > 0);
    return { lic: lic, mkt: mkt, host: host, apps: apps, maint: maint, total: total, notes: notes, est: est, anyEst: anyEst };
  }

  var NATIVE = {
    basic: { pct: .019, intl: .029, fix: 6.5, lbl: 'Shopify Payments' },
    grow: { pct: .018, intl: .028, fix: 6.5, lbl: 'Shopify Payments' },
    advanced: { pct: .016, intl: .026, fix: 6.5, lbl: 'Shopify Payments' },
    plus: { pct: .013, intl: .023, fix: 6.5, lbl: 'Shopify Payments' },
    stBasic: { pct: .018, intl: .0355, fix: 2.7, lbl: 'Shoptet Pay' },
    stBusiness: { pct: .016, intl: .0355, fix: 2.6, lbl: 'Shoptet Pay' },
    stProfi: { pct: .014, intl: .0355, fix: 2.2, lbl: 'Shoptet Pay' },
    shoptet: { pct: .0119, intl: .0355, fix: 1.9, lbl: 'Shoptet Pay' },
    premium: { pct: .0119, intl: .0355, fix: 1.9, lbl: 'Shoptet Pay (individuálně)', est: true }
  };
  var SHOPIFY_EXT_FEE = { basic: .02, grow: .01, advanced: .006, plus: .002 };

  function payments(p, n, c) {
    var V = c.G * c.cardShare, tx = V / c.aov, nonE = c.nonEEA;
    var nat = NATIVE[p.id], cost, label, est = false;
    if (c.gw === 'native' && nat) {
      cost = V * ((1 - nonE) * nat.pct + nonE * nat.intl) + tx * nat.fix;
      label = nat.lbl; est = !!nat.est;
    } else {
      cost = V * ((1 - nonE) * c.extRate + nonE * c.extIntl) + tx * c.extFix;
      label = 'Externí brána ' + nf2.format(c.extRate * 100) + ' %';
      est = true;
      if (SHOPIFY_EXT_FEE[p.id]) { cost += V * SHOPIFY_EXT_FEE[p.id]; label += ' + ' + nf2.format(SHOPIFY_EXT_FEE[p.id] * 100) + ' % Shopify'; }
      if (PRICE.shoptet[p.id] || p.id === 'premium') { cost += PRICE.shoptetGatewayAddon * 12 * (c.mode === 'domain' ? n : 1); label += ' + doplněk 200 Kč/měs.'; }
    }
    return { cost: cost, label: label, est: est };
  }

  function ctx() {
    return {
      G: GMV_STEPS[parseInt($('gmvIdx').value, 10)] || GMV_STEPS[3],
      mode: radio('mode', 'domain'), gw: radio('gw', 'native'),
      b2b: $('b2b').checked, incApps: $('incApps').checked, incMaint: $('incMaint').checked,
      eur: num('eur', 24.5), usd: num('usd', 21.5), rate: num('rate', 1600),
      cardShare: num('cardShare', 70) / 100, aov: Math.max(1, num('aov', 1800)), nonEEA: num('nonEEA', 3) / 100,
      extRate: num('extRate', 1) / 100, extIntl: num('extIntl', 2.5) / 100, extFix: num('extFix', 0),
      premBase: num('premBase', 12000), premExtra: num('premExtra', 6000), plusPct: Math.max(0.0001, num('plusPct', 0.25) / 100),
      ssWeb: num('ssWeb', 300), upExcl: num('upExcl', 10000)
    };
  }

  // --- vykreslení přes DOM API (žádné vkládání HTML řetězců) ---
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function badge(kind) { return el('span', kind === 'od' ? 'pvk-est pvk-min' : 'pvk-est', kind); }
  // Název platformy: barevný proužek typu (SaaS / self-hosted / startovací),
  // pro čtečky typ i textem.
  function platName(node, p) {
    node.classList.add('pvk-k-' + p.kind);
    node.appendChild(document.createTextNode(p.name));
    node.appendChild(el('span', 'pvk-vh', ' (' + KIND_LABEL[p.kind] + ')'));
    if (p.group) { node.appendChild(document.createTextNode(' ')); node.appendChild(el('span', 'pvk-tag', GROUP_LABEL[p.group])); }
    return node;
  }
  // Poznámky: první vidět hned, ostatní pod „více“. Stav rozbalení přežije překreslení.
  function nameCell(p, notes) {
    var td = platName(el('td', 'pvk-name'), p);
    if (!notes || !notes.length) return td;
    td.appendChild(el('small', 'pvk-note', notes[0]));
    if (notes.length > 1) {
      var d = el('details', 'pvk-notes');
      d.open = !!S.notes[p.id];
      d.appendChild(el('summary', null, 'více'));
      d.appendChild(el('small', 'pvk-note', notes.slice(1).join(' ')));
      d.addEventListener('toggle', function () { S.notes[p.id] = d.open; });
      td.appendChild(d);
    }
    return td;
  }
  function numCell(v, estKind, extraCls) {
    var td = el('td', 'pvk-r' + (extraCls ? ' ' + extraCls : ''), fmt(v));
    if (estKind && v > 0.5) { td.appendChild(document.createTextNode(' ')); td.appendChild(badge(estKind)); }
    return td;
  }
  function seg(cls, v, max) {
    var i = el('i', cls);
    i.style.width = (max > 0 ? Math.max(0, v / max * 100) : 0) + '%';
    return i;
  }

  // Filtr platforem: { shopify: true, shoptet: false, … }
  var platBoxes = root.querySelectorAll('.pvk-plat');
  function shownFams() {
    var on = {};
    Array.prototype.forEach.call(platBoxes, function (i) { on[i.value] = i.checked; });
    return on;
  }
  // Statický obsah: sloupce tabulek podle th[data-fam], řádky a karty s data-fam.
  // Sekci, ve které nezůstane žádný sloupec platformy, skryje celou.
  function filterStatic(on) {
    Array.prototype.forEach.call(root.querySelectorAll('.pvk-scroll table'), function (t) {
      if (!t.tHead) return;
      var cols = [];
      Array.prototype.forEach.call(t.tHead.rows[0].cells, function (th, i) {
        var f = th.getAttribute('data-fam'); if (f) cols.push({ i: i, show: !!on[f] });
      });
      if (!cols.length) return;
      Array.prototype.forEach.call(t.rows, function (r) {
        cols.forEach(function (col) { if (r.cells[col.i]) r.cells[col.i].hidden = !col.show; });
      });
      var sec = t.closest('section');
      if (sec) sec.hidden = !cols.some(function (col) { return col.show; });
    });
    Array.prototype.forEach.call(root.querySelectorAll('tr[data-fam], .pvk-card[data-fam]'), function (e) {
      e.hidden = !on[e.getAttribute('data-fam')];
    });
  }

  function render() {
    var c = ctx(), n = S.n;
    $('gmvVal').textContent = fmt(c.G);
    $('marketsVal').textContent = n + ' ' + plural(n);
    $('apiNote').hidden = !$('apiOnly').checked;

    var on = shownFams();
    filterStatic(on);
    var list = P.filter(function (p) { return on[p.fam] && (!$('apiOnly').checked || p.api); });
    var rows = list.map(function (p) { var r = calc(p, n, c); r.p = p; r.pay = payments(p, n, c); return r; });
    rows.sort(function (a, b) { return a.total - b.total; });
    $('sumLede').textContent = 'Obrat ' + fmt(c.G) + ' ročně, ' + n + ' ' + plural(n) + ', ' +
      (c.mode === 'domain' ? 'vlastní doména na zemi' : 'jazykové verze na 1 doméně') + ', ' +
      (c.gw === 'native' ? 'nativní brány' : 'externí brána') + '. Seřazeno od nejlevnějšího, bez poplatků za platby.';

    var top = $('top'); top.textContent = '';
    $('topWrap').hidden = !rows.length;
    rows.slice(0, 3).forEach(function (r) {
      var li = el('li', 'pvk-top-card pvk-k-' + r.p.kind);
      li.appendChild(platName(el('div', 'pvk-top-name'), r.p));
      var v = el('div', 'pvk-top-val', fmt(r.total) + ' / rok');
      if (r.anyEst) { v.appendChild(document.createTextNode(' ')); v.appendChild(badge('odhad')); }
      li.appendChild(v);
      li.appendChild(el('small', 'pvk-note', 'vč. plateb ' + fmt(r.total + r.pay.cost)));
      top.appendChild(li);
    });

    var max = Math.max.apply(null, rows.map(function (r) { return r.total; }).concat([1]));
    var bars = $('bars'); bars.textContent = '';
    rows.forEach(function (r) {
      var row = el('div', 'pvk-bar');
      var nm = platName(el('div', 'pvk-bar-name'), r.p);
      var track = el('div', 'pvk-track');
      track.setAttribute('role', 'img');
      track.setAttribute('aria-label', r.p.name + ': ' + fmt(r.total) + ' ročně');
      track.appendChild(seg('pvk-s-lic', r.lic, max));
      track.appendChild(seg('pvk-s-mkt', r.mkt, max));
      track.appendChild(seg('pvk-s-host', r.host, max));
      if (c.incApps) track.appendChild(seg('pvk-s-app', r.apps, max));
      if (c.incMaint) track.appendChild(seg('pvk-s-mnt', r.maint, max));
      var val = el('div', 'pvk-bar-val', fmt(r.total));
      if (r.anyEst) { val.appendChild(document.createTextNode(' ')); val.appendChild(badge('odhad')); }
      row.appendChild(nm); row.appendChild(track); row.appendChild(val);
      bars.appendChild(row);
    });

    var body = $('costBody'); body.textContent = '';
    rows.forEach(function (r, i) {
      var tr = el('tr');
      tr.hidden = !S.allCosts && i >= COST_ROWS;
      tr.appendChild(nameCell(r.p, r.notes));
      tr.appendChild(numCell(r.lic, r.est.lic));
      tr.appendChild(numCell(r.mkt, r.est.mkt));
      tr.appendChild(numCell(r.host, r.est.host));
      tr.appendChild(numCell(r.apps, null, c.incApps ? '' : 'pvk-off'));
      tr.appendChild(numCell(r.maint, null, c.incMaint ? '' : 'pvk-off'));
      tr.appendChild(numCell(r.total, r.anyEst ? 'odhad' : null, 'pvk-tot'));
      var pay = numCell(r.pay.cost, r.pay.est ? 'odhad' : null);
      pay.appendChild(el('small', 'pvk-note', r.pay.label));
      tr.appendChild(pay);
      tr.appendChild(numCell(r.total + r.pay.cost, (r.anyEst || r.pay.est) ? 'odhad' : null, 'pvk-tot'));
      body.appendChild(tr);
    });
    var more = $('costMore');
    more.hidden = rows.length <= COST_ROWS;
    more.setAttribute('aria-expanded', S.allCosts ? 'true' : 'false');
    more.textContent = S.allCosts ? 'Zobrazit jen prvních ' + COST_ROWS : 'Zobrazit vše (' + rows.length + ')';

    var NS = [1, 2, 3, 4, 5, 6, 8, 10];
    var head = $('mxHead'); head.textContent = '';
    head.appendChild(el('th', null, 'Platforma'));
    NS.forEach(function (k) { head.appendChild(el('th', 'pvk-r', k + ' ' + plural(k))); });
    var mx = $('mxBody'); mx.textContent = '';
    list.forEach(function (p) {
      var b = calc(p, 1, c), base = b.lic + b.mkt, tr = el('tr');
      tr.appendChild(nameCell(p));
      NS.forEach(function (k) {
        var r = calc(p, k, c), v = r.lic + r.mkt, d = v - base;
        var td = numCell(v, r.est.mkt || r.est.lic, k === n ? 'pvk-hl' : '');
        if (k > 1) td.appendChild(el('small', 'pvk-note', d > 1 ? '+' + fmt(d) : 'bez příplatku'));
        tr.appendChild(td);
      });
      mx.appendChild(tr);
    });
    // odkaz na sekci skrytou filtrem platforem z navigace zmizí
    Array.prototype.forEach.call(navLinks, function (a) {
      var sec = a.target.closest('section');
      a.link.hidden = !!(sec && sec.hidden);
    });
    updateScrollers();
    if (heads) updateHeads(true);
  }

  // Plovoucí navigace: zvýrazní sekci, ve které čtenář právě je.
  var nav = $('nav');
  var navLinks = Array.prototype.map.call(nav.querySelectorAll('a'), function (a) {
    return { link: a, target: document.getElementById(a.getAttribute('href').slice(1)) };
  }).filter(function (x) { return x.target; });
  function updateNav() {
    var edge = nav.getBoundingClientRect().bottom + 24, cur = null;
    navLinks.forEach(function (x) {
      if (!x.link.hidden && x.target.getBoundingClientRect().top <= edge) cur = x;
    });
    navLinks.forEach(function (x) {
      if (x === cur) x.link.setAttribute('aria-current', 'true'); else x.link.removeAttribute('aria-current');
    });
    if (cur && nav.scrollWidth > nav.clientWidth) { // na mobilu posune aktivní odkaz do lišty
      var l = cur.link.offsetLeft - nav.offsetLeft;
      if (l < nav.scrollLeft || l + cur.link.offsetWidth > nav.scrollLeft + nav.clientWidth) nav.scrollLeft = l - 16;
    }
  }
  var navTick = false;
  window.addEventListener('scroll', function () {
    if (navTick) return; navTick = true;
    window.requestAnimationFrame(function () { navTick = false; updateNav(); updateHeads(); });
  }, { passive: true });

  // Ukotvený první sloupec a lišta potřebují neprůhledné pozadí: převezmou
  // ho z nejbližšího předka, který nějaké má (šablona webu), jinak bílá.
  function syncBg() {
    root.style.removeProperty('--pvk-bg');
    for (var e = root.parentElement; e; e = e.parentElement) {
      var b = getComputedStyle(e).backgroundColor;
      if (b && b !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(b)) { root.style.setProperty('--pvk-bg', b); return; }
    }
  }
  syncBg();
  if (window.matchMedia) { // přepnutí světlého a tmavého režimu
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', syncBg);
  }

  // Tabulky širší než stránka: třídy pvk-more-l / pvk-more-r zapnou
  // v CSS zesvětlení okraje, za kterým je další obsah.
  var scrollers = root.querySelectorAll('.pvk-scroll');
  function updateScroll(box) {
    var max = box.scrollWidth - box.clientWidth, x = Math.abs(box.scrollLeft);
    box.classList.toggle('pvk-more-l', max > 1 && x > 1);
    box.classList.toggle('pvk-more-r', max > 1 && x < max - 1);
  }
  function updateScrollers() { Array.prototype.forEach.call(scrollers, updateScroll); }
  Array.prototype.forEach.call(scrollers, function (box) {
    box.addEventListener('scroll', function () { updateScroll(box); }, { passive: true });
  });
  window.addEventListener('resize', function () { updateScrollers(); updateHeads(true); });

  // Plovoucí záhlaví tabulek: tabulka je kvůli posunu do strany ve vlastním
  // posuvném kontejneru, takže thead nemůže být sticky vůči oknu. Když záhlaví
  // zajede pod navigaci, ukáže se jeho kopie přichycená pod lištou (fixed),
  // se stejnými šířkami sloupců a stejným posunem do strany.
  var heads = Array.prototype.map.call(scrollers, function (box) {
    var table = box.querySelector('table');
    var wrap = el('div', 'pvk-sh'), clone = el('table', table.className);
    wrap.setAttribute('aria-hidden', 'true');
    wrap.hidden = true;
    wrap.appendChild(clone);
    box.parentNode.insertBefore(wrap, box);
    box.addEventListener('scroll', function () { wrap.scrollLeft = box.scrollLeft; }, { passive: true });
    return { box: box, table: table, wrap: wrap, clone: clone, dirty: true };
  });
  function updateHeads(dirty) {
    var top = Math.max(0, nav.getBoundingClientRect().bottom);
    heads.forEach(function (h) {
      if (dirty) h.dirty = true;
      var th = h.table.tHead, tr = h.table.getBoundingClientRect(), hr = th.getBoundingClientRect();
      var show = h.box.offsetParent !== null && hr.top < top && tr.bottom > top + hr.height * 2;
      if (!show) { h.wrap.hidden = true; return; }
      if (h.wrap.hidden || h.dirty) { // nová kopie záhlaví (mohly se změnit sloupce)
        h.clone.textContent = '';
        h.clone.appendChild(th.cloneNode(true));
        Array.prototype.forEach.call(h.clone.querySelectorAll('[id]'), function (e) { e.removeAttribute('id'); });
        h.dirty = false;
      }
      var src = th.rows[0].cells, dst = h.clone.tHead.rows[0].cells;
      for (var i = 0; i < src.length; i++) {
        var w = src[i].getBoundingClientRect().width + 'px';
        dst[i].style.width = dst[i].style.minWidth = dst[i].style.maxWidth = w;
      }
      var br = h.box.getBoundingClientRect();
      h.clone.style.width = tr.width + 'px';
      h.wrap.style.top = top + 'px';
      h.wrap.style.left = br.left + 'px';
      h.wrap.style.width = h.box.clientWidth + 'px';
      h.wrap.hidden = false;
      h.wrap.scrollLeft = h.box.scrollLeft;
    });
  }

  $('costMore').addEventListener('click', function () { S.allCosts = !S.allCosts; render(); });
  $('platAll').addEventListener('click', function () {
    Array.prototype.forEach.call(platBoxes, function (i) { i.checked = true; });
    render();
  });
  $('filter').hidden = false; // bez JavaScriptu filtr nefunguje, proto je skrytý
  root.addEventListener('change', function (e) { if (e.target.type === 'radio') render(); });
  $('markets').addEventListener('input', function (e) { S.n = parseInt(e.target.value, 10) || 1; render(); });
  Array.prototype.forEach.call(root.querySelectorAll('input'), function (i) {
    if (i.id !== 'pvk-markets' && i.type !== 'radio') i.addEventListener('input', render);
  });
  S.n = parseInt($('markets').value, 10) || 2;
  render();
  updateNav();
})();
