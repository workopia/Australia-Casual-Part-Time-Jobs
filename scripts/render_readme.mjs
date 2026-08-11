/**
 * render_readme — self-contained README renderer for a Workopia CASUAL / part-time jobs repo.
 *
 * Same architecture as the graduate series (graduate_repo_template/scripts/render_readme.mjs):
 * consumes ONLY `.github/scripts/listings.json` — no DB, no registries, no deps — and runs in
 * two places:
 *   1. locally, invoked by `build_casual_country.mjs` right after it writes listings.json;
 *   2. on GitHub, via `.github/workflows/update-readme.yml` → `scripts/update_readme.mjs`.
 *
 * What differs from the graduate renderer (and why):
 *   - tiers are EMPLOYMENT FORMS (Casual / Part-time / Temp & Seasonal), not career stages.
 *     `employmentTypeNorm` is the authority (Mac B tagging line, casual precision 97.9%).
 *   - the table carries the three things a casual job-seeker actually decides on — hourly PAY,
 *     SHIFT pattern, and TICKET/certificate — instead of "key skills".
 *   - a pinned 🎄 Christmas & seasonal section, driven by `seasonal:"christmas-casual"`, so the
 *     repo name never has to carry a season that expires in January.
 *
 * listings.json shape:
 *   meta:       { repo, title, country_iso, country_name, adjective, segment, site_slug, lang,
 *                 as_of, window_days, total_site_jobs_str, country_live_total, generated_at }
 *   categories: [{ key, name, icon, l4slug }]                     (render order)
 *   listings:   [{ id, company_name, company_hi_slug, title, location, pay_display, shift,
 *                  ticket, no_experience, xmas, hot, date_posted, url, category, tier, active }]
 */

const W = 'https://workopia.io';
const TIER_ORDER = ['Casual', 'Part-time', 'Temp & Seasonal'];
const XMAS_CAP = 40;

// The series — cross-repo links. AU ships first; the rest turn on as they are built.
const SERIES = [
  ['AU', 'Australia', 'https://github.com/workopia/Australia-Casual-Part-Time-Jobs'],
];

const L10N = {
  en: {
    updatedDaily: 'Updated Daily',
    intro: 'Live **casual, part-time, temp and seasonal jobs** across {COUNTRY} — retail, hospitality, warehouse & delivery, care, events, cleaning and campus work. {N} roles below, refreshed daily — part of **{TOTAL} active job ads sourced straight from employer career pages, zero third-party scraping.**',
    maintainedBy: "Maintained by [**Workopia**]({URL}) — the world's 2nd largest job database, 94 countries, 2,517 cities.",
    reportIssue: '🙏 **Spotted a wrong or closed role? [Open an issue](../../issues/new/choose) — see the [contribution guide](./CONTRIBUTING.md).** 🙏',
    browseByCategory: 'Browse {N} roles by category',
    xmasTitle: '🎄 Christmas & seasonal hiring — open now',
    xmasBody: '{N} seasonal and Christmas casual roles are live right now. Australian retailers post the bulk of their Christmas casual roles from **September–October**, and the earliest "festive" and "seasonal" roles appear from **August** — this section fills as they open.',
    xmasEmpty: 'No Christmas or seasonal roles are live in this window yet. Australian retailers post the bulk of theirs from **September–October**; this section fills automatically as they open.',
    xmasPrep: '📖 **[How to get hired as a Christmas casual — employer-by-employer guides →]({URL})**',
    wantFullList: '🔎 Want the full, always-fresh list?',
    handPickedSlice: 'This page is a hand-picked slice. Search & filter all {TOTAL} live jobs by role, city, pay & date on Workopia.',
    tiredOfChecking: '🔔 Tired of checking every day?',
    getAlerted: 'Get alerted when new {ADJ} casual & part-time roles go live.',
    watchReleases: 'Or <b>Watch → Custom → Releases</b> on this repo for a weekly email digest of new roles.',
    legend: 'Legend',
    legendNew: 'Posted in the last 2 days',
    legendXmas: 'Christmas / seasonal role',
    legendNoExp: 'No experience required — training provided',
    legendPay: 'Hourly pay as disclosed by the employer — casual loading and penalty rates are set by the role\'s award, confirm on the job page',
    legendTicket: 'Certificate or check the ad asks for (RSA, RCG, White Card, WWCC, Food Safety, police check, driver licence…)',
    legendHot: 'Notable / high-growth employer',
    lookingElse: '**Looking for something else?**',
    otherCountries: 'Other countries',
    fullLiveList: 'The full live list → [all {ADJ} jobs on Workopia]({URL})',
    faqTitle: 'FAQs',
    browseAllCat: '🔎 **[Browse & filter all live {ADJ} {NAME} jobs on Workopia →]({URL})**',
    backToTop: '⬆️ Back to top',
    biggerPicture: '🌍 See the bigger picture',
    monitorAlt: 'Workopia — live global hiring monitor across 94 countries',
    exploreMonitor: '🌍 Explore the live global hiring monitor →',
    footer: '📅 Updated daily · Data © Workopia, sourced from employer career pages · Roles may close before this list refreshes — confirm on the job page. Browse {TOTAL} jobs free at [workopia.io]({URL}).',
    thCompany: 'Company', thRole: 'Role', thLocation: 'Location', thPay: 'Pay', thShift: 'Shift', thTicket: 'Ticket', thApply: 'Apply', thAge: 'Age',
    applyArrow: 'Apply →',
    seePay: 'See pay →',
    tierLabels: { Casual: 'Casual', 'Part-time': 'Part-time', 'Temp & Seasonal': 'Temp & seasonal' },
    tierNote: {
      Casual: '💡 Casual = no guaranteed hours, paid a casual loading instead of paid leave. Highest hourly rate, most flexible.',
      'Part-time': '💡 Part-time = set hours each week with pro-rata leave. Steadier than casual, lower hourly rate.',
      'Temp & Seasonal': '💡 Fixed-term, temp and seasonal contracts — a defined end date, often the fastest way in.',
    },
    browseAlt: 'Browse all {ADJ} casual jobs on Workopia',
    subscribeAlt: 'Subscribe for new-job alerts',
    ageToday: 'today', ageDay: 'd', ageWeek: 'w', ageMonth: 'mo',
  },
};

