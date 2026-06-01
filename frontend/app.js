/* ===== State ===== */
let capturedFile = null;

/* ===== Symptom Filter ===== */
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;
    document.querySelectorAll('.symptom-card').forEach(card => {
      if (filter === 'all') { card.style.display = ''; return; }
      card.style.display = card.dataset.crop === filter ? '' : 'none';
    });
  });
});

/* ===== Crop Switch — show relevant symptoms ===== */
document.querySelectorAll('input[name="crop"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const crop = radio.value;
    document.querySelectorAll('.symptom-card').forEach(card => {
      card.style.display = card.dataset.crop === crop ? '' : 'none';
    });
    // Highlight the active filter button
    document.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.filter === crop || b.dataset.filter === 'all');
    });
  });
});
// Initial trigger
const checkedCrop = document.querySelector('input[name="crop"]:checked');
if (checkedCrop) checkedCrop.dispatchEvent(new Event('change'));

/* ===== Drag & Drop Upload ===== */
const uploadArea = document.getElementById('uploadArea');
const photoInput = document.getElementById('photoInput');
const uploadPreview = document.getElementById('uploadPreview');
const previewImg = document.getElementById('previewImg');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const removeBtn = document.getElementById('removePhoto');

['dragenter', 'dragover'].forEach(e => {
  uploadArea.addEventListener(e, ev => { ev.preventDefault(); uploadArea.classList.add('dragover'); });
});
['dragleave', 'drop'].forEach(e => {
  uploadArea.addEventListener(e, ev => { ev.preventDefault(); uploadArea.classList.remove('dragover'); });
});
uploadArea.addEventListener('drop', ev => {
  const file = ev.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) handleFile(file);
});
photoInput.addEventListener('change', () => {
  if (photoInput.files[0]) handleFile(photoInput.files[0]);
});

function handleFile(file) {
  capturedFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    previewImg.src = e.target.result;
    uploadArea.classList.add('has-image');
  };
  reader.readAsDataURL(file);
}

removeBtn.addEventListener('click', () => {
  capturedFile = null;
  photoInput.value = '';
  uploadArea.classList.remove('has-image');
  previewImg.src = '';
});

/* ===== Form Validation ===== */
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

/* ===== Register / Login ===== */
async function registerOrLogin() {
  const farmerName = document.getElementById('farmerName').value.trim();
  const phone = document.getElementById('phone').value.trim();
  if (!farmerName || !phone) return;

  let userId = localStorage.getItem('userId');
  if (userId) return userId;

  try {
    const res = await fetch('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farmerName, phone })
    });
    const data = await res.json();
    if (data.userId) {
      localStorage.setItem('userId', data.userId);
      return data.userId;
    }
  } catch (e) {
    console.log('Registration:', e);
  }
}

/* ===== Location ===== */
function getLocation() {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

/* ===== Collect Symptoms ===== */
function getSymptomValues() {
  const symptoms = {};
  document.querySelectorAll('.symptom-card input[type="checkbox"]').forEach(cb => {
    symptoms[cb.name] = cb.checked;
  });
  return symptoms;
}

/* ===== Submit ===== */
const form = document.getElementById('report-form');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  // Validate required
  const nameValid = validateField('farmerName');
  const phoneValid = validateField('phone');
  if (!nameValid || !phoneValid) return;

  // Validate at least one symptom
  const symptoms = getSymptomValues();
  const hasSymptom = Object.values(symptoms).some(v => v);
  const hint = document.getElementById('symptomsHint');
  if (!hasSymptom) {
    hint.classList.add('error');
    hint.textContent = 'Please select at least one symptom';
    hint.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  hint.classList.remove('error');
  hint.textContent = 'Select at least one symptom';

  // Register / login
  const userId = await registerOrLogin();

  // Location
  const locationData = await getLocation();
  const location = document.getElementById('location').value.trim();

  // Build payload
  const crop = document.querySelector('input[name="crop"]:checked').value;
  let photoBase64 = null;
  if (capturedFile) {
    photoBase64 = await new Promise(resolve => {
      const r = new FileReader();
      r.onload = () => resolve(r.result.split(',')[1]);
      r.readAsDataURL(capturedFile);
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
    userId
  };
  if (photoBase64) payload.photoBase64 = photoBase64;

  // Show loading
  submitBtn.disabled = true;
  submitBtn.classList.add('loading');

  try {
    const res = await fetch('/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Server error');
    }

    const data = await res.json();
    showResult(data.advisory || data.outcome, payload.photoBase64);
    form.reset();
    capturedFile = null;
    uploadArea.classList.remove('has-image');
    previewImg.src = '';
    // Re-trigger crop filter
    const cropRadio = document.querySelector('input[name="crop"]:checked');
    if (cropRadio) cropRadio.dispatchEvent(new Event('change'));
  } catch (err) {
    const container = document.getElementById('resultContainer');
    const list = document.getElementById('resultList');
    list.innerHTML = `<li style="color:var(--red-500);padding-left:0;">Error: ${err.message}</li>`;
    document.getElementById('resultTitle').textContent = 'Submission Failed';
    document.getElementById('resultConfidence').textContent = '—';
    document.getElementById('resultRisk').textContent = '—';
    document.getElementById('output').classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');
  }
});

/* ===== Show Result ===== */
function showResult(advisory, photoBase64) {
  document.getElementById('resultTitle').textContent = advisory.disease || 'Unknown';
  document.getElementById('resultConfidence').textContent = advisory.confidence || '—';
  document.getElementById('resultRisk').textContent = advisory.risk || '—';

  const list = document.getElementById('resultList');
  const items = advisory.advice || [];
  list.innerHTML = items.map(a => `<li>${a}</li>`).join('') || '<li>No specific advice available</li>';

  // Add photo if submitted
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

/* ===== Reset Form (from result button) ===== */
function resetForm() {
  document.getElementById('output').classList.add('hidden');
  document.getElementById('report-form').reset();
  capturedFile = null;
  uploadArea.classList.remove('has-image');
  previewImg.src = '';
  const cropRadio = document.querySelector('input[name="crop"]:checked');
  if (cropRadio) cropRadio.dispatchEvent(new Event('change'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
