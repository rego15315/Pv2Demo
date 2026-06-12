/* ==================== Data Storage Layer ==================== */
const Storage = {
  prefix: 'dashboard_',
  
  get(key, fallback = null) {
    try {
      const item = localStorage.getItem(this.prefix + key);
      return item ? JSON.parse(item) : fallback;
    } catch { return fallback; }
  },
  
  set(key, value) {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (e) { console.warn('Storage write failed:', e); }
  },
  
  remove(key) {
    try { localStorage.removeItem(this.prefix + key); } catch {}
  }
};

/* ==================== Utility Functions ==================== */
const Utils = {
  pad(n) { return n < 10 ? '0' + n : n; },
  
  formatDate(d) {
    const wd = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return `${d.getFullYear()}年${Utils.pad(d.getMonth()+1)}月${Utils.pad(d.getDate())}日 ${wd[d.getDay()]}`;
  },
  
  formatTime(d) {
    return `${Utils.pad(d.getHours())}:${Utils.pad(d.getMinutes())}:${Utils.pad(d.getSeconds())}`;
  },
  
  getToday() { return new Date().toISOString().slice(0, 10); },
  
  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return d.toISOString().slice(0, 10);
  },
  
  getMonthStart(date) {
    const d = new Date(date);
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  },
  
  debounce(fn, ms) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
  },
  
  throttle(fn, ms) {
    let last = 0;
    return (...args) => {
      const now = Date.now();
      if (now - last >= ms) { last = now; fn(...args); }
    };
  }
};

/* ==================== Clock Module ==================== */
const Clock = {
  init() {
    this.update();
    setInterval(() => this.update(), 1000);
  },
  
  update() {
    const now = new Date();
    const clockEl = document.getElementById('clock');
    const dateEl = document.getElementById('date-display');
    if (clockEl) clockEl.textContent = Utils.formatTime(now);
    if (dateEl) dateEl.textContent = Utils.formatDate(now);
    this.updateGreeting(now);
  },
  
  updateGreeting(now) {
    const h = now.getHours();
    const el = document.getElementById('greeting');
    if (!el) return;
    let greeting;
    if (h < 11) greeting = '早上好，新的一天开始了！';
    else if (h < 13) greeting = '中午好，注意休息午休。';
    else if (h < 18) greeting = '下午好，继续保持专注！';
    else greeting = '晚上好，辛苦了一天。';
    if (el.textContent !== greeting) el.textContent = greeting;
  }
};

