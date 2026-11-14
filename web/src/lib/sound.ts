// One sound preference for the whole experience (radio effects and the narrator). On unless switched off.

const KEY = "mm-sound";

export function soundOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundOn(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* not remembered in private mode */
  }
}

/** Browsers only allow audio after the visitor has interacted with the page (a click on the home page counts). */
export function canPlayNow(): boolean {
  const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  return ua ? ua.hasBeenActive : false;
}

/** Narrator speed (characters per second), measured from the Kokoro bm_fable clips; used to pace typed text. */
export const NARRATOR_CPS = 15;
