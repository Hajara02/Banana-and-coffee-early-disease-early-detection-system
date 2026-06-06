/* ===== State ===== */
let capturedFile = null;
let currentUser = null;

const currentPage = window.location.pathname.split('/').pop() || 'auth.html';
const isAuthPage = currentPage === '' || currentPage === 'index.html' || currentPage === 'auth.html';
const isDashboardPage = currentPage === 'dashboard.html';

const authContainer = document.getElementById('authContainer');
const dashboardContainer = document.getElementById('dashboardContainer');
const reportContainer = document.getElementById('reportContainer');
const authTabs = document.querySelectorAll('.auth-tab');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const newReportBtn = document.getElementById('newReportBtn');
const logoutBtn = document.getElementById('logoutBtn');
const backToDashboardBtn = document.getElementById('backToDashboardBtn');
const reportSummary = document.getElementById('reportSummary');
const welcomeName = document.getElementById('welcomeName');
const loginError = document.getElementById('loginError');
const signupError = document.getElementById('signupError');

const uploadArea = document.getElementById('uploadArea');
const photoInput = document.getElementById('photoInput');
const browseBtn = document.getElementById('browseBtn');
const uploadPreview = document.getElementById('uploadPreview');
const previewImg = document.getElementById('previewImg');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const removeBtn = document.getElementById('removePhoto');
const form = document.getElementById('report-form');
const submitBtn = document.getElementById('submitBtn');

/* ===== View Helpers ===== */
function redirectToDashboard() {
  window.location.href = 'dashboard.html';
}

function redirectToAuth() {
  window.location.href = 'auth.html';
}

function showView(view) {
  if (authContainer) authContainer.classList.toggle('hidden', view !== 'auth');
  if (dashboardContainer) dashboardContainer.classList.toggle('hidden', view !== 'dashboard');
  if (reportContainer) reportContainer.classList.toggle('hidden', view !== 'report');
}

function setAuthTab(targetId) {
  authTabs.forEach(tab => {
    const panel = document.getElementById(tab.dataset.target);
    tab.classList.toggle('active', tab.dataset.target === targetId);
    if (panel) panel.classList.toggle('hidden', panel.id !== targetId);
  });
  if (loginError) loginError.textContent = '';
  if (signupError) signupError.textContent = '';
}

function showAuthError(element, message) {
  element.textContent = message || 'Unable to continue. Please try again.';
}

function validateInput(id, required = true) {
  const input = document.getElementById(id);
  const error = document.getElementById(`${id}Error`) || input.parentElement.parentElement.querySelector('.field-error');
  if (!input) return false;
  if (!required || input.value.trim()) {
    input.classList.remove('error');
    if (error) error.textContent = '';
    return true;
  }
  input.classList.add('error');
  if (error) error.textContent = 'This field is required';
  return false;
}

function loadStoredUser() {
  const stored = localStorage.getItem('farmUser');
  if (!stored) return;
  try {
    currentUser = JSON.parse(stored);
  } catch (error) {
    currentUser = null;
    localStorage.removeItem('farmUser');
  }
}

loadStoredUser();
if (isAuthPage && currentUser) {
  redirectToDashboard();
} else if (isDashboardPage) {
  showDashboard();
}

function saveCurrentUser(user) {
  currentUser = user;
  localStorage.setItem('farmUser', JSON.stringify(user));
}

function clearCurrentUser() {
  currentUser = null;
  localStorage.removeItem('farmUser');
}

function updateDashboardHeader() {
  welcomeName.textContent = currentUser ? `Welcome, ${currentUser.farmerName}` : 'Farmer';
}

async function showDashboard() {
  if (!currentUser) {
    redirectToAuth();
    return;
  }
  if (welcomeName) updateDashboardHeader();
  showView('dashboard');
  await loadDashboardReports();
}

async function loadDashboardReports() {
  if (!currentUser) {
    reportSummary.textContent = 'No farmer logged in.';
    return;
  }

  reportSummary.textContent = 'Loading your reports...';

  try {
    const response = await fetch(`/reports/${encodeURIComponent(currentUser.userId)}`);
    if (!response.ok) {
      reportSummary.textContent = 'Unable to load reports right now.';
      return;
    }
    const data = await response.json();
    renderReportSummary(data.reports || []);
  } catch (error) {
    reportSummary.textContent = 'Unable to connect to the server.';
  }
}

