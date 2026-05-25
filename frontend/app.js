const form = document.getElementById('report-form');
const output = document.getElementById('output');
const resultContainer = document.getElementById('result');
const endpoint = 'http://localhost:4000/report';

function getSymptomValues() {
  return {
    wilting: document.getElementById('wilting').checked,
    yellowLeaves: document.getElementById('yellowLeaves').checked,
    boiledAppearance: document.getElementById('boiledAppearance').checked,
    ooze: document.getElementById('ooze').checked,
    rustSpots: document.getElementById('rustSpots').checked,
    defoliation: document.getElementById('defoliation').checked,
    powderyDust: document.getElementById('powderyDust').checked,
    brownNecrosis: document.getElementById('brownNecrosis').checked,
    stuntedGrowth: document.getElementById('stuntedGrowth').checked
  };
}

function renderResult(advisory) {
  const items = [`<p><strong>Disease:</strong> ${advisory.disease}</p>`, `<p><strong>Confidence:</strong> ${advisory.confidence}</p>`, `<p><strong>Risk level:</strong> ${advisory.risk}</p>`];
  items.push('<p><strong>Recommended actions:</strong></p>');
  items.push('<ul class="result-list">');
  advisory.advice.forEach((item) => {
    items.push(`<li>${item}</li>`);
  });
  items.push('</ul>');
  resultContainer.innerHTML = items.join('');
  output.classList.remove('hidden');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    farmerName: document.getElementById('farmerName').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    location: document.getElementById('location').value.trim(),
    crop: document.getElementById('crop').value,
    symptoms: getSymptomValues(),
    comments: document.getElementById('comments').value.trim()
  };

  resultContainer.innerHTML = '<p>Sending report...</p>';
  output.classList.remove('hidden');

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Unable to submit report');
    }

    const data = await response.json();
    renderResult(data.advisory);
  } catch (error) {
    resultContainer.innerHTML = `<p>Error: ${error.message}</p><p>Is the backend running at <code>${endpoint}</code>?</p>`;
  }
});
