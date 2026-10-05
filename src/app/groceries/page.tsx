"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { ShoppingItem } from "@/features/groceries/types";
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

  // Export to Apple Reminders (Rappels iOS) / Share Sheet
  const handleExportToAppleReminders = async () => {
    const formattedText = formatShoppingListForExport(items);

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
        // User dismissed share sheet or unsupported
      }
    }

    // Fallback: Copy to clipboard and open Apple Reminders scheme
    navigator.clipboard.writeText(formattedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);

    // Attempt to open Apple Reminders / Shortcuts scheme
    try {
      window.location.href = `shortcuts://run-shortcut?name=Courses&input=${encodeURIComponent(
        formattedText
      )}`;
    } catch {}
  };

  const handleCopyText = () => {
    const formattedText = formatShoppingListForExport(items);
    navigator.clipboard.writeText(formattedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const checkedCount = items.filter((i) => i.checked).length;
  const uncheckedItems = items.filter((i) => !i.checked);
  const checkedItems = items.filter((i) => i.checked);

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
            Synchronisée avec le planning
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
        ) : items.length === 0 ? (
          /* Empty State */
          <div className="py-16 px-6 bg-white rounded-3xl border border-dashed border-slate-200 text-center flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#5DB534] flex items-center justify-center mb-3">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-extrabold text-[#181A20]">
              Votre liste de courses est vide
            </h3>
            <p className="text-xs text-[#8E929E] mt-1 max-w-xs leading-relaxed">
              Planifiez des recettes dans votre <strong>Calendrier</strong> pour y ajouter automatiquement les ingrédients nécessaires !
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
          <div className="space-y-4">
            {/* Unchecked Items */}
            <div className="space-y-2">
              {uncheckedItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between gap-3 group hover:border-slate-200 transition-all"
                >
                  <div
                    onClick={() => handleToggle(item)}
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                  >
                    {/* Checkbox */}
                    <div className="w-5 h-5 rounded-lg border-2 border-slate-300 flex items-center justify-center group-hover:border-[#5DB534] transition-colors shrink-0" />

                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[#181A20]">
                        {item.name}
                      </span>
                      {item.recipeTitle && (
                        <span className="text-[10px] text-[#5DB534] font-medium flex items-center gap-1">
                          <span>🍽️</span>
                          <span className="truncate max-w-[180px]">
                            {item.recipeTitle}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
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
              ))}
            </div>

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