function renderReportSummary(reports) {
  if (!reports || reports.length === 0) {
    reportSummary.innerHTML = '<p class="empty-state">No reports yet. Tap New Report to submit your first farm assessment.</p>';
    return;
  }

  const latest = reports.slice(-5).reverse();
  reportSummary.innerHTML = latest.map(report => {
    const date = new Date(report.timestamp).toLocaleDateString();
    const disease = report.outcome?.disease || 'Unknown';
    const risk = report.outcome?.risk || 'Unknown';
    return `
      <div class="report-item">
        <div class="report-row"><strong>${disease}</strong> <span>${date}</span></div>
        <div class="report-row report-meta"><span>${report.crop.toUpperCase()}</span><span>${risk}</span></div>
      </div>
    `;
  }).join('');
}

function getLocation() {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      position => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

function getSymptomValues() {
  const symptoms = {};
  document.querySelectorAll('.symptom-card input[type="checkbox"]').forEach(cb => {
    symptoms[cb.name] = cb.checked;
  });
  return symptoms;
}

function handleFile(file) {
  capturedFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    previewImg.src = e.target.result;
    uploadArea.classList.add('has-image');
  };
  reader.readAsDataURL(file);
}

/* ===== Event Binding ===== */
if (authTabs.length) {
  authTabs.forEach(tab => {
    tab.addEventListener('click', () => setAuthTab(tab.dataset.target));
  });
}

if (loginBtn) loginBtn.addEventListener('click', loginUser);
if (signupBtn) signupBtn.addEventListener('click', registerUser);
if (newReportBtn) {
  newReportBtn.addEventListener('click', () => {
    showView('report');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    clearCurrentUser();
    redirectToAuth();
  });
}

document.querySelectorAll('.password-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    btn.textContent = isHidden ? '🙈' : '👁️';
  });
});

if (backToDashboardBtn) backToDashboardBtn.addEventListener('click', () => showDashboard());

if (uploadArea) {
  ['dragenter', 'dragover'].forEach(eventName => {
    uploadArea.addEventListener(eventName, event => {
      event.preventDefault();
      uploadArea.classList.add('dragover');
    });
  });
  ['dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, event => {
      event.preventDefault();
      uploadArea.classList.remove('dragover');
    });
  });
  uploadArea.addEventListener('drop', event => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleFile(file);
  });
}
if (photoInput) {
  photoInput.addEventListener('change', () => {
    if (photoInput.files[0]) handleFile(photoInput.files[0]);
  });
}
if (browseBtn && photoInput) {
  browseBtn.addEventListener('click', () => photoInput.click());
}
if (removeBtn) {
  removeBtn.addEventListener('click', () => {
    capturedFile = null;
    if (photoInput) photoInput.value = '';
    if (uploadArea) uploadArea.classList.remove('has-image');
    if (previewImg) previewImg.src = '';
  });
}

/* ===== Filter and Symptom Handling ===== */
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;
    document.querySelectorAll('.symptom-card').forEach(card => {
      card.style.display = filter === 'all' ? '' : (card.dataset.crop === filter ? '' : 'none');
    });
  });
});

document.querySelectorAll('input[name="crop"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const crop = radio.value;
    document.querySelectorAll('.symptom-card').forEach(card => {
      card.style.display = card.dataset.crop === crop ? '' : 'none';
    });
    document.querySelectorAll('.filter-btn').forEach(button => {
      button.classList.toggle('active', button.dataset.filter === crop || button.dataset.filter === 'all');
    });
  });
});
const checkedCrop = document.querySelector('input[name="crop"]:checked');
if (checkedCrop) checkedCrop.dispatchEvent(new Event('change'));

/* ===== Auth Actions ===== */
async function registerUser() {
  signupError.textContent = '';
  const farmerName = document.getElementById('signupName').value.trim();
  const phone = document.getElementById('signupPhone').value.trim();
  const password = document.getElementById('signupPassword').value.trim();
  const confirmPassword = document.getElementById('signupConfirmPassword').value.trim();

  const validName = validateInput('signupName');
  const validPhone = validateInput('signupPhone');
  const validPassword = validateInput('signupPassword');
  const validConfirm = validateInput('signupConfirmPassword');
  if (!validName || !validPhone || !validPassword || !validConfirm) return;
  if (password !== confirmPassword) {
    showAuthError(signupError, 'Passwords do not match.');
    return;
  }

  try {
    const response = await fetch('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farmerName, phone, password })
    });
    const data = await response.json();
    if (!response.ok) {
      showAuthError(signupError, data.error || 'Registration failed.');
      return;
    }
    saveCurrentUser({ userId: data.userId, farmerName: data.farmerName, phone: data.phone });
    redirectToDashboard();
  } catch (error) {
    showAuthError(signupError, 'Unable to connect to the server.');
  }
}

