/**
 * Dashboard Application - Main Script
 * 
 * A personal dashboard application built with vanilla JavaScript and LocalStorage.
 * Contains modules for storage, utilities, routing, clock, weather, todos,
 * statistics, pomodoro timer, notebook, calendar, inspiration, and settings.
 * 
 * @module app
 * @author Dashboard App
 */

/* ========================================================================
 * Storage Module - LocalStorage wrapper with prefix support
 * ======================================================================== */

/**
 * Storage module provides a prefixed wrapper around localStorage.
 * All keys are automatically prefixed with 'dashboard_' to avoid collisions.
 */
const Storage = {
  /**
   * Prefix added to all storage keys
   * @type {string}
   */
  prefix: 'dashboard_',

  /**
   * Get an item from localStorage
   * @param {string} key - The storage key (prefix is added automatically)
   * @param {*} fallback - The fallback value if key doesn't exist (default: null)
   * @returns {*} The parsed value from storage, or fallback if not found
   */
  get(key, fallback = null) {
    try {
      const item = localStorage.getItem(this.prefix + key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  },

  /**
   * Set an item in localStorage
   * @param {string} key - The storage key (prefix is added automatically)
   * @param {*} value - The value to store (will be JSON serialized)
   */
  set(key, value) {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (e) {
      // Storage full or unavailable
    }
  },

  /**
   * Remove an item from localStorage
   * @param {string} key - The storage key (prefix is added automatically)
   */
  remove(key) {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch {
      // Ignore errors
    }
  }
};


/* ========================================================================
 * Utility Module - Common helper functions
 * ======================================================================== */

/**
 * Utility module providing common helper functions used across the application.
 */
const U = {
  /**
   * Pad a number with leading zero if less than 10
   * @param {number} n - The number to pad
   * @returns {string} The padded number as a string
   */
  pad(n) {
    return n < 10 ? '0' + n : String(n);
  },

  /**
   * Format a Date object into a Chinese date string
   * @param {Date} d - The date to format
   * @returns {string} Formatted date string like "2026年06月12日 星期五"
   */
  formatDate(d) {
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return `${d.getFullYear()}年${this.pad(d.getMonth() + 1)}月${this.pad(d.getDate())}日 ${weekdays[d.getDay()]}`;
  },

  /**
   * Format a Date object into a time string (HH:MM:SS)
   * @param {Date} d - The date to format
   * @returns {string} Formatted time string like "14:30:45"
   */
  formatTime(d) {
    return `${this.pad(d.getHours())}:${this.pad(d.getMinutes())}:${this.pad(d.getSeconds())}`;
  },

  /**
   * Get today's date as an ISO string (YYYY-MM-DD)
   * @returns {string} Today's date in ISO format
   */
  getToday() {
    return new Date().toISOString().slice(0, 10);
  },

  /**
   * Create a debounced version of a function
   * @param {Function} fn - The function to debounce
   * @param {number} ms - Delay in milliseconds
   * @returns {Function} Debounced function
   */
  debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  },

  /**
   * Create a throttled version of a function
   * @param {Function} fn - The function to throttle
   * @param {number} ms - Minimum interval in milliseconds
   * @returns {Function} Throttled function
   */
  throttle(fn, ms) {
    let last = 0;
    return (...args) => {
      const now = Date.now();
      if (now - last >= ms) {
        last = now;
        fn(...args);
      }
    };
  }
};


/* ========================================================================
 * Router Module - Simple client-side view router
 * ======================================================================== */

/**
 * Router module handles simple client-side navigation between views.
 * Manages active states for navigation items and view switching.
 */
const Router = {
  /**
   * Initialize the router by setting up event listeners on navigation items.
   */
  init() {
    document.querySelectorAll('.nav-item[data-view]').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        this.go(item.dataset.view);
      });
    });

    document.querySelectorAll('.quick-item[data-view]').forEach((item) => {
      item.addEventListener('click', () => {
        this.go(item.dataset.view);
      });
    });
  },

  /**
   * Navigate to a specific view
   * @param {string} view - The view identifier to navigate to
   */
  go(view) {
    // Remove active class from all views
    document.querySelectorAll('.view').forEach((el) => el.classList.remove('active'));
    
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach((nav) => nav.classList.remove('active'));
    
    // Activate the target view
    const target = document.getElementById(`view-${view}`);
    if (target) {
      target.classList.add('active');
    }
    
    // Activate the corresponding nav item
    const navItem = document.querySelector(`.nav-item[data-view="${view}"]`);
    if (navItem) {
      navItem.classList.add('active');
    }
    
    // Close mobile sidebar and overlay
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) {
      sidebar.classList.remove('mobile-open');
    }
    if (overlay) {
      overlay.classList.remove('active');
    }
    
    // Update charts when navigating to stats view
    if (view === 'stats') {
      setTimeout(updateCharts, 100);
    }
  }
};


/* ========================================================================
 * Clock Module - Real-time clock and greeting
 * ======================================================================== */

/**
 * Clock module displays the current time and date,
 * along with time-appropriate greetings.
 */
const Clock = {
  /**
   * Initialize the clock, starting the timer update loop.
   */
  init() {
    this.update();
    setInterval(() => this.update(), 1000);
  },

  /**
   * Update the clock display elements
   */
  update() {
    const now = new Date();
    
    // Update topbar clock
    const clockEl = document.getElementById('topbar-clock');
    if (clockEl) {
      clockEl.textContent = U.formatTime(now);
    }
    
    // Update greeting date
    const dateEl = document.getElementById('greeting-date');
    if (dateEl) {
      dateEl.textContent = U.formatDate(now);
    }
    
    this.greet(now);
  },

  /**
   * Display a time-appropriate greeting message
   * @param {Date} now - The current date/time
   */
  greet(now) {
    const hour = now.getHours();
    const el = document.getElementById('greeting-text');
    if (!el) return;

    let greeting;
    if (hour < 11) {
      greeting = '早上好，新的一天开始了！';
    } else if (hour < 13) {
      greeting = '中午好，注意休息。';
    } else if (hour < 18) {
      greeting = '下午好，继续保持专注！';
    } else {
      greeting = '晚上好，辛苦了一天。';
    }
    el.textContent = greeting;
  }
};


