"use client";

import React, { useState, useRef, useEffect } from "react";
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
  Link as LinkIcon,
  Globe,
  Flame,
  Loader2,
  BookOpen,
  Video,
  Film,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { Recipe } from "@/features/recipes/types";
import {
  RecipePhotoPair,
  createPairsFromFiles,
  parseRecipeAlbumWithAI,
} from "@/features/ai/visionParser";
import { saveRecipeToDb } from "@/features/recipes/actions";
import { BottomNav } from "@/components/layout/BottomNav";
import { DEFAULT_SERVINGS, categoryLabel } from "@/features/recipes/types";

export default function AIImportPage() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const addMoreInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  // Tab State: 'url' | 'photos' | 'video'
  const [activeTab, setActiveTab] = useState<"url" | "photos" | "video">("url");

  // URL Import State
  const [urlInput, setUrlInput] = useState<string>("");
  const [isParsingUrl, setIsParsingUrl] = useState<boolean>(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [parsedUrlRecipe, setParsedUrlRecipe] = useState<Recipe | null>(null);
  const [isSavingUrlRecipe, setIsSavingUrlRecipe] = useState<boolean>(false);
  const [savedUrlSuccess, setSavedUrlSuccess] = useState<boolean>(false);

  // Video File Import State
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoNotes, setVideoNotes] = useState<string>("");
  const [isParsingVideo, setIsParsingVideo] = useState<boolean>(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [parsedVideoRecipe, setParsedVideoRecipe] = useState<Recipe | null>(null);
  const [isSavingVideoRecipe, setIsSavingVideoRecipe] = useState<boolean>(false);
  const [savedVideoSuccess, setSavedVideoSuccess] = useState<boolean>(false);

  // Photos Batch State
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

  // Handler: Parse Recipe URL
  const handleParseUrl = async (urlToParse?: string) => {
    const targetUrl = (urlToParse || urlInput).trim();
    if (!targetUrl) {
      setUrlError("Veuillez saisir ou coller un lien de recette valide.");
      return;
    }

    setUrlError(null);
    setIsParsingUrl(true);
    setParsedUrlRecipe(null);
    setSavedUrlSuccess(false);
    addLog(`Analyse du lien web : ${targetUrl}`);

    try {
      const res = await fetch("/api/ai/parse-recipe-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });

      const data = await res.json();
      if (data.logs && Array.isArray(data.logs)) {
        data.logs.forEach((l: string) => addLog(l));
      }

      if (!res.ok || !data.recipe) {
        throw new Error(data.error || "Impossible d'importer la recette depuis ce lien.");
      }

      const raw = data.recipe;
      const isVideoLink = /instagram\.com|tiktok\.com|youtube\.com|youtu\.be/i.test(targetUrl);
      const recipeToSet: Recipe = {
        id: `url_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: user?.id || "guest",
        title: raw.title || "Recette importée",
        subtitle: raw.subtitle || undefined,
        category: raw.category || "Main Dishes",
        imageUrl: raw.imageUrl || "",
        prepTimeMinutes: raw.prepTimeMinutes || 30,
        difficulty: raw.difficulty || "Easy",
        rating: 0, // the user rates the recipe after cooking it
        servingsBase: raw.servingsBase || DEFAULT_SERVINGS,
        ingredients: Array.isArray(raw.ingredients) ? raw.ingredients : [],
        steps: Array.isArray(raw.steps) ? raw.steps : [],
        sourceUrl: raw.sourceUrl || targetUrl,
        videoUrl: raw.videoUrl || (isVideoLink ? targetUrl : undefined),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setParsedUrlRecipe(recipeToSet);
      addLog(`Succès : Recette "${recipeToSet.title}" extraite (${recipeToSet.ingredients.length} ingrédients, ${recipeToSet.steps.length} étapes).`);
    } catch (err: any) {
      console.error("handleParseUrl error:", err);
      setUrlError(err?.message || "Échec de l'import du lien");
      addLog(`ERREUR : ${err?.message || err}`);
    } finally {
      setIsParsingUrl(false);
    }
  };

  // Handler: Save URL Recipe to Database
  const handleSaveParsedUrlRecipe = async () => {
    if (!parsedUrlRecipe) return;
    if (!user?.id) {
      router.push("/login?redirectedFrom=/import");
      return;
    }

    setIsSavingUrlRecipe(true);
    try {
      const saved = await saveRecipeToDb(parsedUrlRecipe, user.id);
      setSavedUrlSuccess(true);
      addLog(`Recette "${saved.title}" enregistrée en base de données avec succès.`);
      setTimeout(() => {
        router.push(`/recipes/${saved.id}`);
      }, 1000);
    } catch (err: any) {
      console.error("handleSaveParsedUrlRecipe error:", err);
      setUrlError(err?.message || "Erreur lors de la sauvegarde en base.");
    } finally {
      setIsSavingUrlRecipe(false);
    }
  };

  // Handler: Select video file
  const handleSelectVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setVideoError(null);
      setParsedVideoRecipe(null);
      setSavedVideoSuccess(false);
      addLog(`Vidéo sélectionnée : ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
    }
  };

  // Handler: Parse Video File with Multimodal AI
  const handleParseVideo = async () => {
    if (!videoFile) {
      setVideoError("Veuillez sélectionner un fichier vidéo.");
      return;
    }

    setVideoError(null);
    setIsParsingVideo(true);
    setParsedVideoRecipe(null);
    setSavedVideoSuccess(false);
    addLog(`Envoi de la vidéo "${videoFile.name}" à l'IA multimodale Gemini 2.5 Flash...`);

    try {
      const formData = new FormData();
      formData.append("video", videoFile);
      if (videoNotes.trim()) formData.append("notes", videoNotes.trim());

      const res = await fetch("/api/ai/parse-recipe-video", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.logs && Array.isArray(data.logs)) {
        data.logs.forEach((l: string) => addLog(l));
      }

      if (!res.ok || !data.recipe) {
        throw new Error(data.error || "Échec de l'analyse vidéo.");
      }

      const raw = data.recipe;
      const extractedUrlMatch = videoNotes.match(/https?:\/\/[^\s]+/i);
      const recipeToSet: Recipe = {
        id: `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: user?.id || "guest",
        title: raw.title || "Recette vidéo",
        subtitle: raw.subtitle || undefined,
        category: raw.category || "Main Dishes",
        imageUrl: raw.imageUrl || "",
        prepTimeMinutes: raw.prepTimeMinutes || 30,
        difficulty: raw.difficulty || "Easy",
        rating: 0, // the user rates the recipe after cooking it
        servingsBase: raw.servingsBase || DEFAULT_SERVINGS,
        ingredients: Array.isArray(raw.ingredients) ? raw.ingredients : [],
        steps: Array.isArray(raw.steps) ? raw.steps : [],
        sourceUrl: raw.sourceUrl || (extractedUrlMatch ? extractedUrlMatch[0] : undefined),
        videoUrl: raw.videoUrl || (extractedUrlMatch ? extractedUrlMatch[0] : undefined),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setParsedVideoRecipe(recipeToSet);
      addLog(`Succès : Recette vidéo "${recipeToSet.title}" extraite (${recipeToSet.ingredients.length} ingrédients, ${recipeToSet.steps.length} étapes).`);
    } catch (err: any) {
      console.error("handleParseVideo error:", err);
      setVideoError(err?.message || "Échec de l'analyse de la vidéo.");
      addLog(`ERREUR VIDÉO : ${err?.message || err}`);
    } finally {
      setIsParsingVideo(false);
    }
  };

  // Handler: Save Video Recipe to Database
  const handleSaveParsedVideoRecipe = async () => {
    if (!parsedVideoRecipe) return;
    if (!user?.id) {
      router.push("/login?redirectedFrom=/import");
      return;
    }

    setIsSavingVideoRecipe(true);
    try {
      const saved = await saveRecipeToDb(parsedVideoRecipe, user.id);
      setSavedVideoSuccess(true);
      addLog(`Recette vidéo "${saved.title}" enregistrée en base de données avec succès.`);
      setTimeout(() => {
        router.push(`/recipes/${saved.id}`);
      }, 1000);
    } catch (err: any) {
      console.error("handleSaveParsedVideoRecipe error:", err);
      setVideoError(err?.message || "Erreur lors de la sauvegarde en base.");
    } finally {
      setIsSavingVideoRecipe(false);
    }
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
    setGlobalProgressMessage("");
    setIsProcessingBatch(false);
  };

  // Process Batch Queue
  const handleStartBatchProcessing = async () => {
    if (pairs.length === 0 || isProcessingBatch) return;

    if (!user?.id) {
      router.push("/login?redirectedFrom=/import");
      return;
    }

    setIsProcessingBatch(true);
    setShouldStopQueue(false);
    setGlobalProgressMessage("Démarrage du traitement par lot...");
    addLog(`Démarrage du traitement séquentiel pour ${pairs.length} recette(s)...`);

    const updatedPairs = [...pairs];
    const results: Recipe[] = [...completedRecipes];

    for (let i = 0; i < updatedPairs.length; i++) {
      if (shouldStopQueue) {
        addLog("Arrêt demandé par l'utilisateur.");
        break;
      }

      const pair = updatedPairs[i];
      if (pair.status === "success") {
        continue;
      }

      setCurrentPairIndex(i);
      setGlobalProgressMessage(`Analyse de la recette ${i + 1} sur ${updatedPairs.length}...`);

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
          user.id,
          (status) => setGlobalProgressMessage(`Recette ${i + 1}/${updatedPairs.length} : ${status}`)
        );

        await saveRecipeToDb({ ...result.recipe, rating: 0 }, user.id);

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
            <span>Importer une Recette</span>
          </h1>
          <span className="text-[10px] text-[#8E929E] font-medium">
            Liens, Photos ou Vidéos
          </span>
        </div>

        <div
          className="w-10 h-10 flex items-center justify-center text-emerald-600 bg-emerald-50 rounded-full"
          title="Sauvegarde Supabase"
        >
          <ShieldCheck className="w-5 h-5" />
        </div>
      </header>

      <div className="max-w-3xl w-full mx-auto px-5 pt-4 space-y-5">
        {/* Tab Switcher */}
        <div className="flex bg-slate-200/70 p-1 rounded-2xl gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("url")}
            className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "url"
                ? "bg-white text-[#181A20] shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Globe className="w-4 h-4 text-[#5DB534]" />
            <span>Liens</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("photos")}
            className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "photos"
                ? "bg-white text-[#181A20] shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Camera className="w-4 h-4 text-[#5DB534]" />
            <span>Photos</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("video")}
            className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "video"
                ? "bg-white text-[#181A20] shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Film className="w-4 h-4 text-[#5DB534]" />
            <span>Vidéos</span>
          </button>
        </div>

        {/* TAB 1: URL IMPORT */}
        {activeTab === "url" && (
          <div className="space-y-4">
            {/* Input Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-[#181A20] flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-[#5DB534]" />
                  <span>Collez le lien d'une recette ou d'un Reel / TikTok</span>
                </h3>
                <p className="text-xs text-[#8E929E] mt-1 leading-relaxed">
                  Supporte <strong>Instagram Reels</strong>, <strong>TikTok</strong>, <strong>YouTube Shorts</strong>, ainsi que <strong>Marmiton, 750g, CuisineAZ</strong>, HelloFresh et blogs culinaires.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleParseUrl();
                    }}
                    placeholder="https://www.instagram.com/reel/... ou https://www.marmiton.org/..."
                    className="w-full bg-slate-50 px-4 py-3.5 rounded-2xl text-xs text-[#181A20] placeholder-slate-400 border border-slate-200/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5DB534]/30"
                  />
                  {urlInput && (
                    <button
                      type="button"
                      onClick={() => setUrlInput("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleParseUrl()}
                  disabled={isParsingUrl || !urlInput.trim()}
                  className="px-6 py-3.5 bg-[#5DB534] hover:bg-[#4FA12A] disabled:opacity-50 text-white text-xs font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  {isParsingUrl ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyse en cours...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Importer</span>
                    </>
                  )}
                </button>
              </div>

              {/* Quick test button with the user requested link */}
              <div className="pt-1 flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-medium">Lien exemple test :</span>
                <button
                  type="button"
                  onClick={() => {
                    const testLink =
                      "https://www.marmiton.org/recettes/recette_quiche-au-saumon-et-aux-epinards_22164.aspx";
                    setUrlInput(testLink);
                    handleParseUrl(testLink);
                  }}
                  className="text-[11px] text-[#5DB534] hover:underline font-bold flex items-center gap-1 cursor-pointer bg-emerald-50 px-2 py-0.5 rounded-md"
                >
                  <span>Quiche Saumon & Épinards (Marmiton)</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </div>

              {urlError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-xs text-red-600">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{urlError}</span>
                </div>
              )}
            </div>

            {/* Parsed Recipe Preview Card */}
            {parsedUrlRecipe && (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="relative h-48 sm:h-64 w-full bg-slate-100">
                  <img
                    src={parsedUrlRecipe.imageUrl}
                    alt={parsedUrlRecipe.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-extrabold text-[#5DB534]">
                    {categoryLabel(parsedUrlRecipe.category)}
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <h2 className="text-lg sm:text-xl font-extrabold leading-tight">
                      {parsedUrlRecipe.title}
                    </h2>
                    {parsedUrlRecipe.subtitle && (
                      <p className="text-xs text-slate-200 line-clamp-1 mt-1">
                        {parsedUrlRecipe.subtitle}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs font-semibold text-slate-200">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#5DB534]" />
                        {parsedUrlRecipe.prepTimeMinutes} min
                      </span>
                      <span className="flex items-center gap-1">
                        <ChefHat className="w-3.5 h-3.5 text-[#5DB534]" />
                        {parsedUrlRecipe.servingsBase} portions
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-5 sm:p-6 space-y-6">
                  {/* Ingredients Section */}
                  <div>
                    <h4 className="text-xs font-bold text-[#181A20] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Utensils className="w-3.5 h-3.5 text-[#5DB534]" />
                      <span>Ingrédients ({parsedUrlRecipe.ingredients.length})</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {parsedUrlRecipe.ingredients.map((ing, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-50 px-3 py-2 rounded-xl flex items-center justify-between text-xs border border-slate-100"
                        >
                          <span className="font-semibold text-[#181A20]">{ing.name}</span>
                          <span className="text-[#5DB534] font-bold">
                            {ing.amount} {ing.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Steps Section */}
                  <div>
                    <h4 className="text-xs font-bold text-[#181A20] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-[#5DB534]" />
                      <span>Étapes de préparation ({parsedUrlRecipe.steps.length})</span>
                    </h4>
                    <div className="space-y-3">
                      {parsedUrlRecipe.steps.map((st, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-1"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#5DB534] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                              {st.stepNumber || idx + 1}
                            </span>
                            <span className="text-xs font-bold text-[#181A20]">
                              {st.title || `Étape ${idx + 1}`}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 pl-7 leading-relaxed">
                            {st.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Save Action Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleSaveParsedUrlRecipe}
                      disabled={isSavingUrlRecipe || savedUrlSuccess}
                      className="w-full py-4 bg-[#5DB534] hover:bg-[#4FA12A] text-white text-sm font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-98 transition-all cursor-pointer"
                    >
                      {savedUrlSuccess ? (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          <span>Recette enregistrée ! Redirection...</span>
                        </>
                      ) : isSavingUrlRecipe ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Enregistrement en cours...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-5 h-5" />
                          <span>Enregistrer dans mes recettes</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PHOTOS OCR BATCH IMPORT */}
        {activeTab === "photos" && (
          <div className="space-y-4">
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

                    {/* Clear all button */}
                    <button
                      type="button"
                      onClick={handleClearAll}
                      disabled={isProcessingBatch}
                      className="p-2 text-rose-500 hover:bg-rose-50 disabled:opacity-50 rounded-xl transition-colors cursor-pointer"
                      title="Tout effacer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Grid of pairs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pairs.map((pair, index) => (
                    <div
                      key={pair.id}
                      className={`bg-white rounded-2xl p-4 border transition-all shadow-xs ${
                        pair.status === "processing"
                          ? "border-[#5DB534] ring-2 ring-emerald-400/20"
                          : pair.status === "success"
                          ? "border-emerald-200 bg-emerald-50/20"
                          : pair.status === "error"
                          ? "border-rose-200 bg-rose-50/20"
                          : "border-slate-100"
                      }`}
                    >
                      {/* Pair header */}
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-50">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-100 text-[#181A20] text-xs font-bold flex items-center justify-center">
                            {index + 1}
                          </span>
                          <span className="text-xs font-bold text-[#181A20] truncate max-w-[140px]">
                            {pair.recipe?.title || `Fiche Recette ${index + 1}`}
                          </span>
                        </div>

                        {/* Status badge */}
                        <div className="flex items-center gap-1.5">
                          {pair.status === "processing" && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full animate-pulse">
                              En cours...
                            </span>
                          )}
                          {pair.status === "success" && (
                            <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Prêt</span>
                            </span>
                          )}
                          {pair.status === "error" && (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              <span>Erreur</span>
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeletePair(pair.id)}
                            disabled={isProcessingBatch}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Photos Recto / Verso Preview */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* Recto */}
                        <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/60">
                          {pair.rectoPreview ? (
                            <img
                              src={pair.rectoPreview}
                              alt={`Recto ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px]">
                              Recto manquant
                            </div>
                          )}
                          <span className="absolute bottom-1.5 left-1.5 bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                            Recto (Plat)
                          </span>
                        </div>

                        {/* Verso */}
                        <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/60">
                          {pair.versoPreview ? (
                            <img
                              src={pair.versoPreview}
                              alt={`Verso ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-[10px] p-2 text-center">
                              <span>Pas de verso</span>
                              <span className="text-[8px] text-slate-300">(1 seule face)</span>
                            </div>
                          )}
                          <span className="absolute bottom-1.5 left-1.5 bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                            Verso (Étapes)
                          </span>
                        </div>
                      </div>

                      {/* Error or Success details */}
                      {pair.error && (
                        <p className="text-[11px] text-rose-600 mt-2 bg-rose-50 p-2 rounded-xl">
                          {pair.error}
                        </p>
                      )}

                      {/* Actions per card */}
                      <div className="mt-3 pt-2 flex items-center justify-between gap-2 border-t border-slate-50">
                        {pair.versoFile && (
                          <button
                            type="button"
                            onClick={() => handleSwapPair(pair.id)}
                            disabled={isProcessingBatch}
                            className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <ArrowLeftRight className="w-3 h-3 text-emerald-700" />
                            <span>Inverser faces</span>
                          </button>
                        )}

                        {pair.status === "error" && (
                          <button
                            type="button"
                            onClick={() => handleStartBatchProcessing()}
                            disabled={isProcessingBatch}
                            className="px-2.5 py-1 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg flex items-center gap-1 transition-colors ml-auto cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Réessayer</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Global Batch Controls */}
                <div className="sticky bottom-20 z-20 bg-white/95 backdrop-blur-md p-4 rounded-3xl border border-slate-100 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="w-full sm:w-auto">
                    <span className="text-xs font-bold text-[#181A20] block">
                      {isProcessingBatch
                        ? globalProgressMessage || "Traitement du lot..."
                        : `${pendingCount} recette(s) prête(s) à être analysée(s)`}
                    </span>
                    <span className="text-[11px] text-[#8E929E]">
                      Gemini Multimodal Vision • Extraction OCR & Recadrage Auto
                    </span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {isProcessingBatch ? (
                      <button
                        type="button"
                        onClick={() => setShouldStopQueue(true)}
                        className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-2xl flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>Interrompre</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStartBatchProcessing}
                        disabled={pendingCount === 0}
                        className="px-6 py-3 bg-[#5DB534] hover:bg-[#4FA12A] disabled:opacity-50 text-white text-xs font-extrabold rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>Lancer l'analyse du lot</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: VIDEO / REEL MULTIMODAL IMPORT */}
        {activeTab === "video" && (
          <div className="space-y-4">
            {/* Description card */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
              <p className="text-xs text-[#8E929E] leading-relaxed">
                Importez directement un <strong>fichier vidéo</strong> (Reel Instagram téléchargé, TikTok, vidéo de cuisine enregistrée). L'IA <strong>Gemini 2.5 Flash</strong> analyse simultanément l'<strong>image</strong>, les <strong>gestes du chef</strong>, le <strong>texte à l'écran</strong> et la <strong>voix off</strong> pour construire la fiche recette complète calibrée pour 6 personnes.
              </p>
            </div>

            {/* Video Dropzone / Selector */}
            {!videoFile ? (
              <div
                onClick={() => videoInputRef.current?.click()}
                className="border-2 border-dashed border-[#5DB534]/60 hover:border-[#5DB534] bg-emerald-50/20 hover:bg-emerald-50/40 rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all shadow-xs group"
              >
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,video/m4v"
                  onChange={handleSelectVideo}
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-2xl bg-white text-[#5DB534] flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform border border-emerald-100">
                  <Film className="w-8 h-8" />
                </div>

                <h3 className="text-base font-extrabold text-[#181A20]">
                  Déposez votre vidéo de recette ici
                </h3>
                <p className="text-xs text-[#8E929E] mt-1.5 max-w-sm">
                  Formats supportés : MP4, MOV, WEBM. Analyse visuelle et sonore par IA multimodale.
                </p>

                <button
                  type="button"
                  className="mt-5 px-5 py-2.5 bg-[#5DB534] hover:bg-[#4FA12A] text-white text-xs font-bold rounded-full flex items-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
                >
                  <Video className="w-4 h-4" />
                  <span>Choisir un fichier vidéo</span>
                </button>
              </div>
            ) : (
              /* Selected Video & Action Panel */
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3 truncate">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#5DB534] flex items-center justify-center shrink-0">
                      <Film className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <h4 className="text-xs font-bold text-[#181A20] truncate">
                        {videoFile.name}
                      </h4>
                      <span className="text-[11px] text-[#8E929E]">
                        {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setVideoFile(null);
                      setVideoPreview(null);
                      setParsedVideoRecipe(null);
                      setVideoError(null);
                    }}
                    disabled={isParsingVideo}
                    className="text-xs font-bold text-rose-500 hover:text-rose-700 px-3 py-1.5 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    Changer
                  </button>
                </div>

                {/* Video Preview Player */}
                {videoPreview && (
                  <div className="rounded-2xl overflow-hidden bg-black aspect-video max-h-72 w-full flex items-center justify-center">
                    <video
                      src={videoPreview}
                      controls
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                {/* Optional User Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#181A20] flex items-center justify-between">
                    <span>Notes ou précisions complémentaires (optionnel)</span>
                    <span className="text-[10px] text-[#8E929E] font-normal">ex: nom du plat, portions</span>
                  </label>
                  <textarea
                    rows={2}
                    value={videoNotes}
                    onChange={(e) => setVideoNotes(e.target.value)}
                    placeholder="ex: Recette de pâtes carbonara traditionnelles vue sur Instagram..."
                    className="w-full bg-slate-50 px-4 py-2.5 rounded-2xl text-xs text-[#181A20] placeholder-slate-400 border border-slate-200/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5DB534]/30 resize-none"
                  />
                </div>

                {videoError && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-xs text-red-600">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{videoError}</span>
                  </div>
                )}

                {/* Analyze Action Button */}
                <button
                  type="button"
                  onClick={handleParseVideo}
                  disabled={isParsingVideo}
                  className="w-full py-3.5 bg-[#5DB534] hover:bg-[#4FA12A] disabled:opacity-50 text-white text-xs font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-98 transition-all cursor-pointer"
                >
                  {isParsingVideo ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyse IA multimodale en cours (audio + vidéo)...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Analyser la vidéo avec Gemini 2.5 Flash</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Parsed Video Recipe Preview Card */}
            {parsedVideoRecipe && (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="relative h-48 sm:h-64 w-full bg-slate-900 flex items-center justify-center">
                  {parsedVideoRecipe.imageUrl ? (
                    <img
                      src={parsedVideoRecipe.imageUrl}
                      alt={parsedVideoRecipe.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <Film className="w-12 h-12 text-[#5DB534] mx-auto mb-2 opacity-80" />
                      <span className="text-xs text-slate-300 font-semibold">
                        Recette extraite depuis la vidéo
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-extrabold text-[#5DB534]">
                    {categoryLabel(parsedVideoRecipe.category)}
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <h2 className="text-lg sm:text-xl font-extrabold leading-tight">
                      {parsedVideoRecipe.title}
                    </h2>
                    {parsedVideoRecipe.subtitle && (
                      <p className="text-xs text-slate-200 line-clamp-1 mt-1">
                        {parsedVideoRecipe.subtitle}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs font-semibold text-slate-200">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#5DB534]" />
                        {parsedVideoRecipe.prepTimeMinutes} min
                      </span>
                      <span className="flex items-center gap-1">
                        <ChefHat className="w-3.5 h-3.5 text-[#5DB534]" />
                        {parsedVideoRecipe.servingsBase} portions
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-5 sm:p-6 space-y-6">
                  {/* Ingredients Section */}
                  <div>
                    <h4 className="text-xs font-bold text-[#181A20] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Utensils className="w-3.5 h-3.5 text-[#5DB534]" />
                      <span>Ingrédients ({parsedVideoRecipe.ingredients.length})</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {parsedVideoRecipe.ingredients.map((ing, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-50 px-3 py-2 rounded-xl flex items-center justify-between text-xs border border-slate-100"
                        >
                          <span className="font-semibold text-[#181A20]">{ing.name}</span>
                          <span className="text-[#5DB534] font-bold">
                            {ing.amount} {ing.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Steps Section */}
                  <div>
                    <h4 className="text-xs font-bold text-[#181A20] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-[#5DB534]" />
                      <span>Étapes de préparation ({parsedVideoRecipe.steps.length})</span>
                    </h4>
                    <div className="space-y-3">
                      {parsedVideoRecipe.steps.map((st, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-1"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#5DB534] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                              {st.stepNumber || idx + 1}
                            </span>
                            <span className="text-xs font-bold text-[#181A20]">
                              {st.title || `Étape ${idx + 1}`}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 pl-7 leading-relaxed">
                            {st.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Save Action Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleSaveParsedVideoRecipe}
                      disabled={isSavingVideoRecipe || savedVideoSuccess}
                      className="w-full py-4 bg-[#5DB534] hover:bg-[#4FA12A] text-white text-sm font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-98 transition-all cursor-pointer"
                    >
                      {savedVideoSuccess ? (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          <span>Recette vidéo enregistrée ! Redirection...</span>
                        </>
                      ) : isSavingVideoRecipe ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Enregistrement en base de données...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-5 h-5" />
                          <span>Enregistrer dans mes recettes</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Execution Logs Drawer Toggle */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowLogs(!showLogs)}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#5DB534]" />
              <span>Journaux d'exécution IA ({executionLogs.length})</span>
            </div>
            {showLogs ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showLogs && (
            <div className="mt-2 bg-[#181A20] text-emerald-400 p-4 rounded-2xl text-[11px] font-mono shadow-inner border border-slate-800 space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-bold">
                  Console Gemini & Parser
                </span>
                <button
                  type="button"
                  onClick={handleCopyLogs}
                  className="text-slate-400 hover:text-white flex items-center gap-1 text-[10px] cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedLogs ? "Copié !" : "Copier"}</span>
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                {executionLogs.length === 0 ? (
                  <p className="text-slate-500 italic">Aucun log pour le moment.</p>
                ) : (
                  executionLogs.map((log, i) => (
                    <p key={i} className="leading-relaxed">
                      {log}
                    </p>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
