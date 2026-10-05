"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, Sparkles, Check } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { categorizeIngredient, CATEGORY_ICONS } from "@/features/groceries/categorizer";

export const COMMON_INGREDIENTS: Array<{ name: string; category: string }> = [
  { name: "Ail", category: "Épicerie & Condiments" },
  { name: "Avocat", category: "Fruits & Légumes" },
  { name: "Basilic", category: "Fruits & Légumes" },
  { name: "Beurre", category: "Produits Frais & Crèmerie" },
  { name: "Boeuf haché", category: "Viandes & Poissons" },
  { name: "Bouillon de légumes", category: "Épicerie & Condiments" },
  { name: "Bouillon de volaille", category: "Épicerie & Condiments" },
  { name: "Carottes", category: "Fruits & Légumes" },
  { name: "Champignons de Paris", category: "Fruits & Légumes" },
  { name: "Chocolat noir", category: "Épicerie & Condiments" },
  { name: "Citron", category: "Fruits & Légumes" },
  { name: "Concentré de tomate", category: "Épicerie & Condiments" },
  { name: "Courgettes", category: "Fruits & Légumes" },
  { name: "Crème fraîche", category: "Produits Frais & Crèmerie" },
  { name: "Crème liquide", category: "Produits Frais & Crèmerie" },
  { name: "Cumin", category: "Épicerie & Condiments" },
  { name: "Curry", category: "Épicerie & Condiments" },
  { name: "Échalotes", category: "Fruits & Légumes" },
  { name: "Emmental râpé", category: "Produits Frais & Crèmerie" },
  { name: "Épinards", category: "Fruits & Légumes" },
  { name: "Farine de blé", category: "Épicerie & Condiments" },
  { name: "Gingembre frais", category: "Fruits & Légumes" },
  { name: "Gruyère", category: "Produits Frais & Crèmerie" },
  { name: "Huile d'olive", category: "Épicerie & Condiments" },
  { name: "Huile de tournesol", category: "Épicerie & Condiments" },
  { name: "Lait", category: "Produits Frais & Crèmerie" },
  { name: "Lardons", category: "Viandes & Poissons" },
  { name: "Miel", category: "Épicerie & Condiments" },
  { name: "Moutarde de Dijon", category: "Épicerie & Condiments" },
  { name: "Mozzarella", category: "Produits Frais & Crèmerie" },
  { name: "Oeufs", category: "Produits Frais & Crèmerie" },
  { name: "Oignons jaunes", category: "Fruits & Légumes" },
  { name: "Oignons rouges", category: "Fruits & Légumes" },
  { name: "Pain de mie", category: "Boulangerie" },
  { name: "Pain frais", category: "Boulangerie" },
  { name: "Paprika", category: "Épicerie & Condiments" },
  { name: "Parmesan râpé", category: "Produits Frais & Crèmerie" },
  { name: "Pâtes (Spaghetti)", category: "Épicerie & Condiments" },
  { name: "Pâtes (Penne)", category: "Épicerie & Condiments" },
  { name: "Pignons de pin", category: "Épicerie & Condiments" },
  { name: "Poireaux", category: "Fruits & Légumes" },
  { name: "Pois chiches", category: "Épicerie & Condiments" },
  { name: "Poivron rouge", category: "Fruits & Légumes" },
  { name: "Poivre noir", category: "Épicerie & Condiments" },
  { name: "Pommes de terre", category: "Fruits & Légumes" },
  { name: "Poulet (filets)", category: "Viandes & Poissons" },
  { name: "Riz basmati", category: "Épicerie & Condiments" },
  { name: "Riz rond", category: "Épicerie & Condiments" },
  { name: "Salade verte", category: "Fruits & Légumes" },
  { name: "Saumon (pavés)", category: "Viandes & Poissons" },
  { name: "Sauce soja", category: "Épicerie & Condiments" },
  { name: "Sel fin", category: "Épicerie & Condiments" },
  { name: "Sucre en poudre", category: "Épicerie & Condiments" },
  { name: "Thon en boîte", category: "Viandes & Poissons" },
  { name: "Tomates", category: "Fruits & Légumes" },
  { name: "Tomates concassées", category: "Épicerie & Condiments" },
  { name: "Vinaigre balsamique", category: "Épicerie & Condiments" },
];

export interface IngredientSuggestion {
  name: string;
  category: string;
  imageUrl?: string;
}

interface IngredientAutocompleteProps {
  value: string;
  onChange: (val: string, category?: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  onSelect?: (item: IngredientSuggestion) => void;
}

export function IngredientAutocomplete({
  value,
  onChange,
  placeholder = "Nom de l'ingrédient...",
  className = "",
  inputClassName = "",
  autoFocus = false,
  onSelect,
}: IngredientAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dbIngredients, setDbIngredients] = useState<IngredientSuggestion[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load known ingredients from DB
  useEffect(() => {
    async function loadDb() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from("ingredients").select("name, category, image_url");
        if (!error && data && Array.isArray(data)) {
          setDbIngredients(
            data.map((row) => ({
              name: row.name,
              category: row.category || categorizeIngredient(row.name),
              imageUrl: row.image_url || undefined,
            }))
          );
        }
      } catch {}
    }
    loadDb();
  }, []);

  // Merge common ingredients with DB ingredients (avoiding duplicates)
  const allSuggestions = useMemo(() => {
    const map = new Map<string, IngredientSuggestion>();
    COMMON_INGREDIENTS.forEach((item) => {
      map.set(item.name.toLowerCase().trim(), item);
    });
    dbIngredients.forEach((item) => {
      map.set(item.name.toLowerCase().trim(), item);
    });
    return Array.from(map.values());
  }, [dbIngredients]);

  // Filter matching suggestions
  const matches = useMemo(() => {
    if (!value || value.trim().length < 1) return [];
    const query = value.toLowerCase().trim();
    return allSuggestions
      .filter((item) => item.name.toLowerCase().includes(query))
      .slice(0, 6);
  }, [value, allSuggestions]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChoose = (item: IngredientSuggestion) => {
    onChange(item.name, item.category);
    if (onSelect) onSelect(item);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (value.trim().length > 0) setIsOpen(true);
        }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={
          inputClassName ||
          "w-full bg-slate-50 px-3.5 py-2.5 rounded-xl text-xs text-[#181A20] placeholder-slate-400 border border-slate-200/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5DB534]/30"
        }
      />

      {isOpen && matches.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl shadow-xl border border-slate-100 py-1 max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#5DB534]" />
            <span>Suggestions d'ingrédients</span>
          </div>

          {matches.map((item) => {
            const icon = CATEGORY_ICONS[item.category] || "📦";
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => handleChoose(item)}
                className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-emerald-50/60 active:bg-emerald-100/70 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm shrink-0">{icon}</span>
                  <span className="text-xs font-bold text-[#181A20] group-hover:text-[#5DB534] truncate">
                    {item.name}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 bg-slate-100 group-hover:bg-emerald-100/80 group-hover:text-emerald-800 px-2 py-0.5 rounded-md shrink-0 ml-2">
                  {item.category}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