/* ========================================================================
 * Weather Module - Weather display using Open-Meteo API
 * ======================================================================== */

/**
 * Weather module fetches and displays current weather information
 * using the Open-Meteo API (free, no API key required).
 * Uses geolocation for automatic city detection with manual fallback.
 */
const Weather = {
  /** Request timeout in milliseconds */
  timeoutMs: 10000,

  /**
   * Initialize the weather module.
   * Attempts automatic location-based fetch, falls back to manual city search.
   */
  async init() {
    // Check cached data first (valid for 5 minutes)
    const cached = Storage.get('weather');
    if (cached && cached.ts && Date.now() - cached.ts < 300000) {
      this.render(cached.d);
      this.hideError();
      return;
    }
    await this.locate();
  },

  /**
   * Try to get weather via geolocation API
   */
  async locate() {
    if (!navigator.geolocation) {
      this.showError('您的浏览器不支持地理位置，请输入城市名称');
      this.showManual();
      return;
    }

    try {
      const position = await this.requestPosition();
      await this.fetchWeather(position.coords.latitude, position.coords.longitude);
    } catch (err) {
      console.warn('Weather: Geolocation failed:', err);
      this.showError('获取位置失败，请输入城市名称');
      this.showManual();
    }
  },

  /**
   * Request user position with timeout
   * @returns {Promise<GeolocationPosition>}
   */
  requestPosition() {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        clearTimeout(timer);
        reject(new Error('Geolocation timeout'));
      }, this.timeoutMs);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timer);
          resolve(pos);
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
      );
    });
  },

  /**
   * Fetch weather data from Open-Meteo API with timeout
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   */
  async fetchWeather(lat, lon) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,` +
        `weather_code,wind_speed_10m,uv_index&timezone=auto`,
        { signal: controller.signal }
      );

      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const formatted = this.format(data);

      Storage.set('weather', { ts: Date.now(), d: formatted });
      this.render(formatted);
      this.hideError();

      // Hide manual search form
      const searchForm = document.getElementById('city-search');
      if (searchForm) {
        searchForm.style.setProperty('display', 'none');
      }
    } catch (err) {
      clearTimeout(timer);
      console.warn('Weather: Fetch failed:', err);
      this.showError('获取天气失败，请重试或输入城市名称');
      this.showManual();
    }
  },

  /**
   * Format raw API response into display-friendly data
   * @param {Object} api - The raw API response
   * @returns {Object} Formatted weather data
   */
  format(api) {
    const current = api.current;
    return {
      temp: Math.round(current.temperature_2m),
      feels: Math.round(current.apparent_temperature),
      hum: current.relative_humidity_2m,
      wind: Math.round(current.wind_speed_10m),
      uv: Math.round((current.uv_index || 0) * 10) / 10,
      icon: this.weatherIcon(current.weather_code),
      desc: this.weatherDesc(current.weather_code)
    };
  },

  /**
   * Get weather emoji icon based on WMO weather code
   * @param {number} code - WMO weather code
   * @returns {string} Emoji icon
   */
  weatherIcon(code) {
    if (code === 0) return '\u2600\uFE0F';        // Sunny
    if (code <= 3) return '\u26C5';                 // Cloudy
    if (code <= 48) return '\uD83C\uDF2B\uFE0F';   // Foggy
    if (code <= 67) return '\uD83C\uDF27\uFE0F';   // Rainy
    if (code <= 86) return '\uD83C\uDF28\uFE0F';   // Snowy
    return '\u26C5';                                 // Default cloudy
  },

  /**
   * Get weather description in Chinese based on WMO weather code
   * @param {number} code - WMO weather code
   * @returns {string} Chinese description
   */
  weatherDesc(code) {
    if (code === 0) return '晴朗';
    if (code <= 3) return '多云';
    if (code <= 48) return '雾';
    if (code <= 67) return '下雨';
    if (code <= 86) return '大雪';
    return '多云';
  },

  /**
   * Render weather data to the DOM
   * @param {Object} data - Formatted weather data
   */
  render(data) {
    const container = document.getElementById('weather-content');
    if (!container) return;

    container.innerHTML = `
      <div class="weather-main">
        <span class="weather-icon">${data.icon}</span>
        <span class="weather-temp">${data.temp}°C</span>
      </div>
      <div class="weather-details">
        <div>🌡️ 体感 ${data.feels}°C</div>
        <div>💧 湿度 ${data.hum}%</div>
        <div>💨 风速 ${data.wind} km/h</div>
        <div>☀️ UV ${data.uv}</div>
        <div>🌤️ ${data.desc}</div>
      </div>
    `;

    // Update topbar weather summary
    const iconEl = document.getElementById('topbar-weather-icon');
    if (iconEl) iconEl.textContent = data.icon;
    
    const tempEl = document.getElementById('topbar-weather-temp');
    if (tempEl) tempEl.textContent = `${data.temp}°`;

    // Clear error message
    this.hideError();
  },

  /**
   * Show error message in weather card
   * @param {string} message - Error message to display
   */
  showError(message) {
    const errorEl = document.getElementById('weather-error');
    if (errorEl && message) {
      errorEl.textContent = message;
      errorEl.style.setProperty('display', 'block');
    }
  },

  /**
   * Hide error message in weather card
   */
  hideError() {
    const errorEl = document.getElementById('weather-error');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.setProperty('display', 'none');
    }
  },

  /**
   * Show the manual city search form
   */
  showManual() {
    const searchForm = document.getElementById('city-search');
    if (!searchForm) return;

    searchForm.style.setProperty('display', 'flex');

    const btn = document.getElementById('city-search-btn');
    const input = document.getElementById('city-input');

    btn?.addEventListener('click', async () => {
      const city = input.value.trim();
      if (!city) return;

      try {
        // Geocode city name
        const geoResponse = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
        );
        const geoData = await geoResponse.json();

        if (!geoData.results?.length) {
          alert('未找到城市');
          return;
        }

        // Fetch weather for the city
        const r = geoData.results[0];
        const weatherResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${r.latitude}&longitude=${r.longitude}` +
          `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,` +
          `wind_speed_10m,uv_index&timezone=auto`
        );
        const weatherData = await weatherResponse.json();
        const formatted = this.format(weatherData);

        Storage.set('weather', { ts: Date.now(), d: formatted });
        this.render(formatted);
        searchForm.style.setProperty('display', 'none');
      } catch {
        alert('获取失败');
      }
    });
  }
};


