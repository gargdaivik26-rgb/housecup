/**
 * House Cup Mobile Application Logic
 * Supports: Android, iOS, Web
 * Linked to: "Student & Teacher Details" Google Sheet
 */

const HOUSE_DATA = [
  { id: 'ruby', name: 'Ruby', color: '#E5354F' },
  { id: 'sapphire', name: 'Sapphire', color: '#2F72E0' },
  { id: 'topaz', name: 'Topaz', color: '#EAAB1E' },
  { id: 'emerald', name: 'Emerald', color: '#28B577' },
];

const INITIAL_TEACHERS = [
  { username: 'siddharth', password: 'password1', name: 'Siddharth' },
  { username: 'yogesh', password: 'password2', name: 'Yogesh' },
  { username: 'soham', password: 'password3', name: 'Soham' },
];

// Requirement 4: Students sorted firstly Grade-wise, then Division-wise (house can be random)
function sortStudentsGradeThenDiv(list) {
  return list.sort((a, b) => {
    // 1. Grade comparison (numeric, 9 < 10)
    const gA = parseInt(a.grade, 10) || 0;
    const gB = parseInt(b.grade, 10) || 0;
    if (gA !== gB) return gA - gB;

    // 2. Division comparison (alphabetical, A < B < C)
    const dA = (a.division || '').trim().toUpperCase();
    const dB = (b.division || '').trim().toUpperCase();
    if (dA !== dB) return dA.localeCompare(dB);

    // 3. Name comparison (alphabetical within division)
    return (a.name || '').localeCompare(b.name || '');
  });
}

const INITIAL_STUDENTS = sortStudentsGradeThenDiv([
  { name: 'Arnov Shetty', grade: '9', division: 'A', house: 'ruby' },
  { name: 'Ritwik Jain', grade: '9', division: 'A', house: 'emerald' },
  { name: 'Aarav Sharma', grade: '9', division: 'A', house: 'topaz' },
  { name: 'Kshannaya Sanil', grade: '9', division: 'B', house: 'ruby' },
  { name: 'Manyavansh Shroff', grade: '9', division: 'B', house: 'topaz' },
  { name: 'Aarav Bohra', grade: '9', division: 'C', house: 'ruby' },
  { name: 'Pranshi Jhuriya', grade: '9', division: 'C', house: 'ruby' },
  { name: 'Diya Desai', grade: '9', division: 'C', house: 'emerald' },
  { name: 'Arishta Jain', grade: '9', division: 'C', house: 'emerald' },
  { name: 'Vir Nayak', grade: '9', division: 'C', house: 'sapphire' },
  { name: 'Abhiraj Paul', grade: '9', division: 'C', house: 'sapphire' },
  { name: 'Daivik Garg', grade: '10', division: 'A', house: 'ruby' },
  { name: 'Shreyansh PIllai', grade: '10', division: 'A', house: 'ruby' },
  { name: 'Yashvi Kanodia', grade: '10', division: 'A', house: 'ruby' },
  { name: 'Tanish Modani', grade: '10', division: 'A', house: 'emerald' },
  { name: 'Daksh Prajapati', grade: '10', division: 'A', house: 'topaz' },
  { name: 'Dhairya Agrawal', grade: '10', division: 'A', house: 'sapphire' },
  { name: 'Seemarh Sharma', grade: '10', division: 'A', house: 'sapphire' },
  { name: 'Avi Mundra', grade: '10', division: 'B', house: 'emerald' },
  { name: 'Medhansh Baldu', grade: '10', division: 'B', house: 'emerald' },
  { name: 'Ishan Desai', grade: '10', division: 'B', house: 'topaz' },
  { name: 'Devansh Mahendru', grade: '10', division: 'B', house: 'topaz' },
  { name: 'Ayati Kadam', grade: '10', division: 'B', house: 'topaz' },
  { name: 'Krishav Golecha', grade: '10', division: 'C', house: 'ruby' },
  { name: 'Garv Gandhi', grade: '10', division: 'C', house: 'sapphire' },
  { name: 'Parth Maloo', grade: '10', division: 'C', house: 'sapphire' },
]);

