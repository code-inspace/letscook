"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CloudOff, RefreshCw, Check } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { usePendingChanges } from "@/lib/outbox";

const subscribeOnline = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

/**
 * Small pill above the navigation bar, only when it matters: offline, changes
 * waiting to be saved (tap to retry), then a short "Synchronisé ✓".
 */
export function SyncStatus() {
  const { user, syncData } = useAuth();
  const pending = usePendingChanges(user?.id);
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  // Every save goes through the queue for a split second: only report changes
  // that stay pending (failed / offline), otherwise the pill would blink on each tap
  const [stuck, setStuck] = useState(false);
  const wasStuck = useRef(false);

  useEffect(() => {
    if (pending && pending > 0) {
      const t = setTimeout(() => {
        setStuck(true);
        wasStuck.current = true;
      }, 2000);
      return () => clearTimeout(t);
    }
    setStuck(false);
    if (pending === 0 && wasStuck.current) {
      wasStuck.current = false;
      setJustSynced(true);
      const t = setTimeout(() => setJustSynced(false), 2000);
      return () => clearTimeout(t);
    }
  }, [pending]);

  if (!user || pending === null) return null;
  if (online && !stuck && !justSynced) return null;

  const retry = async () => {
    if (syncing || !online) return;
    setSyncing(true);
    try {
      await syncData();
    } finally {
      setSyncing(false);
    }
  };

  let content;
  if (!online) {
    content = (
      <>
        <CloudOff className="w-3.5 h-3.5" />
        <span>Hors ligne{pending > 0 ? ` · ${pending} modif. en attente` : ""}</span>
      </>
    );
  } else if (stuck && pending > 0) {
    content = (
      <>
        <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
        <span>
          {pending} modification{pending > 1 ? "s" : ""} à synchroniser
          {syncing ? "…" : " · Réessayer"}
        </span>
      </>
    );
  } else {
    content = (
      <>
        <Check className="w-3.5 h-3.5" strokeWidth={3} />
        <span>Synchronisé</span>
      </>
    );
  }

  return (
    <button
      type="button"
      onClick={retry}
      disabled={!online || pending === 0}
      aria-live="polite"
      className={`pointer-events-auto mx-auto mb-1 px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 shadow-sm border transition-colors ${
        !online
          ? "bg-slate-800 text-white border-slate-700"
          : pending > 0
          ? "bg-amber-50 text-amber-800 border-amber-200 cursor-pointer"
          : "bg-emerald-50 text-emerald-700 border-emerald-200"
      }`}
    >
      {content}
    </button>
  );
}