/* ========================================================================
 * Quotes Module - Daily motivational quotes
 * ======================================================================== */

/**
 * Quotes module displays motivational quotes.
 * Tries to fetch from an external API, falls back to local quotes.
 */
const Quotes = {
  /**
   * Local fallback quotes array
   * @type {string[]}
   */
  local: [
    '你今天的努力，是最好的礼物。',
    '先完成，再完美。',
    '专注是一种稀缺能力。',
    '时间花在哪里，人生就在哪里。',
    '每天进步一点点，总会成就大我。',
    '自律给我自由。',
    '不积跬步，无以至千里。'
  ],

  /**
   * Initialize the quotes module.
   */
  async init() {
    this.render();
    document.getElementById('refresh-quote')?.addEventListener('click', () => this.render());
  },

  /**
   * Fetch and render a new quote
   */
  async render() {
    const el = document.getElementById('greeting-quote');
    if (!el) return;

    try {
      const response = await fetch('https://apiquot.es/api/v1/quotes/random?length=short');
      if (response.ok) {
        const data = await response.json();
        if (data.results?.length) {
          el.innerHTML = `
            <span class="quote-text">✨ ${data.results[0].text}</span>
            <button class="refresh-btn" id="refresh-quote">↻</button>
          `;
          return;
        }
      }
    } catch {
      // Fetch failed, use local quotes
    }

    const quote = this.local[Math.floor(Math.random() * this.local.length)];
    el.innerHTML = `
      <span class="quote-text">✨ ${quote}</span>
      <button class="refresh-btn" id="refresh-quote">↻</button>
    `;
  }
};


/* ========================================================================
 * Todo Module - Task management
 * ======================================================================== */

/**
 * Todo module manages daily task lists with add, complete, reorder, and delete functionality.
 * Tasks are stored with date tracking for daily organization.
 */
const Todo = {
  /**
   * Array of all todo items
   * @type {Array<{id: number, text: string, done: boolean, date: string, order: number}>}
   */
  items: [],

  /**
   * Today's date key for filtering active tasks
   * @type {string}
   */
  todayKey: '',

  /**
   * Getter for today's tasks
   */
  get today() {
    return this.items.filter(i => i.date === this.todayKey);
  },

  /**
   * Initialize the todo module.
   */
  init() {
    this.items = Storage.get('todos', []);
    this.todayKey = U.getToday();
    this.render();
  },

  /**
   * Add a new todo item
   * @param {string} text - The todo text
   */
  add(text) {
    text = text.trim();
    if (!text) return;

    this.items.push({
      id: Date.now(),
      text: text,
      done: false,
      date: this.todayKey,
      order: this.today.length
    });

    this.save();
    this.render();
  },

  /**
   * Toggle the done status of a todo item
   * @param {number} id - The todo item ID
   */
  toggle(id) {
    const item = this.items.find(x => x.id === id);
    if (item) {
      item.done = !item.done;
      this.save();
      this.render();
    }
  },

  /**
   * Delete a todo item
   * @param {number} id - The todo item ID
   */
  del(id) {
    this.items = this.items.filter(x => x.id !== id);
    this.save();
    this.render();
  },

  /**
   * Move a todo item up or down in the list
   * @param {number} id - The todo item ID
   * @param {number} dir - Direction: -1 for up, +1 for down
   */
  move(id, dir) {
    const todayItems = this.today;
    const currentIndex = todayItems.findIndex(i => i.id === id);
    const newIndex = currentIndex + dir;

    if (newIndex < 0 || newIndex >= todayItems.length) return;

    // Swap order values
    [todayItems[currentIndex].order, todayItems[newIndex].order] =
      [todayItems[newIndex].order, todayItems[currentIndex].order];

    this.save();
    this.render();
  },

  /**
   * Save todos to localStorage (sorted by order)
   */
  save() {
    this.items.sort((a, b) => a.order - b.order);
    Storage.set('todos', this.items);
  },

  /**
   * Render the todo list and progress indicators to the DOM.
   * Renders to both #todo-list (dashboard view) and #todo-list-2 (tasks view).
   */
  render() {
    const items = this.today;
    const doneCount = items.filter(i => i.done).length;
    const total = items.length;
    const percent = total ? Math.round((doneCount / total) * 100) : 0;

    // Update progress displays
    ['todo-count', 'todo-count-2'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = `${doneCount}/${total}`;
    });

    ['todo-percent', 'todo-percent-2'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = `${percent}%`;
    });

    // Generate HTML for the todo list
    const html = items.length ? items.map((item) => `
      <div class="todo-item ${item.done ? 'done' : ''}" data-id="${item.id}">
        <div class="todo-checkbox"></div>
        <span class="todo-label">${item.text}</span>
        <div class="todo-actions">
          <button data-mu>▲</button>
          <button data-md>▼</button>
          <button data-del>✖</button>
        </div>
      </div>
    `).join('') : '<div style="text-align:center;color:var(--text-secondary);padding:20px">暂无任务，添加一个吧！</div>';

    // Render to both list containers
    ['todo-list', 'todo-list-2'].forEach((listId) => {
      const list = document.getElementById(listId);
      if (list) {
        list.innerHTML = html;
        this.bindEvents(list);
      }
    });
  },

  /**
   * Bind event listeners to todo list DOM elements
   * @param {HTMLElement} list - The todo list container element
   */
  bindEvents(list) {
    // Toggle done on checkbox click
    list.querySelectorAll('.todo-checkbox').forEach((checkbox) => {
      const id = +checkbox.parentElement.dataset.id;
      checkbox.addEventListener('click', () => this.toggle(id));
    });

    // Delete on button click
    list.querySelectorAll('[data-del]').forEach((btn) => {
      const id = +btn.closest('.todo-item').dataset.id;
      btn.addEventListener('click', () => this.del(id));
    });

    // Move up
    list.querySelectorAll('[data-mu]').forEach((btn) => {
      const id = +btn.closest('.todo-item').dataset.id;
      btn.addEventListener('click', () => this.move(id, -1));
    });

    // Move down
    list.querySelectorAll('[data-md]').forEach((btn) => {
      const id = +btn.closest('.todo-item').dataset.id;
      btn.addEventListener('click', () => this.move(id, 1));
    });
  },

  /**
   * Initialize input field and button for adding todos
   * @param {string} inputId - The input element ID
   * @param {string} btnId - The button element ID
   */
  initInput(inputId, btnId) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(btnId);

    const handleSubmit = () => {
      this.add(input.value);
      input.value = '';
    };

    btn?.addEventListener('click', handleSubmit);
    input?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSubmit();
    });
  }
};