/* ==================== Weather Module ==================== */
const Weather = {
  apiUsed: false,
  
  async init() {
    const cached = Storage.get('weather_data');
    if (cached && cached.ts && Date.now() - cached.ts < 30 * 60 * 1000) {
      this.render(cached.data);
      return;
    }
    await this.fetchByLocation();
  },
  
  async fetchByLocation() {
    if (!navigator.geolocation) {
      this.showManual();
      this.setStatus('warn', '地理定位不可用');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => await this.fetchData(pos.coords.latitude, pos.coords.longitude),
      () => { this.showManual(); this.setStatus('warn', '位置获取失败，可手动输入'); }
    );
  },
  
  async fetchData(lat, lon) {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,uv_index` +
        `&timezone=auto`
      );
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      Storage.set('weather_data', { ts: Date.now(), data: this.formatWeatherData(data) });
      this.render(this.formatWeatherData(data));
      this.setStatus('');
    } catch {
      this.fetchByCity('');
    }
  },
  
  async fetchByCity(city) {
    try {
      let lat, lon;
      if (!city || city.trim() === '') {
        this.showManual();
        this.setStatus('warn', '获取失败，可手动输入城市');
        return;
      }
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
      const geoData = await geoRes.json();
      if (!geoData.results || geoData.results.length === 0) {
        this.showError(`未找到城市: ${city}`);
        return;
      }
      lat = geoData.results[0].latitude;
      lon = geoData.results[0].longitude;
      
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,uv_index` +
        `&timezone=auto`
      );
      const data = await res.json();
      Storage.set('weather_data', { ts: Date.now(), data: this.formatWeatherData(data) });
      this.render(this.formatWeatherData(data));
      this.setStatus('');
      document.getElementById('manual-city').style.display = 'none';
    } catch {
      this.showError('天气数据获取失败');
      this.setStatus('warn', 'API 故障，使用本地数据');
    }
  },
  
  formatWeatherData(apiData) {
    const c = apiData.current;
    const temp = Math.round(c.temperature_2m);
    const feelsLike = Math.round(c.apparent_temperature);
    const humidity = c.relative_humidity_2m;
    const wind = Math.round(c.wind_speed_10m);
    const code = c.weather_code;
    const uv = c.uv_index || 0;
    return {
      temp,
      feelsLike,
      humidity,
      wind,
      uv: Math.round(uv * 10) / 10,
      icon: this.getWeatherIcon(code),
      desc: this.getWeatherDesc(code),
      aqi: '--'
    };
  },
  
  getWeatherIcon(code) {
    if (code === 0) return '☀️';
    if (code <= 3) return '⛅';
    if (code <= 48) return '🌫️';
    if (code <= 57) return '🌧️';
    if (code <= 67) return '🌧️';
    if (code <= 77) return '❄️';
    if (code <= 82) return '🌧️';
    if (code <= 86) return '🌨️';
    if (code <= 99) return '⛈️';
    return '🌤️';
  },
  
  getWeatherDesc(code) {
    if (code === 0) return '晴朗';
    if (code <= 3) return '多云';
    if (code <= 48) return '雾蒙蒙';
    if (code <= 57) return '毛毛雨';
    if (code <= 67) return '下雨';
    if (code <= 77) return '雪';
    if (code <= 82) return '大雨';
    if (code <= 86) return '大雪';
    if (code <= 99) return '雷雨';
    return '未知';
  },
  
  render(data) {
    const container = document.getElementById('weather-content');
    if (!container) return;
    container.innerHTML = `
      <div class="weather-main">
        <span class="weather-icon">${data.icon}</span>
        <span class="weather-temp">${data.temp}°C</span>
      </div>
      <div class="weather-details">
        <div class="weather-detail">🌡️ 体感 ${data.feelsLike}°C</div>
        <div class="weather-detail">💧 湿度 ${data.humidity}%</div>
        <div class="weather-detail">💨 风速 ${data.wind} km/h</div>
        <div class="weather-detail">☀️ UV ${data.uv}</div>
        <div class="weather-detail">🌤️ 天气 ${data.desc}</div>
        <div class="weather-detail">🌍 空气质量 ${data.aqi}</div>
      </div>`;
  },
  
  showManual() { document.getElementById('manual-city').style.display = 'flex'; },
  showError(msg) { document.getElementById('weather-error').textContent = msg; },
  setStatus(type, msg) {
    const el = document.getElementById('api-status');
    if (!el) return;
    el.querySelector('.dot').className = 'dot' + (type ? ' ' + type : '');
    el.lastChild.textContent = ' ' + (msg || '正常');
  }
};

/* ==================== Quote Module ==================== */
const Quotes = {
  localQuotes: [
    { text: '你今天的努力，是未来最好的礼物。', cat: '励志' },
    { text: '先完成，再完美。开始行动本身就是成功。', cat: '行动' },
    { text: '专注是一种稀缺能力。', cat: '专注' },
    { text: '时间花在哪里，人生就在哪里。', cat: '时间管理' },
    { text: '机会总是留给有准备的人。', cat: '励志' },
    { text: '每天进步一点点，终会成就大我。', cat: '成长' },
    { text: '自律给我自由。', cat: '自律' },
    { text: '不积跬步，无以至千里。', cat: '坚持' }
  ],
  
  async init() {
    this.render();
    document.getElementById('refresh-quote')?.addEventListener('click', () => this.render());
  },
  
  async render() {
    const el = document.getElementById('quote-text');
    if (!el) return;
    try {
      const res = await fetch('https://apiquot.es/api/v1/quotes/random?length=short');
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length) {
          el.textContent = '✨ ' + data.results[0].text;
          return;
        }
      }
    } catch {}
    const q = this.localQuotes[Math.floor(Math.random() * this.localQuotes.length)];
    el.textContent = '✨ ' + q.text;
  }
};

