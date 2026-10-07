"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Heart,
  Clock,
  Utensils,
  Calendar as CalendarIcon,
  ShoppingBag,
  Check,
  X,
  Sparkles,
  Edit3,
  Trash2,
  Plus,
  AlertTriangle,
  Save,
  ArrowRight,
  ChefHat,
  Flame,
  Camera,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Film,
  ExternalLink,
  Globe,
  Users,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { getStoredUserSession } from "@/features/auth/actions";
import { Recipe, IngredientItem, RecipeStep } from "@/features/recipes/types";
import {
  getStoredRecipes,
  getStoredRecipeById,
  fetchRecipesFromDb,
  saveRecipeToDb,
  deleteRecipeFromDb,
  toggleFavoriteInDb,
} from "@/features/recipes/actions";
import { addOrUpdateMealPlan } from "@/features/calendar/actions";
import { syncAndFetchShoppingList } from "@/features/groceries/actions";
import { IngredientAutocomplete } from "@/components/ingredients/IngredientAutocomplete";

const CATEGORIES = [
  "Main Dishes",
  "Soups & Stews",
  "Appetizers",
  "Pastas",
  "Desserts",
  "Salads",
  "Breakfast",
  "Sides",
];

const DIFFICULTIES: Array<"Easy" | "Medium" | "Hard"> = ["Easy", "Medium", "Hard"];

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const recipeId = params?.id as string;

  const [recipe, setRecipe] = useState<Recipe | null>(() => {
    if (typeof window !== "undefined" && recipeId) {
      const session = getStoredUserSession();
      return getStoredRecipeById(recipeId, session?.id);
    }
    return null;
  });

  const [servings, setServings] = useState<number>(6);

  const [isFavorite, setIsFavorite] = useState<boolean>(() => {
    if (typeof window !== "undefined" && recipeId) {
      const session = getStoredUserSession();
      const r = getStoredRecipeById(recipeId, session?.id);
      return Boolean(r?.isFavorite);
    }
    return false;
  });

  const [activeTab, setActiveTab] = useState<"ingredients" | "steps" | "nutrition">("ingredients");
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window !== "undefined" && recipeId) {
      const session = getStoredUserSession();
      const r = getStoredRecipeById(recipeId, session?.id);
      return !r;
    }
    return true;
  });

  // Planning Modal State
  const [isPlanModalOpen, setIsPlanModalOpen] = useState<boolean>(false);
  const [planDate, setPlanDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [planMealType, setPlanMealType] = useState<"lunch" | "dinner" | "breakfast" | "snack">("dinner");
  const [planServings, setPlanServings] = useState<number>(6);
  const [isSubmittingPlan, setIsSubmittingPlan] = useState<boolean>(false);
  const [planSuccessToast, setPlanSuccessToast] = useState<string | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editSubtitle, setEditSubtitle] = useState<string>("");
  const [editCategory, setEditCategory] = useState<string>("Main Dishes");
  const [editPrepTime, setEditPrepTime] = useState<number>(30);
  const [editDifficulty, setEditDifficulty] = useState<"Easy" | "Medium" | "Hard">("Easy");
  const [editServingsBase, setEditServingsBase] = useState<number>(6);
  const [editImageUrl, setEditImageUrl] = useState<string>("");
  const [editSourceUrl, setEditSourceUrl] = useState<string>("");
  const [editVideoUrl, setEditVideoUrl] = useState<string>("");
  const [editIngredients, setEditIngredients] = useState<IngredientItem[]>([]);
  const [editSteps, setEditSteps] = useState<RecipeStep[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [editTab, setEditTab] = useState<"general" | "ingredients" | "steps">("general");

  // Image editing & AI regeneration state
  const [isGeneratingMainImage, setIsGeneratingMainImage] = useState<boolean>(false);
  const [generatingStepIdx, setGeneratingStepIdx] = useState<number | null>(null);
  const mainPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const stepPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [activeStepUploadIdx, setActiveStepUploadIdx] = useState<number | null>(null);

  // Delete Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    if (!recipeId) return;
    const currentUserId = user?.id || getStoredUserSession()?.id;

    const found = getStoredRecipeById(recipeId, currentUserId);
    if (found) {
      setRecipe(found);
      setServings(6);
      setPlanServings(6);
      setIsFavorite(Boolean(found.isFavorite));
      setIsLoading(false);
    }

    if (currentUserId) {
      fetchRecipesFromDb(currentUserId)
        .then((dbList) => {
          const dbFound = dbList.find((r) => r.id === recipeId);
          if (dbFound) {
            setRecipe(dbFound);
            setServings(6);
            setPlanServings(6);
            setIsFavorite(Boolean(dbFound.isFavorite));
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [user?.id, recipeId]);

  if (isLoading && !recipe) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-white">
        <div className="w-8 h-8 border-3 border-[#5DB534] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-bold text-slate-500">Chargement de la recette...</p>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-white">
        <p className="text-sm font-bold text-[#181A20]">Recette introuvable</p>
        <p className="text-xs text-[#8E929E] mt-1">Cette recette n'existe pas ou a été supprimée.</p>
        <Link href="/" className="mt-4 px-4 py-2 bg-slate-100 rounded-full text-xs font-bold text-[#181A20]">
          ← Retour à l'accueil
        </Link>
      </div>
    );
  }

  const scaleFactor = recipe.servingsBase ? servings / recipe.servingsBase : 1;

  const toggleFavorite = async () => {
    if (!user?.id) return;
    const newFav = await toggleFavoriteInDb(recipe.id, user.id);
    setIsFavorite(newFav);
    setRecipe((prev) => (prev ? { ...prev, isFavorite: newFav } : null));
  };

  const handleQuickDateSelect = (daysOffset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    setPlanDate(d.toISOString().split("T")[0]);
  };

  const handleConfirmPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !recipe) return;

    setIsSubmittingPlan(true);
    try {
      await addOrUpdateMealPlan(
        {
          recipeId: recipe.id,
          recipeTitle: recipe.title,
          recipeImageUrl: recipe.imageUrl,
          date: planDate,
          mealType: planMealType,
          servings: planServings,
        },
        user.id
      );

      // Automatically update shopping list in DB
      await syncAndFetchShoppingList(user.id);

      setIsPlanModalOpen(false);
      setPlanSuccessToast("Recette ajoutée à votre calendrier et liste de courses !");
      setTimeout(() => setPlanSuccessToast(null), 4000);
    } catch (err) {
      console.error("handleConfirmPlan error:", err);
    } finally {
      setIsSubmittingPlan(false);
    }
  };

  // Open Edit Mode
  const handleOpenEdit = () => {
    if (!recipe) return;
    setEditTitle(recipe.title || "");
    setEditSubtitle(recipe.subtitle || "");
    setEditCategory(recipe.category || "Main Dishes");
    setEditPrepTime(recipe.prepTimeMinutes || 30);
    setEditDifficulty(recipe.difficulty || "Easy");
    setEditServingsBase(recipe.servingsBase || 2);
    setEditImageUrl(recipe.imageUrl || "");
    setEditSourceUrl(recipe.sourceUrl || "");
    setEditVideoUrl(recipe.videoUrl || "");
    setEditIngredients(recipe.ingredients ? JSON.parse(JSON.stringify(recipe.ingredients)) : []);
    setEditSteps(recipe.steps ? JSON.parse(JSON.stringify(recipe.steps)) : []);
    setEditTab("general");
    setIsEditModalOpen(true);
  };

  // Save Edit to DB
  const handleSaveEdit = async () => {
    if (!user?.id || !recipe || !editTitle.trim()) return;

    setIsSavingEdit(true);
    try {
      const updated: Recipe = {
        ...recipe,
        title: editTitle.trim(),
        subtitle: editSubtitle.trim() || undefined,
        category: editCategory,
        prepTimeMinutes: Number(editPrepTime) || 30,
        difficulty: editDifficulty,
        servingsBase: Number(editServingsBase) || 2,
        imageUrl: editImageUrl.trim() || recipe.imageUrl,
        sourceUrl: editSourceUrl.trim() || undefined,
        videoUrl: editVideoUrl.trim() || undefined,
        ingredients: editIngredients.filter((i) => i.name && i.name.trim()),
        steps: editSteps
          .filter((s) => s.description && s.description.trim())
          .map((s, idx) => ({ ...s, stepNumber: idx + 1 })),
        updatedAt: new Date().toISOString(),
      };

      await saveRecipeToDb(updated, user.id);
      setRecipe(updated);
      setIsEditModalOpen(false);
      setPlanSuccessToast("Recette modifiée et enregistrée en base de données !");
      setTimeout(() => setPlanSuccessToast(null), 3000);
    } catch (err) {
      console.error("handleSaveEdit error:", err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete Recipe
  const handleConfirmDelete = async () => {
    if (!user?.id || !recipe) return;

    setIsDeleting(true);
    try {
      await deleteRecipeFromDb(recipe.id, user.id);
      setIsDeleteModalOpen(false);
      router.push("/");
    } catch (err) {
      console.error("handleConfirmDelete error:", err);
      setIsDeleting(false);
    }
  };

  // Quick direct regeneration of recipe main photo from the page plate
  const handleQuickRegenerateMainPhoto = async () => {
    if (!recipe || !user?.id || isGeneratingMainImage) return;
    setIsGeneratingMainImage(true);
    try {
      const ingSummary = recipe.ingredients
        ?.filter((i) => i.name)
        .slice(0, 5)
        .map((i) => i.name)
        .join(", ");

      const res = await fetch("/api/ai/generate-recipe-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: recipe.title,
          description: recipe.subtitle,
          type: "main",
          ingredientsSummary: ingSummary,
        }),
      });
      const data = await res.json();
      if (res.ok && data.imageUrl) {
        const updated: Recipe = {
          ...recipe,
          imageUrl: data.imageUrl,
          updatedAt: new Date().toISOString(),
        };
        await saveRecipeToDb(updated, user.id);
        setRecipe(updated);
        setEditImageUrl(data.imageUrl);
        setPlanSuccessToast("Photo générée par IA et enregistrée avec succès !");
        setTimeout(() => setPlanSuccessToast(null), 3500);
      } else {
        alert(data.error || "Impossible de générer l'image par IA.");
      }
    } catch (err: any) {
      console.error("handleQuickRegenerateMainPhoto error:", err);
      alert("Erreur lors de la génération IA: " + (err?.message || "Échec réseau"));
    } finally {
      setIsGeneratingMainImage(false);
    }
  };

  // Generate Main Recipe Image via AI (in Edit Modal)
  const handleGenerateMainImageAI = async () => {
    if (!editTitle.trim()) return;
    setIsGeneratingMainImage(true);
    try {
      const ingSummary = editIngredients
        .filter((i) => i.name)
        .slice(0, 5)
        .map((i) => i.name)
        .join(", ");

      const res = await fetch("/api/ai/generate-recipe-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editSubtitle.trim(),
          type: "main",
          ingredientsSummary: ingSummary,
        }),
      });
      const data = await res.json();
      if (res.ok && data.imageUrl) {
        setEditImageUrl(data.imageUrl);
      } else {
        alert(data.error || "Impossible de générer l'image par IA.");
      }
    } catch (err: any) {
      console.error("handleGenerateMainImageAI error:", err);
      alert("Erreur IA: " + (err?.message || "Échec"));
    } finally {
      setIsGeneratingMainImage(false);
    }
  };

  // Generate Step Image via AI
  const handleGenerateStepImageAI = async (stepIndex: number) => {
    const step = editSteps[stepIndex];
    if (!step) return;
    setGeneratingStepIdx(stepIndex);
    try {
      const res = await fetch("/api/ai/generate-recipe-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim() || recipe?.title || "Recette",
          description: step.description || step.title || `Étape ${stepIndex + 1}`,
          stepNumber: stepIndex + 1,
          type: "step",
        }),
      });
      const data = await res.json();
      if (res.ok && data.imageUrl) {
        handleUpdateStep(stepIndex, "imageUrl", data.imageUrl);
      } else {
        alert(data.error || "Impossible de générer l'image de cette étape par IA.");
      }
    } catch (err: any) {
      console.error("handleGenerateStepImageAI error:", err);
      alert("Erreur IA: " + (err?.message || "Échec"));
    } finally {
      setGeneratingStepIdx(null);
    }
  };

  // Upload/Take Main Photo
  const handleMainFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setEditImageUrl(result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Upload/Take Step Photo
  const handleStepFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || activeStepUploadIdx === null) return;
    const targetIdx = activeStepUploadIdx;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        handleUpdateStep(targetIdx, "imageUrl", result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
    setActiveStepUploadIdx(null);
  };

  // Ingredient list editors
  const handleAddIngredient = () => {
    setEditIngredients((prev) => [
      ...prev,
      {
        id: `ing_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: "",
        amount: 1,
        unit: "pièce(s)",
      },
    ]);
  };

  const handleUpdateIngredient = (index: number, field: keyof IngredientItem, value: any) => {
    setEditIngredients((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveIngredient = (index: number) => {
    setEditIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  // Steps list editors
  const handleAddStep = () => {
    setEditSteps((prev) => [
      ...prev,
      {
        stepNumber: prev.length + 1,
        title: `Étape ${prev.length + 1}`,
        description: "",
        durationMinutes: 5,
      },
    ]);
  };

  const handleUpdateStep = (index: number, field: keyof RecipeStep, value: any) => {
    setEditSteps((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveStep = (index: number) => {
    setEditSteps((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((s, idx) => ({ ...s, stepNumber: idx + 1 }))
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FB] pb-32">
      {/* Toast Notification */}
      {planSuccessToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md bg-zinc-900 text-white p-4 rounded-2xl shadow-xl border border-zinc-700/80 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#5DB534] flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 text-white" strokeWidth={3} />
            </div>
            <span className="text-xs font-bold leading-tight">
              {planSuccessToast}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => router.push("/groceries")}
              className="text-[11px] font-bold text-emerald-400 hover:underline px-1.5 py-1"
            >
              Courses
            </button>
            <button
              onClick={() => router.push("/calendar")}
              className="text-[11px] font-bold text-slate-300 hover:underline px-1.5 py-1"
            >
              Planning
            </button>
          </div>
        </div>
      )}

      {/* Top Header: Back, Edit, Delete, Plan, Favorite */}
      <header className="px-5 pt-7 pb-3.5 flex items-center justify-between z-20">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-[#181A20] shadow-sm border border-slate-100 active:scale-95 transition-all cursor-pointer"
          title="Retour"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          {/* Edit Recipe Button */}
          <button
            type="button"
            onClick={handleOpenEdit}
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-slate-700 shadow-sm border border-slate-100 hover:text-[#5DB534] active:scale-95 transition-all cursor-pointer"
            title="Modifier la recette"
          >
            <Edit3 className="w-4 h-4" />
          </button>

          {/* Delete Recipe Button */}
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-slate-700 hover:text-rose-500 shadow-sm border border-slate-100 active:scale-95 transition-all cursor-pointer"
            title="Supprimer la recette"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Plan button */}
          <button
            type="button"
            onClick={() => setIsPlanModalOpen(true)}
            className="px-3.5 py-2 rounded-full bg-white/90 backdrop-blur-md flex items-center gap-1.5 text-xs font-bold text-[#181A20] shadow-sm border border-slate-100 active:scale-95 transition-all cursor-pointer"
            title="Planifier au calendrier"
          >
            <CalendarIcon className="w-4 h-4 text-[#5DB534]" />
            <span>Planifier</span>
          </button>

          {/* Favorite button */}
          <button
            type="button"
            onClick={toggleFavorite}
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-sm border border-slate-100 active:scale-95 transition-all cursor-pointer"
            title="Ajouter aux favoris"
          >
            <Heart
              className={`w-5 h-5 transition-colors ${
                isFavorite ? "fill-[#F43F5E] text-[#F43F5E]" : "text-slate-400"
              }`}
            />
          </button>
        </div>
      </header>

      {/* Hero Circular Dish Plate with Cutout */}
      <div className="relative w-full flex flex-col items-center px-6 mt-1">
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center group">
          <div className="absolute inset-4 rounded-full bg-black/12 blur-2xl translate-y-6 scale-95 pointer-events-none" />
          <div className="relative w-full h-full rounded-full p-2.5 bg-gradient-to-b from-white/95 via-white/70 to-slate-200/50 shadow-[0_20px_40px_rgba(0,0,0,0.12)] border border-white">
            <div className="w-full h-full rounded-full overflow-hidden relative shadow-inner bg-slate-100 flex items-center justify-center">
              {recipe.imageUrl ? (
                <img
                  src={recipe.imageUrl}
                  alt={recipe.title}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                  className={`w-full h-full object-cover object-center transition-all duration-300 ${
                    isGeneratingMainImage ? "scale-105 blur-xs filter brightness-75" : ""
                  }`}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 p-4 text-center">
                  <ChefHat className="w-12 h-12 text-[#5DB534] mb-2" />
                  <span className="text-xs font-bold text-slate-600">Aucune photo</span>
                </div>
              )}

              {/* Loading Spinner during Generation */}
              {isGeneratingMainImage && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex flex-col items-center justify-center text-white text-xs font-bold animate-in fade-in">
                  <Loader2 className="w-8 h-8 animate-spin text-[#5DB534] mb-2" />
                  <span>Génération photo...</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Photo Regeneration Floating Pill */}
          <button
            type="button"
            onClick={handleQuickRegenerateMainPhoto}
            disabled={isGeneratingMainImage}
            className="absolute bottom-2 right-4 z-10 px-3.5 py-1.5 bg-white/95 hover:bg-white text-[#181A20] rounded-full text-xs font-extrabold shadow-md border border-slate-200/80 backdrop-blur-md flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            title="Régénérer la photo du plat"
          >
            {isGeneratingMainImage ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5DB534]" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-[#5DB534]" />
            )}
            <span>Régénérer photo</span>
          </button>
        </div>
      </div>

      {/* Recipe Info Title & Category */}
      <div className="px-6 mt-6 flex flex-col items-start">
        <span className="text-xs font-bold text-[#5DB534] uppercase tracking-wider">
          {recipe.category || "Plat Principal"}
        </span>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#181A20] tracking-tight mt-1 leading-snug">
          {recipe.title}
        </h1>

        {recipe.subtitle && (
          <p className="text-xs text-[#8E929E] font-medium mt-1 leading-relaxed">
            {recipe.subtitle}
          </p>
        )}

        {/* Video / Source URL Link Badge */}
        {(recipe.videoUrl || recipe.sourceUrl) && (
          <div className="mt-3 flex items-center gap-2">
            <a
              href={recipe.videoUrl || recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-full text-xs font-bold border border-rose-100/80 transition-all shadow-2xs active:scale-95 cursor-pointer"
            >
              <Film className="w-3.5 h-3.5 text-rose-500" />
              <span>
                {recipe.videoUrl?.includes("instagram") || recipe.sourceUrl?.includes("instagram")
                  ? "Voir le Reel Instagram"
                  : recipe.videoUrl?.includes("tiktok") || recipe.sourceUrl?.includes("tiktok")
                  ? "Voir sur TikTok"
                  : recipe.videoUrl?.includes("youtube") || recipe.sourceUrl?.includes("youtube") || recipe.sourceUrl?.includes("youtu.be")
                  ? "Voir sur YouTube"
                  : "Voir la source / vidéo originale"}
              </span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          </div>
        )}
      </div>

      {/* Stats Grid: Minutes, Steps, Difficulty, Rating */}
      <div className="px-6 mt-5 grid grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-2xs flex flex-col items-center justify-center text-center">
          <span className="text-sm font-extrabold text-[#181A20]">
            {recipe.prepTimeMinutes}m
          </span>
          <span className="text-[10px] font-semibold text-[#8E929E] mt-0.5">Minutes</span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-2xs flex flex-col items-center justify-center text-center">
          <span className="text-sm font-extrabold text-[#181A20]">
            {recipe.steps?.length || 0}
          </span>
          <span className="text-[10px] font-semibold text-[#8E929E] mt-0.5">Étapes</span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-2xs flex flex-col items-center justify-center text-center">
          <span className="text-sm font-extrabold text-[#181A20]">
            {recipe.difficulty || "Easy"}
          </span>
          <span className="text-[10px] font-semibold text-[#8E929E] mt-0.5">Difficulté</span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-2xs flex flex-col items-center justify-center text-center">
          <span className="text-sm font-extrabold text-[#181A20]">
            {recipe.rating ? Number(recipe.rating).toFixed(1) : "5.0"}
          </span>
          <span className="text-[10px] font-semibold text-[#8E929E] mt-0.5">Note</span>
        </div>
      </div>

      {/* Navigation Tabs (Ingredients / Steps / Nutrition) */}
      <div className="px-6 mt-6 flex items-center justify-between border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab("ingredients")}
            className={`text-sm font-bold transition-colors pb-1 relative cursor-pointer ${
              activeTab === "ingredients" ? "text-[#181A20]" : "text-[#8E929E] hover:text-[#181A20]"
            }`}
          >
            Ingrédients ({recipe.ingredients?.length || 0})
            {activeTab === "ingredients" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5DB534] rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("steps")}
            className={`text-sm font-bold transition-colors pb-1 relative cursor-pointer ${
              activeTab === "steps" ? "text-[#181A20]" : "text-[#8E929E] hover:text-[#181A20]"
            }`}
          >
            Étapes ({recipe.steps?.length || 0})
            {activeTab === "steps" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5DB534] rounded-full" />
            )}
          </button>

          {recipe.nutrition && (
            <button
              onClick={() => setActiveTab("nutrition")}
              className={`text-sm font-bold transition-colors pb-1 relative cursor-pointer ${
                activeTab === "nutrition" ? "text-[#181A20]" : "text-[#8E929E] hover:text-[#181A20]"
              }`}
            >
              Nutrition
              {activeTab === "nutrition" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5DB534] rounded-full" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Servings Selector (Below Tab Bar) */}
      {activeTab === "ingredients" && (
        <div className="px-6 mt-3.5 flex items-center justify-between gap-2">
          {/* Quick Access Toggle: 1 pers <-> 6 pers */}
          <button
            type="button"
            onClick={() => setServings(servings === 6 ? 1 : 6)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-[#5DB534] text-xs font-extrabold border border-emerald-200/60 shadow-2xs active:scale-95 transition-all cursor-pointer"
            title={servings === 6 ? "Passer à 1 personne" : "Passer à 6 personnes"}
          >
            <Users className="w-3.5 h-3.5" />
            <span>
              {servings === 6 ? "Passer à 1 pers." : "Passer à 6 pers."}
            </span>
          </button>

          {/* Stepper +/- */}
          <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setServings((s) => Math.max(1, s - 1))}
              className="w-6 h-6 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900 font-extrabold text-sm active:scale-95 transition-all cursor-pointer"
              title="Diminuer les portions"
            >
              −
            </button>
            <span className="text-xs font-extrabold text-[#181A20] min-w-[55px] text-center">
              {servings} {servings > 1 ? "pers." : "pers."}
            </span>
            <button
              type="button"
              onClick={() => setServings((s) => s + 1)}
              className="w-6 h-6 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900 font-extrabold text-sm active:scale-95 transition-all cursor-pointer"
              title="Augmenter les portions"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="px-6 mt-4 flex-1">
        {/* TAB 1: INGREDIENTS */}
        {activeTab === "ingredients" && (
          <div className="space-y-2.5">
            {recipe.ingredients && recipe.ingredients.length > 0 ? (
              recipe.ingredients.map((ing, idx) => {
                const scaledAmount =
                  typeof ing.amount === "number"
                    ? Math.round(ing.amount * scaleFactor * 100) / 100
                    : ing.amount;

                return (
                  <div
                    key={ing.id || idx}
                    className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between gap-3 hover:border-slate-200 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-[#5DB534] shrink-0" />
                      <span className="text-xs font-bold text-[#181A20] truncate">
                        {ing.name}
                      </span>
                    </div>

                    {(scaledAmount || ing.unit) && (
                      <span className="text-xs font-bold text-[#5DB534] bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200/50 shrink-0">
                        {scaledAmount ? `${scaledAmount} ` : ""}
                        {ing.unit || ""}
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">
                Aucun ingrédient listé pour cette recette.
              </p>
            )}
          </div>
        )}

        {/* TAB 2: STEPS */}
        {activeTab === "steps" && (
          <div className="space-y-3">
            {recipe.steps && recipe.steps.length > 0 ? (
              recipe.steps.map((step, idx) => (
                <div
                  key={step.stepNumber || idx}
                  className="bg-white p-4 rounded-3xl border border-slate-100 shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#5DB534] flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-[10px]">
                        {step.stepNumber || idx + 1}
                      </span>
                      <span>{step.title || `Étape ${idx + 1}`}</span>
                    </span>

                    {step.durationMinutes && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{step.durationMinutes} min</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-normal">
                    {step.description}
                  </p>

                  {step.chefTip && (
                    <div className="p-2.5 bg-amber-50/70 border border-amber-200/50 rounded-2xl text-[11px] text-amber-900 font-medium flex items-center gap-2">
                      <span>💡</span>
                      <span>{step.chefTip}</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">
                Aucune étape listée pour cette recette.
              </p>
            )}
          </div>
        )}

        {/* TAB 3: NUTRITION */}
        {activeTab === "nutrition" && recipe.nutrition && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs text-center">
              <span className="text-xl font-extrabold text-[#181A20]">
                {recipe.nutrition.caloriesKcal || "--"}
              </span>
              <span className="text-xs text-[#8E929E] block mt-0.5">Calories (kcal)</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs text-center">
              <span className="text-xl font-extrabold text-[#181A20]">
                {recipe.nutrition.proteines || "--"}
              </span>
              <span className="text-xs text-[#8E929E] block mt-0.5">Protéines</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs text-center">
              <span className="text-xl font-extrabold text-[#181A20]">
                {recipe.nutrition.glucides || "--"}
              </span>
              <span className="text-xs text-[#8E929E] block mt-0.5">Glucides</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs text-center">
              <span className="text-xl font-extrabold text-[#181A20]">
                {recipe.nutrition.lipides || "--"}
              </span>
              <span className="text-xs text-[#8E929E] block mt-0.5">Lipides</span>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom Cook Action Bar */}
      <div className="fixed bottom-5 left-0 right-0 z-30 px-6 flex justify-center pointer-events-none">
        <button
          type="button"
          onClick={() => router.push(`/recipes/${recipe.id}/cook`)}
          className="w-full max-w-md py-4 px-6 rounded-full bg-[#181A20] hover:bg-black text-white font-extrabold text-sm shadow-[0_12px_28px_rgba(0,0,0,0.25)] flex items-center justify-between active:scale-98 transition-all pointer-events-auto cursor-pointer group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[#5DB534]">
              <Utensils className="w-4 h-4" />
            </div>
            <span>Lancer le mode cuisine</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
            <ArrowRight className="w-4 h-4 text-[#5DB534]" />
          </div>
        </button>
      </div>

      {/* MODAL 1: Plan Meal Modal */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white border border-slate-100 rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-6 text-[#181A20]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-[#181A20]">
                  Planifier cette recette
                </h3>
                <span className="text-xs text-[#5DB534] font-semibold truncate block max-w-[280px]">
                  {recipe.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPlan} className="mt-4 space-y-4">
              {/* Quick Date Selectors */}
              <div>
                <label className="block text-xs font-bold text-[#181A20] mb-2">
                  Date du repas
                </label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => handleQuickDateSelect(0)}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      planDate === new Date().toISOString().split("T")[0]
                        ? "bg-[#5DB534] text-white border-[#5DB534]"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Aujourd'hui
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDateSelect(1)}
                    className="py-2 px-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all cursor-pointer"
                  >
                    Demain
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDateSelect(2)}
                    className="py-2 px-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all cursor-pointer"
                  >
                    Après-demain
                  </button>
                </div>
                <input
                  type="date"
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                  className="w-full bg-slate-50 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#181A20] border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5DB534]/30"
                  required
                />
              </div>

              {/* Meal Type (Lunch vs Dinner) */}
              <div>
                <label className="block text-xs font-bold text-[#181A20] mb-2">
                  Moment du repas
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPlanMealType("lunch")}
                    className={`py-3 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      planMealType === "lunch"
                        ? "bg-emerald-50 border-[#5DB534] text-[#5DB534] shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>☀️</span>
                    <span>Déjeuner (Midi)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlanMealType("dinner")}
                    className={`py-3 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      planMealType === "dinner"
                        ? "bg-emerald-50 border-[#5DB534] text-[#5DB534] shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>🌙</span>
                    <span>Dîner (Soir)</span>
                  </button>
                </div>
              </div>

              {/* Servings */}
              <div>
                <label className="block text-xs font-bold text-[#181A20] mb-2">
                  Nombre de convives
                </label>
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setPlanServings((s) => Math.max(1, s - 1))}
                    className="w-9 h-9 rounded-lg bg-white shadow-xs font-extrabold text-slate-700 hover:bg-slate-100 active:scale-95 flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-sm font-extrabold text-[#181A20]">
                    {planServings} personne{planServings > 1 ? "s" : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPlanServings((s) => s + 1)}
                    className="w-9 h-9 rounded-lg bg-white shadow-xs font-extrabold text-slate-700 hover:bg-slate-100 active:scale-95 flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Shopping auto-sync info box */}
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200/60 flex items-center gap-2.5">
                <ShoppingBag className="w-4 h-4 text-[#5DB534] shrink-0" />
                <p className="text-[11px] text-emerald-900 font-medium leading-tight">
                  Les <strong>{recipe.ingredients?.length || 0} ingrédients</strong> seront automatiquement ajoutés à votre liste de courses triés par rayon.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmittingPlan}
                className="w-full py-3.5 bg-[#5DB534] hover:bg-[#4FA12A] disabled:opacity-50 text-white font-extrabold text-xs rounded-2xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isSubmittingPlan ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirmer la planification</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Full Edit Recipe Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-white border border-slate-100 rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-6 text-[#181A20]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#5DB534] flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-extrabold text-[#181A20]">
                  Modifier la recette
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Edit Sub-tabs (General / Ingredients / Steps) */}
            <div className="flex gap-2 my-3 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setEditTab("general")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  editTab === "general"
                    ? "bg-white text-[#181A20] shadow-xs border border-slate-200/60"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Général
              </button>
              <button
                type="button"
                onClick={() => setEditTab("ingredients")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  editTab === "ingredients"
                    ? "bg-white text-[#181A20] shadow-xs border border-slate-200/60"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Ingrédients ({editIngredients.length})
              </button>
              <button
                type="button"
                onClick={() => setEditTab("steps")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  editTab === "steps"
                    ? "bg-white text-[#181A20] shadow-xs border border-slate-200/60"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Étapes ({editSteps.length})
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-2">
              {/* SUB-TAB 1: GENERAL INFO */}
              {editTab === "general" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#181A20] mb-1">
                      Titre de la recette *
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Ex: Saumon rôti au sésame"
                      className="w-full bg-slate-50 px-3.5 py-2.5 rounded-xl text-xs text-[#181A20] border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5DB534]/30"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#181A20] mb-1">
                      Description / Sous-titre
                    </label>
                    <input
                      type="text"
                      value={editSubtitle}
                      onChange={(e) => setEditSubtitle(e.target.value)}
                      placeholder="Ex: Servi avec du riz jasmin et des légumes sautés"
                      className="w-full bg-slate-50 px-3.5 py-2.5 rounded-xl text-xs text-[#181A20] border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5DB534]/30"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#181A20] mb-1">
                        Catégorie
                      </label>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full bg-slate-50 px-3 py-2.5 rounded-xl text-xs text-[#181A20] border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5DB534]/30 cursor-pointer"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#181A20] mb-1">
                        Difficulté
                      </label>
                      <select
                        value={editDifficulty}
                        onChange={(e) => setEditDifficulty(e.target.value as any)}
                        className="w-full bg-slate-50 px-3 py-2.5 rounded-xl text-xs text-[#181A20] border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5DB534]/30 cursor-pointer"
                      >
                        {DIFFICULTIES.map((diff) => (
                          <option key={diff} value={diff}>
                            {diff}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#181A20] mb-1">
                        Temps de préparation (min)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editPrepTime}
                        onChange={(e) => setEditPrepTime(Number(e.target.value))}
                        className="w-full bg-slate-50 px-3.5 py-2.5 rounded-xl text-xs text-[#181A20] border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5DB534]/30"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#181A20] mb-1">
                        Portions de base
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editServingsBase}
                        onChange={(e) => setEditServingsBase(Number(e.target.value))}
                        className="w-full bg-slate-50 px-3.5 py-2.5 rounded-xl text-xs text-[#181A20] border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5DB534]/30"
                      />
                    </div>
                  </div>

                  {/* Main Recipe Photo Edit */}
                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    <label className="block text-xs font-bold text-[#181A20]">
                      Photo principale du plat
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3 items-start">
                      <div className="relative w-full sm:w-36 h-28 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                        {editImageUrl ? (
                          <img
                            src={editImageUrl}
                            alt="Aperçu du plat"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                            <ImageIcon className="w-6 h-6 mb-1" />
                            <span className="text-[10px]">Aucune photo</span>
                          </div>
                        )}
                        {isGeneratingMainImage && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white text-xs font-bold">
                            <Loader2 className="w-5 h-5 animate-spin mb-1 text-[#5DB534]" />
                            <span>Génération IA...</span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 space-y-2 w-full">
                        <div className="flex flex-wrap gap-2">
                          <input
                            ref={mainPhotoInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleMainFileSelected}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => mainPhotoInputRef.current?.click()}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-[#181A20] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Prendre / Uploader</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleGenerateMainImageAI}
                            disabled={isGeneratingMainImage || !editTitle.trim()}
                            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-[#5DB534] border border-emerald-200/80 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            {isGeneratingMainImage ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5" />
                            )}
                            <span>Régénérer via IA</span>
                          </button>
                        </div>

                        <input
                          type="text"
                          value={editImageUrl}
                          onChange={(e) => setEditImageUrl(e.target.value)}
                          placeholder="Ou collez une URL d'image (https://...)"
                          className="w-full bg-slate-50 px-3 py-2 rounded-xl text-[11px] text-[#181A20] border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5DB534]/30"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Video / Source URL Edit */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <label className="block text-xs font-bold text-[#181A20]">
                      Lien de la vidéo / source originale
                    </label>
                    <input
                      type="url"
                      value={editVideoUrl || editSourceUrl}
                      onChange={(e) => {
                        setEditVideoUrl(e.target.value);
                        setEditSourceUrl(e.target.value);
                      }}
                      placeholder="https://www.instagram.com/reel/... ou https://..."
                      className="w-full bg-slate-50 px-3.5 py-2.5 rounded-xl text-xs text-[#181A20] border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5DB534]/30"
                    />
                  </div>
                </div>
              )}

              {/* SUB-TAB 2: INGREDIENTS WITH AUTOCOMPLETE */}
              {editTab === "ingredients" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">
                      Liste des ingrédients
                    </span>
                    <button
                      type="button"
                      onClick={handleAddIngredient}
                      className="px-3 py-1 bg-emerald-50 text-[#5DB534] border border-emerald-200/80 rounded-full text-xs font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajouter</span>
                    </button>
                  </div>

                  {editIngredients.map((ing, idx) => (
                    <div
                      key={ing.id || idx}
                      className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        {/* Ingredient Name with Autocomplete */}
                        <div className="flex-1 min-w-0">
                          <IngredientAutocomplete
                            value={ing.name}
                            onChange={(nameVal) =>
                              handleUpdateIngredient(idx, "name", nameVal)
                            }
                            placeholder="Ex: Carottes, Crème fraîche..."
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(idx)}
                          className="p-2 text-slate-300 hover:text-rose-500 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Supprimer cet ingrédient"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          step="any"
                          placeholder="Quantité (ex: 200)"
                          value={ing.amount !== null && ing.amount !== undefined ? ing.amount : ""}
                          onChange={(e) =>
                            handleUpdateIngredient(
                              idx,
                              "amount",
                              e.target.value ? parseFloat(e.target.value) : null
                            )
                          }
                          className="bg-white px-3 py-2 rounded-xl text-xs text-[#181A20] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5DB534]/30"
                        />
                        <input
                          type="text"
                          placeholder="Unité (ex: g, ml, pièce)"
                          value={ing.unit || ""}
                          onChange={(e) =>
                            handleUpdateIngredient(idx, "unit", e.target.value)
                          }
                          className="bg-white px-3 py-2 rounded-xl text-xs text-[#181A20] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5DB534]/30"
                        />
                      </div>
                    </div>
                  ))}

                  {editIngredients.length === 0 && (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      Aucun ingrédient. Cliquez sur "+ Ajouter" pour en créer un.
                    </div>
                  )}
                </div>
              )}

              {/* SUB-TAB 3: STEPS */}
              {editTab === "steps" && (
                <div className="space-y-3">
                  <input
                    ref={stepPhotoInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleStepFileSelected}
                    className="hidden"
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">
                      Étapes de préparation ({editSteps.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleAddStep}
                      className="px-3 py-1 bg-emerald-50 text-[#5DB534] border border-emerald-200/80 rounded-full text-xs font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajouter</span>
                    </button>
                  </div>

                  {editSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="w-6 h-6 rounded-lg bg-emerald-100 text-[#5DB534] font-extrabold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>

                        <input
                          type="text"
                          placeholder="Titre de l'étape"
                          value={step.title || ""}
                          onChange={(e) =>
                            handleUpdateStep(idx, "title", e.target.value)
                          }
                          className="flex-1 bg-white px-3 py-2 rounded-xl text-xs font-bold text-[#181A20] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5DB534]/30"
                        />

                        <button
                          type="button"
                          onClick={() => handleRemoveStep(idx)}
                          className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Supprimer cette étape"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <textarea
                        rows={3}
                        placeholder="Instructions détaillées de l'étape..."
                        value={step.description || ""}
                        onChange={(e) =>
                          handleUpdateStep(idx, "description", e.target.value)
                        }
                        className="w-full bg-white px-3 py-2 rounded-xl text-xs text-[#181A20] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5DB534]/30 resize-none"
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          placeholder="Durée (min)"
                          value={step.durationMinutes || ""}
                          onChange={(e) =>
                            handleUpdateStep(
                              idx,
                              "durationMinutes",
                              e.target.value ? parseInt(e.target.value, 10) : undefined
                            )
                          }
                          className="bg-white px-3 py-1.5 rounded-xl text-xs text-[#181A20] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5DB534]/30"
                        />

                        <input
                          type="text"
                          placeholder="Astuce du chef (optionnel)"
                          value={step.chefTip || ""}
                          onChange={(e) =>
                            handleUpdateStep(idx, "chefTip", e.target.value)
                          }
                          className="bg-white px-3 py-1.5 rounded-xl text-xs text-[#181A20] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5DB534]/30"
                        />
                      </div>

                      {/* Step Photo Controls (AI generate, Take/Upload Photo, Remove) */}
                      <div className="pt-2 border-t border-slate-200/60">
                        <div className="flex items-center gap-3">
                          <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-white border border-slate-200 shrink-0">
                            {step.imageUrl ? (
                              <img
                                src={step.imageUrl}
                                alt={`Étape ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                <ImageIcon className="w-4 h-4 text-slate-300" />
                                <span className="text-[8px] text-slate-400 mt-0.5">Pas d'image</span>
                              </div>
                            )}
                            {generatingStepIdx === idx && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                                <Loader2 className="w-4 h-4 animate-spin text-[#5DB534]" />
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 flex-1">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveStepUploadIdx(idx);
                                stepPhotoInputRef.current?.click();
                              }}
                              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-[#181A20] rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Camera className="w-3 h-3 text-emerald-700" />
                              <span>Photo</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleGenerateStepImageAI(idx)}
                              disabled={generatingStepIdx === idx}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-[#5DB534] border border-emerald-200/80 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              {generatingStepIdx === idx ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Sparkles className="w-3 h-3" />
                              )}
                              <span>Régénérer IA</span>
                            </button>

                            {step.imageUrl && (
                              <button
                                type="button"
                                onClick={() => handleUpdateStep(idx, "imageUrl", undefined)}
                                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                                title="Supprimer la photo"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {editSteps.length === 0 && (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      Aucune étape. Cliquez sur "+ Ajouter" pour en créer une.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-colors cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSavingEdit || !editTitle.trim()}
                className="flex-1 py-3 bg-[#5DB534] hover:bg-[#4FA12A] disabled:opacity-50 text-white font-extrabold text-xs rounded-2xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSavingEdit ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Enregistrer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white border border-slate-100 rounded-[32px] p-6 shadow-2xl space-y-4 animate-in zoom-in-95 text-[#181A20]">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-extrabold text-[#181A20]">
                Supprimer cette recette ?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Êtes-vous sûr de vouloir supprimer définitivement <strong>« {recipe.title} »</strong> de votre carnet et de la base de données ?
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-colors cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-extrabold text-xs rounded-2xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Supprimer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