/* ========================================================================
 * Stats Module - Health and habit tracking (water, steps, focus, sleep)
 * ======================================================================== */

/**
 * Stats module tracks daily metrics: water intake, steps, focus time, and sleep.
 * Each metric is stored with a date-specific key for daily reset tracking.
 */
const Stats = {
  // Water tracking
  /** @returns {number} */
  get w() { return Storage.get(`w_${U.getToday()}`, 0); },
  /** @param {number} v */
  set w(v) { Storage.set(`w_${U.getToday()}`, v); },

  // Steps tracking
  /** @returns {number} */
  get s() { return Storage.get(`s_${U.getToday()}`, 0); },
  /** @param {number} v */
  set s(v) { Storage.set(`s_${U.getToday()}`, v); },

  // Focus time tracking (in minutes)
  /** @returns {number} */
  get f() { return Storage.get(`f_${U.getToday()}`, 0); },
  /** @param {number} v */
  set f(v) { Storage.set(`f_${U.getToday()}`, v); },

  // Sleep tracking (in minutes)
  /** @returns {number} */
  get sl() { return Storage.get(`sl_${U.getToday()}`, 0); },
  /** @param {number} v */
  set sl(v) { Storage.set(`sl_${U.getToday()}`, v); },

  /**
   * Add water intake amount
   * @param {number} amount - Amount in ml
   */
  addWater(amount) {
    this.w = (this.w || 0) + amount;
    this.update();
  },

  /**
   * Add step count
   */
  addSteps() {
    const input = document.getElementById('steps-input');
    const value = +input.value;
    if (value > 0) {
      this.s = value;
      input.value = '';
      this.update();
    }
  },

  /**
   * Add sleep duration
   */
  addSleep() {
    const input = document.getElementById('sleep-input');
    const value = input.value;
    if (!value) return;

    const [h, m] = value.split(':').map(Number);
    this.sl = h * 60 + m;
    this.update();
  },

  /**
   * Reset all daily stats
   */
  resetAll() {
    this.w = 0;
    this.s = 0;
    this.sl = 0;
    this.update();
  },

  /**
   * Update all stat displays in the DOM
   */
  update() {
    // Water
    const waterVal = document.getElementById('water-value');
    const waterProg = document.getElementById('water-progress');
    if (waterVal) waterVal.textContent = `${(this.w || 0).toLocaleString()} ML`;
    if (waterProg) waterProg.style.width = `${Math.min(100, (this.w || 0) / 20)}%`;

    // Steps
    const stepsVal = document.getElementById('steps-value');
    const stepsProg = document.getElementById('steps-progress');
    if (stepsVal) stepsVal.textContent = (this.s || 0).toLocaleString();
    if (stepsProg) stepsProg.style.width = `${Math.min(100, (this.s || 0) / 100)}%`;

    // Focus
    const focusVal = document.getElementById('focus-value');
    const focusProg = document.getElementById('focus-progress');
    if (focusVal) focusVal.textContent = `${Math.floor((this.f || 0) / 60)}h ${(this.f || 0) % 60}m`;
    if (focusProg) focusProg.style.width = `${Math.min(100, (this.f || 0) / 8)}%`;

    // Sleep
    const sleepVal = document.getElementById('sleep-value');
    const sleepProg = document.getElementById('sleep-progress');
    const sleepH = Math.floor((this.sl || 0) / 60);
    const sleepM = (this.sl || 0) % 60;
    if (sleepVal) sleepVal.textContent = `${sleepH}h ${sleepM}m`;
    if (sleepProg) sleepProg.style.width = `${Math.min(100, (this.sl || 0) / 8)}%`;

    updateCharts();
  },

  /**
   * Initialize the stats module with event listeners
   */
  init() {
    // Bind all data-action buttons
    document.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const amount = btn.dataset.amount;

        if (action === 'add-water') this.addWater(+amount);
        else if (action === 'reset-water') this.w = 0;
        else if (action === 'add-steps') this.addSteps();
        else if (action === 'reset-steps') this.s = 0;
        else if (action === 'add-sleep') this.addSleep();
        else if (action === 'reset-sleep') this.sl = 0;

        this.update();
      });
    });

    // Steps input Enter key
    const stepsInput = document.getElementById('steps-input');
    stepsInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addSteps();
    });

    // Sleep input change
    const sleepInput = document.getElementById('sleep-input');
    sleepInput?.addEventListener('change', () => this.addSleep());

    // Initial render
    this.update();
  }
};


/* ========================================================================
 * Pomodoro Module - Focus/break timer
 * ======================================================================== */

