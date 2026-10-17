"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChefHat, ChevronDown, FileText, Loader2, Sparkles, Upload, X } from "lucide-react";
import { Recipe } from "@/features/recipes/types";
import { saveRecipeToDb } from "@/features/recipes/actions";
import { MAX_PDF_MB, parseRecipesFromPdf } from "@/features/ai/pdfImport";

interface PdfImportPanelProps {
  userId: string | undefined;
  onLog?: (message: string) => void;
}

/**
 * Import one or several recipes from a PDF (cookbook pages, printed or scanned
 * recipe cards). The AI reads the document; dish photos are cropped from the PDF.
 */
export function PdfImportPanel({ userId, onLog }: PdfImportPanelProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const selectFile = (f: File | undefined) => {
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Ce fichier n'est pas un PDF.");
      return;
    }
    if (f.size > MAX_PDF_MB * 1024 * 1024) {
      setError(`PDF trop volumineux (${MAX_PDF_MB} Mo maximum).`);
      return;
    }
    setFile(f);
    setError(null);
    setRecipes([]);
    setSavedIds(new Set());
    onLog?.(`PDF sélectionné : ${f.name} (${(f.size / (1024 * 1024)).toFixed(2)} Mo)`);
  };

  const handleParse = async () => {
    if (!file) return;
    if (!userId) {
      router.push("/login?redirectedFrom=/import");
      return;
    }
    setIsParsing(true);
    setError(null);
    setRecipes([]);
    try {
      const result = await parseRecipesFromPdf(file, userId, (m) => {
        setProgress(m);
        onLog?.(m);
      });
      setRecipes(result);
      setExpandedId(result.length === 1 ? result[0].id : null);
      onLog?.(`${result.length} recette(s) extraite(s) du PDF.`);
    } catch (err: any) {
      setError(err?.message || "L'analyse du PDF a échoué.");
      onLog?.(`ERREUR PDF : ${err?.message || err}`);
    } finally {
      setIsParsing(false);
      setProgress("");
    }
  };

  const save = async (toSave: Recipe[]) => {
    if (!userId) return;
    setSavingIds((prev) => new Set([...prev, ...toSave.map((r) => r.id)]));
    try {
      for (const recipe of toSave) {
        await saveRecipeToDb(recipe, userId);
        setSavedIds((prev) => new Set(prev).add(recipe.id));
        onLog?.(`Recette « ${recipe.title} » enregistrée.`);
      }
      // Single recipe: open it right away, like the other import methods
      if (recipes.length === 1) setTimeout(() => router.push(`/recipes/${toSave[0].id}`), 600);
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSavingIds(new Set());
    }
  };

  const unsaved = recipes.filter((r) => !savedIds.has(r.id));

  return (
    <div className="space-y-4">
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-extrabold text-[#181A20] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#5DB534]" />
            <span>Importez une recette depuis un PDF</span>
          </h3>
          <p className="text-xs text-[#8E929E] mt-1 leading-relaxed">
            Fiche recette, page de livre, PDF scanné… L&apos;IA extrait chaque recette du document, avec la
            photo du plat quand il y en a une.
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            selectFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        {file ? (
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">{file.name}</p>
              <p className="text-[10px] text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} Mo</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setRecipes([]);
              }}
              disabled={isParsing}
              aria-label="Retirer le PDF"
              className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              selectFile(e.dataTransfer.files?.[0]);
            }}
            className="w-full py-8 rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#5DB534] bg-slate-50/50 flex flex-col items-center gap-2 cursor-pointer transition-colors"
          >
            <Upload className="w-6 h-6 text-[#5DB534]" />
            <span className="text-xs font-bold text-[#181A20]">Choisir un PDF</span>
            <span className="text-[10px] text-slate-500">{MAX_PDF_MB} Mo maximum</span>
          </button>
        )}

        {error && <p className="text-xs font-bold text-rose-600">{error}</p>}

        <button
          type="button"
          onClick={handleParse}
          disabled={!file || isParsing}
          className="w-full py-3.5 rounded-2xl bg-[#5DB534] hover:bg-[#4FA12A] disabled:opacity-40 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer active:scale-[0.99]"
        >
          {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          <span>{isParsing ? progress || "Analyse en cours…" : "Extraire les recettes"}</span>
        </button>
      </div>

      {recipes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-extrabold text-[#181A20]">
              {recipes.length} recette{recipes.length > 1 ? "s" : ""} trouvée{recipes.length > 1 ? "s" : ""}
            </span>
            {recipes.length > 1 && unsaved.length > 0 && (
              <button
                type="button"
                onClick={() => save(unsaved)}
                disabled={savingIds.size > 0}
                className="px-3 py-1.5 rounded-full bg-[#181A20] text-white text-[11px] font-extrabold disabled:opacity-40 cursor-pointer"
              >
                Tout enregistrer ({unsaved.length})
              </button>
            )}
          </div>

          {recipes.map((recipe) => {
            const isSaved = savedIds.has(recipe.id);
            const isSaving = savingIds.has(recipe.id);
            const isOpen = expandedId === recipe.id;
            return (
              <div key={recipe.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-3.5 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center">
                    {recipe.imageUrl ? (
                      <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover" />
                    ) : (
                      <ChefHat className="w-6 h-6 text-[#5DB534]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold truncate">{recipe.title}</p>
                    <p className="text-[11px] text-slate-500">
                      {recipe.ingredients.length} ingr. · {recipe.steps.length} étapes · {recipe.servingsBase} pers.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : recipe.id)}
                    aria-expanded={isOpen}
                    aria-label="Voir le détail"
                    className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 cursor-pointer shrink-0"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                </div>

                {isOpen && (
                  <div className="px-4 pb-3 space-y-2 text-xs">
                    <ul className="space-y-1">
                      {recipe.ingredients.map((ing, idx) => (
                        <li key={idx} className="flex justify-between gap-2">
                          <span className="font-semibold truncate">{ing.name}</span>
                          <span className="text-[#5DB534] font-bold shrink-0">
                            {[ing.amount || "", ing.unit].filter(Boolean).join(" ")}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <ol className="list-decimal pl-4 space-y-1 text-slate-600">
                      {recipe.steps.map((step, idx) => (
                        <li key={idx} className="line-clamp-2">
                          {step.description}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                <div className="px-3.5 pb-3.5">
                  {isSaved ? (
                    <Link
                      href={`/recipes/${recipe.id}`}
                      className="w-full py-2.5 rounded-2xl bg-emerald-50 text-[#5DB534] text-xs font-extrabold flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" /> Enregistrée — voir la recette
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => save([recipe])}
                      disabled={isSaving}
                      className="w-full py-2.5 rounded-2xl bg-[#5DB534] hover:bg-[#4FA12A] disabled:opacity-50 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99]"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Enregistrer la recette
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
