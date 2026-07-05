import { CONFIG, isConfigured, isImageUploadConfigured, isAdminConfigured } from './config.js';
import { CATEGORIES, getCategory, badgeClasses } from './categories.js';
import { fetchData, persistData, uploadImage } from './api.js';
import { uuid, escapeHtml, formatDate, debounce, isValidUrl } from './utils.js';
import { showToast } from './toast.js';

const PSEUDO_KEY = 'bpea_pseudo';
const THEME_KEY = 'bpea_theme';

const state = {
  annonces: [],
  utilisateurs: [],
  pseudo: localStorage.getItem(PSEUDO_KEY) || '',
  pendingPseudo: '',
  pendingIsNewUser: false,
  pseudoModalIsEdit: false,
  searchQuery: '',
  categoryFilter: null,
  sortBy: 'recent',
  editingId: null,
  formTags: [],
  formImageUrl: '',
  imageTab: 'upload',
  imageUploading: false,
};

const el = (id) => document.getElementById(id);

const dom = {
  configWarning: el('config-warning'),
  pseudoDisplay: el('pseudo-display'),
  darkToggle: el('dark-toggle'),
  settingsBtn: el('settings-btn'),

  searchInput: el('search-input'),
  sortSelect: el('sort-select'),
  newAnnonceBtn: el('new-annonce-btn'),
  emptyNewBtn: el('empty-new-btn'),
  categoryFilters: el('category-filters'),
  resetFiltersBtn: el('reset-filters-btn'),

  loadingState: el('loading-state'),
  errorState: el('error-state'),
  errorMessage: el('error-message'),
  retryBtn: el('retry-btn'),
  emptyState: el('empty-state'),
  grid: el('annonces-grid'),

  pseudoModal: el('pseudo-modal'),
  pseudoStepName: el('pseudo-step-name'),
  pseudoInput: el('pseudo-input'),
  pseudoError: el('pseudo-error'),
  pseudoCancel: el('pseudo-cancel'),
  pseudoNext: el('pseudo-next'),

  pseudoStepPassword: el('pseudo-step-password'),
  passwordStepTitle: el('password-step-title'),
  passwordStepSubtitle: el('password-step-subtitle'),
  passwordLoginFields: el('password-login-fields'),
  passwordLoginInput: el('password-login-input'),
  passwordSignupFields: el('password-signup-fields'),
  passwordNewInput: el('password-new-input'),
  passwordConfirmInput: el('password-confirm-input'),
  passwordError: el('password-error'),
  passwordForgotLink: el('password-forgot-link'),
  passwordBack: el('password-back'),
  passwordSubmit: el('password-submit'),

  adminModal: el('admin-modal'),
  adminStepPassword: el('admin-step-password'),
  adminPasswordInput: el('admin-password-input'),
  adminError: el('admin-error'),
  adminCancel: el('admin-cancel'),
  adminSubmit: el('admin-submit'),
  adminStepList: el('admin-step-list'),
  adminUsersList: el('admin-users-list'),
  adminClose: el('admin-close'),

  annonceModal: el('annonce-modal'),
  annonceModalTitle: el('annonce-modal-title'),
  annonceModalClose: el('annonce-modal-close'),
  annonceForm: el('annonce-form'),
  fieldTitre: el('field-titre'),
  fieldCategorie: el('field-categorie'),
  fieldDescription: el('field-description'),
  imageTabUpload: el('image-tab-upload'),
  imageTabUrl: el('image-tab-url'),
  imagePanelUpload: el('image-panel-upload'),
  imagePanelUrl: el('image-panel-url'),
  fieldImageFile: el('field-image-file'),
  fieldImageUrl: el('field-image-url'),
  imagePreviewWrap: el('image-preview-wrap'),
  imagePreview: el('image-preview'),
  imageUploadStatus: el('image-upload-status'),
  fieldLien: el('field-lien'),
  fieldTags: el('field-tags'),
  tagsList: el('tags-list'),
  formError: el('form-error'),
  annonceFormCancel: el('annonce-form-cancel'),
  annonceFormSubmit: el('annonce-form-submit'),
  annonceFormSubmitLabel: el('annonce-form-submit-label'),

  detailModal: el('detail-modal'),
  detailModalClose: el('detail-modal-close'),
  detailBadge: el('detail-badge'),
  detailTitre: el('detail-titre'),
  detailMeta: el('detail-meta'),
  detailImage: el('detail-image'),
  detailDescription: el('detail-description'),
  detailTags: el('detail-tags'),
  detailLien: el('detail-lien'),
  detailShareBtn: el('detail-share-btn'),
  detailEditBtn: el('detail-edit-btn'),
  detailDeleteBtn: el('detail-delete-btn'),

  confirmModal: el('confirm-modal'),
  confirmTitle: el('confirm-title'),
  confirmMessage: el('confirm-message'),
  confirmCancel: el('confirm-cancel'),
  confirmOk: el('confirm-ok'),

  toastContainer: el('toast-container'),
};

