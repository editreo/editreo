// Public plugin settings. Safe to publish: no secrets here.
// API_BASE: the deployed license Worker URL. PUBLIC_KEY_X: from tools/keys/public-key.txt.
export const API_BASE = process.env.EDITREO_API_BASE || "https://studio-seven-license.studioseven.workers.dev";
export const PUBLIC_KEY_X = process.env.EDITREO_PUBLIC_KEY_X || "GsxqYVjM09b6jxBtHhOW_njJJw9uoShLDzW2lB1kFcg";

export const STYLES = {
  "lumen-cinematic": "Lumen Cinematic",
  "lumen-noir": "Lumen Noir",
  "pixel-pop": "Pixel Pop",
  "skyline-stance": "Skyline Stance",
  "neon-frame": "Neon Frame",
  "premium-gold": "Premium Gold",
  "night-lime": "Night Lime",
  "sky-theme": "Sky Theme",
  "mono-motion": "Mono Motion",
  captions: "Captions (bonus)",
  "cut-pauses": "Cut Pauses (bonus)",
  shorts: "Shorts (bonus)",
};
