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
  Sparkles,
  ShoppingBag,
  ExternalLink,
  Calendar,
  AlertCircle,
  Apple,
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

  // Recipe Filter State
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<Set<string>>(new Set());
  const [hasInitializedFilter, setHasInitializedFilter] = useState<boolean>(false);

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
      if (user?.id) setItems(getStoredShoppingItems(user.id));
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

  // Initialize all contributing recipes as selected by default
  useEffect(() => {
    if (contributingRecipes.length > 0 && !hasInitializedFilter) {
      setSelectedRecipeIds(new Set(contributingRecipes.map((r) => r.id)));
      setHasInitializedFilter(true);
    }
  }, [contributingRecipes, hasInitializedFilter]);

  const toggleRecipeFilter = (recipeId: string) => {
    setSelectedRecipeIds((prev) => {
      const next = new Set(prev);
      if (next.has(recipeId)) {
        next.delete(recipeId);
      } else {
        next.add(recipeId);
      }
      return next;
    });
  };

  const handleToggle = async (item: ShoppingItem) => {
    if (!user?.id) return;
    const newChecked = !item.checked;
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
          const activeSources = item.recipeSources.filter((s) =>
            selectedRecipeIds.has(s.recipeId)
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
        if (item.recipeId && !selectedRecipeIds.has(item.recipeId)) {
          return null;
        }

        return item;
      })
      .filter((item): item is ShoppingItem => item !== null);
  }, [items, selectedRecipeIds]);

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

  const checkedCount = displayItems.filter((i) => i.checked).length;
  const uncheckedItems = displayItems.filter((i) => !i.checked);
  const checkedItems = displayItems.filter((i) => i.checked);

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

        <div className="flex items-center gap-1">
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
        {/* iOS Reminders Export Banner */}
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 text-white p-4 rounded-3xl shadow-md border border-zinc-700/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white shrink-0">
              <Share2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xs font-bold flex items-center gap-1.5">
                <span>Exporter vers Rappels iOS</span>
              </h3>
              <p className="text-[10px] text-zinc-300 mt-0.5">
                Ajoutez la liste en 1 clic dans vos Rappels Apple
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportToAppleReminders}
            className="px-3.5 py-2 bg-[#5DB534] hover:bg-[#4FA12A] text-white font-extrabold text-[11px] rounded-xl shadow-sm active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>{isCopied ? "Copié !" : "Exporter"}</span>
          </button>
        </div>

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
                Recettes prévues ({selectedRecipeIds.size}/{contributingRecipes.length})
              </span>
              <button
                type="button"
                onClick={() => {
                  if (selectedRecipeIds.size === contributingRecipes.length) {
                    setSelectedRecipeIds(new Set());
                  } else {
                    setSelectedRecipeIds(new Set(contributingRecipes.map((r) => r.id)));
                  }
                }}
                className="text-[10px] font-bold text-[#5DB534] hover:underline cursor-pointer"
              >
                {selectedRecipeIds.size === contributingRecipes.length
                  ? "Tout masquer"
                  : "Tout afficher"}
              </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {contributingRecipes.map((rec) => {
                const isSelected = selectedRecipeIds.has(rec.id);
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
          {checkedCount > 0 && (
            <button
              type="button"
              onClick={handleClearCompleted}
              className="text-rose-500 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Effacer cochés ({checkedCount})</span>
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
              {contributingRecipes.length > 0 && selectedRecipeIds.size === 0
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
            {/* Unchecked Items Grouped by Category */}
            {groupedUnchecked.map((group) => (
              <div key={group.category} className="space-y-2">
                {/* Department Header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{group.icon}</span>
                    <h3 className="text-xs font-bold text-[#181A20] tracking-wide">
                      {group.category}
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {group.items.length}
                  </span>
                </div>

                {/* Items in this category */}
                <div className="space-y-2">
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
              </div>
            ))}

            {/* Checked Items */}
            {checkedItems.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-200/60">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block px-1">
                  Déjà achetés ({checkedItems.length})
                </span>

                {checkedItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-50/70 p-3 rounded-2xl border border-slate-100 flex items-center justify-between gap-3 opacity-60"
                  >
                    <div
                      onClick={() => handleToggle(item)}
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                    >
                      <div className="w-5 h-5 rounded-lg bg-[#5DB534] text-white flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                      </div>

                      <span className="text-xs font-semibold text-slate-500 line-through">
                        {item.name}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      className="p-1 text-slate-300 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