/**
 * Pomodoro module implements a focus/break timer with notifications
 * and focus time tracking for the Stats module.
 */
const Pomo = {
  /** @type {null|number} Timer interval reference */
  timer: null,

  /** @type {string} Current state: 'idle', 'running', 'paused' */
  state: 'idle',

  /** @type {number} Seconds remaining in the current session */
  timeLeft: 0,

  /** @type {boolean} True if currently in focus phase */
  isFocus: true,

  /** @type {number} Focus duration in minutes */
  focusM: 25,

  /** @type {number} Break duration in minutes */
  breakM: 5,

  /**
   * Initialize the Pomodoro timer with stored settings and event listeners.
   */
  init() {
    this.focusM = Storage.get('pf', 25);
    this.breakM = Storage.get('pb', 5);

    const focusInput = document.getElementById('pomo-focus');
    const breakInput = document.getElementById('pomo-break');

    if (focusInput) focusInput.value = this.focusM;
    if (breakInput) breakInput.value = this.breakM;

    focusInput?.addEventListener('change', (e) => {
      this.focusM = +e.target.value;
      Storage.set('pf', this.focusM);
    });

    breakInput?.addEventListener('change', (e) => {
      this.breakM = +e.target.value;
      Storage.set('pb', this.breakM);
    });

    document.getElementById('start-pomo')?.addEventListener('click', () => this.start());
    document.getElementById('pause-pomo')?.addEventListener('click', () => this.pause());
    document.getElementById('reset-pomo')?.addEventListener('click', () => this.reset());

    this.update();
  },

  /**
   * Start the timer
   */
  start() {
    if (this.state === 'idle') {
      this.timeLeft = (this.isFocus ? this.focusM : this.breakM) * 60;
    }
    this.state = 'running';

    document.getElementById('start-pomo').disabled = true;
    document.getElementById('pause-pomo').disabled = false;

    this.timer = setInterval(() => {
      this.timeLeft--;
      this.update();
      if (this.timeLeft <= 0) {
        this.complete();
      }
    }, 1000);
  },

  /**
   * Pause the timer
   */
  pause() {
    this.state = 'paused';
    clearInterval(this.timer);
    document.getElementById('start-pomo').disabled = false;
    document.getElementById('pause-pomo').disabled = true;
  },

  /**
   * Reset the timer to idle state
   */
  reset() {
    this.state = 'idle';
    clearInterval(this.timer);
    this.timeLeft = 0;
    this.update();
    document.getElementById('timer-label').textContent = '准备开始';
    document.getElementById('start-pomo').disabled = false;
    document.getElementById('pause-pomo').disabled = true;
  },

  /**
   * Handle timer completion - switch between focus and break phases
   */
  complete() {
    clearInterval(this.timer);
    this.state = 'idle';

    if (this.isFocus) {
      // Focus session complete
      let count = Storage.get('pomo_count', 0) + 1;
      Storage.set('pomo_count', count);
      document.getElementById('pomo-count').textContent = count;

      Stats.f = (Stats.f || 0) + this.focusM;
      Stats.update();

      this.isFocus = false;
      this.timeLeft = this.breakM * 60;
      document.getElementById('timer-label').textContent = '休息时间！';
      this.notify('芝麻酱完成！', '休息 5 分钟吧');
    } else {
      // Break session complete
      this.isFocus = true;
      this.timeLeft = this.focusM * 60;
      document.getElementById('timer-label').textContent = '专注时间！';
      this.notify('休息结束！', '开始新的专注');
    }

    this.playSound();
    this.update();
  },

  /**
   * Update the timer display
   */
  update() {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    const display = `${U.pad(minutes)}:${U.pad(seconds)}`;

    const timerEl = document.getElementById('timer-display');
    if (timerEl) timerEl.textContent = display;

    document.title = `${display} - Dashboard`;
  },

  /**
   * Send a browser notification
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   */
  notify(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  },

  /**
   * Play a simple beep sound using Web Audio API
   */
  playSound() {
    try {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.frequency.value = 800;
      gain.gain.value = 0.3;

      oscillator.start();
      oscillator.stop(context.currentTime + 0.5);
    } catch {
      // Audio not supported
    }
  }
};


/* ========================================================================
 * Notebook Module - Note-taking with markdown preview
 * ======================================================================== */

/**
 * Notebook module provides a simple note-taking system with
 * create, edit, delete, search, and markdown preview functionality.
 */