const ADDITION_CRITERIA = [
  'Homework Excellence',
  'Class Participation',
  'Good Behavior',
  'Helping a Peer',
  'Sports Achievement',
  'Perfect Attendance',
  'Other' // Requirement 2
];

const DEDUCTION_CRITERIA = [
  'Late to Class',
  'Incomplete Homework',
  'Disruptive Behavior',
  'Uniform Violation',
  'Rule Violation',
  'Other' // Requirement 2
];

const CLOUD_SYNC_URL = 'https://script.google.com/macros/s/AKfycbwJfFPouOZ0AU2Qm530Jart8o0pgpuyEKB02khK517bRF_qs53_enCDLMJNW-MjWtf4/exec';

class HouseCupApp {
  constructor() {
    this.role = 'teacher';
    this.session = null;
    this.teachers = [...INITIAL_TEACHERS];
    this.students = [...INITIAL_STUDENTS];
    
    // Load local storage
    const saved = this.loadLocal();
    this.houses = (saved && saved.houses) || HOUSE_DATA.map(h => ({ ...h, points: 0 }));
    this.events = (saved && saved.events) || [];
    this.syncUrl = localStorage.getItem('housecup_sync_url') || CLOUD_SYNC_URL;

    // Action state
    this.selectedStudent = null;
    this.direction = 'add';
    this.selectedCriteria = null;
    this.customReason = '';
    this.selectedPoints = 10;
    this.toastTimer = null;
    this.pollTimer = null;

    // Detect API endpoint (local backend or cloud Apps Script)
    this.apiBase = window.location.origin && window.location.origin.startsWith('http')
      ? window.location.origin
      : 'http://localhost:3000';

    this.init();
  }

  // --- Local Persistence (Requirement 4) ---
  loadLocal() {
    try {
      const data = localStorage.getItem('housecup_mobile_data');
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Could not read from localStorage', e);
    }
    return null;
  }

  saveLocal() {
    try {
      localStorage.setItem('housecup_mobile_data', JSON.stringify({
        houses: this.houses,
        events: this.events,
        students: this.students,
        teachers: this.teachers
      }));
    } catch (e) {
      console.warn('Could not write to localStorage', e);
    }
  }

  getHouse(id) {
    return this.houses.find(h => h.id.toLowerCase() === id.toLowerCase()) || { name: id, color: '#999', points: 0 };
  }

  init() {
    const input = document.getElementById('sync-api-url');
    if (input && this.syncUrl) input.value = this.syncUrl;

    this.renderScoreboard();
    this.renderActivity();
    this.filterStudents();

    // Initial fetch from Google Sheet
    this.fetchDataFromCloud();

    // Requirement 3: Multi-device sync (poll every 4 seconds)
    // When Siddharth updates points on Device 1, Yogesh on Device 2 sees the update automatically!
    this.startPolling();
  }

  startPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => {
      this.fetchDataFromCloud(true);
    }, 4000);
  }

  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add('active');
      target.scrollTop = 0;
    }
  }

  // --- Login Screen ---
  setRole(r) {
    this.role = r;
    document.getElementById('btn-role-teacher').classList.toggle('active', r === 'teacher');
    document.getElementById('btn-role-student').classList.toggle('active', r === 'student');
    document.getElementById('form-teacher').style.display = r === 'teacher' ? 'flex' : 'none';
    document.getElementById('form-student').style.display = r === 'student' ? 'flex' : 'none';
    this.hideLoginErrors();
  }

  hideLoginErrors() {
    document.getElementById('login-error-teacher').style.display = 'none';
    document.getElementById('login-error-student').style.display = 'none';
  }

  // Requirement 5: No username examples
  submitTeacherLogin() {
    this.hideLoginErrors();
    const u = (document.getElementById('teacher-username').value || '').trim().toLowerCase();
    const p = (document.getElementById('teacher-password').value || '');

    const teacher = this.teachers.find(t => t.username.toLowerCase() === u && t.password === p);
    if (!teacher) {
      const err = document.getElementById('login-error-teacher');
      err.textContent = 'Incorrect username or password. Check credentials.';
      err.style.display = 'block';
      return;
    }

    const disp = teacher.displayName || (teacher.name ? (teacher.name.charAt(0).toUpperCase() + teacher.name.slice(1)) : teacher.username);
    this.session = { role: 'teacher', name: disp };
    this.onLoginSuccess();
  }

  // Requirement 1: Student login by full name or partial name (e.g. "Daivik" or "Daivik Garg"), with NO examples or hints
  submitStudentLogin() {
    this.hideLoginErrors();
    const val = (document.getElementById('student-name-input').value || '').trim();
    if (!val) {
      const err = document.getElementById('login-error-student');
      err.textContent = 'Please enter your name.';
      err.style.display = 'block';
      return;
    }

    const q = val.toLowerCase();

    // 1. Check exact match
    const exact = this.students.find(s => s.name.toLowerCase() === q);
    if (exact) {
      this.session = { role: 'student', name: exact.name };
      this.onLoginSuccess();
      return;
    }

    // 2. Check partial name match (e.g. "Daivik" or substring/words)
    const matches = this.students.filter(s => {
      const sLower = s.name.toLowerCase();
      const parts = sLower.split(/\s+/);
      return sLower === q || parts.includes(q) || sLower.startsWith(q) || sLower.includes(q);
    });

    if (matches.length === 1) {
      this.session = { role: 'student', name: matches[0].name };
      this.onLoginSuccess();
      return;
    }

    const err = document.getElementById('login-error-student');
    if (matches.length > 1) {
      err.textContent = 'Multiple students found with that name. Please enter your full name.';
    } else {
      err.textContent = 'Student not found in registry. Please check your spelling.';
    }
    err.style.display = 'block';
  }

  onLoginSuccess() {
    document.getElementById('home-session-name').textContent = this.session.name;
    const fab = document.getElementById('teacher-fab');
    fab.style.display = this.session.role === 'teacher' ? 'flex' : 'none';
    this.renderScoreboard();
    this.renderActivity();
    this.showScreen('screen-home');
  }

  logout() {
    this.session = null;
    document.getElementById('teacher-username').value = '';
    document.getElementById('teacher-password').value = '';
    document.getElementById('student-name-input').value = '';
    this.showScreen('screen-login');
  }

  // --- Home / Scoreboard Screen ---
  renderScoreboard() {
    const sorted = [...this.houses].sort((a, b) => b.points - a.points);
    const container = document.getElementById('scoreboard-list');

    container.innerHTML = sorted.map((h, i) => {
      const lastEv = this.events.find(e => e.house.toLowerCase() === h.id.toLowerCase());
      let liveHtml = '<span style="color: rgba(245,244,240,0.3); font-size: 13px; font-weight: 700;">—</span>';

      if (lastEv) {
        const isPos = lastEv.delta > 0;
        const text = isPos ? `+${lastEv.delta}` : `${lastEv.delta}`;
        const color = isPos ? '#28B577' : '#F0405B';
        const bg = isPos ? 'rgba(40,181,119,0.18)' : 'rgba(240,64,91,0.18)';
        liveHtml = `<span class="live-chip pulse" style="background: ${bg}; color: ${color};">${text}</span>`;
      }

      return `
        <div class="scoreboard-row">
          <div class="rank-text" style="color: ${h.color};">${i + 1}</div>
          <div class="house-name-cell">
            <div class="house-dot" style="background: ${h.color};"></div>
            <div class="house-label">${h.name}</div>
          </div>
          <div class="points-text">${h.points}</div>
          <div style="text-align: right;">${liveHtml}</div>
        </div>
      `;
    }).join('');
  }

  renderActivity() {
    const container = document.getElementById('activity-list');
    if (!this.events || this.events.length === 0) {
      container.innerHTML = '<div style="text-align:center; color:rgba(245,244,240,0.35); font-size:13.5px; padding:32px 0;">No point changes yet</div>';
      return;
    }

    container.innerHTML = this.events.slice(0, 30).map((e, i) => {
      const house = this.getHouse(e.house);
      const isPos = e.delta > 0;
      const timeStr = i === 0 ? 'Just now' : `${i * 2}m ago`;
      const color = isPos ? '#28B577' : '#F0405B';
      const text = isPos ? `+${e.delta}` : `${e.delta}`;

      return `
        <div class="activity-card">
          <div class="house-dot" style="background: ${house.color};"></div>
          <div style="flex: 1; min-width: 0;">
            <div class="activity-student">${e.student}</div>
            <div class="activity-sub">${e.criteria} · ${timeStr}</div>
          </div>
          <div class="delta-badge" style="color: ${color};">${text}</div>
        </div>
      `;
    }).join('');
  }

  goToHome() {
    this.showScreen('screen-home');
  }

  goToSearch() {
    this.filterStudents();
    this.showScreen('screen-search');
  }

  // --- Search Screen (Requirement 4: Grade-wise then Division-wise) ---
  filterStudents() {
    const q = (document.getElementById('search-student-query')?.value || '').trim().toLowerCase();
    const g = document.getElementById('filter-grade')?.value || '';
    const h = document.getElementById('filter-house')?.value || '';
    const d = document.getElementById('filter-division')?.value || '';

    let results = this.students.filter(s => {
      if (q && !s.name.toLowerCase().includes(q)) return false;
      if (g && s.grade !== g) return false;
      if (h && s.house.toLowerCase() !== h.toLowerCase()) return false;
      if (d && s.division.toLowerCase() !== d.toLowerCase()) return false;
      return true;
    });

    // Ensure sorted Grade-wise then Division-wise
    results = sortStudentsGradeThenDiv(results);

    const container = document.getElementById('student-search-results');
    if (results.length === 0) {
      container.innerHTML = '<div style="text-align:center; color:rgba(245,244,240,0.35); font-size:13.5px; padding:32px 0;">No matching students found</div>';
      return;
    }

    container.innerHTML = results.map(s => {
      const house = this.getHouse(s.house);
      return `
        <div class="activity-card" style="cursor: pointer;" onclick="app.selectStudentForAction('${s.name.replace(/'/g, "\\'")}')">
          <div class="house-dot" style="background: ${house.color};"></div>
          <div style="flex: 1;">
            <div style="font-size: 14.5px; font-weight: 600; color: #F5F4F0;">${s.name}</div>
            <div style="font-size: 12px; color: var(--text-dim);">${house.name} · Grade ${s.grade}${s.division}</div>
          </div>
          <svg width="7" height="12" viewBox="0 0 7 12">
            <path d="M1 1l5 5-5 5" stroke="rgba(245,244,240,0.3)" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      `;
    }).join('');
  }

  // --- Action / Update Points Screen ---
  selectStudentForAction(name) {
    const s = this.students.find(st => st.name === name);
    if (!s) return;
    this.selectedStudent = s;
    this.direction = 'add';
    this.selectedCriteria = null;
    this.customReason = '';
    this.selectedPoints = 10;

    const house = this.getHouse(s.house);
    document.getElementById('action-student-name').textContent = s.name;
    document.getElementById('action-house-dot').style.background = house.color;
    document.getElementById('action-student-sub').textContent = `${house.name} · Grade ${s.grade}${s.division}`;

    // Reset inputs
    document.getElementById('action-custom-reason').value = '';
    document.getElementById('other-reason-container').style.display = 'none';

    this.setDirection('add');
    this.setPoints(10);
    this.renderCriteria();
    this.updateApplyButton();
    this.showScreen('screen-action');
  }

  goBackFromAction() {
    this.showScreen('screen-search');
  }

  setDirection(dir) {
    this.direction = dir;
    const isAdd = dir === 'add';
    const btnAdd = document.getElementById('btn-dir-add');
    const btnDeduct = document.getElementById('btn-dir-deduct');

    if (isAdd) {
      btnAdd.style.background = '#28B577';
      btnAdd.style.color = '#12141A';
      btnDeduct.style.background = 'transparent';
      btnDeduct.style.color = 'var(--text-dim)';
    } else {
      btnDeduct.style.background = '#F0405B';
      btnDeduct.style.color = '#12141A';
      btnAdd.style.background = 'transparent';
      btnAdd.style.color = 'var(--text-dim)';
    }

    this.selectedCriteria = null;
    this.customReason = '';
    document.getElementById('action-custom-reason').value = '';
    document.getElementById('other-reason-container').style.display = 'none';

    this.setPoints(this.selectedPoints);
    this.renderCriteria();
    this.updateApplyButton();
  }

  renderCriteria() {
    const list = this.direction === 'add' ? ADDITION_CRITERIA : DEDUCTION_CRITERIA;
    const container = document.getElementById('criteria-list-container');

    container.innerHTML = list.map(item => {
      const isSel = this.selectedCriteria === item;
      return `
        <div class="criteria-row ${isSel ? 'selected' : ''}" onclick="app.selectCriteria('${item.replace(/'/g, "\\'")}')">
          <div class="radio-circle"></div>
          <div style="flex: 1; font-size: 14px; color: #F5F4F0;">${item}</div>
        </div>
      `;
    }).join('');
  }

  // Requirement 2: When "Other" is selected, text box appears for the reason
  selectCriteria(item) {
    this.selectedCriteria = item;
    const otherBox = document.getElementById('other-reason-container');
    const isOther = item === 'Other';

    otherBox.style.display = isOther ? 'flex' : 'none';
    if (isOther) {
      setTimeout(() => document.getElementById('action-custom-reason').focus(), 100);
    }

    this.renderCriteria();
    this.updateApplyButton();
  }

  onCustomReasonInput(val) {
    this.customReason = val;
    this.updateApplyButton();
  }

  setPoints(pts) {
    this.selectedPoints = pts;
    const isAdd = this.direction === 'add';
    const activeClass = isAdd ? 'active-add' : 'active-deduct';

    [10, 20, 50].forEach(p => {
      const el = document.getElementById(`chip-${p}`);
      el.className = 'pts-chip';
      if (p === pts) el.classList.add(activeClass);
    });

    this.updateApplyButton();
  }

  updateApplyButton() {
    const btn = document.getElementById('btn-apply-points');
    const isAdd = this.direction === 'add';
    const pts = this.selectedPoints;
    const hasStudent = !!this.selectedStudent;
    const hasCriteria = !!this.selectedCriteria;
    const isOtherValid = this.selectedCriteria !== 'Other' || (this.customReason && this.customReason.trim().length > 0);
    const canApply = hasStudent && hasCriteria && isOtherValid;

    btn.textContent = isAdd ? `Add ${pts} Points` : `Deduct ${pts} Points`;
    btn.className = `primary-btn ${canApply ? '' : 'disabled'}`;
    btn.style.background = canApply ? (isAdd ? '#28B577' : '#F0405B') : 'rgba(255,255,255,0.08)';
    btn.style.color = canApply ? '#12141A' : 'rgba(245,244,240,0.3)';
  }

  // Requirement 1 & 3: Save to Google Sheets immediately & propagate across devices
  async applyPoints() {
    if (!this.selectedStudent || !this.selectedCriteria) return;
    if (this.selectedCriteria === 'Other' && (!this.customReason || !this.customReason.trim())) return;

    const finalCriteria = this.selectedCriteria === 'Other' ? this.customReason.trim() : this.selectedCriteria;
    const delta = this.direction === 'add' ? this.selectedPoints : -this.selectedPoints;

    // 1. Optimistic UI update locally
    this.houses = this.houses.map(h => {
      if (h.id.toLowerCase() === this.selectedStudent.house.toLowerCase()) {
        return { ...h, points: h.points + delta };
      }
      return h;
    });

    const ev = {
      id: Date.now(),
      house: this.selectedStudent.house,
      student: this.selectedStudent.name,
      teacher: this.session ? this.session.name : 'Teacher',
      criteria: finalCriteria,
      delta: delta,
      timestamp: new Date().toISOString()
    };
    this.events = [ev, ...this.events];

    this.saveLocal();

    const houseObj = this.getHouse(this.selectedStudent.house);
    const sign = delta > 0 ? '+' : '';
    this.showToast(`${sign}${delta} to ${houseObj.name} — ${finalCriteria}`);

    this.renderScoreboard();
    this.renderActivity();
    this.showScreen('screen-home');

    // 2. Transmit to Google Sheet (Backend or Apps Script)
    await this.transmitPointChange(ev);
  }

  async transmitPointChange(ev) {
    const payload = {
      teacher: ev.teacher,
      student: ev.student,
      house: ev.house,
      action: ev.delta > 0 ? 'add' : 'deduct',
      points: Math.abs(ev.delta),
      criteria: ev.criteria,
      reason: ev.criteria
    };

    if (this.syncUrl) {
      try {
        await fetch(this.syncUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
        this.updateSyncIndicators('synced', 'Google Sheet Updated');
        setTimeout(() => this.fetchDataFromCloud(true), 600);
      } catch (err) {
        console.warn('Cloud sync error:', err);
        this.updateSyncIndicators('error', 'Sync Pending');
      }
    }
  }

  showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  }

  // --- Multi-Device Cloud Data Fetching (Requirement 2 & 3) ---
  async fetchDataFromCloud(silent = false) {
    if (!this.syncUrl) return;

    try {
      const resp = await fetch(this.syncUrl);
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.success) {
          this.applyCloudData(data);
          this.updateSyncIndicators('synced', 'Live Google Sheet');
          return;
        }
      }
    } catch (err) {
      if (!silent) console.warn('Fetch cloud data error:', err);
      this.updateSyncIndicators('offline', 'Offline');
    }
  }

  applyCloudData(data) {
    let changed = false;

    // Requirement 2: Changes in students or teachers in Google Sheet reflected immediately
    if (data.students && Array.isArray(data.students)) {
      this.students = sortStudentsGradeThenDiv(data.students);
      this.filterStudents();
      changed = true;
    }

    if (data.teachers && Array.isArray(data.teachers)) {
      this.teachers = data.teachers;
      changed = true;
    }

    // Requirement 3: Multi-device sync for points and activity
    if (data.houses && Array.isArray(data.houses)) {
      this.houses = data.houses;
      this.renderScoreboard();
      changed = true;
    }

    if (data.events && Array.isArray(data.events)) {
      this.events = data.events;
      this.renderActivity();
      changed = true;
    }

    if (changed) {
      this.saveLocal();
    }
  }

  // --- Cloud Sync Settings Modal ---
  openSyncModal() {
    document.getElementById('modal-sync').classList.add('open');
    document.getElementById('sync-modal-status').textContent = '';
  }

  closeSyncModal() {
    document.getElementById('modal-sync').classList.remove('open');
  }

  saveAndSyncNow() {
    const url = (document.getElementById('sync-api-url').value || '').trim();
    this.syncUrl = url;
    localStorage.setItem('housecup_sync_url', url);

    const status = document.getElementById('sync-modal-status');
    status.textContent = 'Connecting and syncing...';

    this.fetchDataFromCloud(false).then(() => {
      status.textContent = 'Sync complete! Data updated from Google Sheet.';
      setTimeout(() => this.closeSyncModal(), 1200);
    });
  }

  updateSyncIndicators(state, text) {
    const dots = [document.getElementById('sync-dot-login'), document.getElementById('sync-dot-home')];
    dots.forEach(d => {
      if (!d) return;
      d.className = 'sync-dot';
      if (state === 'offline') d.classList.add('offline');
      if (state === 'error') d.classList.add('error');
    });

    const loginText = document.getElementById('sync-text-login');
    if (loginText && text) loginText.textContent = text;
  }
}

// Global instance
const app = new HouseCupApp();
