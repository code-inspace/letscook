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
  Wand2,
  Image as ImageIcon
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { Recipe } from "@/features/recipes/types";
import { parseRecipeAlbumWithAI, generateStudioDishImageUrl } from "@/features/ai/visionParser";
import { saveRecipeToDb } from "@/features/recipes/actions";

export default function AIImportPage() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressStatus, setProgressStatus] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [extractedRecipe, setExtractedRecipe] = useState<Recipe | null>(null);
  const [originalCutout, setOriginalCutout] = useState<string>("");
  const [isAiStudioGenerated, setIsAiStudioGenerated] = useState<boolean>(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(filesArray);
      const urls = filesArray.map((f) => URL.createObjectURL(f));
      setPreviews(urls);
      setExtractedRecipe(null);
      setErrorMessage("");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      setSelectedFiles(filesArray);
      const urls = filesArray.map((f) => URL.createObjectURL(f));
      setPreviews(urls);
      setExtractedRecipe(null);
      setErrorMessage("");
    }
  };

  const startAIExtraction = async () => {
    if (selectedFiles.length === 0) return;
    setIsProcessing(true);
    setErrorMessage("");
    setProgressStatus("Envoi des photos à l'IA...");

    try {
      const parsed = await parseRecipeAlbumWithAI(
        selectedFiles,
        user?.id,
        (status) => setProgressStatus(status)
      );
      setExtractedRecipe(parsed);
      setOriginalCutout(parsed.imageUrl);
      setIsAiStudioGenerated(false);
    } catch (err: any) {
      console.error("AI Import error:", err);
      setErrorMessage(err?.message || "Une erreur est survenue lors de l'analyse.");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleStudioAiRegeneration = () => {
    if (!extractedRecipe) return;

    if (!isAiStudioGenerated) {
      const ingrNames = (extractedRecipe.ingredients || []).map((i) => i.name);
      const studioUrl = generateStudioDishImageUrl(extractedRecipe.title, ingrNames);
      setExtractedRecipe({ ...extractedRecipe, imageUrl: studioUrl });
      setIsAiStudioGenerated(true);
    } else {
      setExtractedRecipe({ ...extractedRecipe, imageUrl: originalCutout });
      setIsAiStudioGenerated(false);
    }
  };

  const handleSaveAndCook = async () => {
    if (!extractedRecipe) return;
    setIsProcessing(true);
    setProgressStatus("Chiffrement AES-256-GCM & Synchronisation...");
    await saveRecipeToDb(extractedRecipe, user?.id);
    router.push(`/recipes/${extractedRecipe.id}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FB] pb-32">
      {/* Header */}
      <header className="px-6 pt-7 pb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-[#181A20] shadow-sm border border-slate-100 active:scale-95 transition-all cursor-pointer"
          aria-label="Retour à l'accueil"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <h1 className="text-base font-extrabold text-[#181A20]">
          Import Photo IA
        </h1>

        <div className="w-11 h-11 flex items-center justify-center text-emerald-600" title="Chiffrement activé">
          <ShieldCheck className="w-6 h-6" />
        </div>
      </header>

      <div className="px-6 pt-2">
        <p className="text-xs text-[#8E929E] leading-relaxed">
          Prenez en photo votre fiche recette (recto du plat + verso des étapes). L'IA associe automatiquement les ingrédients, découpe la photo de <strong>chaque étape</strong> et détourera le plat principal !
        </p>

        {/* Drag and drop / Photo upload zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-4 border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            selectedFiles.length > 0
              ? "border-[#22C55E] bg-emerald-50/20"
              : "border-slate-200 bg-white hover:border-[#22C55E]/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#22C55E] flex items-center justify-center mb-3 shadow-inner">
            <UploadCloud className="w-7 h-7" />
          </div>

          <h3 className="text-sm font-bold text-[#181A20]">
            {selectedFiles.length > 0
              ? `${selectedFiles.length} photo(s) sélectionnée(s)`
              : "Ajouter les photos (Recto + Verso)"}
          </h3>
          <p className="text-xs text-[#8E929E] mt-1">
            Glissez vos photos ou cliquez pour parcourir
          </p>

          <button
            type="button"
            className="mt-3.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#181A20] text-xs font-bold rounded-full flex items-center gap-1.5 transition-colors"
          >
            <Camera className="w-4 h-4 text-emerald-600" />
            <span>Sélectionner les 2 photos</span>
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-700">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Erreur d'analyse</p>
              <p className="mt-0.5 text-rose-600">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Selected Photos Thumbnails Grid */}
        {previews.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#181A20]">Photos sélectionnées ({previews.length})</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedFiles([]);
                  setPreviews([]);
                  setExtractedRecipe(null);
                  setErrorMessage("");
                }}
                className="text-xs font-semibold text-rose-500 hover:underline flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Effacer
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {previews.map((url, i) => (
                <div
                  key={i}
                  className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 shadow-2xs group"
                >
                  <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-xs">
                    {i === 0 ? "Recto (Plat)" : "Verso (Étapes)"}
                  </span>
                </div>
              ))}
            </div>

            {!extractedRecipe && (
              <button
                type="button"
                onClick={startAIExtraction}
                disabled={isProcessing}
                className="w-full mt-4 py-3.5 bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white text-xs font-extrabold rounded-full shadow-md hover:brightness-105 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Lancer l'analyse IA multimodale</span>
              </button>
            )}
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="mt-6 p-5 bg-white rounded-3xl border border-emerald-100 shadow-sm flex flex-col items-center text-center animate-in fade-in">
            <div className="w-10 h-10 border-3 border-[#22C55E] border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-xs font-bold text-[#181A20]">{progressStatus}</span>
            <span className="text-[11px] text-[#8E929E] mt-1">Découpe automatique du plat et des photos d'étapes</span>
          </div>
        )}

        {/* Extracted Recipe Result Card & Step Photos Review */}
        {extractedRecipe && (
          <div className="mt-6 bg-white p-5 rounded-3xl border border-slate-100 shadow-md space-y-4 animate-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-xs font-bold">Recette extraite avec succès !</span>
            </div>

            {/* Main Dish Cutout + Studio AI Switch */}
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-full overflow-hidden p-1 bg-gradient-to-b from-white to-slate-200 border border-slate-200 shadow-md shrink-0">
                <img
                  src={extractedRecipe.imageUrl}
                  alt={extractedRecipe.title}
                  className="w-full h-full object-cover rounded-full"
                />
              </div>

              <div className="flex-1">
                <span className="text-[10px] font-bold text-[#22C55E] uppercase">
                  {extractedRecipe.category}
                </span>
                <h3 className="text-sm font-bold text-[#181A20] line-clamp-2">
                  {extractedRecipe.title}
                </h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-[#8E929E]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    {extractedRecipe.prepTimeMinutes}m
                  </span>
                  <span>{extractedRecipe.ingredients?.length || 0} ingr.</span>
                  <span>{extractedRecipe.steps?.length || 0} étapes</span>
                </div>
              </div>
            </div>

            {/* Studio AI Regeneration Toggle Button */}
            <button
              type="button"
              onClick={toggleStudioAiRegeneration}
              className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <Wand2 className="w-3.5 h-3.5 text-purple-600" />
              <span>
                {isAiStudioGenerated
                  ? "Revenir à la photo réelle détourée"
                  : "✨ Régénérer en Photo Studio IA (FLUX 4K)"}
              </span>
            </button>

            {/* Step Photos Gallery */}
            <div>
              <span className="text-xs font-bold text-[#181A20]">Photos des étapes extraites :</span>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {extractedRecipe.steps?.map((step) => (
                  <div
                    key={step.stepNumber}
                    className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-2xs group"
                  >
                    {step.imageUrl ? (
                      <img
                        src={step.imageUrl}
                        alt={`Étape ${step.stepNumber}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                    )}
                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-xs">
                      Étape {step.stepNumber}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ingredients detected preview */}
            <div>
              <span className="text-xs font-bold text-[#181A20]">Ingrédients détectés :</span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {extractedRecipe.ingredients?.map((ing, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-medium bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-xl text-slate-700"
                  >
                    {ing.name} ({ing.amount} {ing.unit})
                  </span>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSaveAndCook}
              className="w-full py-4 bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white text-sm font-extrabold rounded-full shadow-[0_6px_20px_rgba(34,197,94,0.4)] hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Enregistrer & Cuisiner</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