/* ==================== Todo Module ==================== */
const Todo = {
  init() {
    this.items = Storage.get('todos', []);
    this.todayKey = Utils.getToday();
    if (!this.items.filter(i => i.date === this.todayKey).length) {
      this.clearDone();
    }
    this.bindEvents();
    this.render();
  },
  
  clearDone() {
    this.items = this.items.filter(i => i.date !== this.todayKey || !i.done);
    this.save();
  },
  
  get todayItems() {
    return this.items.filter(i => i.date === this.todayKey);
  },
  
  add(text) {
    text = text.trim();
    if (!text) return;
    this.items.push({ id: Date.now(), text, done: false, date: this.todayKey, order: this.todayItems.length });
    this.save();
    this.render();
  },
  
  toggle(id) {
    const item = this.items.find(i => i.id === id);
    if (item) { item.done = !item.done; this.save(); this.render(); }
  },
  
  delete(id) {
    this.items = this.items.filter(i => i.id !== id);
    this.save();
    this.render();
  },
  
  edit(id, newText) {
    newText = newText.trim();
    if (!newText) return;
    const item = this.items.find(i => i.id === id);
    if (item) { item.text = newText; this.save(); this.render(); }
  },
  
  save() {
    this.items.sort((a, b) => a.order - b.order);
    Storage.set('todos', this.items);
  },
  
  move(id, dir) {
    const today = this.todayItems;
    const idx = today.findIndex(i => i.id === id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= today.length) return;
    [today[idx].order, today[newIdx].order] = [today[newIdx].order, today[idx].order];
    this.save();
    this.render();
  },
  
  bindEvents() {
    const input = document.getElementById('todo-input');
    const btn = document.getElementById('add-todo');
    const handler = () => { this.add(input.value); input.value = ''; };
    btn?.addEventListener('click', handler);
    input?.addEventListener('keypress', (e) => { if (e.key === 'Enter') handler(); });
  },
  
  render() {
    const list = document.getElementById('todo-list');
    if (!list) return;
    const items = this.todayItems;
    const doneCount = items.filter(i => i.done).length;
    const total = items.length;
    const percent = total ? Math.round((doneCount / total) * 100) : 0;
    
    const countEl = document.getElementById('todo-count');
    const pctEl = document.getElementById('todo-percent');
    if (countEl) countEl.textContent = `${doneCount}/${total}`;
    if (pctEl) pctEl.textContent = `${percent}%`;
    
    if (!items.length) {
      list.innerHTML = '<div style="text-align:center;color:var(--text-secondary);padding:20px">暂无任务，添加一个吧！</div>';
      return;
    }
    
    list.innerHTML = items.map(item => `
      <div class="todo-item ${item.done ? 'done' : ''}" draggable="true" data-id="${item.id}">
        <div class="todo-checkbox" data-action="toggle"></div>
        <span class="todo-label">${this.escapeHtml(item.text)}</span>
        <div class="todo-actions">
          <button class="todo-action-btn" data-action="move-up" title="上移">▲</button>
          <button class="todo-action-btn" data-action="move-down" title="下移">▼</button>
          <button class="todo-action-btn" data-action="edit" title="编辑">✏️</button>
          <button class="todo-action-btn" data-action="delete" title="删除">🗑️</button>
        </div>
      </div>`).join('');
    
    this.bindTodoEvents();
    this.initDragAndDrop();
  },
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
  
  bindTodoEvents() {
    document.querySelectorAll('.todo-item').forEach(el => {
      const id = Number(el.dataset.id);
      el.querySelector('.todo-checkbox')?.addEventListener('click', () => this.toggle(id));
      el.querySelector('[data-action="delete"]')?.addEventListener('click', () => this.delete(id));
      el.querySelector('[data-action="edit"]')?.addEventListener('click', () => this.startEdit(el, id));
      el.querySelector('[data-action="move-up"]')?.addEventListener('click', () => this.move(id, -1));
      el.querySelector('[data-action="move-down"]')?.addEventListener('click', () => this.move(id, 1));
    });
  },
  
  startEdit(el, id) {
    const label = el.querySelector('.todo-label');
    const current = label.textContent;
    label.replaceWith(document.createTextNode(''));
    const input = document.createElement('input');
    input.className = 'todo-edit-input';
    input.value = current;
    label.parentNode.insertBefore(input, label);
    input.focus();
    input.select();
    const finish = () => { this.edit(id, input.value); };
    input.addEventListener('blur', finish);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') input.blur(); });
  },
  
  initDragAndDrop() {
    document.querySelectorAll('.todo-item').forEach(el => {
      el.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', el.dataset.id);
        el.classList.add('dragging');
      });
      el.addEventListener('dragend', () => el.classList.remove('dragging'));
      el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('dragging'); });
      el.addEventListener('dragleave', () => el.classList.remove('dragging'));
      el.addEventListener('drop', (e) => {
        e.preventDefault();
        el.classList.remove('dragging');
        const fromId = Number(e.dataTransfer.getData('text/plain'));
        const toId = Number(el.dataset.id);
        if (fromId === toId) return;
        const today = this.todayItems;
        const fromIdx = today.findIndex(i => i.id === fromId);
        const toIdx = today.findIndex(i => i.id === toId);
        [today[fromIdx].order, today[toIdx].order] = [today[toIdx].order, today[fromIdx].order];
        this.save();
        this.render();
      });
    });
  }
};

