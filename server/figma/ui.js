// ui.js
const jsonArea = document.getElementById('json');
const urlInput = document.getElementById('url');
const fetchBtn = document.getElementById('fetchBtn');
const createBtn = document.getElementById('create');
const clearBtn = document.getElementById('clear');
const status = document.getElementById('status');

fetchBtn.onclick = async () => {
  const url = urlInput.value.trim();
  if (!url) { status.textContent = "Enter a URL first."; return; }
  try {
    status.textContent = "Fetching...";
    const res = await fetch(url);
    const data = await res.text();
    jsonArea.value = data;
    status.textContent = "Fetched JSON.";
  } catch (e) {
    status.textContent = "Fetch failed: " + e.message;
  }
};

createBtn.onclick = () => {
  parent.postMessage({ pluginMessage: { type: 'create-wireframe', json: jsonArea.value } }, '*');
};

clearBtn.onclick = () => { jsonArea.value = ''; status.textContent = ''; };