const Notes = {
  /**
   * Array of all notes
   * @type {Array<{id: number, title: string, content: string, created: number}>}
   */
  notes: [],

  /** @type {number|null} ID of the currently active note */
  activeId: null,

  /**
   * Initialize the notebook module.
   */
  init() {
    this.notes = Storage.get('notes', []);
    this.bindEvents();
    this.renderList();

    // Auto-select first note if available
    if (this.notes.length) {
      this.select(this.notes[0].id);
    }
  },

  /**
   * Bind all event listeners for the notebook UI
   */
  bindEvents() {
    document.getElementById('new-note')?.addEventListener('click', () => this.create());
    document.getElementById('save-note')?.addEventListener('click', () => this.save());
    document.getElementById('delete-note')?.addEventListener('click', () => this.del());
    document.getElementById('note-search')?.addEventListener(
      'input',
      U.debounce((e) => this.renderList(e.target.value), 300)
    );

    // Tab switching
    document.querySelectorAll('.note-tab').forEach((tab) => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });
  },

  /**
   * Create a new note and select it
   */
  create() {
    const note = {
      id: Date.now(),
      title: '无标题',
      content: '',
      created: Date.now()
    };
    this.notes.unshift(note);
    this.persist();
    this.renderList();
    this.select(note.id);
  },

  /**
   * Select a note by ID and populate the editor
   * @param {number} id - The note ID to select
   */
  select(id) {
    this.activeId = id;
    const note = this.notes.find(x => x.id === id);
    if (!note) return;

    const titleEl = document.getElementById('note-title');
    const contentEl = document.getElementById('note-content');
    if (titleEl) titleEl.value = note.title;
    if (contentEl) contentEl.value = note.content;

    this.renderList();
  },

  /**
   * Save the current active note to storage
   */
  save() {
    if (!this.activeId) return;

    const note = this.notes.find(x => x.id === this.activeId);
    if (!note) return;

    note.title = document.getElementById('note-title')?.value || '无标题';
    note.content = document.getElementById('note-content')?.value || '';
    note.updated = Date.now();

    this.persist();
    this.renderList();
  },

  /**
   * Persist notes to localStorage
   */
  persist() {
    Storage.set('notes', this.notes);
  },

  /**
   * Delete the current active note
   */
  del() {
    if (!this.activeId) return;

    this.notes = this.notes.filter(x => x.id !== this.activeId);
    this.persist();

    this.activeId = this.notes.length ? this.notes[0].id : null;

    if (this.activeId) {
      this.select(this.activeId);
    } else {
      const titleEl = document.getElementById('note-title');
      const contentEl = document.getElementById('note-content');
      if (titleEl) titleEl.value = '';
      if (contentEl) contentEl.value = '';
    }

    this.renderList();
  },

  /**
   * Render the note list sidebar
   * @param {string} [filter] - Optional search filter string
   */
  renderList(filter) {
    const list = document.getElementById('note-list');
    if (!list) return;

    const filtered = filter
      ? this.notes.filter((n) =>
          n.title.toLowerCase().includes(filter.toLowerCase()) ||
          n.content.toLowerCase().includes(filter.toLowerCase())
        )
      : this.notes;

    list.innerHTML = filtered.map((n) => `
      <div class="note-item ${n.id === this.activeId ? 'active' : ''}" data-id="${n.id}">
        ${n.title || '无标题'}
      </div>
    `).join('');

    list.querySelectorAll('.note-item').forEach((el) => {
      el.addEventListener('click', () => this.select(+el.dataset.id));
    });
  },

  /**
   * Switch between edit and preview tabs
   * @param {string} tab - Tab identifier: 'edit' or 'preview'
   */
  switchTab(tab) {
    document.querySelectorAll('.note-tab').forEach((t) => t.classList.remove('active'));
    document.querySelector(`.note-tab[data-tab="${tab}"]`)?.classList.add('active');

    const textarea = document.getElementById('note-content');
    const preview = document.getElementById('note-preview');

    if (tab === 'edit') {
      textarea.style.display = 'block';
      preview.classList.remove('visible');
    } else {
      textarea.style.display = 'none';
      if (textarea && preview && typeof marked !== 'undefined') {
        preview.innerHTML = marked.parse(textarea.value || '');
      }
      preview.classList.add('visible');
    }
  }
};


/* ========================================================================
 * Calendar Module - Event/schedule management
 * ======================================================================== */

/**
 * Calendar module provides a monthly calendar view with event management.
 * Events are stored per date and persist in localStorage.
 */
const Calendar = {
  /** @type {Date} Currently displayed month */
  cur: new Date(),

  /**
   * Array of all events
   * @type {Array<{id: number, date: string, text: string}>}
   */
  events: [],

  /** @type {string|null} Currently selected date for event management */
  selDate: null,

  /**
   * Initialize the calendar module.
   */
  init() {
    this.events = Storage.get('cal_ev', []);
    this.bindEvents();
    this.render();
  },

  /**
   * Bind event listeners for calendar navigation and event management
   */
  bindEvents() {
    document.getElementById('prev-month')?.addEventListener('click', () => {
      this.cur.setMonth(this.cur.getMonth() - 1);
      this.render();
    });

    document.getElementById('next-month')?.addEventListener('click', () => {
      this.cur.setMonth(this.cur.getMonth() + 1);
      this.render();
    });

    document.getElementById('add-event')?.addEventListener('click', () => this.addEvent());
  },

  /**
   * Render the calendar grid for the current month
   */
  render() {
    const grid = document.getElementById('calendar-grid');
    const monthYear = document.getElementById('calendar-month-year');
    if (!grid || !monthYear) return;

    const year = this.cur.getFullYear();
    const month = this.cur.getMonth();
    monthYear.textContent = `${year}年${month + 1}月`;

    const today = U.getToday();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();

    const days = [];

    // Previous month padding days
    for (let i = startDay - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ day: i, month: d.getMonth(), year: d.getFullYear(), other: true });
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ day: i, month, year, other: false });
    }

    // Next month padding days
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ day: i, month: d.getMonth(), year: d.getFullYear(), other: true });
    }

    grid.innerHTML = days.map((d) => {
      const key = `${d.year}-${U.pad(d.month + 1)}-${U.pad(d.day)}`;
      const isToday = key === today;
      const hasEvent = this.events.some((e) => e.date === key);

      return `<div class="calendar-day ${d.other ? 'other-month' : ''} ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}" data-date="${key}">${d.day}</div>`;
    }).join('');

    // Bind click events to valid day cells
    grid.querySelectorAll('.calendar-day:not(.other-month)').forEach((el) => {
      el.addEventListener('click', () => this.selectDate(el.dataset.date));
    });
  },

  /**
   * Select a date for event management
   * @param {string} date - The selected date string (YYYY-MM-DD)
   */
  selectDate(date) {
    this.selDate = date;
    document.getElementById('event-area').style.setProperty('display', 'block');
    document.getElementById('selected-date').textContent = date;
    this.renderEvents();
  },

  /**
   * Add a new event for the selected date
   */
  addEvent() {
    if (!this.selDate) return;

    const input = document.getElementById('event-input');
    const text = input?.value?.trim();
    if (!text) return;

    this.events.push({
      id: Date.now(),
      date: this.selDate,
      text: text
    });

    Storage.set('cal_ev', this.events);
    input.value = '';
    this.render();
    this.renderEvents();
  },

  /**
   * Render the event list for the currently selected date
   */
  renderEvents() {
    const list = document.getElementById('event-list');
    if (!list) return;

    const events = this.events.filter((e) => e.date === this.selDate);
    list.innerHTML = events.map((e) => `
      <div class="event-item">
        <span>${e.text}</span>
        <button data-id="${e.id}">✖</button>
      </div>
    `).join('');

    list.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.events = this.events.filter((e) => e.id !== +btn.dataset.id);
        Storage.set('cal_ev', this.events);
        this.render();
        this.renderEvents();
      });
    });
  }
};