/* ==================== Stats Module ==================== */
const Stats = {
  init() {
    this.bindEvents();
    this.updateAll();
  },
  
  bindEvents() {
    document.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const amount = btn.dataset.amount;
        switch (action) {
          case 'add-water': this.addWater(Number(amount)); break;
          case 'reset-water': this.resetWater(); break;
          case 'add-steps': this.addSteps(); break;
          case 'reset-steps': this.resetSteps(); break;
          case 'add-sleep': this.addSleep(); break;
          case 'reset-sleep': this.resetSleep(); break;
        }
      });
    });
    
    const stepsInput = document.getElementById('steps-input');
    stepsInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.addSteps(); });
  },
  
  get todayWater() { return Storage.get(`water_${Utils.getToday()}`, 0); },
  set todayWater(v) { Storage.set(`water_${Utils.getToday()}`, v); },
  
  get todaySteps() { return Storage.get(`steps_${Utils.getToday()}`, 0); },
  set todaySteps(v) { Storage.set(`steps_${Utils.getToday()}`, v); },
  
  get todayFocus() { return Storage.get(`focus_${Utils.getToday()}`, 0); },
  set todayFocus(v) { Storage.set(`focus_${Utils.getToday()}`, v); },
  
  get todaySleep() { return Storage.get(`sleep_${Utils.getToday()}`, 0); },
  set todaySleep(v) { Storage.set(`sleep_${Utils.getToday()}`, v); },
  
  addWater(amt) { this.todayWater = (this.todayWater || 0) + amt; this.updateAll(); },
  resetWater() { this.todayWater = 0; this.updateAll(); },
  addSteps() {
    const input = document.getElementById('steps-input');
    const val = Number(input.value);
    if (val > 0) { this.todaySteps = val; input.value = ''; this.updateAll(); }
  },
  resetSteps() { this.todaySteps = 0; this.updateAll(); },
  addSleep() {
    const input = document.getElementById('sleep-input');
    const val = input.value;
    if (!val) return;
    const [h, m] = val.split(':').map(Number);
    const minutes = h * 60 + m;
    if (minutes > 0 && minutes < 1080) { this.todaySleep = minutes; this.updateAll(); }
  },
  resetSleep() { this.todaySleep = 0; this.updateAll(); },
  
  updateAll() {
    this.updateWater();
    this.updateSteps();
    this.updateFocus();
    this.updateSleep();
    updateCharts();
  },
  
  updateWater() {
    const val = this.todayWater || 0;
    const target = 2000;
    const pct = Math.min(100, (val / target) * 100);
    const el = document.getElementById('water-value');
    const bar = document.getElementById('water-progress');
    if (el) el.textContent = `${val.toLocaleString()} ML`;
    if (bar) bar.style.width = `${pct}%`;
  },
  
  updateSteps() {
    const val = this.todaySteps || 0;
    const target = 10000;
    const pct = Math.min(100, (val / target) * 100);
    const el = document.getElementById('steps-value');
    const bar = document.getElementById('steps-progress');
    if (el) el.textContent = val.toLocaleString();
    if (bar) bar.style.width = `${pct}%`;
  },
  
  updateFocus() {
    const val = this.todayFocus || 0;
    const hours = Math.floor(val / 60);
    const mins = val % 60;
    const target = 480;
    const pct = Math.min(100, (val / target) * 100);
    const el = document.getElementById('focus-value');
    const bar = document.getElementById('focus-progress');
    if (el) el.textContent = `${hours}h ${mins}m`;
    if (bar) bar.style.width = `${pct}%`;
  },
  
  updateSleep() {
    const val = this.todaySleep || 0;
    const hours = Math.floor(val / 60);
    const mins = val % 60;
    const target = 480;
    const pct = Math.min(100, (val / target) * 100);
    const el = document.getElementById('sleep-value');
    const bar = document.getElementById('sleep-progress');
    if (el) el.textContent = `${hours}h ${mins}m`;
    if (bar) bar.style.width = `${pct}%`;
  }
};

/* ==================== Chart Module ==================== */
let charts = {};

function getHistoryData(key, range) {
  const now = new Date();
  const labels = [];
  const data = [];
  
  if (range === 'day') {
    for (let h = 0; h < 24; h++) {
      labels.push(`${Utils.pad(h)}:00`);
      data.push(0);
    }
    return { labels, data };
  }
  
  const days = range === 'week' ? 7 : 30;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    labels.push(`${d.getMonth()+1}/${d.getDate()}`);
    data.push(Storage.get(`${key}_${Utils.getToday()}`, 0));
  }
  return { labels, data };
}

function initChart(canvasId, config) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  if (charts[canvasId]) charts[canvasId].destroy();
  const ctx = canvas.getContext('2d');
  charts[canvasId] = new Chart(ctx, config);
  return charts[canvasId];
}

function getChartColors() {
  const style = getComputedStyle(document.documentElement);
  return {
    text: style.getPropertyValue('--text-secondary').trim() || '#8a8f96',
    accentStart: style.getPropertyValue('--accent-start').trim() || '#a78bfa',
    accentEnd: style.getPropertyValue('--accent-end').trim() || '#60a5fa',
    grid: style.getPropertyValue('--border-color').trim() || 'rgba(255,255,255,0.08)'
  };
}