let confirmCallback = null;
let currentDetailAnnonce = null;

// ---------- Thème ----------
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = saved ? saved === 'dark' : prefersDark;
  document.documentElement.classList.toggle('dark', dark);
  dom.darkToggle.textContent = dark ? '☀️' : '🌙';
}

dom.darkToggle.addEventListener('click', () => {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  dom.darkToggle.textContent = isDark ? '☀️' : '🌙';
});

// ---------- Modales génériques ----------
function openModal(modal) {
  modal.classList.remove('hidden');
  requestAnimationFrame(() => modal.classList.add('open'));
}

function closeModal(modal) {
  modal.classList.remove('open');
  setTimeout(() => modal.classList.add('hidden'), 200);
}

function openConfirm(title, message, onConfirm) {
  dom.confirmTitle.textContent = title;
  dom.confirmMessage.textContent = message;
  confirmCallback = onConfirm;
  openModal(dom.confirmModal);
}

dom.confirmCancel.addEventListener('click', () => closeModal(dom.confirmModal));
dom.confirmOk.addEventListener('click', () => {
  closeModal(dom.confirmModal);
  if (confirmCallback) confirmCallback();
  confirmCallback = null;
});

document.querySelectorAll('.modal-overlay').forEach((overlay) => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(overlay);
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const openOverlay = document.querySelector('.modal-overlay.open');
  if (!openOverlay || openOverlay === dom.pseudoModal) return;
  if (openOverlay === dom.adminModal) {
    closeAdminModal();
  } else {
    closeModal(openOverlay);
  }
});

// ---------- Pseudo & mot de passe ----------
// Protection légère anti-usurpation entre amis : les mots de passe sont stockés
// en clair dans le même bin JSON (déjà lisible via la clé API côté client), ce
// n'est pas un vrai système sécurisé. Voir README pour le détail du compromis.
function findUser(pseudo) {
  const normalized = pseudo.trim().toLowerCase();
  return state.utilisateurs.find((u) => u.pseudo.trim().toLowerCase() === normalized);
}

function openPseudoNameStep(isEdit) {
  state.pseudoModalIsEdit = isEdit;
  dom.pseudoStepName.classList.remove('hidden');
  dom.pseudoStepPassword.classList.add('hidden');
  dom.pseudoInput.value = isEdit ? state.pseudo : '';
  dom.pseudoError.classList.add('hidden');
  dom.pseudoCancel.classList.toggle('hidden', !isEdit);
  openModal(dom.pseudoModal);
  setTimeout(() => dom.pseudoInput.focus(), 50);
}

dom.pseudoCancel.addEventListener('click', () => closeModal(dom.pseudoModal));

