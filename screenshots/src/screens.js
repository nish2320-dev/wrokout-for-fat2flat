/* -------------------------------------------------------------
   Fat2Flat Fitness — App Store screenshot content.
   Each screen is authored at iPhone logical size (393 x 852).
   ------------------------------------------------------------- */

const ICON = {
  home:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.2 12 3l9 7.2V20a1 1 0 0 1-1 1h-4.5v-6h-7v6H4a1 1 0 0 1-1-1z"/></svg>',
  dumbbell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 7.5v9M3.5 9.5v5M17.5 7.5v9M20.5 9.5v5M6.5 12h11"/></svg>',
  meal:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v7a2 2 0 0 0 4 0V3M8 10v11M17.5 3c-1.4 1.2-2 3-2 5.5 0 1.6.7 2.5 2 2.5V3zM17.5 11v10"/></svg>',
  chart:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V11M10 20V5M16 20v-6M22 20H2"/></svg>',
  user:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/></svg>',
  bolt:   '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 2 4 13.4h6L9.8 22 20 10.4h-6.4z"/></svg>',
  plus:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  clock:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5.3l3.4 2"/></svg>',
  check:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5 9.5 18 20 6.5"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
  chev:   '<svg viewBox="0 0 8 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 1.5 6.5 7l-5 5.5"/></svg>',
  flame:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2c.6 3.2-1 4.6-2.6 6C8.4 9.7 7 11.3 7 14a5.7 5.7 0 0 0 11.4 0c0-3-1.6-4.7-2.9-6.4C14.4 6.2 13.6 4.4 13 2z"/><path d="M12 13c.3 1.5-1.6 2-1.6 3.6a1.9 1.9 0 0 0 3.8 0c0-1.4-1.4-2-2.2-3.6z" fill="#fff" opacity=".55"/></svg>',
  trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 5.5H4.5V7A3.5 3.5 0 0 0 8 10.5M17 5.5h2.5V7A3.5 3.5 0 0 1 16 10.5M9.5 20h5M12 14v6"/></svg>',
  scale:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M9 9.5 12 7l3 2.5M8.5 16h7"/></svg>',
  play:   '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5 19 12 7 19.5z"/></svg>',
  timerI: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2.5h5M12 5.5a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15zM12 10v3.5l2.4 1.6"/></svg>'
};

const statusBar = () => `
  <div class="status">
    <div class="status-time">9:41</div>
    <div class="status-icons">
      <svg width="18" height="12" viewBox="0 0 18 12" fill="#0E1013"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
      <svg width="17" height="12" viewBox="0 0 17 12" fill="#0E1013"><path d="M8.5 11.6 6.2 9.1a3.4 3.4 0 0 1 4.6 0zM8.5 6.1c-1.6 0-3.1.6-4.2 1.7L2.5 6.1a8.6 8.6 0 0 1 12 0l-1.8 1.7a5.9 5.9 0 0 0-4.2-1.7zM8.5 2.4c-2.6 0-5 1-6.8 2.7L0 3.3a12.2 12.2 0 0 1 17 0l-1.7 1.8a9.6 9.6 0 0 0-6.8-2.7z"/></svg>
      <svg width="26" height="12" viewBox="0 0 26 12" fill="none"><rect x=".6" y=".6" width="21" height="10.8" rx="3.2" stroke="#0E1013" stroke-opacity=".38" stroke-width="1.1"/><rect x="2.2" y="2.2" width="15.5" height="7.6" rx="2" fill="#0E1013"/><path d="M23.4 4.2c1 .3 1.6 1 1.6 1.8s-.6 1.5-1.6 1.8z" fill="#0E1013" fill-opacity=".38"/></svg>
    </div>
  </div>`;