function updateCharts() {
  updateWaterChart();
  updateFocusChart();
  updateSleepChart();
  updateTodoChart();
}

function updateWaterChart() {
  const toggle = document.querySelector('[data-range="water"]') || document.querySelectorAll('.charts-section .toggle-btn')[0]?.parentElement;
  const activeBtn = toggle?.querySelector('.toggle-btn.active');
  const range = activeBtn?.dataset.range || 'day';
  
  const { labels, data } = getHistoryData('water', range);
  const colors = getChartColors();
  
  initChart('water-chart', {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '饮水量 (ML)',
        data,
        borderColor: colors.accentStart,
        backgroundColor: colors.accentStart + '22',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: colors.text }, grid: { color: colors.grid } },
        y: { ticks: { color: colors.text }, grid: { color: colors.grid } }
      }
    }
  });
}

function updateFocusChart() {
  const btns = document.querySelectorAll('.charts-section .toggle-btn');
  const idx = 1;
  const parent = btns[idx]?.parentElement;
  const activeBtn = parent?.querySelector('.toggle-btn.active');
  const range = activeBtn?.dataset.range || 'day';
  
  const { labels, data } = getHistoryData('focus', range);
  const colors = getChartColors();
  
  initChart('focus-chart', {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '专注时长 (min)',
        data,
        backgroundColor: colors.accentStart + '88',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: colors.text }, grid: { color: colors.grid } },
        y: { ticks: { color: colors.text }, grid: { color: colors.grid } }
      }
    }
  });
}

function updateSleepChart() {
  const btns = document.querySelectorAll('.charts-section .toggle-btn');
  const parent = btns[2]?.parentElement;
  const activeBtn = parent?.querySelector('.toggle-btn.active');
  const range = activeBtn?.dataset.range || 'day';
  
  const { labels, data } = getHistoryData('sleep', range);
  const colors = getChartColors();
  
  initChart('sleep-chart', {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '睡眠时长 (min)',
        data,
        borderColor: colors.accentEnd,
        backgroundColor: colors.accentEnd + '22',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: colors.text }, grid: { color: colors.grid } },
        y: { ticks: { color: colors.text }, grid: { color: colors.grid } }
      }
    }
  });
}

function updateTodoChart() {
  const btns = document.querySelectorAll('.charts-section .toggle-btn');
  const parent = btns[3]?.parentElement;
  const activeBtn = parent?.querySelector('.toggle-btn.active');
  const range = activeBtn?.dataset.range || 'day';
  
  const now = new Date();
  const labels = [];
  const data = [];
  const days = range === 'week' ? 7 : (range === 'day' ? 24 : 30);
  
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = Utils.getToday();
    d.setDate(d.getDate() - (days - 1 - i));
    labels.push(`${d.getMonth()+1}/${d.getDate()}`);
    
    const todos = Storage.get('todos', []);
    const dayTodos = todos.filter(t => t.date === d.toISOString().slice(0, 10));
    const done = dayTodos.filter(t => t.done).length;
    data.push(dayTodos.length ? Math.round((done / dayTodos.length) * 100) : 0);
  }
  
  const colors = getChartColors();
  
  initChart('todo-chart', {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '完成率 (%)',
        data,
        backgroundColor: data.map(v => v >= 80 ? colors.accentStart + '88' : v >= 50 ? '#fbbf2488' : '#f8717188'),
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: colors.text }, grid: { color: colors.grid } },
        y: { max: 100, ticks: { color: colors.text }, grid: { color: colors.grid } }
      }
    }
  });
}