dom.pseudoNext.addEventListener('click', () => {
  const value = dom.pseudoInput.value.trim();
  if (value.length < 2) {
    dom.pseudoError.classList.remove('hidden');
    return;
  }
  dom.pseudoError.classList.add('hidden');
  openPasswordStep(value);
});

dom.pseudoInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') dom.pseudoNext.click();
});

dom.settingsBtn.addEventListener('click', () => openPseudoNameStep(true));

function openPasswordStep(pseudo) {
  state.pendingPseudo = pseudo;
  const existingUser = findUser(pseudo);
  state.pendingIsNewUser = !existingUser;

  dom.pseudoStepName.classList.add('hidden');
  dom.pseudoStepPassword.classList.remove('hidden');
  dom.passwordError.classList.add('hidden');
  dom.passwordLoginInput.value = '';
  dom.passwordNewInput.value = '';
  dom.passwordConfirmInput.value = '';

  if (existingUser) {
    dom.passwordStepTitle.textContent = `Bon retour, ${pseudo} !`;
    dom.passwordStepSubtitle.textContent = 'Entre ton mot de passe pour continuer.';
    dom.passwordLoginFields.classList.remove('hidden');
    dom.passwordSignupFields.classList.add('hidden');
    dom.passwordForgotLink.classList.remove('hidden');
    setTimeout(() => dom.passwordLoginInput.focus(), 50);
  } else {
    dom.passwordStepTitle.textContent = `Bienvenue, ${pseudo} !`;
    dom.passwordStepSubtitle.textContent = 'Ce pseudo est libre : choisis un mot de passe pour le protéger.';
    dom.passwordLoginFields.classList.add('hidden');
    dom.passwordSignupFields.classList.remove('hidden');
    dom.passwordForgotLink.classList.add('hidden');
    setTimeout(() => dom.passwordNewInput.focus(), 50);
  }
}

dom.passwordBack.addEventListener('click', () => openPseudoNameStep(state.pseudoModalIsEdit));

function completeLogin(pseudo) {
  state.pseudo = pseudo;
  localStorage.setItem(PSEUDO_KEY, pseudo);
  updatePseudoDisplay();
  closeModal(dom.pseudoModal);
  render();
  openDetailFromHash();
}

dom.passwordSubmit.addEventListener('click', async () => {
  const pseudo = state.pendingPseudo;
  dom.passwordError.classList.add('hidden');

  if (state.pendingIsNewUser) {
    const pwd = dom.passwordNewInput.value;
    const confirmPwd = dom.passwordConfirmInput.value;
    if (pwd.length < 4) {
      dom.passwordError.textContent = 'Le mot de passe doit contenir au moins 4 caractères.';
      dom.passwordError.classList.remove('hidden');
      return;
    }
    if (pwd !== confirmPwd) {
      dom.passwordError.textContent = 'Les mots de passe ne correspondent pas.';
      dom.passwordError.classList.remove('hidden');
      return;
    }
    const updatedUsers = [...state.utilisateurs, { pseudo, motDePasse: pwd, dateCreation: new Date().toISOString() }];
    dom.passwordSubmit.disabled = true;
    try {
      await persistData({ annonces: state.annonces, utilisateurs: updatedUsers });
      state.utilisateurs = updatedUsers;
      completeLogin(pseudo);
    } catch (err) {
      dom.passwordError.textContent = err.message;
      dom.passwordError.classList.remove('hidden');
    } finally {
      dom.passwordSubmit.disabled = false;
    }
  } else {
    const pwd = dom.passwordLoginInput.value;
    const user = findUser(pseudo);
    if (!user || user.motDePasse !== pwd) {
      dom.passwordError.textContent = 'Mot de passe incorrect.';
      dom.passwordError.classList.remove('hidden');
      return;
    }
    // Utilise la casse enregistrée à l'inscription pour que la comparaison
    // "annonce.auteur === state.pseudo" continue de reconnaître l'auteur.
    completeLogin(user.pseudo);
  }
});

