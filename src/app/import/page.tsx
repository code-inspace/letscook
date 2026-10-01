"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Camera,
  UploadCloud,
  Sparkles,
  CheckCircle2,
  Image as ImageIcon,
  Trash2,
  Clock,
  Flame,
  ShieldCheck,
  Utensils
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { Recipe, Ingredient, RecipeStep } from "@/features/recipes/types";
import { parseRecipeAlbumWithAI } from "@/features/ai/visionParser";
import { saveRecipeToDb } from "@/features/recipes/actions";

export default function AIImportPage() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressStatus, setProgressStatus] = useState<string>("");
  const [extractedRecipe, setExtractedRecipe] = useState<Recipe | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(filesArray);
      const urls = filesArray.map((f) => URL.createObjectURL(f));
      setPreviews(urls);
      setExtractedRecipe(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const filesArray = Array.from(e.dataTransfer.files);
      setSelectedFiles(filesArray);
      const urls = filesArray.map((f) => URL.createObjectURL(f));
      setPreviews(urls);
      setExtractedRecipe(null);
    }
  };

  const startAIExtraction = async () => {
    if (selectedFiles.length === 0) return;
    setIsProcessing(true);
    setProgressStatus("Analyse de l'album photo par l'IA...");

    try {
      const parsed = await parseRecipeAlbumWithAI(
        selectedFiles,
        user?.id,
        (status) => setProgressStatus(status)
      );
      setExtractedRecipe(parsed);
    } catch (err) {
      console.error("AI Import error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveAndCook = async () => {
    if (!extractedRecipe) return;
    setIsProcessing(true);
    setProgressStatus("Chiffrement AES-256-GCM & Synchronisation...");
    await saveRecipeToDb(extractedRecipe, user?.id);
    router.push(`/recipes/${extractedRecipe.id}`);
  };

  // Preset demo loader for the 2 HelloFresh sheets
  const loadHelloFreshSample = (sampleType: "porc" | "dinde") => {
    setIsProcessing(true);
    setProgressStatus("Extraction de la fiche recette HelloFresh...");

    setTimeout(() => {
      if (sampleType === "porc") {
        setExtractedRecipe({
          id: `rec_${Date.now()}`,
          userId: user?.id || "user-default-1",
          title: "Porc haché, riz & navet glacé à la japonaise",
          subtitle: "avec une sauce soja-sésame & du citron",
          category: "Main Dishes",
          imageUrl: "https://images.unsplash.com/photo-1552611052-33e04de081de?w=600&auto=format&fit=crop&q=80",
          prepTimeMinutes: 40,
          difficulty: "Medium",
          rating: 4.9,
          servingsBase: 6,
          spiceLevel: "Épicé",
          utensils: ["Sauteuse avec couvercle", "Râpe", "Casserole", "Éplucheur", "Passoire"],
          nutrition: {
            caloriesKcal: 830,
            proteines: "26g",
            glucides: "83g",
            lipides: "45g",
            fibres: "7g",
            sel: "3.6g",
          },
          allergens: ["Soja", "Sésame"],
          ingredients: [
            { id: "ing-p1", name: "Navet", amount: 4, unit: "pièce(s)" },
            { id: "ing-p2", name: "Carotte", amount: 3, unit: "pièce(s)" },
            { id: "ing-p3", name: "Gousse d'ail", amount: 2, unit: "pièce(s)" },
            { id: "ing-p4", name: "Oignon nouveau", amount: 100, unit: "g" },
            { id: "ing-p5", name: "Gingembre frais", amount: 2, unit: "cm" },
            { id: "ing-p6", name: "Riz", amount: 450, unit: "g" },
            { id: "ing-p7", name: "Farce au porc", amount: 2, unit: "paquet(s)" },
            { id: "ing-p8", name: "Citron", amount: 1.5, unit: "pièce(s)" },
            { id: "ing-p9", name: "Sauce soja", amount: 1.5, unit: "sachet(s)" },
            { id: "ing-p10", name: "Huile de sésame", amount: 1.5, unit: "sachet(s)" },
          ],
          steps: [
            {
              stepNumber: 1,
              title: "Coupe, tranche, cisèle !",
              description: "Épluchez le navet et coupez-le en quartiers de 1 cm. Épluchez la carotte et coupez-la en 8 bâtonnets. Ciselez l'ail ainsi que le blanc et le vert de l'oignon nouveau. Râpez le gingembre.",
              durationMinutes: 10,
            },
            {
              stepNumber: 2,
              title: "La sauteuse en action",
              description: "Faites fondre du beurre à feu moyen-vif. Ajoutez le navet et la carotte (5 min). Saupoudrez le sucre (3 min). Mouillez à hauteur, couvrez et cuisez 14-18 min.",
              durationMinutes: 18,
              chefTip: "Vérifiez la cuisson des légumes avec la pointe d'un couteau.",
            },
            {
              stepNumber: 3,
              title: "Le riz passe à la casserole",
              description: "Portez de l'eau salée à ébullition. Cuisez le riz 12-14 min. Égouttez, beurrez et couvrez.",
              durationMinutes: 14,
            },
            {
              stepNumber: 4,
              title: "Au tour de la viande",
              description: "Faites dorer l'ail et le porc 4-5 min dans un wok à feu vif. Ajoutez le blanc d'oignon et poursuivez 2-3 min.",
              durationMinutes: 8,
            },
            {
              stepNumber: 5,
              title: "Pause fraîcheur",
              description: "Mélangez le citron, gingembre, sauce soja, huile de sésame et vinaigre. Ajoutez la moitié dans les légumes et le reste dans la viande.",
              durationMinutes: 4,
            },
            {
              stepNumber: 6,
              title: "Dressage en vue",
              description: "Dressez le riz dans les assiettes, disposez les légumes caramélisés et le porc par-dessus. Parsemez de vert d'oignon nouveau.",
              durationMinutes: 2,
            },
          ],
          isFavorite: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        setExtractedRecipe({
          id: `rec_${Date.now()}`,
          userId: user?.id || "user-default-1",
          title: "Mijoté vivifiant de dinde au curry",
          subtitle: "garni de lait de coco & patate douce",
          category: "Soups & Stews",
          imageUrl: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&auto=format&fit=crop&q=80",
          prepTimeMinutes: 50,
          difficulty: "Easy",
          rating: 4.8,
          servingsBase: 6,
          spiceLevel: "Épicé",
          utensils: ["Râpe", "Casserole", "Éplucheur"],
          nutrition: {
            caloriesKcal: 635,
            proteines: "31g",
            glucides: "53g",
            lipides: "33g",
            fibres: "10g",
            sel: "8.6g",
          },
          allergens: ["Poisson"],
          ingredients: [
            { id: "ing-d1", name: "Oignon", amount: 3, unit: "pièce(s)" },
            { id: "ing-d2", name: "Gousse d'ail", amount: 4, unit: "pièce(s)" },
            { id: "ing-d3", name: "Gingembre frais", amount: 2, unit: "cm" },
            { id: "ing-d4", name: "Oignon nouveau", amount: 100, unit: "g" },
            { id: "ing-d5", name: "Patate douce", amount: 2, unit: "pièce(s)" },
            { id: "ing-d6", name: "Carotte", amount: 3, unit: "pièce(s)" },
            { id: "ing-d7", name: "Dés de filet de dinde", amount: 2, unit: "paquet(s)" },
            { id: "ing-d8", name: "Curry jaune", amount: 1.5, unit: "sachet(s)" },
            { id: "ing-d9", name: "Lait de coco", amount: 2, unit: "paquet(s)" },
            { id: "ing-d10", name: "Sauce poisson", amount: 1.5, unit: "sachet(s)" },
          ],
          steps: [
            {
              stepNumber: 1,
              title: "Légumes à la chaîne !",
              description: "Préparez le bouillon avec de l'eau chaude. Ciselez l'oignon, l'ail et le blanc de l'oignon nouveau. Râpez le gingembre. Coupez la patate douce en dés et la carotte en demi-lunes.",
              durationMinutes: 12,
            },
            {
              stepNumber: 2,
              title: "Chauffer les casseroles !",
              description: "Faites revenir la dinde 2-3 min à feu vif dans une marmite avec de l'huile. Réservez. Faites revenir les légumes avec l'ail, le gingembre et le curry 3-5 min.",
              durationMinutes: 8,
            },
            {
              stepNumber: 3,
              title: "Ça mijote !",
              description: "Déglacez au vinaigre balsamique. Ajoutez la patate douce, le bouillon, le lait de coco et la sauce poisson. Portez à ébullition puis mijotez 20-22 min.",
              durationMinutes: 22,
            },
            {
              stepNumber: 4,
              title: "Sur la route des saveurs",
              description: "Remettez la dinde 2-3 min avant la fin. Rectifiez l'assaisonnement et servez dans des assiettes creuses avec le vert d'oignon nouveau.",
              durationMinutes: 4,
            },
          ],
          isFavorite: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      setIsProcessing(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FB] pb-32">
      {/* Header */}
      <header className="px-6 pt-7 pb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-[#181A20] shadow-sm border border-slate-100 active:scale-95 transition-all"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <h1 className="text-base font-extrabold text-[#181A20]">
          Import Photo IA
        </h1>

        <div className="w-11 h-11 flex items-center justify-center text-emerald-600">
          <ShieldCheck className="w-6 h-6" />
        </div>
      </header>

      <div className="px-6 pt-2">
        <p className="text-xs text-[#8E929E]">
          Prenez en photo votre fiche recette (recto du plat + verso des étapes). L'IA associe automatiquement les ingrédients, étapes et détourera le plat !
        </p>

        {/* Quick Demo Pre-fill Pills */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">
            Exemples :
          </span>
          <button
            type="button"
            onClick={() => loadHelloFreshSample("porc")}
            className="px-3 py-1.5 bg-emerald-50 text-[#16A34A] rounded-xl text-xs font-semibold border border-emerald-200/60 whitespace-nowrap active:scale-95"
          >
            🍱 Porc & Navet Japonais
          </button>
          <button
            type="button"
            onClick={() => loadHelloFreshSample("dinde")}
            className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-xl text-xs font-semibold border border-amber-200/60 whitespace-nowrap active:scale-95"
          >
            🍛 Mijoté Dinde & Curry
          </button>
        </div>

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
              : "Ajouter l'album de photos"}
          </h3>
          <p className="text-xs text-[#8E929E] mt-1">
            Glissez vos photos recto & verso ou cliquez pour parcourir
          </p>

          <button
            type="button"
            className="mt-3.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#181A20] text-xs font-bold rounded-full flex items-center gap-1.5 transition-colors"
          >
            <Camera className="w-4 h-4 text-emerald-600" />
            <span>Sélectionner des photos</span>
          </button>
        </div>

        {/* Selected Photos Thumbnails Grid */}
        {previews.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#181A20]">Photos de la fiche</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedFiles([]);
                  setPreviews([]);
                  setExtractedRecipe(null);
                }}
                className="text-xs font-semibold text-rose-500 hover:underline flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Effacer
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {previews.map((url, i) => (
                <div
                  key={i}
                  className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 shadow-2xs group"
                >
                  <img src={url} alt={`Aperçu ${i + 1}`} className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-xs">
                    Page {i + 1}
                  </span>
                </div>
              ))}
            </div>

            {!extractedRecipe && (
              <button
                type="button"
                onClick={startAIExtraction}
                disabled={isProcessing}
                className="w-full mt-4 py-3.5 bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white text-xs font-extrabold rounded-full shadow-md hover:brightness-105 active:scale-98 flex items-center justify-center gap-2"
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
            <span className="text-[11px] text-[#8E929E] mt-1">Association des ingrédients, étapes et détourage du plat</span>
          </div>
        )}

        {/* Extracted Recipe Result Card & Confirmation */}
        {extractedRecipe && (
          <div className="mt-6 bg-white p-5 rounded-3xl border border-slate-100 shadow-md space-y-4 animate-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-xs font-bold">Recette extraite avec succès !</span>
            </div>

            {/* Circular Plate Cutout Preview */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full overflow-hidden p-1 bg-gradient-to-b from-white to-slate-200 border border-slate-200 shadow-md shrink-0">
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

            {/* Ingredients preview pill list */}
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

            {/* Steps preview list */}
            <div>
              <span className="text-xs font-bold text-[#181A20]">Étapes détectées :</span>
              <div className="space-y-1.5 mt-2">
                {extractedRecipe.steps?.map((step) => (
                  <div key={step.stepNumber} className="text-xs text-slate-600 flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {step.stepNumber}
                    </span>
                    <span className="font-semibold text-[#181A20]">{step.title}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSaveAndCook}
              className="w-full py-4 bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white text-sm font-extrabold rounded-full shadow-[0_6px_20px_rgba(34,197,94,0.4)] hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <span>Enregistrer & Cuisiner</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