// AU-specific FAQ. Every claim either links to the primary source (Fair Work / Home Affairs)
// or is stated as what THIS repo's data shows — nothing asserted from memory.
const FAQ = {
  AU: (U) => [
    ['What does “casual” actually mean in Australia?',
      `A casual employee has **no guaranteed hours** and no paid annual or sick leave — in exchange they are paid a **casual loading** on top of the base rate, set by the relevant modern award or agreement. Part-time is the opposite trade: set hours and pro-rata leave, lower hourly rate. Check the rate for your role and award on [Fair Work's Pay Calculator](https://calculate.fairwork.gov.au/).`],
    ['When do Christmas casual jobs open?',
      `Most Australian retailers post the bulk of their Christmas casual roles in **September–October**, with the earliest "festive"/"seasonal" roles from **August**. This list is rebuilt daily, so the 🎄 section above shows what is genuinely open today rather than last year's timeline.`],
    ['Do I need experience?',
      `Often not. Roles flagged 🌱 say in the ad that **no experience is required** or that training is provided — common in supermarket nightfill, trolley collection, fast food, warehouse picking and event staffing.`],
    ['Which certificates will I be asked for?',
      `The **Ticket** column lifts it straight from the ad: **RSA** to serve alcohol, **RSA + RCG** for gaming in NSW, **White Card** for construction sites, **WWCC / Blue Card** for work with children, **Food Safety** for food handling, plus police checks and driver licences. Requirements and issuing bodies are state-based — confirm on the employer's ad before you pay for a course.`],
    ['I\'m on a student visa — how many hours can I work?',
      `Student visa holders have a **capped fortnightly work limit while their course is in session** (unlimited during scheduled course breaks). The cap has changed more than once — check the current figure on the [Department of Home Affairs work-conditions page](https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500/when-you-have-a-student-visa) before you commit to a roster.`],
    ['How is this list built?',
      `Every role comes from the **employer's own career page or ATS feed** — never scraped from another job board — and is classified with Workopia's employment-type tagging. Apply links open the role on Workopia, where you also get a match score and a tailored CV. See [CONTRIBUTING.md](./CONTRIBUTING.md).`],
  ],
};

const slugify = (s) => (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-') || 'job';
const anc = (icon, name) => (icon + ' ' + name).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, '').replace(/[^a-z0-9 ]/g, '').trim().replace(/ +/g, '-');
const role = (t) => (t.length > 58 ? t.slice(0, 55).replace(/[\s\-–,(]+$/, '') + '…' : t);
const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));