dom.passwordLoginInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') dom.passwordSubmit.click();
});
dom.passwordConfirmInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') dom.passwordSubmit.click();
});

function updatePseudoDisplay() {
  dom.pseudoDisplay.textContent = state.pseudo ? `👤 ${state.pseudo}` : '';
}

// ---------- Récupération admin ----------
function closeAdminModal() {
  closeModal(dom.adminModal);
  if (!state.pseudo) openPseudoNameStep(false);
}

function openAdminModal() {
  dom.adminStepPassword.classList.remove('hidden');
  dom.adminStepList.classList.add('hidden');
  dom.adminPasswordInput.value = '';
  dom.adminError.classList.toggle('hidden', isAdminConfigured());
  if (!isAdminConfigured()) {
    dom.adminError.textContent = "Fonction admin non configurée par le déployeur (voir config.js).";
  }
  openModal(dom.adminModal);
  setTimeout(() => dom.adminPasswordInput.focus(), 50);
}

dom.passwordForgotLink.addEventListener('click', () => {
  closeModal(dom.pseudoModal);
  openAdminModal();
});

dom.adminCancel.addEventListener('click', closeAdminModal);
dom.adminClose.addEventListener('click', closeAdminModal);

dom.adminSubmit.addEventListener('click', () => {
  if (!isAdminConfigured()) return;
  const pwd = dom.adminPasswordInput.value;
  if (pwd !== CONFIG.ADMIN_PASSWORD) {
    dom.adminError.textContent = 'Mot de passe admin incorrect.';
    dom.adminError.classList.remove('hidden');
    return;
  }
  dom.adminStepPassword.classList.add('hidden');
  dom.adminStepList.classList.remove('hidden');
  dom.adminUsersList.innerHTML = state.utilisateurs.length
    ? state.utilisateurs
        .map(
          (u) => `
      <div class="flex justify-between items-center py-2 gap-3">
        <span class="font-medium">${escapeHtml(u.pseudo)}</span>
        <code class="text-slate-500 dark:text-slate-400">${escapeHtml(u.motDePasse)}</code>
      </div>`
        )
        .join('')
    : '<p class="text-slate-500 py-2">Aucun utilisateur enregistré pour le moment.</p>';
});

dom.adminPasswordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') dom.adminSubmit.click();
});

// ---------- Chargement des données ----------
async function loadData() {
  dom.loadingState.classList.remove('hidden');
  dom.errorState.classList.add('hidden');
  dom.emptyState.classList.add('hidden');
  dom.grid.classList.add('hidden');
  try {
    const data = await fetchData();
    state.annonces = data.annonces;
    state.utilisateurs = data.utilisateurs;
    dom.loadingState.classList.add('hidden');
    dom.grid.classList.remove('hidden');
    render();
    return true;
  } catch (err) {
    dom.loadingState.classList.add('hidden');
    dom.errorState.classList.remove('hidden');
    dom.errorMessage.textContent = err.message;
    return false;
  }
}

dom.retryBtn.addEventListener('click', async () => {
  const ok = await loadData();
  if (ok) proceedToPseudoFlow();
});

// ---------- Filtres & recherche ----------
function renderCategoryFilters() {
  dom.categoryFilters.innerHTML = CATEGORIES.map((cat) => {
    const active = state.categoryFilter === cat.label;
    return `
      <button type="button" data-category="${escapeHtml(cat.label)}"
        class="category-chip ${active ? 'active' : ''} text-sm px-3 py-1.5 rounded-full border ${badgeClasses(cat.color)} transition">
        ${cat.emoji} ${escapeHtml(cat.label)}
      </button>`;
  }).join('');
}

dom.categoryFilters.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-category]');
  if (!btn) return;
  const label = btn.dataset.category;
  state.categoryFilter = state.categoryFilter === label ? null : label;
  renderCategoryFilters();
  render();
});