/* ========================================================================
 * Inspiration Module - Tips and tricks display
 * ======================================================================== */

/**
 * Inspiration module displays random programming and productivity tips.
 */
const Insp = {
  /**
   * Array of local tips
   * @type {Array<{t: string, c: string}>}
   */
  tips: [
    { t: '使用 Ctrl+S 保存文件，养成好习惯。', c: '编程技巧' },
    { t: 'Git 的 rebase -i 可以整理提交历史。', c: 'Git 技巧' },
    { t: '在终端中使用 * 通配符可以匹配多个文件。', c: 'Linux 技巧' },
    { t: 'Arch Linux 的 pacman -Syu 是系统更新命令。', c: 'Arch Linux' },
    { t: '使用 ChatGPT 写代码时，提供上下文能获得更好的答案。', c: 'AI 工具' },
    { t: 'CSS Grid 比 Flexbox 更适合二维布局。', c: '编程技巧' },
    { t: '使用 tmux 可以管理终端会话。', c: 'Linux 技巧' },
    { t: 'yay 是 Arch Linux 上常用的 AUR 助手。', c: 'Arch Linux' }
  ],

  /**
   * Initialize the inspiration module.
   */
  async init() {
    this.render();
    document.getElementById('refresh-inspiration')?.addEventListener('click', () => this.render());
  },

  /**
   * Render a random tip to the DOM
   */
  render() {
    const tip = this.tips[Math.floor(Math.random() * this.tips.length)];
    const categoryEl = document.getElementById('inspiration-category');
    const textEl = document.getElementById('inspiration-text');

    if (categoryEl) categoryEl.textContent = tip.c;
    if (textEl) textEl.textContent = tip.t;
  }
};


/* ========================================================================
 * Settings Module - Theme, color, and font size customization
 * ======================================================================== */

/**
 * Settings module handles theme switching (light/dark/auto),
 * accent color selection, and font size adjustment.
 */
const Settings = {
  /**
   * Available accent color themes
   * @type {Object<string, {s: string, e: string}>}
   */
  colors: {
    purple: { s: '#a78bfa', e: '#60a5fa' },
    blue:   { s: '#60a5fa', e: '#3b82f6' },
    green:  { s: '#34d399', e: '#10b981' },
    orange: { s: '#fbbf24', e: '#f59e0b' },
    pink:   { s: '#f472b6', e: '#ec4899' }
  },

  /**
   * Initialize the settings module.
   */
  init() {
    const saved = Storage.get('settings', { theme: 'auto', color: 'purple', fs: 14 });

    // Apply theme
    if (saved.theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else if (saved.theme === 'dark') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      // Auto: follow system preference
      if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        document.documentElement.setAttribute('data-theme', 'light');
      }
    }

    // Apply color
    this.color(saved.color);

    // Apply font size
    document.body.style.fontSize = saved.fs + 'px';

    // Set active radio/swatch
    document.querySelector(`input[name="theme"][value="${saved.theme}"]`)?.setAttribute('checked', '');
    document.querySelectorAll('.swatch').forEach((s) => {
      s.classList.toggle('active', s.dataset.color === saved.color);
    });

    // Font size slider
    const slider = document.getElementById('font-size-slider');
    if (slider) slider.value = saved.fs;

    // Settings overlay toggle
    document.getElementById('settings-btn')?.addEventListener('click', () => {
      document.getElementById('settings-overlay').classList.add('active');
    });
    document.getElementById('close-settings')?.addEventListener('click', () => {
      document.getElementById('settings-overlay').classList.remove('active');
    });
    document.getElementById('settings-overlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) e.target.classList.remove('active');
    });

    // Theme radio buttons
    document.querySelectorAll('input[name="theme"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        const settings = Storage.get('settings', {});
        settings.theme = e.target.value;
        Storage.set('settings', settings);

        if (e.target.value === 'light') {
          document.documentElement.setAttribute('data-theme', 'light');
        } else if (e.target.value === 'dark') {
          document.documentElement.removeAttribute('data-theme');
        } else {
          if (window.matchMedia('(prefers-color-scheme: light)').matches) {
            document.documentElement.setAttribute('data-theme', 'light');
          }
        }
      });
    });

    // Color swatches
    document.querySelectorAll('.swatch').forEach((swatch) => {
      swatch.addEventListener('click', () => {
        document.querySelectorAll('.swatch').forEach((s) => s.classList.remove('active'));
        swatch.classList.add('active');
        this.color(swatch.dataset.color);

        const settings = Storage.get('settings', {});
        settings.color = swatch.dataset.color;
        Storage.set('settings', settings);
      });
    });

    // Font size slider
    document.getElementById('font-size-slider')?.addEventListener('input', (e) => {
      const size = +e.target.value;
      document.body.style.fontSize = size + 'px';

      const settings = Storage.get('settings', {});
      settings.fs = size;
      Storage.set('settings', settings);
    });
  },

  /**
   * Apply an accent color theme
   * @param {string} color - Color key (purple, blue, green, orange, pink)
   */
  color(color) {
    const theme = this.colors[color] || this.colors.purple;
    document.documentElement.style.setProperty('--accent-start', theme.s);
    document.documentElement.style.setProperty('--accent-end', theme.e);
  }
};


/* ========================================================================
 * Charts Module - Data visualization using Chart.js
 * ======================================================================== */

/**
 * Charts container holding all Chart.js instances.
 * @type {Object<string, Chart>}
 */
let charts = {};

