"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Database, Sparkles } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { categorizeIngredient, CATEGORY_ICONS } from "@/features/groceries/categorizer";

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
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Charger les ingrédients directement depuis la table Supabase "ingredients"
  useEffect(() => {
    let isMounted = true;
    async function loadIngredientsFromDb() {
      try {
        setIsLoading(true);
        const supabase = createClient();
        const { data, error } = await supabase
          .from("ingredients")
          .select("name, category, image_url")
          .order("name", { ascending: true })
          .limit(1000);

        if (!error && data && Array.isArray(data) && isMounted) {
          const list: IngredientSuggestion[] = data
            .filter((row) => row.name && row.name.trim().length > 0)
            .map((row) => ({
              name: row.name.trim(),
              category: row.category || categorizeIngredient(row.name),
              imageUrl: row.image_url || undefined,
            }));

          // Dédoublonnage par nom
          const uniqueMap = new Map<string, IngredientSuggestion>();
          list.forEach((item) => {
            const key = item.name.toLowerCase();
            if (!uniqueMap.has(key)) {
              uniqueMap.set(key, item);
            }
          });
          setDbIngredients(Array.from(uniqueMap.values()));
        }
      } catch (err) {
        console.warn("Erreur chargement ingrédients depuis la BDD:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadIngredientsFromDb();
    return () => {
      isMounted = false;
    };
  }, []);

  // Recherche dynamique / filtrage basé exclusivement sur les données de la BDD
  const matches = useMemo(() => {
    if (!value || value.trim().length < 1) return [];
    const query = value.toLowerCase().trim();
    return dbIngredients
      .filter((item) => item.name.toLowerCase().includes(query))
      .slice(0, 8);
  }, [value, dbIngredients]);

  // Fermer la dropdown lors d'un clic extérieur
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
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50">
            <Database className="w-3 h-3 text-[#5DB534]" />
            <span>Ingrédients de la base ({matches.length})</span>
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