dom.searchInput.addEventListener(
  'input',
  debounce((e) => {
    state.searchQuery = e.target.value.trim();
    render();
  }, 200)
);

dom.sortSelect.addEventListener('change', (e) => {
  state.sortBy = e.target.value;
  render();
});

dom.resetFiltersBtn.addEventListener('click', () => {
  state.searchQuery = '';
  state.categoryFilter = null;
  state.sortBy = 'recent';
  dom.searchInput.value = '';
  dom.sortSelect.value = 'recent';
  renderCategoryFilters();
  render();
});

function getVisibleAnnonces() {
  let list = [...state.annonces];

  if (state.categoryFilter) {
    list = list.filter((a) => a.categorie === state.categoryFilter);
  }

  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    list = list.filter(
      (a) =>
        a.titre.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        (a.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  }

  if (state.sortBy === 'alpha') {
    list.sort((a, b) => a.titre.localeCompare(b.titre));
  } else {
    list.sort((a, b) => new Date(b.dateCreation) - new Date(a.dateCreation));
  }

  return list;
}

// ---------- Rendu de la grille ----------
function renderCard(annonce) {
  const cat = getCategory(annonce.categorie);
  const isOwner = annonce.auteur === state.pseudo;
  const tagsHtml = (annonce.tags || [])
    .map((t) => `<span class="chip text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">#${escapeHtml(t)}</span>`)
    .join('');

  const imageHtml = annonce.image
    ? `<img src="${escapeHtml(annonce.image)}" loading="lazy" alt="${escapeHtml(annonce.titre)}" class="w-full h-40 object-cover" />`
    : `<div class="card-image-placeholder w-full h-40 flex items-center justify-center text-4xl">${cat.emoji}</div>`;

  const ownerActions = isOwner
    ? `<div class="flex gap-1">
        <button data-action="edit" data-id="${annonce.id}" title="Modifier" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">✏️</button>
        <button data-action="delete" data-id="${annonce.id}" title="Supprimer" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-100 dark:hover:bg-red-500/20">🗑️</button>
      </div>`
    : '';

  return `
    <article data-id="${annonce.id}" class="card cursor-pointer bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col">
      ${imageHtml}
      <div class="p-4 flex flex-col gap-2 flex-1">
        <span class="self-start inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${badgeClasses(cat.color)}">
          ${cat.emoji} ${escapeHtml(annonce.categorie)}
        </span>
        <h3 class="font-bold text-lg leading-snug">${escapeHtml(annonce.titre)}</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">${escapeHtml(annonce.description)}</p>
        ${tagsHtml ? `<div class="flex flex-wrap gap-1">${tagsHtml}</div>` : ''}
        <div class="mt-auto pt-2 flex items-center justify-between text-xs text-slate-400">
          <span>${escapeHtml(annonce.auteur)} · ${formatDate(annonce.dateCreation)}</span>
          ${ownerActions}
        </div>
      </div>
    </article>`;
}

function render() {
  const visible = getVisibleAnnonces();
  dom.emptyState.classList.toggle('hidden', visible.length > 0);
  dom.grid.classList.toggle('hidden', visible.length === 0);
  dom.grid.innerHTML = visible.map(renderCard).join('');
}

dom.grid.addEventListener('click', (e) => {
  const editBtn = e.target.closest('[data-action="edit"]');
  const deleteBtn = e.target.closest('[data-action="delete"]');
  const card = e.target.closest('article[data-id]');

  if (editBtn) {
    const annonce = state.annonces.find((a) => a.id === editBtn.dataset.id);
    if (annonce) openAnnonceForm(annonce);
    return;
  }
  if (deleteBtn) {
    const annonce = state.annonces.find((a) => a.id === deleteBtn.dataset.id);
    if (annonce) confirmDelete(annonce);
    return;
  }
  if (card) {
    const annonce = state.annonces.find((a) => a.id === card.dataset.id);
    if (annonce) openDetail(annonce);
  }
});

// ---------- Formulaire création / édition ----------
function populateCategorySelect() {
  dom.fieldCategorie.innerHTML = CATEGORIES.map((c) => `<option value="${escapeHtml(c.label)}">${c.emoji} ${escapeHtml(c.label)}</option>`).join('');
}

function switchImageTab(tab) {
  state.imageTab = tab;
  dom.imageTabUpload.classList.toggle('bg-orange-500', tab === 'upload');
  dom.imageTabUpload.classList.toggle('text-white', tab === 'upload');
  dom.imageTabUpload.classList.toggle('bg-slate-100', tab !== 'upload');
  dom.imageTabUpload.classList.toggle('dark:bg-slate-700', tab !== 'upload');

  dom.imageTabUrl.classList.toggle('bg-orange-500', tab === 'url');
  dom.imageTabUrl.classList.toggle('text-white', tab === 'url');
  dom.imageTabUrl.classList.toggle('bg-slate-100', tab !== 'url');
  dom.imageTabUrl.classList.toggle('dark:bg-slate-700', tab !== 'url');

  dom.imagePanelUpload.classList.toggle('hidden', tab !== 'upload');
  dom.imagePanelUrl.classList.toggle('hidden', tab !== 'url');
}

dom.imageTabUpload.addEventListener('click', () => switchImageTab('upload'));
dom.imageTabUrl.addEventListener('click', () => switchImageTab('url'));

function renderTags() {
  dom.tagsList.innerHTML = state.formTags
    .map(
      (tag, i) => `
      <span class="chip text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-full">
        #${escapeHtml(tag)} <span class="chip-remove" data-index="${i}">&times;</span>
      </span>`
    )
    .join('');
}

function addTagFromInput() {
  const raw = dom.fieldTags.value.trim().replace(/,$/, '');
  if (raw && !state.formTags.includes(raw)) {
    state.formTags.push(raw);
    renderTags();
  }
  dom.fieldTags.value = '';
}

dom.fieldTags.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    addTagFromInput();
  } else if (e.key === 'Backspace' && !dom.fieldTags.value && state.formTags.length) {
    state.formTags.pop();
    renderTags();
  }
});