async function loginUser() {
  loginError.textContent = '';
  const farmerName = document.getElementById('loginName').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  const validName = validateInput('loginName');
  const validPassword = validateInput('loginPassword');
  if (!validName || !validPassword) return;

  try {
    const response = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farmerName, password })
    });
    const data = await response.json();
    if (!response.ok) {
      showAuthError(loginError, data.error || 'Login failed.');
      return;
    }
    saveCurrentUser({ userId: data.userId, farmerName: data.farmerName, phone: data.phone });
    redirectToDashboard();
  } catch (error) {
    showAuthError(loginError, 'Unable to connect to the server.');
  }
}

/* ===== Report Submission ===== */
if (form) {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!currentUser) {
      redirectToAuth();
      return;
    }

    const nameValid = validateField('farmerName');
  const phoneValid = validateField('phone');
  if (!nameValid || !phoneValid) return;

  const symptoms = getSymptomValues();
  const hasSymptom = Object.values(symptoms).some(Boolean);
  const hint = document.getElementById('symptomsHint');
  if (!hasSymptom) {
    hint.classList.add('error');
    hint.textContent = 'Please select at least one symptom';
    hint.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  hint.classList.remove('error');
  hint.textContent = 'Select at least one symptom';

  const locationData = await getLocation();
  const location = document.getElementById('location').value.trim();
  const crop = document.querySelector('input[name="crop"]:checked').value;

  let photoBase64 = null;
  if (capturedFile) {
    photoBase64 = await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(capturedFile);
    });
  }

  const payload = {
    farmerName: document.getElementById('farmerName').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    location,
    crop,
    symptoms,
    comments: document.getElementById('comments').value.trim(),
    gis: locationData ? { lat: locationData.lat, lng: locationData.lng } : null,
    userId: currentUser.userId
  };
  if (photoBase64) payload.photoBase64 = photoBase64;

  submitBtn.disabled = true;
  submitBtn.classList.add('loading');

  try {
    const response = await fetch('/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Server error');
    }
    showResult(data.advisory || data.outcome, photoBase64);
    await loadDashboardReports();
    form.reset();
    capturedFile = null;
    uploadArea.classList.remove('has-image');
    previewImg.src = '';
    const cropRadio = document.querySelector('input[name="crop"]:checked');
    if (cropRadio) cropRadio.dispatchEvent(new Event('change'));
  } catch (error) {
    const list = document.getElementById('resultList');
    list.innerHTML = `<li style="color:var(--red-500);padding-left:0;">Error: ${error.message}</li>`;
    document.getElementById('resultTitle').textContent = 'Submission Failed';
    document.getElementById('resultConfidence').textContent = '—';
    document.getElementById('resultRisk').textContent = '—';
    document.getElementById('output').classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');
  }
});
}

function validateField(id) {
  const input = document.getElementById(id);
  const error = input.parentElement.parentElement.querySelector('.field-error');
  if (!input.hasAttribute('required')) return true;
  if (!input.value.trim()) {
    input.classList.add('error');
    if (error) error.textContent = 'This field is required';
    return false;
  }
  input.classList.remove('error');
  if (error) error.textContent = '';
  return true;
}

document.querySelectorAll('input[required]').forEach(input => {
  input.addEventListener('blur', () => validateField(input.id));
  input.addEventListener('input', () => {
    if (input.classList.contains('error')) validateField(input.id);
  });
});

function showResult(advisory, photoBase64) {
  document.getElementById('resultTitle').textContent = advisory.disease || 'Unknown';
  document.getElementById('resultConfidence').textContent = advisory.confidence || '—';
  document.getElementById('resultRisk').textContent = advisory.risk || '—';

  const list = document.getElementById('resultList');
  const items = advisory.advice || [];
  list.innerHTML = items.map(a => `<li>${a}</li>`).join('') || '<li>No specific advice available</li>';

  if (photoBase64) {
    const imgHtml = `<li style="padding-left:0;list-style:none;margin-top:8px;">
      <strong>Uploaded image:</strong><br>
      <img src="data:image/jpeg;base64,${photoBase64}" style="max-width:100%;border-radius:8px;margin-top:4px;" />
    </li>`;
    list.insertAdjacentHTML('beforeend', imgHtml);
  }

  document.getElementById('output').classList.remove('hidden');
  document.getElementById('output').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetForm() {
  document.getElementById('output').classList.add('hidden');
  form.reset();
  capturedFile = null;
  uploadArea.classList.remove('has-image');
  previewImg.src = '';
  const cropRadio = document.querySelector('input[name="crop"]:checked');
  if (cropRadio) cropRadio.dispatchEvent(new Event('change'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function init() {
  loadStoredUser();
  if (currentUser) {
    showDashboard();
  } else {
    showView('auth');
    setAuthTab('loginPanel');
  }
}

init();