const tabBar = (active) => {
  const items = [
    ['Home', ICON.home], ['Workouts', ICON.dumbbell], ['Meals', ICON.meal],
    ['Progress', ICON.chart], ['Profile', ICON.user]
  ];
  return `<div class="tabs">${items.map(([l, i], n) =>
    `<div class="tab${n === active ? ' on' : ''}">${i}<span>${l}</span></div>`
  ).join('')}</div><div class="home-bar"></div>`;
};

const screen = (active, body, cls = '') =>
  `${statusBar()}<div class="body ${cls}">${body}</div>${tabBar(active)}`;

/* ---------------------------------------------------------------- */

const ring = (pct, text) => `
  <div class="ring">
    <svg viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="16.5" fill="none" stroke="#EEF0F3" stroke-width="6"/>
      <circle cx="20" cy="20" r="16.5" fill="none" stroke="#E1251B" stroke-width="6"
              stroke-linecap="round" stroke-dasharray="${(2 * Math.PI * 16.5).toFixed(1)}"
              stroke-dashoffset="${(2 * Math.PI * 16.5 * (1 - pct)).toFixed(1)}"/>
    </svg>
    <div class="ring-val">${text}</div>
  </div>`;

/* ---------------- 1. Home ---------------- */

const HOME = screen(0, `
  <div class="row" style="padding:2px 2px 2px">
    <div class="col">
      <div class="hero-greet">Hey Alex 👋</div>
      <div class="label" style="margin-top:3px">Push day · let's get after it.</div>
    </div>
    <div class="pill sm" style="background:var(--red-wash);color:var(--red);gap:4px">
      <span style="width:12px;height:12px;display:inline-block">${ICON.flame}</span>5 day streak
    </div>
  </div>

  <div class="spread">
    <div class="card tight">
      <div class="row">
        <div class="col">
          <div class="label">Calories</div>
          <div class="metric sm" style="margin-top:3px">420<span> / 2000</span></div>
        </div>
        ${ring(0.21, '21%')}
      </div>
    </div>
    <div class="card tight">
      <div class="row">
        <div class="col">
          <div class="label">Protein</div>
          <div class="metric sm" style="margin-top:3px">38<span> / 160g</span></div>
        </div>
        ${ring(0.24, '24%')}
      </div>
    </div>
  </div>

  <div class="card">
    <div class="row" style="margin-bottom:11px">
      <div class="card-title">This week</div>
      <div class="label">4 of 5 done</div>
    </div>
    <div class="week">
      ${[['M', 'done'], ['T', 'done'], ['W', 'done'], ['T', 'done'], ['F', 'today'], ['S', ''], ['S', '']]
        .map(([d, s]) => `
        <div class="day">
          <div class="day-dot ${s}">${s === 'done' ? ICON.check : ''}</div>
          <div class="day-l">${d}</div>
        </div>`).join('')}
    </div>
  </div>

  <div class="col" style="gap:9px">
    <div class="eyebrow" style="padding-left:2px">Quick start</div>
    <div class="quick">
      <div class="quick-item primary">${ICON.bolt}Generate workout</div>
      <div class="quick-item">${ICON.plus}Log a workout</div>
      <div class="quick-item">${ICON.meal}Log a meal</div>
      <div class="quick-item">${ICON.timerI}Rest timer</div>
    </div>
  </div>

  <div class="card flush">
    <div class="row" style="padding:0 14px 10px">
      <div class="card-title">Recent workouts</div>
      <div class="label" style="color:var(--red)">See all</div>
    </div>
    <div style="border-top:1px solid var(--line)"></div>
    ${[['Push Day', 'Aug 27 · 15 sets · 8,450 lb', '52 min'],
       ['Leg Day', 'Aug 25 · 18 sets · 12,300 lb', '61 min'],
       ['Pull Day', 'Aug 24 · 14 sets · 9,120 lb', '48 min'],
       ['Upper Body', 'Aug 22 · 16 sets · 9,880 lb', '55 min']]
      .map(([n, m, t]) => `
      <div class="list-row">
        <div class="thumb">${ICON.dumbbell}</div>
        <div class="col grow">
          <div class="list-name">${n}</div>
          <div class="list-meta">${m}</div>
        </div>
        <div class="tag grey plain">${t}</div>
        <div class="chev">${ICON.chev}</div>
      </div>`).join('')}
  </div>
`);