dom.tagsList.addEventListener('click', (e) => {
  const removeBtn = e.target.closest('[data-index]');
  if (!removeBtn) return;
  state.formTags.splice(Number(removeBtn.dataset.index), 1);
  renderTags();
});

function setImagePreview(url) {
  state.formImageUrl = url || '';
  if (url) {
    dom.imagePreview.src = url;
    dom.imagePreviewWrap.classList.remove('hidden');
  } else {
    dom.imagePreviewWrap.classList.add('hidden');
    dom.imagePreview.src = '';
  }
}

dom.fieldImageFile.addEventListener('change', async () => {
  const file = dom.fieldImageFile.files[0];
  if (!file) return;
  if (!isImageUploadConfigured()) {
    dom.imageUploadStatus.textContent = "⚠️ Upload non configuré (clé imgbb manquante). Utilise l'onglet URL.";
    return;
  }
  state.imageUploading = true;
  dom.imageUploadStatus.innerHTML = '<span class="spinner inline-block align-middle"></span> Envoi de l\'image...';
  try {
    const url = await uploadImage(file);
    setImagePreview(url);
    dom.imageUploadStatus.textContent = '✅ Image envoyée';
  } catch (err) {
    dom.imageUploadStatus.textContent = `⚠️ ${err.message}`;
  } finally {
    state.imageUploading = false;
  }
});

dom.fieldImageUrl.addEventListener(
  'input',
  debounce((e) => {
    const url = e.target.value.trim();
    if (isValidUrl(url)) setImagePreview(url);
  }, 300)
);

function resetForm() {
  dom.annonceForm.reset();
  state.formTags = [];
  state.editingId = null;
  setImagePreview('');
  dom.imageUploadStatus.textContent = '';
  dom.formError.classList.add('hidden');
  renderTags();
  switchImageTab('upload');
}