/* ==================== Pomodoro Module ==================== */
const Pomodoro = {
  timer: null,
  state: 'idle',
  timeLeft: 0,
  isFocus: true,
  
  init() {
    this.focusMinutes = Storage.get('pomo_focus', 25);
    this.breakMinutes = Storage.get('pomo_break', 5);
    
    const focusInput = document.getElementById('pomo-focus');
    const breakInput = document.getElementById('pomo-break');
    if (focusInput) focusInput.value = this.focusMinutes;
    if (breakInput) breakInput.value = this.breakMinutes;
    
    focusInput?.addEventListener('change', (e) => {
      this.focusMinutes = Number(e.target.value) || 25;
      Storage.set('pomo_focus', this.focusMinutes);
    });
    breakInput?.addEventListener('change', (e) => {
      this.breakMinutes = Number(e.target.value) || 5;
      Storage.set('pomo_break', this.breakMinutes);
    });
    
    document.getElementById('start-pomo')?.addEventListener('click', () => this.start());
    document.getElementById('pause-pomo')?.addEventListener('click', () => this.pause());
    document.getElementById('reset-pomo')?.addEventListener('click', () => this.reset());
    
    this.updateDisplay();
  },
  
  start() {
    if (this.state === 'idle') {
      this.timeLeft = (this.isFocus ? this.focusMinutes : this.breakMinutes) * 60;
    }
    this.state = 'running';
    this.updateButtons();
    
    this.timer = setInterval(() => {
      this.timeLeft--;
      this.updateDisplay();
      if (this.timeLeft <= 0) {
        this.complete();
      }
    }, 1000);
  },
  
  pause() {
    this.state = 'paused';
    clearInterval(this.timer);
    this.updateButtons();
  },
  
  reset() {
    this.state = 'idle';
    clearInterval(this.timer);
    this.timeLeft = 0;
    this.updateDisplay();
    this.updateButtons();
    document.getElementById('timer-label').textContent = '准备开始';
  },
  
  complete() {
    clearInterval(this.timer);
    this.state = 'idle';
    
    if (this.isFocus) {
      const count = Storage.get('pomo_count', 0) + 1;
      Storage.set('pomo_count', count);
      document.getElementById('pomo-count').textContent = count;
      
      const focusMin = Storage.get('pomo_focus', 25);
      Stats.todayFocus = (Stats.todayFocus || 0) + focusMin;
      Stats.updateFocus();
      
      this.isFocus = false;
      this.timeLeft = this.breakMinutes * 60;
      document.getElementById('timer-label').textContent = '休息时间到！';
      
      this.notify('番茄钟完成！', '休息 5 分钟吧');
    } else {
      this.isFocus = true;
      this.timeLeft = this.focusMinutes * 60;
      document.getElementById('timer-label').textContent = '专注时间！';
      this.notify('休息结束！', '开始新的专注');
    }
    
    this.playSound();
    this.updateDisplay();
    this.updateButtons();
  },
  
  updateDisplay() {
    const min = Math.floor(this.timeLeft / 60);
    const sec = this.timeLeft % 60;
    const display = document.getElementById('timer-display');
    if (display) display.textContent = `${Utils.pad(min)}:${Utils.pad(sec)}`;
  },
  
  updateButtons() {
    const startBtn = document.getElementById('start-pomo');
    const pauseBtn = document.getElementById('pause-pomo');
    if (startBtn) startBtn.disabled = this.state === 'running';
    if (pauseBtn) pauseBtn.disabled = this.state !== 'running';
  },
  
  notify(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  },
  
  playSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  }
};

