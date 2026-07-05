// Configuration de l'application — à personnaliser avant déploiement.
export const CONFIG = {
  // JSONBin.io — crée un bin sur https://jsonbin.io puis renseigne son ID et ta clé API.
  JSONBIN_BIN_ID: '6a4a5d2bda38895dfe30e05e',
  JSONBIN_API_KEY: '$2a$10$BqunamqwLpiSlpSBNDCye.rS/WNFvhhXQFS/FM8J56pMAP3//AuMe',
  JSONBIN_BASE_URL: 'https://api.jsonbin.io/v3/b',

  // imgbb.com — crée une clé API gratuite sur https://api.imgbb.com/ pour activer l'upload d'images.
  IMGBB_API_KEY: '9ce51dc002389fafcfd4ce6d925ff425',
  IMGBB_UPLOAD_URL: 'https://api.imgbb.com/1/upload',

  // Mot de passe pour la vue admin (consultation des mots de passe en cas d'oubli).
  // Change-le avant de déployer, et ne le partage qu'avec la personne de confiance
  // qui gère le groupe. Ce n'est pas un vrai système sécurisé (voir README).
  ADMIN_PASSWORD: 'BPEA*',
};

export function isConfigured() {
  return (
    CONFIG.JSONBIN_BIN_ID !== 'REPLACE_WITH_YOUR_BIN_ID' &&
    CONFIG.JSONBIN_API_KEY !== 'REPLACE_WITH_YOUR_JSONBIN_API_KEY'
  );
}

export function isImageUploadConfigured() {
  return CONFIG.IMGBB_API_KEY !== 'REPLACE_WITH_YOUR_IMGBB_API_KEY';
}

export function isAdminConfigured() {
  return CONFIG.ADMIN_PASSWORD !== 'BPEA*';
}