function openAnnonceForm(annonce) {
  resetForm();
  populateCategorySelect();

  if (annonce) {
    state.editingId = annonce.id;
    dom.annonceModalTitle.textContent = "Modifier l'annonce";
    dom.annonceFormSubmitLabel.textContent = 'Enregistrer';
    dom.fieldTitre.value = annonce.titre;
    dom.fieldCategorie.value = annonce.categorie;
    dom.fieldDescription.value = annonce.description;
    dom.fieldLien.value = annonce.lien || '';
    state.formTags = [...(annonce.tags || [])];
    renderTags();
    if (annonce.image) {
      switchImageTab('url');
      dom.fieldImageUrl.value = annonce.image;
      setImagePreview(annonce.image);
    }
  } else {
    dom.annonceModalTitle.textContent = 'Publier une annonce';
    dom.annonceFormSubmitLabel.textContent = 'Publier';
  }

  openModal(dom.annonceModal);
}

dom.newAnnonceBtn.addEventListener('click', () => openAnnonceForm(null));
dom.emptyNewBtn.addEventListener('click', () => openAnnonceForm(null));
dom.annonceModalClose.addEventListener('click', () => closeModal(dom.annonceModal));
dom.annonceFormCancel.addEventListener('click', () => closeModal(dom.annonceModal));

dom.annonceForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  addTagFromInput();

  const titre = dom.fieldTitre.value.trim();
  const categorie = dom.fieldCategorie.value;
  const description = dom.fieldDescription.value.trim();
  const lien = dom.fieldLien.value.trim();
  // Lu directement depuis le champ (et non depuis un état mis à jour par un debounce)
  // pour ne jamais perdre une URL tapée juste avant une soumission rapide.
  const image = state.imageTab === 'url' ? dom.fieldImageUrl.value.trim() : state.formImageUrl;

  if (!titre || !categorie || !description) {
    dom.formError.textContent = 'Merci de remplir tous les champs obligatoires (*).';
    dom.formError.classList.remove('hidden');
    return;
  }
  if (lien && !isValidUrl(lien)) {
    dom.formError.textContent = 'Le lien externe doit être une URL valide.';
    dom.formError.classList.remove('hidden');
    return;
  }
  if (image && !isValidUrl(image)) {
    dom.formError.textContent = "L'URL de l'image n'est pas valide.";
    dom.formError.classList.remove('hidden');
    return;
  }
  if (state.imageUploading) {
    dom.formError.textContent = "Attends la fin de l'envoi de l'image avant de publier.";
    dom.formError.classList.remove('hidden');
    return;
  }
  dom.formError.classList.add('hidden');

  const now = new Date().toISOString();
  let updatedList;

  if (state.editingId) {
    updatedList = state.annonces.map((a) =>
      a.id === state.editingId
        ? { ...a, titre, categorie, description, image, lien, tags: [...state.formTags], dateModification: now }
        : a
    );
  } else {
    const newAnnonce = {
      id: uuid(),
      titre,
      categorie,
      description,
      auteur: state.pseudo,
      image,
      lien,
      tags: [...state.formTags],
      dateCreation: now,
      dateModification: null,
    };
    updatedList = [...state.annonces, newAnnonce];
  }

  dom.annonceFormSubmit.disabled = true;
  dom.annonceFormSubmitLabel.innerHTML = '<span class="spinner inline-block align-middle"></span>';

  try {
    await persistData({ annonces: updatedList, utilisateurs: state.utilisateurs });
    state.annonces = updatedList;
    closeModal(dom.annonceModal);
    showToast(state.editingId ? 'Annonce mise à jour' : 'Annonce publiée', 'success');
    render();
  } catch (err) {
    dom.formError.textContent = err.message;
    dom.formError.classList.remove('hidden');
  } finally {
    dom.annonceFormSubmit.disabled = false;
    dom.annonceFormSubmitLabel.textContent = state.editingId ? 'Enregistrer' : 'Publier';
  }
});

