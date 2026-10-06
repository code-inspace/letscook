import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

function parseIsoDuration(durationStr?: string): number {
  if (!durationStr) return 0;
  try {
    const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
    if (!match) {
      const minMatch = durationStr.match(/(\d+)\s*(?:min|m)/i);
      return minMatch ? parseInt(minMatch[1], 10) : 0;
    }
    const hours = parseInt(match[1] || "0", 10);
    const minutes = parseInt(match[2] || "0", 10);
    return hours * 60 + minutes;
  } catch {
    return 0;
  }
}

function parseServings(yieldStr?: string | number): number {
  if (!yieldStr) return 4;
  if (typeof yieldStr === "number") return yieldStr;
  const match = yieldStr.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 4;
}

function parseIngredientString(raw: string, index: number) {
  const clean = raw.replace(/\s+/g, " ").trim();
  // Regex pattern for "200 g d'épinards", "1 rouleau de...", "3 oeufs", "25 cl de..."
  const match = clean.match(/^([\d\/\.,]+)\s*([a-zA-Zàâäéèêëîïôöùûüç°%]+)?\s*(?:d'|de |du |des )?\s*(.+)$/i);
  
  if (match) {
    let amount = parseFloat(match[1].replace(",", "."));
    let unit = match[2] ? match[2].trim() : "";
    let name = match[3] ? match[3].trim() : clean;

    if (isNaN(amount)) amount = 1;
    return {
      id: `ing_${Date.now()}_${index}`,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      amount,
      unit: unit || "pièce(s)",
    };
  }

  return {
    id: `ing_${Date.now()}_${index}`,
    name: clean.charAt(0).toUpperCase() + clean.slice(1),
    amount: 1,
    unit: "portion",
  };
}

export async function POST(req: NextRequest) {
  const serverLogs: string[] = [];
  const log = (msg: string) => {
    const timestamp = new Date().toISOString().substring(11, 19);
    serverLogs.push(`[${timestamp}] ${msg}`);
  };

  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string" || !url.startsWith("http")) {
      return NextResponse.json(
        { error: "URL de recette invalide.", logs: serverLogs },
        { status: 400 }
      );
    }

    log(`Analyse de l'URL: ${url}`);

    const isInstagram = /instagram\.com\/(?:reel|p|tv|share)\/|instagr\.am/i.test(url);
    const isTikTok = /tiktok\.com/i.test(url);
    const isYouTube = /youtube\.com\/shorts\/|youtu\.be\/|youtube\.com\/watch/i.test(url);

    // =========================================================================
    // 0. TRAITEMENT SPÉCIAL RÉSEAUX SOCIAUX (INSTAGRAM, TIKTOK, YOUTUBE SHORTS)
    // =========================================================================
    if (isInstagram || isTikTok || isYouTube) {
      log(`Lien vidéo/réseau social détecté : ${isInstagram ? "Instagram" : isTikTok ? "TikTok" : "YouTube"}`);

      let socialCaption = "";
      let socialThumbnail = "";
      let socialAuthor = "";

      // A. SPÉCIFIQUE INSTAGRAM : Extraction via le Captioned Embed Endpoint officiel
      if (isInstagram) {
        try {
          const igMatch =
            url.match(/instagram\.com\/(?:reel|p|tv|share)\/([a-zA-Z0-9_-]+)/i) ||
            url.match(/instagr\.am\/([a-zA-Z0-9_-]+)/i);

          if (igMatch && igMatch[1]) {
            const shortcode = igMatch[1];
            const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
            log(`Extraction Instagram via Embed : ${embedUrl}`);

            const embedRes = await fetch(embedUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
                "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
              },
              signal: AbortSignal.timeout(10000),
            });

            if (embedRes.ok) {
              const html = await embedRes.text();

              // 1. Auteur
              const authorMatch = html.match(/class=["\']CaptionUsername["\'][^>]*>([^<]+)<\/a>/i);
              if (authorMatch) {
                socialAuthor = authorMatch[1].trim();
              }

              // 2. Légende complète depuis le DOM rendu
              const captionBlockMatch = html.match(/<div class=["\']Caption["\'][^>]*>([\s\S]*?)<\/div>/i);
              if (captionBlockMatch) {
                let rawCaption = captionBlockMatch[1];
                rawCaption = rawCaption.replace(/<a class=["\']CaptionUsername["\'][^>]*>[\s\S]*?<\/a>/gi, "");
                rawCaption = rawCaption.replace(/<br\s*[\/]?>/gi, "\n");
                let cleanCaption = rawCaption.replace(/<[^>]+>/g, "").trim();
                cleanCaption = cleanCaption.replace(/View all \d+ comments[\s\S]*$/i, "").trim();
                if (cleanCaption) {
                  socialCaption = cleanCaption;
                  log(`Légende Instagram extraite avec succès (${socialCaption.length} caractères).`);
                }
              }

              // 3. Fallback légende si JSON présent
              if (!socialCaption) {
                const jsonTextMatch = html.match(/edge_media_to_caption[\s\S]*?\"text\":\"(.*?)\"/);
                if (jsonTextMatch) {
                  try {
                    socialCaption = JSON.parse(`"${jsonTextMatch[1]}"`);
                  } catch {
                    socialCaption = jsonTextMatch[1];
                  }
                }
              }

              // 4. Image de couverture (Thumbnail)
              const imgMatch = html.match(/<img class=["\']EmbeddedMediaImage["\'][^>]*src=["\']([^"\']+)["\']/i);
              if (imgMatch) {
                socialThumbnail = imgMatch[1].replace(/&amp;/g, "&");
              } else {
                const displayUrlMatch = html.match(/\"display_url\":\"([^"]+)\"/i) || html.match(/\"thumbnail_src\":\"([^"]+)\"/i);
                if (displayUrlMatch) {
                  socialThumbnail = displayUrlMatch[1].replace(/\\\//g, "/");
                }
              }
            }
          }
        } catch (igEmbedErr) {
          log(`Instagram Embed warning : ${igEmbedErr}`);
        }
      }

      // B. Essai via les API oEmbed officielles (pour TikTok, YouTube, ou fallback IG)
      if (!socialCaption || !socialThumbnail) {
        try {
          let oembedUrl = "";
          if (isInstagram) {
            oembedUrl = `https://api.instagram.com/oembed?url=${encodeURIComponent(url)}&omitscript=true`;
          } else if (isTikTok) {
            oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
          } else if (isYouTube) {
            oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
          }

          log(`Interrogation oEmbed : ${oembedUrl}`);
          const oembedRes = await fetch(oembedUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" },
            signal: AbortSignal.timeout(8000),
          });

          if (oembedRes.ok) {
            const oembedData = await oembedRes.json();
            if (!socialCaption) socialCaption = oembedData.title || oembedData.description || "";
            if (!socialThumbnail) socialThumbnail = oembedData.thumbnail_url || "";
            if (!socialAuthor) socialAuthor = oembedData.author_name || "";
            log(`Données oEmbed récupérées (${socialCaption.length} caractères dans la légende).`);
          }
        } catch (oembedErr) {
          log(`oEmbed non disponible : ${oembedErr}`);
        }
      }

      // C. Secours OpenGraph avec headers mobiles et crawler
      if (!socialCaption || !socialThumbnail) {
        try {
          const socialHtmlRes = await fetch(url, {
            headers: {
              "User-Agent":
                "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
              Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
            signal: AbortSignal.timeout(10000),
          });

          if (socialHtmlRes.ok) {
            const socialHtml = await socialHtmlRes.text();
            const ogTitle = socialHtml.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i)?.[1] || "";
            const ogDesc = socialHtml.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i)?.[1] || "";
            const ogImg = socialHtml.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i)?.[1] || "";

            if (ogDesc && !socialCaption) socialCaption = ogDesc;
            if (ogTitle && !socialCaption) socialCaption = ogTitle;
            if (ogImg && !socialThumbnail) socialThumbnail = ogImg;
            log("Métadonnées OpenGraph extraites.");
          }
        } catch {}
      }

      // D. Analyse par Gemini 2.5 Flash
      const geminiApiKey =
        process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

      if (!geminiApiKey) {
        throw new Error("Clé API Gemini manquante pour analyser la vidéo.");
      }

      log("Analyse sémantique et culinaire de la publication avec Google Gemini...");

      const socialPrompt = `Tu es un chef cuisinier expert spécialisé dans l'analyse de vidéos et recettes de réseaux sociaux (Instagram Reels, TikTok, YouTube).
Voici les informations extraites de la publication :
URL : ${url}
Auteur / Créateur : ${socialAuthor || "Chef créateur"}
Légende & Description complète de la vidéo :
"""
${socialCaption || "Vidéo culinaire"}
"""
Image de couverture détectée : ${socialThumbnail || ""}

INSTRUCTIONS CRITIQUES :
1. Extrais ou déduis le titre appétissant et exact de la recette.
2. Identifie tous les ingrédients, condiments et quantités indiqués dans la description ou usuels pour ce plat. Calibre les quantités par défaut pour 6 personnes.
3. Rédige les étapes de préparation chronologiques, claires et détaillées.
4. Détermine le temps total de préparation, le niveau de difficulté ("Easy", "Medium" ou "Hard") et la catégorie adaptée.

Réponds STRICTEMENT avec ce JSON valide :
{
  "title": "Nom de la recette",
  "subtitle": "Courte description alléchante",
  "category": "Main Dishes" | "Soups & Stews" | "Appetizers" | "Pastas" | "Desserts" | "Salads",
  "imageUrl": "${socialThumbnail}",
  "prepTimeMinutes": 30,
  "difficulty": "Easy" | "Medium" | "Hard",
  "rating": 5.0,
  "servingsBase": 6,
  "ingredients": [
    { "id": "ing_1", "name": "Nom ingrédient", "amount": 200, "unit": "g" }
  ],
  "steps": [
    { "stepNumber": 1, "title": "Étape 1", "description": "Instructions détaillées...", "durationMinutes": 5 }
  ]
}`;

      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
      const geminiRes = await fetch(geminiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: socialPrompt }] }],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.2,
          },
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (geminiRes.ok) {
        const geminiData = await geminiRes.json();
        const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const cleanedText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(cleanedText);
          parsed.sourceUrl = url;
          if (!parsed.imageUrl && socialThumbnail) parsed.imageUrl = socialThumbnail;
          parsed.servingsBase = parsed.servingsBase || 6;

          log(`Succès : Recette "${parsed.title}" extraite de la vidéo avec ${parsed.ingredients?.length || 0} ingrédients.`);
          return NextResponse.json({
            recipe: parsed,
            logs: serverLogs,
            provider: isInstagram ? "Instagram Reel AI Extractor" : isTikTok ? "TikTok AI Extractor" : "YouTube Shorts AI",
          });
        }
      }

      throw new Error("Impossible d'extraire la recette depuis cette publication vidéo.");
    }

    // =========================================================================
    // 1. EXTRACTION STANDARD POUR LES SITES DE RECETTES WEB (MARMITON, 750G...)
    // =========================================================================
    log(`Téléchargement de la page web : ${url}`);

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      log(`Échec du téléchargement de la page: HTTP ${res.status}`);
      return NextResponse.json(
        {
          error: `Impossible d'accéder au site web (HTTP ${res.status}).`,
          logs: serverLogs,
        },
        { status: 502 }
      );
    }

    const html = await res.text();
    log(`Page téléchargée avec succès (${(html.length / 1024).toFixed(1)} KB).`);

    // 1. Chercher les balises JSON-LD Schema.org Recipe
    let recipeSchema: any = null;
    const jsonLdRegex = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let jsonMatch;

    while ((jsonMatch = jsonLdRegex.exec(html)) !== null) {
      try {
        const rawJson = jsonMatch[1].trim();
        const parsed = JSON.parse(rawJson);

        if (parsed["@type"] === "Recipe") {
          recipeSchema = parsed;
          break;
        } else if (Array.isArray(parsed["@graph"])) {
          const found = parsed["@graph"].find(
            (node: any) => node["@type"] === "Recipe"
          );
          if (found) {
            recipeSchema = found;
            break;
          }
        } else if (Array.isArray(parsed)) {
          const found = parsed.find((node: any) => node["@type"] === "Recipe");
          if (found) {
            recipeSchema = found;
            break;
          }
        }
      } catch {}
    }

    // 2. Extraire les métadonnées OpenGraph comme secours visuel
    const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i);
    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i);
    const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i);

    const ogTitle = ogTitleMatch ? ogTitleMatch[1] : "";
    const ogImage = ogImageMatch ? ogImageMatch[1] : "";
    const ogDesc = ogDescMatch ? ogDescMatch[1] : "";

    // Si on a un schéma Recipe bien formé
    if (recipeSchema) {
      log(`Schéma Recipe JSON-LD détecté : "${recipeSchema.name}"`);

      // Photo
      let mainImage = "";
      if (typeof recipeSchema.image === "string") {
        mainImage = recipeSchema.image;
      } else if (Array.isArray(recipeSchema.image) && recipeSchema.image.length > 0) {
        const first = recipeSchema.image[0];
        mainImage = typeof first === "string" ? first : first.url || "";
      } else if (recipeSchema.image?.url) {
        mainImage = recipeSchema.image.url;
      }
      if (!mainImage) mainImage = ogImage;

      // Durée
      const prepMin = parseIsoDuration(recipeSchema.prepTime);
      const cookMin = parseIsoDuration(recipeSchema.cookTime);
      const totalMin = parseIsoDuration(recipeSchema.totalTime) || (prepMin + cookMin) || 30;

      // Ingrédients
      const rawIngredients: string[] = Array.isArray(recipeSchema.recipeIngredient)
        ? recipeSchema.recipeIngredient
        : [];
      const ingredients = rawIngredients.map((item, idx) => parseIngredientString(item, idx));

      // Étapes
      let steps: any[] = [];
      if (Array.isArray(recipeSchema.recipeInstructions)) {
        steps = recipeSchema.recipeInstructions.map((instruction: any, idx: number) => {
          let text = "";
          let stepTitle = `Étape ${idx + 1}`;
          let stepImg = "";

          if (typeof instruction === "string") {
            text = instruction;
          } else if (typeof instruction === "object") {
            text = instruction.text || instruction.description || "";
            if (instruction.name) stepTitle = instruction.name;
            if (instruction.image) {
              if (typeof instruction.image === "string") {
                stepImg = instruction.image;
              } else if (Array.isArray(instruction.image) && instruction.image.length > 0) {
                stepImg = typeof instruction.image[0] === "string" ? instruction.image[0] : instruction.image[0].url || "";
              } else if (instruction.image.url) {
                stepImg = instruction.image.url;
              }
            }
          }

          // Nettoyer les balises HTML éventuelles
          text = text.replace(/<[^>]*>?/gm, "").trim();

          // Générer un prompt visuel pour l'étape
          const stepPrompt = `Food photography of ${recipeSchema.name || "cooking recipe"}, step ${idx + 1}: ${text.substring(0, 100)}`;

          return {
            stepNumber: idx + 1,
            title: stepTitle,
            description: text,
            imageUrl: stepImg || undefined,
            imagePrompt: stepPrompt,
            durationMinutes: Math.max(2, Math.round(totalMin / Math.max(1, recipeSchema.recipeInstructions.length))),
          };
        });
      }

      // Catégorie
      let category = "Main Dishes";
      const rawCat = recipeSchema.recipeCategory;
      if (rawCat) {
        const catStr = Array.isArray(rawCat) ? rawCat.join(" ") : String(rawCat);
        if (/dessert|gâteau|tarte sucrée|sucré/i.test(catStr)) category = "Desserts";
        else if (/soupe|potage|velouté/i.test(catStr)) category = "Soups & Stews";
        else if (/entrée|apéro|amuse/i.test(catStr)) category = "Appetizers";
        else if (/pâte|pasta|nouille/i.test(catStr)) category = "Pastas";
        else if (/salade/i.test(catStr)) category = "Salads";
      }

      const parsedRecipe = {
        title: recipeSchema.name || ogTitle || "Recette importée",
        subtitle: recipeSchema.description || ogDesc || undefined,
        category,
        imageUrl: mainImage,
        prepTimeMinutes: totalMin,
        difficulty: "Easy",
        rating: recipeSchema.aggregateRating?.ratingValue
          ? parseFloat(recipeSchema.aggregateRating.ratingValue)
          : 4.8,
        servingsBase: parseServings(recipeSchema.recipeYield),
        ingredients,
        steps,
        sourceUrl: url,
      };

      log(`Recette analysée avec succès: "${parsedRecipe.title}" (${ingredients.length} ingrédients, ${steps.length} étapes).`);

      return NextResponse.json({
        recipe: parsedRecipe,
        logs: serverLogs,
        provider: "Schema.org Recipe JSON-LD",
      });
    }

    // 3. Si aucun JSON-LD direct, analyse intelligente par Google Gemini
    log("Aucun JSON-LD Recipe complet trouvé. Analyse approfondie avec Google Gemini...");

    const geminiApiKey =
      process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!geminiApiKey) {
      throw new Error("Clé API Gemini manquante pour l'analyse de page web non structurée.");
    }

    // Nettoyer le HTML pour ne garder que le contenu textuel essentiel
    const simplifiedText = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<svg[\s\S]*?<\/svg>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .substring(0, 12000);

    const prompt = `Extrais la recette de cuisine complète depuis ce contenu de page web :
URL : ${url}
Image principale trouvée : ${ogImage}
Titre page : ${ogTitle}

Contenu :
${simplifiedText}

Réponds STRICTEMENT avec ce JSON valide :
{
  "title": "Nom de la recette",
  "subtitle": "Courte description",
  "category": "Main Dishes" | "Soups & Stews" | "Appetizers" | "Pastas" | "Desserts" | "Salads",
  "imageUrl": "${ogImage}",
  "prepTimeMinutes": 30,
  "difficulty": "Easy" | "Medium" | "Hard",
  "rating": 4.8,
  "servingsBase": 4,
  "ingredients": [
    { "id": "ing_1", "name": "Nom ingrédient", "amount": 200, "unit": "g" }
  ],
  "steps": [
    { "stepNumber": 1, "title": "Étape 1", "description": "Instructions...", "durationMinutes": 5 }
  ]
}`;

    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
    const geminiRes = await fetch(geminiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.1,
        },
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (geminiRes.ok) {
      const geminiData = await geminiRes.json();
      const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const cleanedText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanedText);
        parsed.sourceUrl = url;
        if (!parsed.imageUrl && ogImage) parsed.imageUrl = ogImage;

        log(`Succès Gemini : Recette "${parsed.title}" extraite avec succès.`);
        return NextResponse.json({
          recipe: parsed,
          logs: serverLogs,
          provider: "Google Gemini Web AI",
        });
      }
    }

    throw new Error("Impossible d'extraire une recette valide depuis cette page web.");
  } catch (err: any) {
    log(`Erreur lors de l'import URL: ${err?.message || err}`);
    return NextResponse.json(
      {
        error: err?.message || "Erreur lors de l'analyse du lien de recette.",
        logs: serverLogs,
      },
      { status: 500 }
    );
  }
}