/**
 * Track the current time range for each chart type.
 * @type {Object<string, 'week'|'month'>}
 */
const chartRanges = {
  water: 'week',
  focus: 'week',
  sleep: 'week',
  todo: 'week'
};

/**
 * Get historical data for a given key and time range
 * @param {string} key - The storage key prefix
 * @param {string} range - Time range: 'week' (7 days) or 'month' (30 days)
 * @returns {{labels: string[], data: number[]}} Labels and data array
 */
function getHist(key, range) {
  const now = new Date();
  const labels = [];
  const data = [];
  const days = range === 'month' ? 30 : 7;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    labels.push(`${date.getMonth() + 1}/${date.getDate()}`);
    data.push(Storage.get(`${key}_${U.getToday()}`, 0));
  }

  return { labels, data };
}

/**
 * Initialize a Chart.js chart instance
 * @param {string} id - The canvas element ID
 * @param {Object} config - Chart.js configuration
 * @returns {Chart|null} The created chart instance
 */
function initChart(id, config) {
  const canvas = document.getElementById(id);
  if (!canvas) return null;

  if (charts[id]) {
    charts[id].destroy();
  }

  charts[id] = new Chart(canvas.getContext('2d'), config);
  return charts[id];
}

/**
 * Get computed CSS colors for charts (theme-aware)
 * @returns {{text: string, start: string, grid: string}}
 */
function chartColors() {
  const style = getComputedStyle(document.documentElement);
  return {
    text: style.getPropertyValue('--text-secondary').trim() || '#8a8f96',
    start: style.getPropertyValue('--accent-start').trim() || '#a78bfa',
    grid: style.getPropertyValue('--border-color').trim() || 'rgba(255,255,255,0.08)'
  };
}

/**
 * Update all chart visualizations
 */
function updateCharts() {
  updWater();
  updFocus();
  updSleep();
  updTodo();
}

/**
 * Update the water intake line chart
 */
function updWater() {
  const range = chartRanges.water || 'week';
  const { labels, data } = getHist('water', range);
  const colors = chartColors();

  initChart('water-chart', {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '饮水量 (ML)',
        data,
        backgroundColor: colors.start + '22',
        borderColor: colors.start,
        tension: 0.4,
        fill: true
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

/**
 * Update the focus time bar chart
 */
function updFocus() {
  const range = chartRanges.focus || 'week';
  const { labels, data } = getHist('focus', range);
  const colors = chartColors();

  initChart('focus-chart', {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '专注时长 (min)',
        data,
        backgroundColor: colors.start + '88',
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

/**
 * Update the sleep time line chart
 */
function updSleep() {
  const range = chartRanges.sleep || 'week';
  const { labels, data } = getHist('sleep', range);
  const colors = chartColors();

  initChart('sleep-chart', {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '睡眠时间 (min)',
        data,
        backgroundColor: colors.start + '22',
        borderColor: colors.start,
        tension: 0.4,
        fill: true
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

/**
 * Update the todo completion rate bar chart
 */
function updTodo() {
    const range = chartRanges.todo || 'week';
  const now = new Date();
  const labels = [];
  const data = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    labels.push(`${date.getMonth() + 1}/${date.getDate()}`);

    const todos = Storage.get('todos', []);
    const dateStr = date.toISOString().slice(0, 10);
    const dayTasks = todos.filter(t => t.date === dateStr);
    const doneCount = dayTasks.filter(t => t.done).length;
    data.push(dayTasks.length ? Math.round((doneCount / dayTasks.length) * 100) : 0);
  }

  const colors = chartColors();

  initChart('todo-chart', {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '完成率 (%)',
        data,
        backgroundColor: data.map(v =>
          v >= 80 ? colors.start + '88' : v >= 50 ? '#fbbf2488' : '#f8717188'
        ),
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


/* ========================================================================
 * Theme Toggle - Quick theme switcher
 * ======================================================================== */

document.getElementById('theme-toggle')?.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  
  if (current === 'light') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }

  const saved = Storage.get('settings', {});
  saved.theme = current === 'light' ? 'dark' : 'light';
  Storage.set('settings', saved);
});


/* ========================================================================
 * Sidebar Toggle - Mobile/Collapsible sidebar
 * ======================================================================== */

document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('collapsed');
});

/**
 * Toggle the mobile sidebar overlay and sidebar visibility.
 */
function toggleMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  
  if (!sidebar || !overlay) return;
  
  const isOpen = sidebar.classList.contains('mobile-open');
  
  if (isOpen) {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
  } else {
    sidebar.classList.add('mobile-open');
    overlay.classList.add('active');
  }
}

document.getElementById('mobile-menu-btn')?.addEventListener('click', toggleMobileSidebar);

// Close sidebar when clicking the overlay
document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  
  if (sidebar && overlay) {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
  }
});


/* ========================================================================
 * Application Initialization
 * ======================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize all modules
  Clock.init();
  Weather.init();
  Quotes.init();
  
  Todo.init();
  Todo.initInput('todo-input', 'add-todo');
  Todo.initInput('todo-input-2', 'add-todo-2');
  
  Stats.init();
  Pomo.init();
  Notes.init();
  Calendar.init();
  Insp.init();
  Settings.init();
  Router.init();

  // Toggle button group for chart filters (time range switching)
  document.querySelectorAll('.toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      // Update active state within the same parent
      btn.parentElement.querySelectorAll('.toggle-btn').forEach((x) => x.classList.remove('active'));
      btn.classList.add('active');
      
      // Update the chart range for this specific chart
      const chartType = btn.dataset.chart;
      const range = btn.dataset.range;
      
      if (chartType && range && chartRanges.hasOwnProperty(chartType)) {
        chartRanges[chartType] = range;
        
        // Update only the affected chart
        if (chartType === 'water') updWater();
        else if (chartType === 'focus') updFocus();
        else if (chartType === 'sleep') updSleep();
        else if (chartType === 'todo') updTodo();
      }
    });
  });

  // Request notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
});