// ---------- Suppression ----------
function confirmDelete(annonce) {
  openConfirm('Supprimer cette annonce ?', `« ${annonce.titre} » sera définitivement supprimée.`, () => deleteAnnonce(annonce.id));
}

async function deleteAnnonce(id) {
  const updatedList = state.annonces.filter((a) => a.id !== id);
  try {
    await persistData({ annonces: updatedList, utilisateurs: state.utilisateurs });
    state.annonces = updatedList;
    closeModal(dom.detailModal);
    showToast('Annonce supprimée', 'success');
    render();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ---------- Détail ----------
function openDetail(annonce) {
  currentDetailAnnonce = annonce;
  const cat = getCategory(annonce.categorie);
  const isOwner = annonce.auteur === state.pseudo;

  dom.detailBadge.className = `inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${badgeClasses(cat.color)}`;
  dom.detailBadge.textContent = `${cat.emoji} ${annonce.categorie}`;
  dom.detailTitre.textContent = annonce.titre;
  const modifiedNote = annonce.dateModification ? ` · modifiée le ${formatDate(annonce.dateModification)}` : '';
  dom.detailMeta.textContent = `${annonce.auteur} · publiée le ${formatDate(annonce.dateCreation)}${modifiedNote}`;
  dom.detailDescription.textContent = annonce.description;

  if (annonce.image) {
    dom.detailImage.src = annonce.image;
    dom.detailImage.classList.remove('hidden');
  } else {
    dom.detailImage.classList.add('hidden');
  }

  dom.detailTags.innerHTML = (annonce.tags || [])
    .map((t) => `<span class="chip text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">#${escapeHtml(t)}</span>`)
    .join('');

  if (annonce.lien) {
    dom.detailLien.href = annonce.lien;
    dom.detailLien.classList.remove('hidden');
  } else {
    dom.detailLien.classList.add('hidden');
  }

  dom.detailEditBtn.classList.toggle('hidden', !isOwner);
  dom.detailDeleteBtn.classList.toggle('hidden', !isOwner);

  history.replaceState(null, '', `#annonce-${annonce.id}`);
  openModal(dom.detailModal);
}

dom.detailModalClose.addEventListener('click', () => {
  closeModal(dom.detailModal);
  history.replaceState(null, '', location.pathname + location.search);
});

dom.detailEditBtn.addEventListener('click', () => {
  closeModal(dom.detailModal);
  if (currentDetailAnnonce) openAnnonceForm(currentDetailAnnonce);
});

dom.detailDeleteBtn.addEventListener('click', () => {
  if (currentDetailAnnonce) confirmDelete(currentDetailAnnonce);
});

dom.detailShareBtn.addEventListener('click', async () => {
  if (!currentDetailAnnonce) return;
  const url = `${location.origin}${location.pathname}#annonce-${currentDetailAnnonce.id}`;
  try {
    await navigator.clipboard.writeText(url);
    showToast('Lien copié dans le presse-papiers', 'info');
  } catch {
    showToast(url, 'info');
  }
});

function openDetailFromHash() {
  const match = location.hash.match(/^#annonce-(.+)$/);
  if (!match) return;
  const annonce = state.annonces.find((a) => a.id === match[1]);
  if (annonce) openDetail(annonce);
}

// ---------- Démarrage ----------
function proceedToPseudoFlow() {
  if (!state.pseudo) {
    openPseudoNameStep(false);
  } else {
    updatePseudoDisplay();
    openDetailFromHash();
  }
}

async function init() {
  initTheme();
  populateCategorySelect();
  renderCategoryFilters();
  renderTags();

  if (!isConfigured()) {
    dom.configWarning.classList.remove('hidden');
  }

  const ok = await loadData();
  if (ok) proceedToPseudoFlow();
}

init();
