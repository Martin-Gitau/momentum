const XP_PER_TASK = 10;
const XP_PER_LEVEL = 100;
const STREAK_BONUSES = [[3,10],[7,25],[30,100]];

let state = loadState();
checkDailyReset();
render();

document.getElementById('task-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') addTask();
});

document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-GB', {weekday:'long', day:'numeric', month:'long', year:'numeric'});

let priority = 'none';
function cyclePriority() {
  const cycle = ['none','low','med','high'];
  priority = cycle[(cycle.indexOf(priority)+1)%cycle.length];
  const btn = document.getElementById('priority-btn');
  const labels = {none:'— none', low:'▲ low', med:'▲ med', high:'▲ high'};
  btn.textContent = labels[priority];
  btn.className = 'priority-btn ' + (priority !== 'none' ? priority : '');
}

function addTask() {
  const input = document.getElementById('task-input');
  const text = input.value.trim();
  if (!text) return;
  state.tasks.push({ id: Date.now(), text, priority, done: false, createdAt: Date.now() });
  input.value = '';
  priority = 'none';
  const btn = document.getElementById('priority-btn');
  btn.textContent = '— none';
  btn.className = 'priority-btn';
  saveState();
  render();
}

function completeTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task || task.done) return;
  task.done = true;
  task.completedAt = Date.now();

  const today = dateKey(new Date());
  if (!state.completedDays.includes(today)) {
    state.completedDays.push(today);
    updateStreak();
  }

  let bonus = 0;
  STREAK_BONUSES.forEach(([days, xp]) => {
    if (state.streak === days) bonus = xp;
  });

  state.xp += XP_PER_TASK + bonus;
  state.totalCompleted = (state.totalCompleted || 0) + 1;

  const msg = bonus > 0
    ? `+${XP_PER_TASK} XP  +${bonus} streak bonus!`
    : `+${XP_PER_TASK} XP`;
  showToast(msg);
  saveState();
  render();
}

function deleteTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveState();
  render();
}

function updateStreak() {
  const today = dateKey(new Date());
  const yesterday = dateKey(new Date(Date.now() - 86400000));
  if (state.lastStreakDay === yesterday || state.lastStreakDay === today) {
    if (state.lastStreakDay !== today) state.streak++;
  } else {
    state.streak = 1;
  }
  state.lastStreakDay = today;
  state.longestStreak = Math.max(state.longestStreak || 0, state.streak);
}

function checkDailyReset() {
  const today = dateKey(new Date());
  if (state.lastOpenDay && state.lastOpenDay !== today) {
    if (!state.completedDays.includes(state.lastOpenDay) && state.streak > 0) {
      const yesterday = dateKey(new Date(Date.now() - 86400000));
      if (state.lastOpenDay !== yesterday) {
        state.streak = 0;
      }
    }
  }
  state.lastOpenDay = today;
  saveState();
}

let showCompleted = false;
function toggleCompleted() {
  showCompleted = !showCompleted;
  render();
}

function render() {
  const active = state.tasks.filter(t => !t.done);
  const completed = state.tasks.filter(t => t.done);
  const todayDone = completed.filter(t => dateKey(new Date(t.completedAt)) === dateKey(new Date())).length;

  document.getElementById('stat-today').textContent = todayDone;
  document.getElementById('stat-streak').textContent = state.streak;
  document.getElementById('stat-best').textContent = state.longestStreak || 0;

  const streakWrap = document.getElementById('streak-badge-wrap');
  if (state.streak >= 3) {
    const label = state.streak >= 30 ? '30d bonus' : state.streak >= 7 ? '7d bonus' : '3d bonus';
    streakWrap.innerHTML = `<div class="streak-badge"><span class="flame">&#x25b2;</span> ${label}</div>`;
  } else {
    streakWrap.innerHTML = `<div class="stat-sub">days</div>`;
  }

  const level = Math.floor(state.xp / XP_PER_LEVEL) + 1;
  const xpInLevel = state.xp % XP_PER_LEVEL;
  const pct = (xpInLevel / XP_PER_LEVEL) * 100;
  document.getElementById('xp-level-label').textContent = 'Level ' + level;
  document.getElementById('xp-bar').style.width = pct + '%';
  document.getElementById('xp-current-pts').textContent = state.xp + ' XP total';
  document.getElementById('xp-next-pts').textContent = 'next: ' + (level * XP_PER_LEVEL) + ' XP';

  const al = document.getElementById('active-list');
  document.getElementById('active-count').textContent = active.length;
  al.innerHTML = active.length === 0
    ? '<div class="empty-state">no active tasks — add one above</div>'
    : active.map(t => taskHTML(t)).join('');

  const cl = document.getElementById('completed-list');
  const cs = document.getElementById('completed-section');
  const sw = document.getElementById('show-completed-wrap');
  if (completed.length > 0) {
    if (showCompleted) {
      cs.style.display = 'block';
      sw.style.display = 'none';
      cl.innerHTML = completed.map(t => taskHTML(t)).join('');
    } else {
      cs.style.display = 'none';
      sw.style.display = 'block';
    }
  } else {
    cs.style.display = 'none';
    sw.style.display = 'none';
  }
}

function taskHTML(t) {
  const pd = t.priority !== 'none' ? `<div class="priority-dot ${t.priority}"></div>` : '';
  return `<div class="task-item ${t.done ? 'done' : ''}" id="task-${t.id}">
    <button class="check-btn" onclick="completeTask(${t.id})" title="complete">
      <div class="check-mark"></div>
    </button>
    ${pd}
    <span class="task-text">${escHtml(t.text)}</span>
    <button class="del-btn" onclick="deleteTask(${t.id})" title="delete">&#xd7;</button>
  </div>`;
}

let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function dateKey(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function loadState() {
  try {
    const s = localStorage.getItem('momentum_v1');
    if (s) return JSON.parse(s);
  } catch(e) {}
  return { tasks: [], xp: 0, streak: 0, longestStreak: 0, lastStreakDay: null, lastOpenDay: null, completedDays: [], totalCompleted: 0 };
}

function saveState() {
  try { localStorage.setItem('momentum_v1', JSON.stringify(state)); } catch(e) {}
}