/* ---------------- 2. Generator ---------------- */

const chipGroup = (title, items) => `
  <div class="col" style="gap:8px">
    <div class="eyebrow" style="padding-left:2px">${title}</div>
    <div class="chips">${items.map(([l, on]) =>
      `<div class="pill${on ? ' on' : ''}">${l}</div>`).join('')}</div>
  </div>`;

const GENERATE = screen(1, `
  ${chipGroup('Muscle group', [['Full Body', 1], ['Upper Body', 0], ['Legs', 0], ['Core', 0]])}
  ${chipGroup('Equipment', [['Dumbbells', 1], ['Barbell', 1], ['Bodyweight', 0]])}
  ${chipGroup('Goal', [['Build Muscle', 1], ['Lose Fat', 0], ['Endurance', 0]])}
  ${chipGroup('Session length', [['30 min', 0], ['45 min', 1], ['60 min', 0], ['75 min', 0]])}

  <div class="btn" style="margin-top:2px">${ICON.bolt}Generate workout</div>

  <div class="card flush">
    <div class="row" style="padding:0 14px 10px">
      <div class="col">
        <div class="card-title">Today's plan</div>
        <div class="list-meta" style="margin-top:2px">6 exercises · 22 sets · ~45 min</div>
      </div>
      <div class="tag">Auto-built</div>
    </div>
    <div style="border-top:1px solid var(--line)"></div>
    ${[['Barbell Bench Press', 'Chest · Barbell', '4 × 8'],
       ['Incline Dumbbell Press', 'Chest · Dumbbells', '3 × 10'],
       ['Barbell Row', 'Back · Barbell', '4 × 8'],
       ['Overhead Press', 'Shoulders · Barbell', '3 × 10'],
       ['Lat Pulldown', 'Back · Machine', '3 × 12'],
       ['Barbell Curl', 'Arms · Barbell', '3 × 12']]
      .map(([n, m, s], i) => `
      <div class="list-row" style="padding-top:9px;padding-bottom:9px">
        <div class="thumb" style="width:26px;height:26px;border-radius:9px;font-size:12px;font-weight:800;color:var(--muted)">${i + 1}</div>
        <div class="col grow">
          <div class="list-name">${n}</div>
          <div class="list-meta">${m}</div>
        </div>
        <div class="pr-val" style="color:var(--red)">${s}</div>
      </div>`).join('')}
  </div>
`);

/* ---------------- 3. Logging ---------------- */

const setRow = (n, reps, wt, state) => `
  <div class="set-row">
    <div style="color:var(--muted)">${n}</div>
    <div>${reps}</div>
    <div>${wt}</div>
    <div class="done-b${state ? '' : ' idle'}">${state ? ICON.check + 'Logged' : 'Log'}</div>
  </div>`;

