"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Plus,
  Check,
  Trash2,
  Share2,
  Copy,
  ShoppingBag,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { ShoppingItem, RecipeContribution } from "@/features/groceries/types";
import { CATEGORY_ICONS } from "@/features/groceries/categorizer";
import {
  syncAndFetchShoppingList,
  getStoredShoppingItems,
  addCustomShoppingItem,
  toggleShoppingItemInDb,
  deleteShoppingItemFromList,
  clearCompletedShoppingItems,
  formatShoppingListForExport,
} from "@/features/groceries/actions";
import { BottomNav } from "@/components/layout/BottomNav";

const CATEGORY_ORDER = [
  "Fruits & Légumes",
  "Viandes & Poissons",
  "Produits Frais & Crèmerie",
  "Boulangerie",
  "Épicerie & Condiments",
  "Boissons",
  "Articles divers",
];

export default function GroceriesPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [newItemName, setNewItemName] = useState<string>("");
  const [newItemAmount, setNewItemAmount] = useState<string>("");
  const [newItemUnit, setNewItemUnit] = useState<string>("");
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<string>("");

  // Recipe Filter State: we track DESELECTED recipe IDs (empty set = all recipes active)
  const [deselectedRecipeIds, setDeselectedRecipeIds] = useState<Set<string>>(new Set());

  // Expandable state for each department category (stores category names that are collapsed)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Expandable Accordion for purchased items
  const [isPurchasedExpanded, setIsPurchasedExpanded] = useState<boolean>(true);

  const loadGroceries = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    // 1. Instant local load
    const cached = getStoredShoppingItems(user.id);
    if (cached.length > 0) {
      setItems(cached);
      setIsLoading(false);
    }

    // 2. Full synchronization with database upcoming meal plans + custom items
    try {
      const fullList = await syncAndFetchShoppingList(user.id);
      setItems(fullList);
    } catch (err) {
      console.warn("loadGroceries sync error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadGroceries();

    const handleUpdate = () => {
      if (user?.id) {
        setItems(getStoredShoppingItems(user.id));
      }
    };

    window.addEventListener("letscook:groceries-updated", handleUpdate);
    window.addEventListener("letscook:meal-plans-updated", loadGroceries);
    return () => {
      window.removeEventListener("letscook:groceries-updated", handleUpdate);
      window.removeEventListener("letscook:meal-plans-updated", loadGroceries);
    };
  }, [loadGroceries, user?.id]);

  // Extract all distinct contributing recipes from shopping items
  const contributingRecipes = useMemo(() => {
    const map = new Map<string, { id: string; title: string; imageUrl?: string }>();
    items.forEach((item) => {
      if (item.recipeSources && item.recipeSources.length > 0) {
        item.recipeSources.forEach((src) => {
          if (src.recipeId && !map.has(src.recipeId)) {
            map.set(src.recipeId, {
              id: src.recipeId,
              title: src.recipeTitle,
              imageUrl: src.recipeImageUrl,
            });
          }
        });
      } else if (item.recipeId && !map.has(item.recipeId)) {
        map.set(item.recipeId, {
          id: item.recipeId,
          title: item.recipeTitle || "Recette",
          imageUrl: item.recipeImageUrl,
        });
      }
    });
    return Array.from(map.values());
  }, [items]);

  const toggleRecipeFilter = (recipeId: string) => {
    setDeselectedRecipeIds((prev) => {
      const next = new Set(prev);
      if (next.has(recipeId)) {
        next.delete(recipeId);
      } else {
        next.add(recipeId);
      }
      return next;
    });
  };

  const handleToggleAllRecipes = () => {
    if (deselectedRecipeIds.size === contributingRecipes.length) {
      setDeselectedRecipeIds(new Set()); // Tout réafficher
    } else {
      setDeselectedRecipeIds(new Set(contributingRecipes.map((r) => r.id))); // Tout masquer
    }
  };

  const toggleCategoryCollapse = (categoryName: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      return next;
    });
  };

  // Immediate toggle of checked status
  const handleToggle = async (item: ShoppingItem) => {
    if (!user?.id) return;
    const newChecked = !item.checked;

    // Optimistic UI update
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, checked: newChecked } : i))
    );

    await toggleShoppingItemInDb(item.id, newChecked, user.id);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !user?.id) return;

    const amountNum = newItemAmount ? parseFloat(newItemAmount) : null;
    const added = await addCustomShoppingItem(
      newItemName,
      amountNum,
      newItemUnit || null,
      user.id
    );

    setItems((prev) => [added, ...prev]);
    setNewItemName("");
    setNewItemAmount("");
    setNewItemUnit("");
  };

  const handleDelete = async (item: ShoppingItem) => {
    if (!user?.id) return;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    await deleteShoppingItemFromList(item, user.id);
  };

  const handleClearCompleted = async () => {
    if (!user?.id) return;
    setItems((prev) => prev.filter((i) => !i.checked));
    await clearCompletedShoppingItems(user.id);
  };

  // Filter items based on active recipe filter selection & re-calculate quantities dynamically
  const displayItems = useMemo(() => {
    return items
      .map((item) => {
        if (item.isCustom) return item;

        // Auto item with multiple recipe sources
        if (item.recipeSources && item.recipeSources.length > 0) {
          const activeSources = item.recipeSources.filter(
            (s) => !deselectedRecipeIds.has(s.recipeId)
          );

          if (activeSources.length === 0) return null;

          // Recompute total amount for active sources
          let sumAmount: number | null = null;
          let hasAmounts = false;
          activeSources.forEach((s) => {
            if (typeof s.amount === "number") {
              sumAmount = (sumAmount || 0) + s.amount;
              hasAmounts = true;
            }
          });

          return {
            ...item,
            amount: hasAmounts && sumAmount !== null ? Math.round(sumAmount * 100) / 100 : item.amount,
            recipeSources: activeSources,
          };
        }

        // Single recipe item
        if (item.recipeId && deselectedRecipeIds.has(item.recipeId)) {
          return null;
        }

        return item;
      })
      .filter((item): item is ShoppingItem => item !== null);
  }, [items, deselectedRecipeIds]);

  // Export to Apple Reminders (Rappels iOS) / Share Sheet
  const handleExportToAppleReminders = async () => {
    const formattedText = formatShoppingListForExport(displayItems);

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Liste de courses Let's Cook",
          text: formattedText,
        });
        setExportNotice("Exporté vers vos applications iOS !");
        setTimeout(() => setExportNotice(""), 3000);
        return;
      } catch (err) {
        // User dismissed share sheet
      }
    }

    navigator.clipboard.writeText(formattedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);

    try {
      window.location.href = `shortcuts://run-shortcut?name=Courses&input=${encodeURIComponent(
        formattedText
      )}`;
    } catch {}
  };

  const handleCopyText = () => {
    const formattedText = formatShoppingListForExport(displayItems);
    navigator.clipboard.writeText(formattedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const uncheckedItems = useMemo(
    () => displayItems.filter((i) => !i.checked),
    [displayItems]
  );
  const checkedItems = useMemo(
    () => displayItems.filter((i) => i.checked),
    [displayItems]
  );

  // Group unchecked items by department category
  const groupedUnchecked = useMemo(() => {
    const groups: Record<string, ShoppingItem[]> = {};
    for (const item of uncheckedItems) {
      const cat = item.category || "Articles divers";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }

    const existingCats = Object.keys(groups);
    existingCats.sort((a, b) => {
      const idxA = CATEGORY_ORDER.indexOf(a);
      const idxB = CATEGORY_ORDER.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    return existingCats.map((category) => ({
      category,
      icon: CATEGORY_ICONS[category] || "📦",
      items: groups[category],
    }));
  }, [uncheckedItems]);

  const activeRecipesCount = contributingRecipes.length - deselectedRecipeIds.size;

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col pb-32">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md px-5 pt-7 pb-3.5 flex items-center justify-between border-b border-slate-100">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#181A20] shadow-sm border border-slate-100 active:scale-95 transition-all cursor-pointer"
          aria-label="Retour"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h1 className="text-base font-extrabold text-[#181A20] flex items-center justify-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-[#5DB534]" />
            <span>Liste de courses</span>
          </h1>
          <span className="text-[10px] text-[#8E929E] font-medium">
            Mutualisée & synchronisée
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleExportToAppleReminders}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-700 shadow-sm border border-slate-100 active:scale-95 transition-all cursor-pointer"
            title="Partager / Exporter la liste"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleCopyText}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-700 shadow-sm border border-slate-100 active:scale-95 transition-all cursor-pointer"
            title="Copier la liste"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="max-w-xl w-full mx-auto px-5 pt-4 space-y-4">
        {exportNotice && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl animate-in fade-in text-center">
            {exportNotice}
          </div>
        )}

        {/* Recipe Filter Carousel (Interactive Miniature Recipe Chips) */}
        {contributingRecipes.length > 0 && (
          <div className="bg-white p-3.5 rounded-3xl border border-slate-100 shadow-2xs space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-slate-500">
                Recettes prévues ({activeRecipesCount}/{contributingRecipes.length})
              </span>
              <button
                type="button"
                onClick={handleToggleAllRecipes}
                className="text-[10px] font-bold text-[#5DB534] hover:underline cursor-pointer"
              >
                {deselectedRecipeIds.size === contributingRecipes.length
                  ? "Tout afficher"
                  : "Tout masquer"}
              </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {contributingRecipes.map((rec) => {
                const isSelected = !deselectedRecipeIds.has(rec.id);
                return (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => toggleRecipeFilter(rec.id)}
                    className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-2xl border transition-all cursor-pointer shrink-0 active:scale-95 ${
                      isSelected
                        ? "bg-emerald-50/50 border-[#5DB534] shadow-2xs ring-1 ring-[#5DB534]/30"
                        : "bg-slate-50/60 border-slate-200 opacity-40 grayscale"
                    }`}
                  >
                    <div className="w-7 h-7 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-100 shadow-2xs">
                      {rec.imageUrl ? (
                        <img
                          src={rec.imageUrl}
                          alt={rec.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-emerald-100 flex items-center justify-center text-xs">
                          🍽️
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-bold text-[#181A20] truncate max-w-[130px]">
                      {rec.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Add Form */}
        <form
          onSubmit={handleAddItem}
          className="bg-white p-3 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Ajouter un article (ex: Lait, Pain...)"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="flex-1 bg-slate-50 px-3.5 py-2.5 rounded-xl text-xs text-[#181A20] placeholder-slate-400 border border-slate-200/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5DB534]/30"
          />

          <input
            type="text"
            placeholder="Qté"
            value={newItemAmount}
            onChange={(e) => setNewItemAmount(e.target.value)}
            className="w-14 bg-slate-50 px-2 py-2.5 rounded-xl text-xs text-center text-[#181A20] placeholder-slate-400 border border-slate-200/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5DB534]/30"
          />

          <button
            type="submit"
            disabled={!newItemName.trim()}
            className="w-10 h-10 bg-[#5DB534] hover:bg-[#4FA12A] disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-5 h-5" />
          </button>
        </form>

        {/* Status Bar */}
        <div className="flex items-center justify-between text-xs px-1 text-[#8E929E]">
          <span className="font-semibold text-[#181A20]">
            {uncheckedItems.length} article(s) à acheter
          </span>
          {checkedItems.length > 0 && (
            <button
              type="button"
              onClick={handleClearCompleted}
              className="text-rose-500 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Effacer cochés ({checkedItems.length})</span>
            </button>
          )}
        </div>

        {/* List of Items */}
        {isLoading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-[#5DB534] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-[#8E929E]">Chargement de votre liste...</p>
          </div>
        ) : displayItems.length === 0 ? (
          /* Empty State */
          <div className="py-16 px-6 bg-white rounded-3xl border border-dashed border-slate-200 text-center flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#5DB534] flex items-center justify-center mb-3">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-extrabold text-[#181A20]">
              Aucun ingrédient à acheter
            </h3>
            <p className="text-xs text-[#8E929E] mt-1 max-w-xs leading-relaxed">
              {contributingRecipes.length > 0 && deselectedRecipeIds.size === contributingRecipes.length
                ? "Toutes les recettes sont actuellement désélectionnées. Cliquez sur les miniatures en haut pour les réafficher !"
                : "Planifiez des recettes dans votre Calendrier pour y ajouter automatiquement les ingrédients mutualisés !"}
            </p>
            <button
              type="button"
              onClick={() => router.push("/calendar")}
              className="mt-4 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-full flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ouvrir le calendrier</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. All Items Checked Congratulation Banner */}
            {uncheckedItems.length === 0 && checkedItems.length > 0 && (
              <div className="p-4 bg-emerald-50/80 border border-emerald-200/80 rounded-3xl text-center space-y-1 animate-in fade-in">
                <div className="inline-flex items-center justify-center w-8 h-8 bg-emerald-500 text-white rounded-full mb-1">
                  <Check className="w-5 h-5 stroke-[3]" />
                </div>
                <h4 className="text-xs font-extrabold text-emerald-900">
                  Tous les articles ont été achetés !
                </h4>
                <p className="text-[11px] text-emerald-700">
                  Retrouvez vos articles cochés ci-dessous dans « Courses achetées ».
                </p>
              </div>
            )}

            {/* 2. Unchecked Items Grouped by Expandable Category */}
            {groupedUnchecked.map((group) => {
              const isCollapsed = collapsedCategories.has(group.category);

              return (
                <div key={group.category} className="space-y-2">
                  {/* Department Expandable Header Button */}
                  <button
                    type="button"
                    onClick={() => toggleCategoryCollapse(group.category)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-2xl bg-white hover:bg-slate-50 border border-slate-100 shadow-2xs transition-all cursor-pointer group text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{group.icon}</span>
                      <h3 className="text-xs font-bold text-[#181A20] tracking-wide">
                        {group.category}
                      </h3>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {group.items.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-slate-400 group-hover:text-slate-600 transition-colors">
                      <span className="text-[10px] font-medium">
                        {isCollapsed ? "Déplier" : "Replier"}
                      </span>
                      {isCollapsed ? (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                  </button>

                  {/* Items in this category */}
                  {!isCollapsed && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      {group.items.map((item) => {
                        const activeSources: RecipeContribution[] =
                          item.recipeSources && item.recipeSources.length > 0
                            ? item.recipeSources
                            : item.recipeId
                            ? [
                                {
                                  recipeId: item.recipeId,
                                  recipeTitle: item.recipeTitle || "Recette",
                                  recipeImageUrl: item.recipeImageUrl,
                                },
                              ]
                            : [];

                        return (
                          <div
                            key={item.id}
                            className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between gap-3 group hover:border-slate-200 transition-all"
                          >
                            <div
                              onClick={() => handleToggle(item)}
                              className="flex items-center gap-3 flex-1 cursor-pointer min-w-0"
                            >
                              {/* Checkbox */}
                              <div className="w-5 h-5 rounded-lg border-2 border-slate-300 flex items-center justify-center group-hover:border-[#5DB534] transition-colors shrink-0" />

                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-xs font-bold text-[#181A20] truncate">
                                  {item.name}
                                </span>

                                {/* Mutualized Source Recipe Badges */}
                                {activeSources.length > 0 && (
                                  <span className="text-[10px] text-[#5DB534] font-medium flex items-center gap-1 mt-0.5 truncate">
                                    <span>🍽️</span>
                                    <span className="truncate max-w-[200px]">
                                      {activeSources.map((s) => s.recipeTitle).join(" + ")}
                                    </span>
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {/* Recipe Miniatures Avatars */}
                              {activeSources.length > 0 && (
                                <div className="flex items-center -space-x-2 shrink-0">
                                  {activeSources.map((src, idx) => (
                                    <div
                                      key={idx}
                                      className="w-6 h-6 rounded-full overflow-hidden border-2 border-white shadow-2xs bg-slate-100 shrink-0"
                                      title={src.recipeTitle}
                                    >
                                      {src.recipeImageUrl ? (
                                        <img
                                          src={src.recipeImageUrl}
                                          alt={src.recipeTitle}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full bg-emerald-100 flex items-center justify-center text-[9px]">
                                          🍽️
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Amount Pill */}
                              {(item.amount || item.unit) && (
                                <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                                  {item.amount ? `${item.amount} ` : ""}
                                  {item.unit || ""}
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDelete(item)}
                                className="p-1 text-slate-300 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* 3. Expandable Section: Courses Achetées / Checked Items */}
            {checkedItems.length > 0 && (
              <div className="pt-2 border-t border-slate-200/60 space-y-2">
                {/* Expandable Accordion Header */}
                <button
                  type="button"
                  onClick={() => setIsPurchasedExpanded((prev) => !prev)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-white border border-slate-100 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-emerald-100 text-[#5DB534] flex items-center justify-center text-xs">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">
                      Courses achetées
                    </span>
                    <span className="text-[10px] font-extrabold bg-[#5DB534]/10 text-[#5DB534] px-2 py-0.5 rounded-full">
                      {checkedItems.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="text-[10px] font-medium">
                      {isPurchasedExpanded ? "Replier" : "Déplier"}
                    </span>
                    {isPurchasedExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                </button>

                {/* Collapsible Content */}
                {isPurchasedExpanded && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    {checkedItems.map((item) => {
                      const activeSources: RecipeContribution[] =
                        item.recipeSources && item.recipeSources.length > 0
                          ? item.recipeSources
                          : item.recipeId
                          ? [
                              {
                                recipeId: item.recipeId,
                                recipeTitle: item.recipeTitle || "Recette",
                                recipeImageUrl: item.recipeImageUrl,
                              },
                            ]
                          : [];

                      return (
                        <div
                          key={item.id}
                          className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100 flex items-center justify-between gap-3 opacity-75 hover:opacity-100 transition-all"
                        >
                          <div
                            onClick={() => handleToggle(item)}
                            className="flex items-center gap-3 flex-1 cursor-pointer min-w-0"
                          >
                            <div className="w-5 h-5 rounded-lg bg-[#5DB534] text-white flex items-center justify-center shrink-0 shadow-2xs">
                              <Check className="w-3.5 h-3.5" strokeWidth={3} />
                            </div>

                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-xs font-semibold text-slate-500 line-through truncate">
                                {item.name}
                              </span>
                              {activeSources.length > 0 && (
                                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5 truncate">
                                  <span>🍽️</span>
                                  <span className="truncate max-w-[200px]">
                                    {activeSources.map((s) => s.recipeTitle).join(" + ")}
                                  </span>
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Recipe Miniatures Avatars */}
                            {activeSources.length > 0 && (
                              <div className="flex items-center -space-x-2 shrink-0 opacity-60">
                                {activeSources.map((src, idx) => (
                                  <div
                                    key={idx}
                                    className="w-5 h-5 rounded-full overflow-hidden border border-white shadow-2xs bg-slate-100 shrink-0"
                                    title={src.recipeTitle}
                                  >
                                    {src.recipeImageUrl ? (
                                      <img
                                        src={src.recipeImageUrl}
                                        alt={src.recipeTitle}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-emerald-100 flex items-center justify-center text-[8px]">
                                        🍽️
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Amount Pill */}
                            {(item.amount || item.unit) && (
                              <span className="text-[10px] font-semibold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-md">
                                {item.amount ? `${item.amount} ` : ""}
                                {item.unit || ""}
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              className="p-1 text-slate-300 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
