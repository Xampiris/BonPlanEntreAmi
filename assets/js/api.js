import { CONFIG, isConfigured } from './config.js';

// Tant que JSONBin n'est pas configuré, les annonces sont stockées localement
// (localStorage) pour permettre de découvrir/tester l'application immédiatement.
const LOCAL_FALLBACK_KEY = 'bpea_local_annonces';

function readLocalFallback() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_FALLBACK_KEY)) || [];
  } catch {
    return [];
  }
}

function writeLocalFallback(annonces) {
  localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(annonces));
}

export async function fetchAnnonces() {
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
    throw new Error(`Impossible de charger les annonces (erreur ${res.status})`);
  }
  const data = await res.json();
  return Array.isArray(data?.annonces) ? data.annonces : [];
}

export async function persistAnnonces(annonces) {
  if (!isConfigured()) {
    writeLocalFallback(annonces);
    return { annonces };
  }
  const res = await fetch(`${CONFIG.JSONBIN_BASE_URL}/${CONFIG.JSONBIN_BIN_ID}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': CONFIG.JSONBIN_API_KEY,
    },
    body: JSON.stringify({ annonces }),
  });
  if (!res.ok) {
    throw new Error(`Impossible d'enregistrer les annonces (erreur ${res.status})`);
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