/* ==================== Notebook Module ==================== */
const Notebook = {
  notes: [],
  activeId: null,
  
  init() {
    this.notes = Storage.get('notes', []);
    this.bindEvents();
    this.renderList();
    if (this.notes.length) this.selectNote(this.notes[0].id);
  },
  
  bindEvents() {
    document.getElementById('new-note')?.addEventListener('click', () => this.createNote());
    document.getElementById('save-note')?.addEventListener('click', () => this.saveNote());
    document.getElementById('delete-note')?.addEventListener('click', () => this.deleteNote());
    
    const searchInput = document.getElementById('note-search');
    searchInput?.addEventListener('input', Utils.debounce((e) => this.renderList(e.target.value), 300));
    
    document.querySelectorAll('.note-tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });
  },
  
  createNote() {
    const note = { id: Date.now(), title: '无标题', content: '', created: Date.now() };
    this.notes.unshift(note);
    this.save();
    this.renderList();
    this.selectNote(note.id);
  },
  
  selectNote(id) {
    this.activeId = id;
    const note = this.notes.find(n => n.id === id);
    if (!note) return;
    
    const titleInput = document.getElementById('note-title');
    const contentInput = document.getElementById('note-content');
    if (titleInput) titleInput.value = note.title;
    if (contentInput) contentInput.value = note.content;
    
    this.renderList();
  },
  
  saveNote() {
    if (!this.activeId) return;
    const note = this.notes.find(n => n.id === this.activeId);
    if (!note) return;
    note.title = document.getElementById('note-title')?.value || '无标题';
    note.content = document.getElementById('note-content')?.value || '';
    note.updated = Date.now();
    this.save();
    this.renderList();
  },
  
  deleteNote() {
    if (!this.activeId) return;
    this.notes = this.notes.filter(n => n.id !== this.activeId);
    this.save();
    this.activeId = this.notes.length ? this.notes[0].id : null;
    if (this.activeId) this.selectNote(this.activeId);
    else {
      document.getElementById('note-title').value = '';
      document.getElementById('note-content').value = '';
    }
    this.renderList();
  },
  
  save() {
    Storage.set('notes', this.notes);
  },
  
  renderList(filter = '') {
    const list = document.getElementById('note-list');
    if (!list) return;
    const filtered = filter
      ? this.notes.filter(n => n.title.toLowerCase().includes(filter.toLowerCase()) || n.content.toLowerCase().includes(filter.toLowerCase()))
      : this.notes;
    
    list.innerHTML = filtered.map(n => `
      <div class="note-item ${n.id === this.activeId ? 'active' : ''}" data-id="${n.id}">
        ${this.escapeHtml(n.title || '无标题')}
      </div>`).join('');
    
    list.querySelectorAll('.note-item').forEach(el => {
      el.addEventListener('click', () => this.selectNote(Number(el.dataset.id)));
    });
  },
  
  switchTab(tab) {
    document.querySelectorAll('.note-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.note-tab[data-tab="${tab}"]`)?.classList.add('active');
    
    const textarea = document.getElementById('note-content');
    const preview = document.getElementById('note-preview');
    
    if (tab === 'edit') {
      textarea.style.display = 'block';
      preview.classList.remove('visible');
    } else {
      textarea.style.display = 'none';
      preview.innerHTML = marked.parse(textarea?.value || '');
      preview.classList.add('visible');
    }
  },
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

/* ==================== Calendar Module ==================== */
const Calendar = {
  currentDate: new Date(),
  events: [],
  selectedDate: null,
  
  init() {
    this.events = Storage.get('calendar_events', []);
    this.bindEvents();
    this.render();
  },
  
  bindEvents() {
    document.getElementById('prev-month')?.addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      this.render();
    });
    document.getElementById('next-month')?.addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      this.render();
    });
    document.getElementById('add-event')?.addEventListener('click', () => this.addEvent());
  },
  
  getMonthDays() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startDay = first.getDay();
    const days = [];
    
    for (let i = startDay - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d.getDate(), month: d.getMonth(), year: d.getFullYear(), other: true });
    }
    
    for (let i = 1; i <= last.getDate(); i++) {
      days.push({ date: i, month, year, other: false });
    }
    
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: i, month: d.getMonth(), year: d.getFullYear(), other: true });
    }
    
    return days;
  },
  
  getDateKey(year, month, date) {
    return `${year}-${Utils.pad(month + 1)}-${Utils.pad(date)}`;
  },
  
  render() {
    const grid = document.getElementById('calendar-grid');
    const monthYear = document.getElementById('calendar-month-year');
    if (!grid || !monthYear) return;
    
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    monthYear.textContent = `${year}年${month + 1}月`;
    
    const today = Utils.getToday();
    const days = this.getMonthDays();
    
    grid.innerHTML = days.map(d => {
      const key = this.getDateKey(d.year, d.month, d.date);
      const isToday = key === today;
      const hasEvent = this.events.some(e => e.date === key);
      return `<div class="calendar-day ${d.other ? 'other-month' : ''} ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}" data-date="${key}">${d.date}</div>`;
    }).join('');
    
    grid.querySelectorAll('.calendar-day:not(.other-month)').forEach(el => {
      el.addEventListener('click', () => this.selectDate(el.dataset.date));
    });
  },
  
  selectDate(date) {
    this.selectedDate = date;
    const area = document.getElementById('event-input-area');
    const dateEl = document.getElementById('selected-date');
    if (area) area.style.display = 'grid';
    if (dateEl) dateEl.textContent = date;
    this.renderEvents();
  },
  
  addEvent() {
    if (!this.selectedDate) return;
    const input = document.getElementById('event-input');
    const text = input?.value?.trim();
    if (!text) return;
    
    this.events.push({ id: Date.now(), date: this.selectedDate, text });
    Storage.set('calendar_events', this.events);
    input.value = '';
    this.render();
    this.renderEvents();
  },
  
  renderEvents() {
    const list = document.getElementById('event-list');
    if (!list) return;
    const dayEvents = this.events.filter(e => e.date === this.selectedDate);
    
    list.innerHTML = dayEvents.map(e => `
      <div class="event-item">
        <span>${this.escapeHtml(e.text)}</span>
        <button data-id="${e.id}">✕</button>
      </div>`).join('');
    
    list.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        this.events = this.events.filter(e => e.id !== Number(btn.dataset.id));
        Storage.set('calendar_events', this.events);
        this.render();
        this.renderEvents();
      });
    });
  },
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

