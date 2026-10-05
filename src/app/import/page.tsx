"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Camera,
  UploadCloud,
  Sparkles,
  CheckCircle2,
  Trash2,
  Clock,
  ShieldCheck,
  AlertCircle,
  Terminal,
  Copy,
  ChevronDown,
  ChevronUp,
  ArrowLeftRight,
  Plus,
  Play,
  RotateCcw,
  Check,
  ChefHat,
  Utensils,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { Recipe } from "@/features/recipes/types";
import {
  RecipePhotoPair,
  createPairsFromFiles,
  parseRecipeAlbumWithAI,
} from "@/features/ai/visionParser";
import { saveRecipeToDb } from "@/features/recipes/actions";

export default function AIImportPage() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const addMoreInputRef = useRef<HTMLInputElement | null>(null);

  const [pairs, setPairs] = useState<RecipePhotoPair[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState<boolean>(false);
  const [currentPairIndex, setCurrentPairIndex] = useState<number>(0);
  const [globalProgressMessage, setGlobalProgressMessage] = useState<string>("");
  const [completedRecipes, setCompletedRecipes] = useState<Recipe[]>([]);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState<boolean>(false);
  const [copiedLogs, setCopiedLogs] = useState<boolean>(false);
  const [shouldStopQueue, setShouldStopQueue] = useState<boolean>(false);

  const addLog = (msg: string) => {
    const timestamp = new Date().toISOString().substring(11, 19);
    setExecutionLogs((prev) => [...prev, `[${timestamp}] ${msg}`]);
  };

  // Handle dropping or selecting multiple photos (up to 100)
  const handleFilesAdded = (incomingFiles: FileList | File[]) => {
    const filesArray = Array.from(incomingFiles).filter((f) =>
      f.type.startsWith("image/")
    );
    if (filesArray.length === 0) return;

    addLog(`${filesArray.length} photo(s) importée(s).`);
    const newPairs = createPairsFromFiles(filesArray);
    setPairs((prev) => [...prev, ...newPairs]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  // Flip Recto and Verso for a single pair
  const handleSwapPair = (pairId: string) => {
    setPairs((prev) =>
      prev.map((pair) => {
        if (pair.id !== pairId) return pair;
        return {
          ...pair,
          rectoFile: pair.versoFile || pair.rectoFile,
          versoFile: pair.versoFile ? pair.rectoFile : undefined,
          rectoPreview: pair.versoPreview || pair.rectoPreview,
          versoPreview: pair.versoPreview ? pair.rectoPreview : undefined,
        };
      })
    );
    addLog(`Paire ${pairId} : Recto et Verso inversés.`);
  };

  // Invert Recto & Verso for ALL pairs
  const handleSwapAll = () => {
    setPairs((prev) =>
      prev.map((pair) => {
        if (!pair.versoFile) return pair;
        return {
          ...pair,
          rectoFile: pair.versoFile,
          versoFile: pair.rectoFile,
          rectoPreview: pair.versoPreview || pair.rectoPreview,
          versoPreview: pair.rectoPreview,
        };
      })
    );
    addLog("Tous les Recto/Verso du lot ont été inversés.");
  };

  // Delete a single pair
  const handleDeletePair = (pairId: string) => {
    setPairs((prev) => prev.filter((p) => p.id !== pairId));
  };

  // Clear all pairs
  const handleClearAll = () => {
    setPairs([]);
    setCompletedRecipes([]);
    setExecutionLogs([]);
    setIsProcessingBatch(false);
  };

  // Launch Batch Analysis of all pairs sequentially
  const startBatchAnalysis = async () => {
    if (pairs.length === 0 || isProcessingBatch) return;

    setIsProcessingBatch(true);
    setShouldStopQueue(false);
    addLog(`Démarrage de l'analyse par lot pour ${pairs.length} recette(s)...`);

    const updatedPairs = [...pairs];
    const results: Recipe[] = [...completedRecipes];

    for (let i = 0; i < updatedPairs.length; i++) {
      if (shouldStopQueue) {
        addLog("Traitement par lot interrompu par l'utilisateur.");
        break;
      }

      const pair = updatedPairs[i];
      // Skip if already successfully extracted
      if (pair.status === "success" && pair.recipe) {
        continue;
      }

      setCurrentPairIndex(i);
      setGlobalProgressMessage(`Analyse de la recette ${i + 1} sur ${updatedPairs.length}...`);

      // Mark current as processing
      pair.status = "processing";
      pair.error = undefined;
      setPairs([...updatedPairs]);

      try {
        const filesToParse = pair.versoFile
          ? [pair.rectoFile, pair.versoFile]
          : [pair.rectoFile];

        addLog(`[Recette ${i + 1}/${updatedPairs.length}] Envoi de ${filesToParse.length} photo(s) à Gemini Vision...`);

        const result = await parseRecipeAlbumWithAI(
          filesToParse,
          user?.id,
          (status) => setGlobalProgressMessage(`Recette ${i + 1}/${updatedPairs.length} : ${status}`)
        );

        // Save immediately to local/encrypted store
        await saveRecipeToDb(result.recipe, user?.id);

        pair.status = "success";
        pair.recipe = result.recipe;
        pair.logs = result.logs;
        results.push(result.recipe);
        setCompletedRecipes([...results]);

        addLog(`[Recette ${i + 1}/${updatedPairs.length}] Succès : "${result.recipe.title}" enregistrée.`);
      } catch (err: any) {
        console.error(`Erreur sur la recette ${i + 1}:`, err);
        const errMsg = err?.message || "Échec de l'analyse visuelle";
        pair.status = "error";
        pair.error = errMsg;
        pair.logs = err.logs;
        addLog(`[Recette ${i + 1}/${updatedPairs.length}] ERREUR : ${errMsg}`);
      }

      setPairs([...updatedPairs]);
    }

    setIsProcessingBatch(false);
    setGlobalProgressMessage("Analyse du lot terminée !");
    addLog(`Fin du traitement du lot. ${results.length} recette(s) enregistrée(s).`);
  };

  // Re-run analysis for a single failed pair
  const handleRetrySingle = async (index: number) => {
    if (isProcessingBatch) return;
    const pair = pairs[index];
    if (!pair) return;

    const updatedPairs = [...pairs];
    pair.status = "processing";
    pair.error = undefined;
    setPairs(updatedPairs);

    try {
      const filesToParse = pair.versoFile
        ? [pair.rectoFile, pair.versoFile]
        : [pair.rectoFile];

      addLog(`[Relance Recette ${index + 1}] Analyse Gemini Vision...`);

      const result = await parseRecipeAlbumWithAI(
        filesToParse,
        user?.id,
        (status) => setGlobalProgressMessage(status)
      );

      await saveRecipeToDb(result.recipe, user?.id);

      pair.status = "success";
      pair.recipe = result.recipe;
      setCompletedRecipes((prev) => [...prev, result.recipe]);
      addLog(`[Relance Recette ${index + 1}] Succès : "${result.recipe.title}" enregistrée.`);
    } catch (err: any) {
      pair.status = "error";
      pair.error = err?.message || "Échec de l'analyse";
      addLog(`[Relance Recette ${index + 1}] ERREUR : ${pair.error}`);
    }

    setPairs([...updatedPairs]);
  };

  const handleCopyLogs = () => {
    if (executionLogs.length === 0) return;
    navigator.clipboard.writeText(executionLogs.join("\n"));
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const totalPhotosCount = pairs.reduce(
    (acc, p) => acc + (p.versoFile ? 2 : 1),
    0
  );
  const successfulCount = pairs.filter((p) => p.status === "success").length;
  const pendingCount = pairs.filter((p) => p.status !== "success").length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 pb-36">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md px-6 pt-7 pb-3.5 flex items-center justify-between border-b border-slate-100">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#181A20] shadow-sm border border-slate-100 active:scale-95 transition-all cursor-pointer"
          aria-label="Retour à l'accueil"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h1 className="text-base font-extrabold text-[#181A20] flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#5DB534]" />
            <span>Import Massif IA</span>
          </h1>
          <span className="text-[10px] text-[#8E929E] font-medium">
            Google Gemini Multimodal Vision
          </span>
        </div>

        <div
          className="w-10 h-10 flex items-center justify-center text-emerald-600 bg-emerald-50 rounded-full"
          title="Chiffrement AES-256 activé"
        >
          <ShieldCheck className="w-5 h-5" />
        </div>
      </header>

      <div className="max-w-3xl w-full mx-auto px-5 pt-4 space-y-5">
        {/* Description card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <p className="text-xs text-[#8E929E] leading-relaxed">
            Déposez jusqu'à <strong>100 photos</strong> de fiches recettes. Le système associe automatiquement chaque <strong>Recto (Plat)</strong> avec son <strong>Verso (Étapes)</strong>. Vous pouvez réajuster l'ordre ou inverser les faces avant de lancer l'analyse complète par lot.
          </p>
        </div>

        {/* Big Dropzone */}
        {pairs.length === 0 ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#5DB534]/60 hover:border-[#5DB534] bg-emerald-50/20 hover:bg-emerald-50/40 rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all shadow-xs group"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => {
                if (e.target.files) handleFilesAdded(e.target.files);
              }}
              className="hidden"
            />

            <div className="w-16 h-16 rounded-2xl bg-white text-[#5DB534] flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform border border-emerald-100">
              <UploadCloud className="w-8 h-8" />
            </div>

            <h3 className="text-base font-extrabold text-[#181A20]">
              Déposez toutes vos photos ici
            </h3>
            <p className="text-xs text-[#8E929E] mt-1.5 max-w-sm">
              Glissez-déposez jusqu'à 100 photos à la fois ou cliquez pour sélectionner vos fichiers.
            </p>

            <button
              type="button"
              className="mt-5 px-5 py-2.5 bg-[#5DB534] hover:bg-[#4FA12A] text-white text-xs font-bold rounded-full flex items-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>Sélectionner des photos (lot jusqu'à 100)</span>
            </button>
          </div>
        ) : (
          /* Pair Management Dashboard */
          <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-[#181A20] block">
                  {pairs.length} recette(s) détectée(s) ({totalPhotosCount} photos)
                </span>
                <span className="text-[11px] text-[#8E929E]">
                  {successfulCount} analysée(s) • {pendingCount} restante(s)
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Swap all Recto/Verso button */}
                <button
                  type="button"
                  onClick={handleSwapAll}
                  disabled={isProcessingBatch}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-[#181A20] text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Inverser les Recto et Verso pour toutes les paires"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Inverser tous</span>
                </button>

                {/* Add more button */}
                <input
                  ref={addMoreInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files) handleFilesAdded(e.target.files);
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => addMoreInputRef.current?.click()}
                  disabled={isProcessingBatch}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-[#5DB534] text-xs font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter</span>
                </button>

                {/* Clear all */}
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={isProcessingBatch}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  title="Tout effacer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Launch Batch Analysis CTA */}
            {pendingCount > 0 && (
              <div className="bg-gradient-to-r from-[#5DB534] to-[#4FA12A] p-5 rounded-3xl text-white shadow-lg shadow-emerald-600/25 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-extrabold flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Lancer l'analyse par lot</span>
                  </h3>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    Extraction OCR, redressement et découpage des étapes par Gemini
                  </p>
                </div>

                <button
                  type="button"
                  onClick={startBatchAnalysis}
                  disabled={isProcessingBatch}
                  className="w-full sm:w-auto px-6 py-3.5 bg-white text-[#181A20] hover:bg-slate-100 font-extrabold text-xs rounded-full shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isProcessingBatch ? (
                    <>
                      <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      <span>Analyse en cours...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-[#5DB534] text-[#5DB534]" />
                      <span>Analyser les {pendingCount} recette(s)</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Live Progress Bar if processing */}
            {isProcessingBatch && (
              <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-[#181A20]">
                  <span className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-[#5DB534] border-t-transparent rounded-full animate-spin" />
                    <span>{globalProgressMessage}</span>
                  </span>
                  <span className="text-emerald-700">
                    {Math.round(((currentPairIndex + 1) / pairs.length) * 100)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#5DB534] transition-all duration-300 rounded-full"
                    style={{
                      width: `${((currentPairIndex + 1) / pairs.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* List of Paired Recipe Cards */}
            <div className="space-y-3.5">
              {pairs.map((pair, index) => {
                const isSuccess = pair.status === "success";
                const isCurrentProcessing = pair.status === "processing";
                const isError = pair.status === "error";

                return (
                  <div
                    key={pair.id}
                    className={`bg-white p-4 rounded-2xl border transition-all ${
                      isCurrentProcessing
                        ? "border-[#5DB534] ring-2 ring-[#5DB534]/20 shadow-md"
                        : isSuccess
                        ? "border-emerald-200 bg-emerald-50/10"
                        : isError
                        ? "border-rose-200 bg-rose-50/10"
                        : "border-slate-200/80 shadow-2xs hover:border-slate-300"
                    }`}
                  >
                    {/* Header of the pair */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-[#181A20] text-xs font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="text-xs font-bold text-[#181A20]">
                          {pair.recipe?.title || `Recette #${index + 1}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Status Tag */}
                        {isSuccess && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                            <Check className="w-3 h-3" />
                            <span>Enregistrée</span>
                          </span>
                        )}
                        {isCurrentProcessing && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full animate-pulse">
                            <div className="w-2.5 h-2.5 border-2 border-[#5DB534] border-t-transparent rounded-full animate-spin" />
                            <span>OCR en cours...</span>
                          </span>
                        )}
                        {isError && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">
                            <AlertCircle className="w-3 h-3" />
                            <span>Échec</span>
                          </span>
                        )}

                        {/* Swap Recto/Verso Button */}
                        {!isSuccess && pair.versoFile && (
                          <button
                            type="button"
                            onClick={() => handleSwapPair(pair.id)}
                            disabled={isProcessingBatch}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Inverser Recto et Verso"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete pair */}
                        {!isProcessingBatch && (
                          <button
                            type="button"
                            onClick={() => handleDeletePair(pair.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Supprimer cette paire"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Recto & Verso Thumbnails */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Recto (Plat) */}
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                        <img
                          src={pair.rectoPreview}
                          alt={`Recto recette ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1.5 left-1.5 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-1">
                          <Utensils className="w-2.5 h-2.5 text-emerald-400" />
                          <span>Recto (Plat)</span>
                        </span>
                      </div>

                      {/* Verso (Étapes) */}
                      {pair.versoPreview ? (
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                          <img
                            src={pair.versoPreview}
                            alt={`Verso recette ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-1.5 left-1.5 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-1">
                            <ChefHat className="w-2.5 h-2.5 text-amber-400" />
                            <span>Verso (Étapes)</span>
                          </span>
                        </div>
                      ) : (
                        <div className="aspect-video rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center p-2 bg-slate-50 text-slate-400">
                          <span className="text-[11px] font-semibold">
                            Recto unique
                          </span>
                          <span className="text-[9px] text-slate-400">
                            (Pas de verso détecté)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Result details if successfully extracted */}
                    {pair.recipe && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3 text-[#8E929E]">
                          <span className="flex items-center gap-1 font-semibold text-[#181A20]">
                            <Clock className="w-3.5 h-3.5 text-emerald-600" />
                            {pair.recipe.prepTimeMinutes} min
                          </span>
                          <span>{pair.recipe.ingredients?.length || 0} ingr.</span>
                          <span>{pair.recipe.steps?.length || 0} étapes</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => router.push(`/recipes/${pair.recipe?.id}`)}
                            className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>Voir la fiche</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Error message & Retry */}
                    {isError && (
                      <div className="mt-3 pt-3 border-t border-rose-100 flex items-center justify-between text-xs text-rose-700">
                        <span className="truncate pr-2">{pair.error}</span>
                        <button
                          type="button"
                          onClick={() => handleRetrySingle(index)}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Réessayer</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Technical AI Debug Logs Panel */}
        {executionLogs.length > 0 && (
          <div className="bg-slate-900 rounded-2xl text-slate-200 overflow-hidden shadow-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setShowLogs(!showLogs)}
              className="w-full px-4 py-3 flex items-center justify-between text-xs font-mono font-medium hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#5DB534]" />
                <span>Logs d'exécution IA ({executionLogs.length})</span>
                <span className="text-[10px] bg-slate-800 text-emerald-400 px-2 py-0.5 rounded-full border border-slate-700 font-sans">
                  Gemini Vision
                </span>
              </div>
              {showLogs ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showLogs && (
              <div className="p-3 border-t border-slate-800 bg-slate-950 font-mono text-[11px] leading-relaxed">
                <div className="flex justify-end mb-2">
                  <button
                    type="button"
                    onClick={handleCopyLogs}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition-colors cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedLogs ? "Copié !" : "Copier les logs"}</span>
                  </button>
                </div>
                <div className="max-h-56 overflow-y-auto space-y-1 text-slate-300 pr-1">
                  {executionLogs.map((logLine, idx) => {
                    const isError =
                      logLine.includes("ERREUR") ||
                      logLine.includes("Exception") ||
                      logLine.includes("ÉCHEC");
                    const isSuccess =
                      logLine.includes("Succès") || logLine.includes("réussi");

                    return (
                      <div
                        key={idx}
                        className={`break-words ${
                          isError
                            ? "text-rose-400 font-bold"
                            : isSuccess
                            ? "text-emerald-400"
                            : "text-slate-300"
                        }`}
                      >
                        {logLine}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Global Action Footer when recipes are completed */}
        {completedRecipes.length > 0 && !isProcessingBatch && (
          <div className="bg-white p-5 rounded-3xl border border-emerald-200 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#5DB534] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#181A20]">
                  {completedRecipes.length} recette(s) enregistrée(s)
                </h4>
                <p className="text-xs text-[#8E929E]">
                  Retrouvez-les directement dans votre carnet
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="w-full sm:w-auto px-6 py-3.5 bg-[#5DB534] hover:bg-[#4FA12A] text-white text-xs font-bold rounded-full shadow-md shadow-emerald-600/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Accéder à Mon Carnet</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