export function renderReadme(data, now = Date.now()) {
  const { meta, categories, listings } = data;
  const lang = meta.lang && L10N[meta.lang] ? meta.lang : 'en';
  const t = L10N[lang];
  const age = (d) => { if (!d) return ''; const days = Math.floor((now - new Date(d).getTime()) / 864e5); if (Number.isNaN(days)) return ''; if (days <= 0) return t.ageToday; if (days < 14) return days + t.ageDay; if (days < 60) return Math.round(days / 7) + t.ageWeek; return Math.round(days / 30) + t.ageMonth; };

  const U = 'utm_source=github&utm_medium=repo&utm_campaign=' + meta.repo.toLowerCase();
  const BJ = `${W}/browsejobs/${meta.segment}?${U}`;
  const active = listings.filter((r) => r.active !== false);
  const repoTotal = active.length;

  const byCatTier = new Map();
  for (const r of active) {
    const k = r.category + '|' + r.tier;
    if (!byCatTier.has(k)) byCatTier.set(k, []);
    byCatTier.get(k).push(r);
  }
  const tiersOf = (d) => Object.fromEntries(TIER_ORDER.map((tk) => [tk, byCatTier.get(d.key + '|' + tk) || []]));

  const flags = (r) => { let f = ''; if (r.date_posted && (now - new Date(r.date_posted).getTime()) <= 2 * 864e5) f += ' 🆕'; if (r.xmas) f += ' 🎄'; if (r.no_experience) f += ' 🌱'; if (r.hot) f += ' 🔥'; return f; };

  // Fixed column geometry across every table (GitHub keeps width attrs) — without them each
  // table auto-sizes to its own content and the page reads as a pile of unrelated grids.
  const TH = `<thead><tr><th width="17%">${t.thCompany}</th><th width="27%">${t.thRole}</th><th width="12%">${t.thLocation}</th><th width="12%">${t.thPay}</th><th width="11%">${t.thShift}</th><th width="11%">${t.thTicket}</th><th width="6%">${t.thApply}</th><th width="4%">${t.thAge}</th></tr></thead>`;
  function table(rows) {
    let last = '', b = '';
    for (const r of rows) {
      const nm = r.company_name;
      const co = nm === last ? '↳' : (r.company_hi_slug ? `<strong><a href="${W}/hi/companies/${r.company_hi_slug}?${U}">${nm}</a></strong>` : `<strong>${nm}</strong>`);
      if (nm !== last) last = nm;
      const payCell = r.pay_display
        ? `<a href="${r.url}?${U}">${r.pay_display}</a>`
        : `<a href="${r.url}?${U}">${t.seePay}</a>`;
      b += `<tr><td>${co}</td><td>${role(r.title)}${flags(r)}</td><td>${r.location}</td><td>${payCell}</td><td>${r.shift || '—'}</td><td>${r.ticket || '—'}</td><td><a href="${r.url}?${U}">${t.applyArrow}</a></td><td>${age(r.date_posted)}</td></tr>\n`;
    }
    return `<table>\n${TH}\n<tbody>\n${b}</tbody>\n</table>`;
  }

  const browse = categories.map((d) => {
    const tt = tiersOf(d);
    const cc = TIER_ORDER.reduce((n, tk) => n + tt[tk].length, 0); if (!cc) return null;
    const ti = TIER_ORDER.filter((tk) => tt[tk].length).map((tk) => `${t.tierLabels[tk]} ${tt[tk].length}`).join(' · ');
    return `- ${d.icon} **[${d.name}](#${anc(d.icon, d.name)})** (${cc}) — ${ti}`;
  }).filter(Boolean).join('\n');

  // 🎄 pinned section — the same rows, surfaced by season instead of by category. Sorted newest
  // first and capped: this is the shop window, the category tables remain the full list.
  // `data.seasonal` is selected by the builder outside the category caps (a chain posting 30
  // store-level Christmas ads must not be trimmed away here). Older payloads without it fall
  // back to the flagged rows inside `listings`.
  const seasonalRows = Array.isArray(data.seasonal) && data.seasonal.length
    ? data.seasonal
    : active.filter((r) => r.xmas).sort((a, b) => new Date(b.date_posted || 0) - new Date(a.date_posted || 0));
  const xmasRows = seasonalRows.slice(0, XMAS_CAP);
  const xmasCount = meta.seasonal_live_roles || seasonalRows.length;
  const xmasBlock = xmasCount
    ? `\n## ${t.xmasTitle}\n\n${fill(t.xmasBody, { N: xmasCount })}\n\n${table(xmasRows)}\n\n${fill(t.xmasPrep, { URL: `${W}/resources/interview-tips/christmas-casuals?${U}` })}\n`
    : `\n## ${t.xmasTitle}\n\n${t.xmasEmpty}\n\n${fill(t.xmasPrep, { URL: `${W}/resources/interview-tips/christmas-casuals?${U}` })}\n`;

  function renderCat(d) {
    const tt = tiersOf(d);
    const cc = TIER_ORDER.reduce((n, tk) => n + tt[tk].length, 0); if (!cc) return '';
    let o = `\n## ${d.icon} ${d.name}\n`;
    for (const tk of TIER_ORDER) {
      const r = tt[tk]; if (!r.length) continue;
      o += `\n### ${t.tierLabels[tk]} (${r.length})\n\n> ${t.tierNote[tk]}\n\n${table(r)}\n`;
    }
    const catUrl = d.l4slug ? `${W}/browsejobs/positions/${meta.segment}/${d.l4slug}?${U}` : BJ;
    o += `\n${fill(t.browseAllCat, { ADJ: meta.adjective, NAME: d.name, URL: catUrl })}\n\n<sub>[${t.backToTop}](#${slugify(meta.title)})</sub>\n`;
    return o;
  }

  const others = SERIES.filter(([iso]) => iso !== meta.country_iso).map(([, label, url]) => `[${label}](${url})`).join(' · ');
  const faq = (FAQ[meta.country_iso] || FAQ.AU)(U).map(([q, a]) => `**${q}**\n${a}\n`).join('\n');

  const md = `# ${meta.title} — ${t.updatedDaily}

${fill(t.intro, { COUNTRY: meta.country_name, N: repoTotal, TOTAL: meta.total_site_jobs_str })}

${fill(t.maintainedBy, { URL: BJ })}

${t.reportIssue}

---

### ${fill(t.browseByCategory, { N: repoTotal })}

${browse}

---
${xmasBlock}
---

<div align="center">
  <h3>${t.wantFullList}</h3>
  <a href="${BJ}"><img src="./static/btn-browse.svg" alt="${fill(t.browseAlt, { ADJ: meta.adjective })}" width="460"></a>
  <p><sub><i>${fill(t.handPickedSlice, { TOTAL: meta.total_site_jobs_str })}</i></sub></p>
</div>

---

<div align="center">
  <h3>${t.tiredOfChecking}</h3>
  <a href="${BJ}"><img src="./static/btn-subscribe.svg" alt="${t.subscribeAlt}" width="360"></a>
  <p><sub><i>${fill(t.getAlerted, { ADJ: meta.adjective })}</i></sub></p>
  <p><sub>${t.watchReleases}</sub></p>
</div>

---

## ${t.legend}
- 🆕 ${t.legendNew}
- 🎄 ${t.legendXmas}
- 🌱 ${t.legendNoExp}
- 💵 ${t.legendPay}
- 🎫 ${t.legendTicket}
- 🔥 ${t.legendHot}

> ${t.lookingElse}
${others ? `> 🌍 ${t.otherCountries} → ${others}\n` : ''}> 🔎 ${fill(t.fullLiveList, { ADJ: meta.adjective, URL: BJ })}

## ${t.faqTitle}

${faq}
---
${categories.map(renderCat).join('\n')}

---

## ${t.biggerPicture}
<div align="center">
  <a href="${W}/hi/monitor?${U}"><img src="./static/workopia-banner.png" alt="${t.monitorAlt}" width="80%"></a>
  <p><b><a href="${W}/hi/monitor?${U}">${t.exploreMonitor}</a></b></p>
</div>

<sub>${fill(t.footer, { TOTAL: meta.total_site_jobs_str, URL: `${W}/?${U}` })}</sub>
`;
  return { md, repoTotal, xmasCount };
}

export function renderPreview(md) {
  const safe = md.replace(/<\/script>/g, '<\\/script>');
  return `<!doctype html><meta charset=utf-8><link rel=stylesheet href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.1/github-markdown.min.css"><script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script><style>body{box-sizing:border-box;max-width:1012px;margin:0 auto;padding:45px}img{max-width:100%}table{display:table;width:100%}</style><article class=markdown-body id=o></article><script id=md type=text/plain>${safe}</script><script>o.innerHTML=marked.parse(md.textContent)</script>`;
}
