import { CONFIG, isConfigured } from './config.js';

// Tant que JSONBin n'est pas configuré, les données sont stockées localement
// (localStorage) pour permettre de découvrir/tester l'application immédiatement.
const LOCAL_FALLBACK_KEY = 'bpea_local_data';

function readLocalFallback() {
  try {
    const data = JSON.parse(localStorage.getItem(LOCAL_FALLBACK_KEY));
    return { annonces: data?.annonces || [], utilisateurs: data?.utilisateurs || [] };
  } catch {
    return { annonces: [], utilisateurs: [] };
  }
}

function writeLocalFallback(data) {
  localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(data));
}

export async function fetchData() {
  if (!isConfigured()) {
    return readLocalFallback();
  }
  const res = await fetch(`${CONFIG.JSONBIN_BASE_URL}/${CONFIG.JSONBIN_BIN_ID}/latest`, {
    headers: {
      'X-Master-Key': CONFIG.JSONBIN_API_KEY,
      'X-Bin-Meta': 'false',
    },
  });
  if (!res.ok) {
    throw new Error(`Impossible de charger les données (erreur ${res.status})`);
  }
  const data = await res.json();
  return { annonces: Array.isArray(data?.annonces) ? data.annonces : [], utilisateurs: Array.isArray(data?.utilisateurs) ? data.utilisateurs : [] };
}

export async function persistData(data) {
  if (!isConfigured()) {
    writeLocalFallback(data);
    return data;
  }
  const res = await fetch(`${CONFIG.JSONBIN_BASE_URL}/${CONFIG.JSONBIN_BIN_ID}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': CONFIG.JSONBIN_API_KEY,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`Impossible d'enregistrer les données (erreur ${res.status})`);
  }
  return res.json();
}

export async function uploadImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch(`${CONFIG.IMGBB_UPLOAD_URL}?key=${CONFIG.IMGBB_API_KEY}`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error("Échec de l'upload de l'image");
  }
  return data.data.url;
}