const LOG = screen(1, `
  <div class="row" style="padding:2px 2px">
    <div class="col">
      <div class="hero-greet" style="font-size:22px">Push Day</div>
      <div class="label" style="margin-top:3px">9 of 15 sets · 6,240 lb moved</div>
    </div>
    <div class="pill sm" style="background:#0E1013;color:#fff">24:18</div>
  </div>

  <div class="timer-bar">
    <div class="col" style="gap:2px">
      <div class="label">Rest</div>
      <div class="timer-val">0:42</div>
    </div>
    <div class="timer-track"><i style="width:58%"></i></div>
    <div class="pill sm" style="background:rgba(255,255,255,.14);color:#fff">+30s</div>
  </div>

  <div class="card flush">
    <div class="row" style="padding:0 14px 12px">
      <div class="col">
        <div class="card-title">Barbell Squat</div>
        <div class="list-meta" style="margin-top:2px">Last time: 3 × 8 @ 185 lb</div>
      </div>
      <div class="tag">New PR</div>
    </div>
    <div class="set-row head"><div>Set</div><div>Reps</div><div>Weight</div><div></div></div>
    ${setRow(1, 8, '185 lb', 1)}
    ${setRow(2, 8, '185 lb', 1)}
    ${setRow(3, 6, '195 lb', 1)}
    ${setRow(4, 6, '195 lb', 0)}
  </div>

  <div class="card flush">
    <div class="row" style="padding:0 14px 12px">
      <div class="col">
        <div class="card-title">Romanian Deadlift</div>
        <div class="list-meta" style="margin-top:2px">Last time: 3 × 10 @ 135 lb</div>
      </div>
      <div class="tag grey">Up next</div>
    </div>
    <div class="set-row head"><div>Set</div><div>Reps</div><div>Weight</div><div></div></div>
    ${setRow(1, 10, '135 lb', 0)}
    ${setRow(2, 10, '135 lb', 0)}
    ${setRow(3, 10, '135 lb', 0)}
    <div class="list-row" style="border-top:1px solid var(--line-2);color:var(--red);gap:7px;padding-top:12px">
      <span style="width:15px;height:15px;display:inline-block">${ICON.plus}</span>
      <span class="list-name" style="color:var(--red)">Add exercise</span>
    </div>
  </div>

  <div class="btn" style="margin-bottom:2px">Finish workout</div>
`);

/* ---------------- 4. Library ---------------- */

const exRow = (name, meta, tag) => `
  <div class="list-row">
    <div class="thumb">${ICON.dumbbell}</div>
    <div class="col grow">
      <div class="list-name">${name}</div>
      <div class="list-meta">${meta}</div>
    </div>
    ${tag ? `<div class="tag">${tag}</div>` : ''}
    <div class="chev">${ICON.chev}</div>
  </div>`;

const LIBRARY = screen(1, `
  <div class="search">${ICON.search}Search 300+ exercises</div>
  <div class="chips" style="flex-wrap:nowrap;overflow:hidden">
    ${[['All', 1], ['Chest', 0], ['Back', 0], ['Legs', 0], ['Shoulders', 0], ['Arms', 0]]
      .map(([l, on]) => `<div class="pill sm${on ? ' on' : ''}">${l}</div>`).join('')}
  </div>

  <div class="col" style="gap:9px">
    <div class="section-h"><div class="eyebrow">Chest</div><div class="sub">24 exercises</div></div>
    <div class="card flush">
      ${exRow('Barbell Bench Press', 'Barbell · Compound', 'Guide')}
      ${exRow('Incline Dumbbell Press', 'Dumbbells · Compound', 'Guide')}
      ${exRow('Cable Fly', 'Cables · Isolation', 'Guide')}
    </div>

    <div class="section-h"><div class="eyebrow">Back</div><div class="sub">31 exercises</div></div>
    <div class="card flush">
      ${exRow('Pull-Up', 'Bodyweight · Compound', 'Guide')}
      ${exRow('Barbell Row', 'Barbell · Compound', 'Guide')}
      ${exRow('Lat Pulldown', 'Machine · Compound', 'Guide')}
    </div>

    <div class="section-h"><div class="eyebrow">Legs</div><div class="sub">28 exercises</div></div>
    <div class="card flush">
      ${exRow('Barbell Squat', 'Barbell · Compound', 'Guide')}
      ${exRow('Romanian Deadlift', 'Barbell · Compound', 'Guide')}
      ${exRow('Leg Press', 'Machine · Compound', 'Guide')}
    </div>
  </div>
`, 'fade');

/* ---------------- 5. Progress ---------------- */

const BARS = [52, 61, 55, 74, 68, 92, 84, 40];
const DAYS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'];

