"use client";

import { useState } from "react";
import { ClipboardPaste, Check, ChevronDown, Loader2, Play, X } from "lucide-react";
import { ShoppingItem } from "@/features/groceries/types";
import {
  parseRemindersText,
  ParsedReminder,
  REMINDERS_SHORTCUT_NAME,
  remindersShortcutUrl,
} from "@/features/groceries/remindersImport";

interface RemindersImportSheetProps {
  existing: ShoppingItem[];
  /** True when the user is coming back from the Shortcut: go straight to step 2 */
  returningFromShortcut: boolean;
  onLaunchShortcut: () => void;
  onClose: () => void;
  onImport: (items: ParsedReminder[]) => Promise<void>;
}

/**
 * Imports the open reminders of the iOS "Courses" list.
 *
 * A web app can't read Apple Reminders: an iOS Shortcut copies them to the
 * clipboard, then the app reads the clipboard (or a manual paste) and lets the
 * user pick which items to add.
 */
export function RemindersImportSheet({
  existing,
  returningFromShortcut,
  onLaunchShortcut,
  onClose,
  onImport,
}: RemindersImportSheetProps) {
  const [parsed, setParsed] = useState<ParsedReminder[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [manualText, setManualText] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [error, setError] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const load = (text: string) => {
    const items = parseRemindersText(text, existing);
    if (items.length === 0) {
      setError("Aucun article trouvé dans le texte copié.");
      return;
    }
    setError("");
    setParsed(items);
    setSelected(new Set(items.filter((i) => !i.duplicate).map((i) => i.name)));
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      load(text);
    } catch {
      // Permission refused / unsupported: fall back to a manual paste
      setShowManual(true);
      setError("Accès au presse-papiers refusé : collez la liste ci-dessous.");
    }
  };

  const toggle = (name: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const handleImport = async () => {
    if (!parsed) return;
    setIsImporting(true);
    try {
      await onImport(parsed.filter((i) => selected.has(i.name)));
      onClose();
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reminders-title"
        className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] p-5 shadow-2xl flex flex-col max-h-[88vh] animate-in slide-in-from-bottom-6 text-[#181A20]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 id="reminders-title" className="text-base font-extrabold">
              Importer depuis Rappels
            </h3>
            <p className="text-[11px] text-[#8E929E] mt-0.5">
              Récupère les articles non cochés de votre liste « Courses »
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-3">
          {!parsed && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onLaunchShortcut}
                  className={`p-3 rounded-2xl border text-left cursor-pointer active:scale-95 transition-all ${
                    returningFromShortcut ? "border-slate-200 bg-slate-50" : "border-[#5DB534] bg-emerald-50/60"
                  }`}
                >
                  <span className="text-[10px] font-extrabold text-[#5DB534]">ÉTAPE 1</span>
                  <span className="mt-1 flex items-center gap-1.5 text-xs font-extrabold">
                    <Play className="w-3.5 h-3.5" /> Copier mes rappels
                  </span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">Lance le raccourci iOS</span>
                </button>
                <button
                  type="button"
                  onClick={pasteFromClipboard}
                  className={`p-3 rounded-2xl border text-left cursor-pointer active:scale-95 transition-all ${
                    returningFromShortcut ? "border-[#5DB534] bg-emerald-50/60" : "border-slate-200 bg-white"
                  }`}
                >
                  <span className="text-[10px] font-extrabold text-[#5DB534]">ÉTAPE 2</span>
                  <span className="mt-1 flex items-center gap-1.5 text-xs font-extrabold">
                    <ClipboardPaste className="w-3.5 h-3.5" /> Coller ici
                  </span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">De retour dans l&apos;app</span>
                </button>
              </div>

              {error && <p className="text-xs font-bold text-rose-600">{error}</p>}

              {showManual && (
                <div className="space-y-2">
                  <textarea
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder={"Un article par ligne\n2 kg Pommes de terre\nLait"}
                    rows={5}
                    className="w-full bg-slate-50 p-3 rounded-2xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5DB534]/30 select-text"
                  />
                  <button
                    type="button"
                    onClick={() => load(manualText)}
                    disabled={!manualText.trim()}
                    className="w-full py-2.5 rounded-xl bg-[#181A20] disabled:opacity-40 text-white text-xs font-extrabold cursor-pointer"
                  >
                    Analyser la liste
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowSetup((v) => !v)}
                aria-expanded={showSetup}
                className="w-full flex items-center justify-between text-xs font-bold text-slate-600 py-2 cursor-pointer"
              >
                <span>Première fois ? Créer le raccourci (1 min)</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showSetup ? "rotate-180" : ""}`} />
              </button>
              {showSetup && (
                <ol className="text-[11px] text-slate-600 space-y-1.5 list-decimal pl-4 pb-2 leading-relaxed">
                  <li>
                    Ouvrez l&apos;app <b>Raccourcis</b> → <b>+</b>, nommez-le exactement{" "}
                    <b>« {REMINDERS_SHORTCUT_NAME} »</b>.
                  </li>
                  <li>
                    Ajoutez l&apos;action <b>Rechercher des rappels</b> : filtre <b>Liste</b> est <b>Courses</b>,
                    puis <b>Est terminé</b> est <b>désactivé</b>.
                  </li>
                  <li>
                    Ajoutez l&apos;action <b>Copier dans le presse-papiers</b> (entrée : <b>Rappels</b>).
                  </li>
                  <li>Revenez ici : « Copier mes rappels », puis revenez dans l&apos;app et « Coller ici ».</li>
                </ol>
              )}
            </>
          )}

          {parsed && (
            <>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 px-1">
                <span>
                  {parsed.length} article{parsed.length > 1 ? "s" : ""} trouvé{parsed.length > 1 ? "s" : ""}
                </span>
                <button
                  type="button"
                  onClick={() => setParsed(null)}
                  className="text-[#5DB534] cursor-pointer"
                >
                  Recommencer
                </button>
              </div>
              <ul className="space-y-1.5">
                {parsed.map((item) => {
                  const isOn = selected.has(item.name);
                  return (
                    <li key={item.name}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={isOn}
                        onClick={() => toggle(item.name)}
                        className={`w-full p-2.5 rounded-xl border flex items-center gap-2.5 text-left cursor-pointer transition-all ${
                          isOn ? "border-emerald-300 bg-emerald-50/50" : "border-slate-200 bg-white"
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                            isOn ? "bg-[#5DB534] text-white" : "border border-slate-300"
                          }`}
                        >
                          {isOn && <Check className="w-3.5 h-3.5" />}
                        </span>
                        <span className="flex-1 min-w-0 text-xs font-bold truncate">{item.name}</span>
                        {(item.amount || item.unit) && (
                          <span className="text-[11px] font-bold text-[#5DB534] shrink-0">
                            {[item.amount, item.unit].filter(Boolean).join(" ")}
                          </span>
                        )}
                        {item.duplicate && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md shrink-0">
                            déjà dans la liste
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {parsed && (
          <button
            type="button"
            onClick={handleImport}
            disabled={selected.size === 0 || isImporting}
            className="mt-3 w-full py-3 rounded-2xl bg-[#5DB534] hover:bg-[#4FA12A] disabled:opacity-40 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95"
          >
            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Ajouter {selected.size} article{selected.size > 1 ? "s" : ""}
          </button>
        )}
      </div>
    </div>
  );
}