/* ==================== Inspiration Module ==================== */
const Inspiration = {
  tips: [
    { text: '使用 Ctrl+S 保存文件，养成好习惯。', cat: '编程技巧' },
    { text: 'Git 的 rebase -i 可以整理提交历史。', cat: 'Git 技巧' },
    { text: '在终端中使用 * 通配符可以匹配多个文件。', cat: 'Linux 技巧' },
    { text: 'Arch Linux 的 pacman -Syu 是系统更新命令。', cat: 'Arch Linux' },
    { text: '使用 ChatGPT 写代码时，提供上下文能获得更好的答案。', cat: 'AI 工具' },
    { text: 'CSS Grid 比 Flexbox 更适合二维布局。', cat: '编程技巧' },
    { text: '使用 tmux 可以管理终端会话。', cat: 'Linux 技巧' },
    { text: 'Git bisect 可以快速定位引入 bug 的提交。', cat: 'Git 技巧' },
    { text: 'yay 是 Arch Linux 上常用的 AUR 助手。', cat: 'Arch Linux' },
    { text: '使用 Cursor 编辑代码时，Cmd+K 可以快速生成代码。', cat: 'AI 工具' },
    { text: '函数式编程的纯函数更容易测试和调试。', cat: '编程技巧' },
    { text: '使用 sed -i 可以原地替换文件内容。', cat: 'Linux 技巧' },
    { text: 'GitHub Copilot 可以自动补全整行代码。', cat: 'AI 工具' }
  ],
  
  async init() {
    this.render();
    document.getElementById('refresh-inspiration')?.addEventListener('click', () => this.render());
  },
  
  async render() {
    const catEl = document.getElementById('inspiration-category');
    const textEl = document.getElementById('inspiration-text');
    if (!catEl || !textEl) return;
    
    const tip = this.tips[Math.floor(Math.random() * this.tips.length)];
    catEl.textContent = tip.cat;
    textEl.textContent = tip.text;
  }
};

/* ==================== Settings Module ==================== */
const Settings = {
  init() {
    this.loadSettings();
    this.bindEvents();
  },
  
  loadSettings() {
    const settings = Storage.get('settings', { theme: 'auto', color: 'purple', fontSize: 14 });
    
    if (settings.theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else if (settings.theme === 'dark') document.documentElement.removeAttribute('data-theme');
    else {
      if (window.matchMedia('(prefers-color-scheme: light)').matches) document.documentElement.setAttribute('data-theme', 'light');
    }
    
    this.applyColor(settings.color);
    document.body.style.fontSize = settings.fontSize + 'px';
    
    const radio = document.querySelector(`input[name="theme"][value="${settings.theme}"]`);
    if (radio) radio.checked = true;
    
    document.querySelectorAll('.color-swatch').forEach(s => {
      s.classList.toggle('active', s.dataset.color === settings.color);
    });
    
    const slider = document.getElementById('font-size-slider');
    if (slider) slider.value = settings.fontSize;
  },
  
  applyColor(color) {
    const colors = {
      purple: { start: '#a78bfa', end: '#60a5fa' },
      blue: { start: '#60a5fa', end: '#3b82f6' },
      green: { start: '#34d399', end: '#10b981' },
      orange: { start: '#fbbf24', end: '#f59e0b' },
      pink: { start: '#f472b6', end: '#ec4899' }
    };
    const c = colors[color] || colors.purple;
    document.documentElement.style.setProperty('--accent-start', c.start);
    document.documentElement.style.setProperty('--accent-end', c.end);
  },
  
  bindEvents() {
    document.getElementById('settings-btn')?.addEventListener('click', () => {
      document.getElementById('settings-overlay').classList.add('active');
    });
    
    document.getElementById('close-settings')?.addEventListener('click', () => {
      document.getElementById('settings-overlay').classList.remove('active');
    });
    
    document.getElementById('settings-overlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) e.currentTarget.classList.remove('active');
    });
    
    document.querySelectorAll('input[name="theme"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const settings = Storage.get('settings', {});
        settings.theme = e.target.value;
        Storage.set('settings', settings);
        if (e.target.value === 'light') document.documentElement.setAttribute('data-theme', 'light');
        else if (e.target.value === 'dark') document.documentElement.removeAttribute('data-theme');
        else {
          if (window.matchMedia('(prefers-color-scheme: light)').matches) document.documentElement.setAttribute('data-theme', 'light');
          else document.documentElement.removeAttribute('data-theme');
        }
      });
    });
    
    document.querySelectorAll('.color-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        this.applyColor(swatch.dataset.color);
        const settings = Storage.get('settings', {});
        settings.color = swatch.dataset.color;
        Storage.set('settings', settings);
      });
    });
    
    document.getElementById('font-size-slider')?.addEventListener('input', (e) => {
      const size = Number(e.target.value);
      document.body.style.fontSize = size + 'px';
      const settings = Storage.get('settings', {});
      settings.fontSize = size;
      Storage.set('settings', settings);
    });
  }
};

/* ==================== Initialize All Modules ==================== */
document.addEventListener('DOMContentLoaded', () => {
  Clock.init();
  Weather.init();
  Quotes.init();
  Todo.init();
  Stats.init();
  Pomodoro.init();
  Notebook.init();
  Calendar.init();
  Inspiration.init();
  Settings.init();
  
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.parentElement.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateCharts();
    });
  });
  
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
});