const PROGRESS = screen(3, `
  <div class="spread">
    ${[['Workouts', '24', 'this quarter'], ['Volume', '128k', 'lb lifted'], ['Streak', '5d', 'personal best']]
      .map(([l, v, s]) => `
      <div class="card tight">
        <div class="label">${l}</div>
        <div class="metric sm" style="margin:3px 0 1px">${v}</div>
        <div class="sub">${s}</div>
      </div>`).join('')}
  </div>

  <div class="card">
    <div class="row" style="margin-bottom:12px">
      <div class="col">
        <div class="card-title">Weekly volume</div>
        <div class="list-meta" style="margin-top:2px">Up 18% vs. last month</div>
      </div>
      <div class="tag green">+18%</div>
    </div>
    <div class="chart">
      ${BARS.map((h, i) => `
        <div class="chart-col">
          <div class="chart-bar${i === BARS.length - 1 ? ' dim' : ''}" style="height:${h}%"></div>
          <div class="chart-x">${DAYS[i]}</div>
        </div>`).join('')}
    </div>
  </div>

  <div class="card">
    <div class="row" style="margin-bottom:8px">
      <div class="col">
        <div class="card-title">Body weight</div>
        <div class="list-meta" style="margin-top:2px">198 lb · down 12 lb in 90 days</div>
      </div>
      <div class="tag green">−12 lb</div>
    </div>
    <svg class="trend" viewBox="0 0 320 84" preserveAspectRatio="none">
      <defs>
        <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#E1251B" stop-opacity=".20"/>
          <stop offset="100%" stop-color="#E1251B" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="M0 14 L46 20 L91 17 L137 32 L183 41 L229 39 L274 55 L320 62 L320 84 L0 84 Z" fill="url(#tg)"/>
      <path d="M0 14 L46 20 L91 17 L137 32 L183 41 L229 39 L274 55 L320 62"
            fill="none" stroke="#E1251B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="320" cy="62" r="4.5" fill="#E1251B" stroke="#fff" stroke-width="2.5"/>
    </svg>
    <div class="trend-x"><span>90 days ago</span><span>60d</span><span>30d</span><span>Today</span></div>
  </div>

  <div class="card flush">
    <div class="row" style="padding:0 14px 10px">
      <div class="card-title">Personal records</div>
      <div class="label" style="color:var(--red)">See all</div>
    </div>
    <div style="border-top:1px solid var(--line)"></div>
    ${[['Barbell Bench Press', 'Aug 27', '225 lb', '+10'],
       ['Barbell Squat', 'Aug 25', '315 lb', '+15'],
       ['Deadlift', 'Aug 22', '365 lb', '+20']]
      .map(([n, d, v, up]) => `
      <div class="pr-row">
        <div class="thumb" style="color:var(--red)">${ICON.trophy}</div>
        <div class="col grow">
          <div class="list-name">${n}</div>
          <div class="list-meta">${d}</div>
        </div>
        <div class="col" style="align-items:flex-end;gap:3px">
          <div class="pr-val">${v}</div>
          <div class="tag green" style="height:17px;font-size:9px">${up} lb</div>
        </div>
      </div>`).join('')}
  </div>
`);

/* ---------------- slides ---------------- */

const SLIDES = [
  { id: 'home',     headline: 'Your fitness journey,<br><em>tracked.</em>',
    sub: 'Workouts, meals and progress in one place.',            markup: HOME },
  { id: 'generate', headline: 'A workout built<br><em>just for you.</em>',
    sub: 'Pick your gear and goal — get a plan in seconds.',      markup: GENERATE },
  { id: 'log',      headline: 'Log every set<br><em>in seconds.</em>',
    sub: 'Reps, weight and a rest timer, without leaving the rack.', markup: LOG },
  { id: 'library',  headline: 'Master every move<br><em>with built-in guides.</em>',
    sub: '300+ exercises with form cues and demos.',              markup: LIBRARY },
  { id: 'progress', headline: 'Watch your progress<br><em>add up.</em>',
    sub: 'Volume, body weight and PRs, tracked automatically.',   markup: PROGRESS }
];
