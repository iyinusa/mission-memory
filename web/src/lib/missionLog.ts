import { useEffect, useState } from "react";

// The Mission Log: which explorers this visitor has found (tuned in to) and whose stories they heard to the end.
// Kept only on this device; no account, nothing sent anywhere.

const KEY = "mm-log";
const EVENT = "mm-log-change";

export interface MissionLog {
  found: string[];
  heard: string[];
}

function read(): MissionLog {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return { found: Array.isArray(v.found) ? v.found : [], heard: Array.isArray(v.heard) ? v.heard : [] };
  } catch {
    return { found: [], heard: [] };
  }
}

function add(field: keyof MissionLog, id: string) {
  const log = read();
  if (log[field].includes(id)) return;
  log[field] = [...log[field], id];
  try {
    localStorage.setItem(KEY, JSON.stringify(log));
  } catch {
    /* private mode: the log lasts for this page only */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { field, id } }));
}

export const logFound = (id: string) => add("found", id);
/** Hearing a story to the end also counts as finding that explorer. */
export const logHeard = (id: string) => {
  add("found", id);
  add("heard", id);
};

export function useMissionLog(): MissionLog {
  const [log, setLog] = useState(read);
  useEffect(() => {
    const sync = () => setLog(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return log;
}

/** Fires `cb` with an explorer id whenever a new one is added to the log. */
export function useNewStamp(cb: (id: string, field: keyof MissionLog) => void) {
  useEffect(() => {
    const on = (e: Event) => {
      const { id, field } = (e as CustomEvent<{ id: string; field: keyof MissionLog }>).detail;
      cb(id, field);
    };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, [cb]);
}
