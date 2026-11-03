-- Mutualisation du catalogue d'ingrédients : 276 lignes → 228 ingrédients (48 doublons fusionnés)
-- Généré le 2026-11-03 depuis la table actuelle, avec les règles de l'appli
-- (src/features/ingredients/canonical.ts) : les prochains ajouts suivront ces regroupements.
-- Ne supprime QUE les anciennes entrées listées ; un ingrédient ajouté depuis n'est pas touché.
BEGIN;

-- 1. Retirer les anciennes entrées (doublons, noms contenant une quantité ou une mesure)
DELETE FROM public.ingredients WHERE id IN (
  'ing_abaisses_de_p_tes_feuillet_e',
  'ing_ail_hach_',
  'ing_gousse_d_ail',
  'ing_gousses_d_ail',
  'ing_a_oli',
  'ing_amandes_effil_es',
  'ing_amandes_grill_es_non_sal_es',
  'ing_amandes_ou_de_noix_concass_es',
  'ing_aneth_cisel_s__frais_ou_surgel_s_',
  'ing_arachides__non_sal_es_',
  'ing_beurre_de_cacahu_te',
  'ing_blanc_de_poulet',
  'ing_blancs_de_poulet',
  'ing_bocal_de_champignons_mix_sp_cial_volaille__poids_net__goutt__',
  'ing_b_uf__macreuse__paleron_ou_autre_morceau_tendre_',
  'ing_boeuf_hach_',
  'ing__minc_s_de_b_uf',
  'ing_bouillon_de_boeuf',
  'ing_bouillon_de_b_uf',
  'ing_cube_de_bouillon_de_b_uf',
  'ing_bouillon_cube_l_gumes',
  'ing_bouillon_de_l_gumes',
  'ing_bouillon_de_l_gumes__ou_eau_',
  'ing_cube_de_bouillon_de_l_gumes',
  'ing_bouillon_de_poulet',
  'ing_bouillon_cube_volaille',
  'ing_bouillon_de_volaille',
  'ing_cube_de_bouillon',
  'ing_cubes_de_bouillon__b_uf_ou_crevettes_',
  'ing_cacahu_tes_non_sal_es',
  'ing_caf__de_paprika',
  'ing_caf__de_poivre_blanc',
  'ing_caf__de_poivre_noir',
  'ing_c_leri_branche',
  'ing_branches_de_c_leri',
  'ing_chair___saucisse',
  'ing_chair_de_tomates',
  'ing_champignons_de_paris_coup_s_en_lamelles',
  'ing_champignons_tranch_s',
  'ing_bo_tes_de_champignons_entiers',
  'ing_champignons_de_paris',
  'ing_d_s_de_chorizo',
  'ing_choux_de_bruxelles',
  'ing___soupe_de_ciboulette_hach_e',
  'ing_citronnelle_moulue',
  'ing_cive__ou_oignon_nouveau_',
  'ing_compote_sans_sucre_ajout__ou_de_yaourt_grec',
  'ing___caf__de_concentr__de_tomates',
  'ing_concentr__de_tomates',
  'ing_confit_de_canard',
  'ing___caf__de_coriandre',
  'ing_coriandre_fra_che__facultatif_',
  'ing_coriandre_moulue',
  'ing_couscous_perl_',
  'ing_cr_me__paisse',
  'ing_cr_me_fra_che_fluide',
  'ing_cr_me_liquide',
  'ing_cr_me',
  'ing_cr_me_enti_re__heavy_cream_',
  'ing_crevettes_d_cortiqu_es__facultatif_mais_traditionnel_',
  'ing_crevettes',
  'ing_crevettes_fraiches',
  'ing_cuisse_de_poulet',
  'ing_cumin_en_poudre',
  'ing_curcuma_en_poudre',
  'ing_curry_en_poudre',
  'ing_dip_d_avocat',
  'ing_bo_tes_de_double_concentr__de_tomates__environ_70_g_',
  'ing__chalote',
  'ing___soupe_d__pices___colombo',
  'ing__pices___l_italienne_buon_appetito',
  'ing__pices_italiennes',
  'ing__pices_mexicaines',
  'ing__pices_du_moyen_orient',
  'ing__pinards',
  'ing__pinards_frais',
  'ing__pinards_hach_s_surgel_s',
  'ing_extrait_de_vanille',
  'ing_filet_de_poulet',
  'ing_filet_de_saumon_avec_peau',
  'ing_flocons_d_avoine__dont_80_g_mix_s_en_farine_',
  'ing_fromage_de_ch_vre_frais',
  'ing_fromage_r_p____l_italienne',
  'ing_fruit_de_la_passion',
  'ing_garlic__minced',
  'ing_gingembre_frais',
  'ing_morceau_de_gingembre',
  'ing_pur_e_de_gingembre',
  'ing_gnocchis_de_pommes_de_terre',
  'ing_gouda_r_p_',
  'ing_graines_de_njansang__facultatif_',
  'ing_graines_de_s_same',
  'ing_gros_capitaine_entier',
  'ing_gros_oignon',
  'ing_gruy_re__facultatif_',
  'ing_haricots_rouges_secs',
  'ing_herbes_de_provence',
  'ing_houmous',
  'ing_huile_d_olive_saveur_truffe',
  'ing_huile_d_olive',
  'ing_huile_de_palme__ou_huile_neutre_',
  'ing_huile_de_s_same',
  'ing___soupe_d_huile_de_tournesol',
  'ing_huile_de_tournesol',
  'ing_huile_v_g_tale',
  'ing_huile_v_g_tale__rouge_de_palme_ou_neutre_',
  'ing_jaune_d__uf',
  'ing___2_jaunes',
  'ing_jus_de_citron_vert',
  'ing_jus_de_citron',
  'ing_lait_1_2__cr_m_',
  'ing_lait_d_avoine',
  'ing_lait_de_coco',
  'ing_lardons_fum_s_sans_nitrite',
  'ing_lentilles_corail',
  'ing_lentilles_vertes',
  'ing_marrons',
  'ing_m_lange_de_carotte__chou_rouge_et_blanc',
  'ing_m_lange_d__pices_du_moyen_orient',
  'ing_merguez_de_b_uf',
  'ing_moutarde_forte_de_dijon',
  'ing_mozzarella_cheese__grated',
  'ing_mozzarella_r_p_e',
  'ing_mushrooms__sliced',
  'ing_et_1_navet',
  'ing_feuilles_de_ndol___fra_ches_ou_surgel_es_',
  'ing_noix_de_cajou_concass_es',
  'ing_noix_de_muscade',
  'ing_nouilles_de_bl_',
  'ing_nouilles_udon_fra_ches',
  'ing__uf',
  'ing_oignons_frits',
  'ing_oignons_verts',
  'ing_oignons',
  'ing_origan_s_ch_',
  'ing_pak_cho_',
  'ing_paprika_fum_',
  'ing_paprika_fum__en_poudre',
  'ing_parmesan_r_p_',
  'ing_p_te__pic_e_javanaise',
  'ing_p_te_feuillet_e',
  'ing_p_te___tarte',
  'ing_pav__de_b_uf_marin_',
  'ing_pinc_e_de_p_b__moulu',
  'ing_pecorino_aop_r_p_',
  'ing___soupe_de_persil',
  'ing_branches_de_persil',
  'ing_persil_frais',
  'ing_pesto_de_champignons',
  'ing_petits_pois_en_conserve',
  'ing_piment_antillais',
  'ing___soupe_de_piments_de_cayenne_ou_1_piment_vert',
  'ing_piments',
  'ing_piments__selon_go_t_',
  'ing_piments_s_ch_',
  'ing_poivre_de_penja_ou_poivre_noir',
  'ing_poivre_et_sel',
  'ing_poivre_noir',
  'ing_pommes_de_terre',
  'ing_potato_gnocchi__refrigerated_or_shelf_stable_',
  'ing_poudre_de_colombo',
  'ing_morceaux_de_poulet',
  'ing_raisins_secs_sultanines',
  'ing_riz_pour_risotto',
  'ing_sauce_asiatique_sucr_e',
  'ing_sauce_soja_r_duite_en_sel',
  'ing_saumon_frais_ou_surgel_',
  'ing_s_ch_',
  'ing_sel_et_poivre',
  'ing_sel__poivre',
  'ing_sirop_d_agave',
  'ing_sucre_en_poudre',
  'ing___soupe_de_thym',
  'ing_thym_s_ch_',
  'ing_tomates_pel_es__environ_720_g__avec_son_jus',
  'ing_bo_tes_de_tomates_pel_es',
  'ing_tomates',
  'ing_eminc_s_vegan_fa_on_poulet',
  'ing__minc_s_vegan_fa_on_poulet',
  'ing_vegetable_broth__or_water_',
  'ing_viande_hach_e_au_b_uf',
  'ing_vinaigre_balsamique_blanc_ou_de_riz',
  'ing_vinaigre_de_vin_rouge_ou_de_cidre',
  'ing___soupe_de_vinaigre',
  'ing_yaourt___la_grecque'
);

-- 2. Créer ou renommer l'entrée canonique de chaque ingrédient concerné
INSERT INTO public.ingredients (id, name, category, image_url, updated_at) VALUES
  ('ing_abaisse_pate_feuilletee', 'Abaisses de pâtes feuilletée', 'Épicerie & Condiments', NULL, now()), -- ⟵ abaisses de pâtes feuilletée
  ('ing_ail', 'Ail', 'Fruits & Légumes', NULL, now()), -- ⟵ Ail | Ail haché | Gousse d'ail | Gousses d'ail
  ('ing_aioli', 'Aïoli', 'Articles divers', NULL, now()), -- ⟵ Aïoli
  ('ing_amande_effilee', 'Amandes effilées', 'Articles divers', NULL, now()), -- ⟵ Amandes effilées
  ('ing_amande_grillee_non_salee', 'Amandes grillées non salées', 'Articles divers', NULL, now()), -- ⟵ Amandes grillées non salées
  ('ing_amande_ou_noix_concassee', 'Amandes ou de noix concassées', 'Articles divers', NULL, now()), -- ⟵ amandes ou de noix concassées
  ('ing_aneth', 'Aneth', 'Fruits & Légumes', NULL, now()), -- ⟵ Aneth ciselés (frais ou surgelés)
  ('ing_arachide', 'Arachides', 'Articles divers', NULL, now()), -- ⟵ Arachides (non salées)
  ('ing_beurre_cacahuete', 'Beurre de cacahuète', 'Produits Frais & Crèmerie', NULL, now()), -- ⟵ beurre de cacahuète
  ('ing_blanc_poulet', 'Blanc de poulet', 'Viandes & Poissons', NULL, now()), -- ⟵ Blanc de poulet | blancs de poulet
  ('ing_bocal_champignon_mix_special_volaille', 'Bocal de champignons mix spécial volaille', 'Fruits & Légumes', NULL, now()), -- ⟵ bocal de champignons mix spécial volaille (poids net égoutté)
  ('ing_boeuf', 'Bœuf', 'Boissons', NULL, now()), -- ⟵ Bœuf (macreuse, paleron ou autre morceau tendre) | Boeuf haché | Émincés de bœuf
  ('ing_bouillon_boeuf', 'Bouillon de bœuf', 'Viandes & Poissons', NULL, now()), -- ⟵ Bouillon de boeuf | Bouillon de bœuf | Cube de bouillon de bœuf
  ('ing_bouillon_legume', 'Bouillon de légumes', 'Fruits & Légumes', NULL, now()), -- ⟵ Bouillon cube légumes | Bouillon de légumes | Bouillon de légumes (ou eau) | Cube de bouillon de légumes
  ('ing_bouillon_poulet', 'Bouillon de poulet', 'Viandes & Poissons', NULL, now()), -- ⟵ Bouillon de poulet
  ('ing_bouillon_volaille', 'Bouillon de volaille', 'Fruits & Légumes', NULL, now()), -- ⟵ Bouillon cube volaille | Bouillon de volaille
  ('ing_bouillon', 'Bouillon', 'Épicerie & Condiments', NULL, now()), -- ⟵ cube de bouillon | Cubes de bouillon (bœuf ou crevettes)
  ('ing_cacahuete_non_salee', 'Cacahuètes non salées', 'Articles divers', NULL, now()), -- ⟵ Cacahuètes non salées
  ('ing_cafe_paprika', 'Café de paprika', 'Épicerie & Condiments', NULL, now()), -- ⟵ café de paprika
  ('ing_cafe_poivre_blanc', 'Café de poivre blanc', 'Épicerie & Condiments', NULL, now()), -- ⟵ café de poivre blanc
  ('ing_cafe_poivre_noir', 'Café de poivre noir', 'Épicerie & Condiments', NULL, now()), -- ⟵ café de poivre noir
  ('ing_celeri_branche', 'Céleri-branche', 'Articles divers', NULL, now()), -- ⟵ Céleri-branche
  ('ing_celeri', 'Céleri', 'Articles divers', NULL, now()), -- ⟵ branches de céleri
  ('ing_chair_saucisse', 'Chair à saucisse', 'Viandes & Poissons', NULL, now()), -- ⟵ Chair à saucisse
  ('ing_chair_tomate', 'Chair de tomates', 'Fruits & Légumes', NULL, now()), -- ⟵ Chair de tomates
  ('ing_champignon_paris_coupe_lamelle', 'Champignons de paris coupés en lamelles', 'Fruits & Légumes', NULL, now()), -- ⟵ champignons de Paris coupés en lamelles
  ('ing_champignon_tranche', 'Champignons tranchés', 'Fruits & Légumes', NULL, now()), -- ⟵ Champignons tranchés
  ('ing_champignon', 'Champignons de paris', 'Fruits & Légumes', NULL, now()), -- ⟵ Boîtes de champignons entiers | Champignons de Paris
  ('ing_chocolat_noir', 'Chocolat noir', 'Épicerie & Condiments', NULL, now()), -- ⟵ chocolat noir
  ('ing_chorizo', 'Chorizo', 'Épicerie & Condiments', NULL, now()), -- ⟵ Dés de chorizo
  ('ing_chou_bruxelle', 'Choux de bruxelles', 'Fruits & Légumes', NULL, now()), -- ⟵ Choux de Bruxelles
  ('ing_ciboulette', 'Ciboulette', 'Fruits & Légumes', NULL, now()), -- ⟵ À soupe de ciboulette hachée | Ciboulette
  ('ing_citronnelle', 'Citronnelle', 'Fruits & Légumes', NULL, now()), -- ⟵ Citronnelle moulue
  ('ing_cive', 'Cive', 'Fruits & Légumes', NULL, now()), -- ⟵ Cive (ou oignon nouveau)
  ('ing_compote_san_sucre_ajoute_ou_yaourt_grec', 'Compote sans sucre ajouté ou de yaourt grec', 'Produits Frais & Crèmerie', NULL, now()), -- ⟵ compote sans sucre ajouté ou de yaourt grec
  ('ing_concentre_tomate', 'Concentré de tomates', 'Fruits & Légumes', NULL, now()), -- ⟵ À café de concentré de tomates | Concentré de tomates
  ('ing_confit_canard', 'Confit de canard', 'Viandes & Poissons', NULL, now()), -- ⟵ Confit de canard
  ('ing_coriandre', 'Coriandre', 'Fruits & Légumes', NULL, now()), -- ⟵ À café de coriandre | Coriandre | Coriandre fraîche (facultatif) | Coriandre moulue
  ('ing_couscous_perle', 'Couscous perlé', 'Épicerie & Condiments', NULL, now()), -- ⟵ Couscous perlé
  ('ing_creme_epaisse', 'Crème épaisse', 'Produits Frais & Crèmerie', NULL, now()), -- ⟵ Crème épaisse
  ('ing_creme_fraiche_fluide', 'Crème fraîche fluide', 'Produits Frais & Crèmerie', NULL, now()), -- ⟵ Crème fraîche fluide
  ('ing_creme_liquide', 'Crème liquide', 'Produits Frais & Crèmerie', NULL, now()), -- ⟵ Crème liquide
  ('ing_creme', 'Crème', 'Produits Frais & Crèmerie', NULL, now()), -- ⟵ Crème | Crème entière (heavy cream)
  ('ing_crevette_decortiquee', 'Crevettes décortiquées', 'Viandes & Poissons', NULL, now()), -- ⟵ Crevettes décortiquées (facultatif mais traditionnel)
  ('ing_crevette', 'Crevettes', 'Viandes & Poissons', NULL, now()), -- ⟵ Crevettes | Crevettes fraiches
  ('ing_cuisse_poulet', 'Cuisse de poulet', 'Viandes & Poissons', NULL, now()), -- ⟵ Cuisse de poulet
  ('ing_cumin', 'Cumin', 'Articles divers', NULL, now()), -- ⟵ Cumin en poudre
  ('ing_curcuma', 'Curcuma', 'Articles divers', NULL, now()), -- ⟵ Curcuma en poudre
  ('ing_curry', 'Curry', 'Épicerie & Condiments', NULL, now()), -- ⟵ Curry en poudre
  ('ing_dip_avocat', 'Dip d''avocat', 'Fruits & Légumes', NULL, now()), -- ⟵ Dip d'avocat
  ('ing_double_concentre_tomate', 'Double concentré de tomates', 'Fruits & Légumes', NULL, now()), -- ⟵ Boîtes de double concentré de tomates (environ 70 g)
  ('ing_echalote', 'Échalote', 'Fruits & Légumes', NULL, now()), -- ⟵ Échalote
  ('ing_epice_colombo', 'Épices à colombo', 'Épicerie & Condiments', NULL, now()), -- ⟵ À soupe d'épices à colombo
  ('ing_epice_italienne_buon_appetito', 'Épices à l''italienne buon appetito', 'Épicerie & Condiments', NULL, now()), -- ⟵ Épices à l'italienne Buon Appetito
  ('ing_epice_italienne', 'Épices italiennes', 'Épicerie & Condiments', NULL, now()), -- ⟵ Épices italiennes
  ('ing_epice_mexicaine', 'Épices mexicaines', 'Épicerie & Condiments', NULL, now()), -- ⟵ Épices mexicaines
  ('ing_epice_moyen_orient', 'Épices du moyen-orient', 'Épicerie & Condiments', NULL, now()), -- ⟵ Épices du Moyen-Orient
  ('ing_epinard', 'Épinards', 'Fruits & Légumes', NULL, now()), -- ⟵ Épinards | Épinards frais | Épinards hachés surgelés
  ('ing_extrait_vanille', 'Extrait de vanille', 'Articles divers', NULL, now()), -- ⟵ extrait de vanille
  ('ing_filet_poulet', 'Filet de poulet', 'Viandes & Poissons', NULL, now()), -- ⟵ Filet de poulet
  ('ing_filet_saumon_peau', 'Filet de saumon avec peau', 'Viandes & Poissons', NULL, now()), -- ⟵ Filet de saumon avec peau
  ('ing_flocon_avoine', 'Flocons d''avoine', 'Épicerie & Condiments', NULL, now()), -- ⟵ flocons d'avoine (dont 80 g mixés en farine)
  ('ing_fromage_chevre', 'Fromage de chèvre', 'Produits Frais & Crèmerie', NULL, now()), -- ⟵ Fromage de chèvre frais
  ('ing_fromage_gorgonzola', 'Fromage gorgonzola', 'Produits Frais & Crèmerie', NULL, now()), -- ⟵ Fromage Gorgonzola
  ('ing_fromage_italienne', 'Fromage à l''italienne', 'Produits Frais & Crèmerie', NULL, now()), -- ⟵ Fromage râpé à l'italienne
  ('ing_fruit_passion', 'Fruit de la passion', 'Fruits & Légumes', NULL, now()), -- ⟵ Fruit de la passion
  ('ing_garlic_minced', 'Garlic, minced', 'Articles divers', NULL, now()), -- ⟵ Garlic, minced
  ('ing_gingembre', 'Gingembre', 'Fruits & Légumes', NULL, now()), -- ⟵ gingembre | Gingembre frais | Morceau de gingembre | Purée de gingembre
  ('ing_gnocchi_pomme_terre', 'Gnocchis de pommes de terre', 'Fruits & Légumes', NULL, now()), -- ⟵ Gnocchis de pommes de terre
  ('ing_gouda', 'Gouda', 'Articles divers', NULL, now()), -- ⟵ Gouda | Gouda râpé
  ('ing_graine_njansang', 'Graines de njansang', 'Articles divers', NULL, now()), -- ⟵ Graines de njansang (facultatif)
  ('ing_graine_sesame', 'Graines de sésame', 'Épicerie & Condiments', NULL, now()), -- ⟵ Graines de sésame
  ('ing_gro_capitaine', 'Gros capitaine', 'Boulangerie', NULL, now()), -- ⟵ gros capitaine entier
  ('ing_gro_oignon', 'Gros oignon', 'Fruits & Légumes', NULL, now()), -- ⟵ gros oignon
  ('ing_gruyere', 'Gruyère', 'Produits Frais & Crèmerie', NULL, now()), -- ⟵ Gruyère (facultatif)
  ('ing_haricot_rouge_sec', 'Haricots rouges secs', 'Articles divers', NULL, now()), -- ⟵ Haricots rouges secs
  ('ing_herbe_provence', 'Herbes de provence', 'Fruits & Légumes', NULL, now()), -- ⟵ Herbes de Provence
  ('ing_houmou', 'Houmous', 'Articles divers', NULL, now()), -- ⟵ Houmous
  ('ing_huile_olive_saveur_truffe', 'Huile d''olive saveur truffe', 'Épicerie & Condiments', NULL, now()), -- ⟵ Huile d'olive saveur truffe
  ('ing_huile_olive', 'Huile d''olive', 'Épicerie & Condiments', NULL, now()), -- ⟵ Huile d'olive
  ('ing_huile_palme', 'Huile de palme', 'Épicerie & Condiments', NULL, now()), -- ⟵ Huile de palme (ou huile neutre)
  ('ing_huile_sesame', 'Huile de sésame', 'Épicerie & Condiments', NULL, now()), -- ⟵ Huile de sésame
  ('ing_huile_tournesol', 'Huile de tournesol', 'Épicerie & Condiments', NULL, now()), -- ⟵ À soupe d'huile de tournesol | Huile de tournesol
  ('ing_huile_vegetale', 'Huile végétale', 'Épicerie & Condiments', NULL, now()), -- ⟵ huile végétale | Huile végétale (rouge de palme ou neutre)
  ('ing_jaune_oeuf', 'Jaune d''œuf', 'Articles divers', NULL, now()), -- ⟵ jaune d'œuf
  ('ing_jaune', 'Jaunes', 'Articles divers', NULL, now()), -- ⟵ + 2 jaunes
  ('ing_jus_citron_vert', 'Jus de citron vert', 'Fruits & Légumes', NULL, now()), -- ⟵ Jus de citron vert
  ('ing_jus_citron', 'Jus de citron', 'Fruits & Légumes', NULL, now()), -- ⟵ Jus de citron
  ('ing_lait_1_2_ecreme', 'Lait 1/2 écrémé', 'Produits Frais & Crèmerie', NULL, now()), -- ⟵ lait 1/2 écrémé
  ('ing_lait_avoine', 'Lait d''avoine', 'Produits Frais & Crèmerie', NULL, now()), -- ⟵ lait d'avoine
  ('ing_lait_coco', 'Lait de coco', 'Produits Frais & Crèmerie', NULL, now()), -- ⟵ Lait de coco
  ('ing_lait', 'Lait', 'Produits Frais & Crèmerie', NULL, now()), -- ⟵ lait
  ('ing_lardon_fume_san_nitrite', 'Lardons fumés sans nitrite', 'Viandes & Poissons', NULL, now()), -- ⟵ Lardons fumés sans nitrite
  ('ing_lentille_corail', 'Lentilles corail', 'Fruits & Légumes', NULL, now()), -- ⟵ Lentilles corail
  ('ing_lentille_verte', 'Lentilles vertes', 'Épicerie & Condiments', NULL, now()), -- ⟵ Lentilles vertes
  ('ing_marron', 'Marrons', 'Articles divers', NULL, now()), -- ⟵ Marrons
  ('ing_melange_carotte_chou_rouge_blanc', 'Mélange de carotte, chou rouge et blanc', 'Fruits & Légumes', NULL, now()), -- ⟵ Mélange de carotte, chou rouge et blanc
  ('ing_melange_epice_moyen_orient', 'Mélange d''épices du moyen-orient', 'Épicerie & Condiments', NULL, now()), -- ⟵ Mélange d'épices du Moyen-Orient
  ('ing_merguez_boeuf', 'Merguez de bœuf', 'Viandes & Poissons', NULL, now()), -- ⟵ Merguez de bœuf
  ('ing_moutarde_forte_dijon', 'Moutarde forte de dijon', 'Épicerie & Condiments', NULL, now()), -- ⟵ moutarde forte de Dijon
  ('ing_mozzarella_cheese_grated', 'Mozzarella cheese, grated', 'Produits Frais & Crèmerie', NULL, now()), -- ⟵ Mozzarella cheese, grated
  ('ing_mozzarella', 'Mozzarella', 'Produits Frais & Crèmerie', NULL, now()), -- ⟵ Mozzarella | Mozzarella râpée
  ('ing_mushroom_sliced', 'Mushrooms, sliced', 'Articles divers', NULL, now()), -- ⟵ Mushrooms, sliced
  ('ing_navet', 'Navet', 'Articles divers', NULL, now()), -- ⟵ Et 1 navet | Navet
  ('ing_ndole', 'Ndolé', 'Articles divers', NULL, now()), -- ⟵ Feuilles de ndolé (fraîches ou surgelées)
  ('ing_noix_cajou_concassee', 'Noix de cajou concassées', 'Articles divers', NULL, now()), -- ⟵ Noix de cajou concassées
  ('ing_noix_muscade', 'Noix de muscade', 'Articles divers', NULL, now()), -- ⟵ Noix de muscade
  ('ing_nouille_ble', 'Nouilles de blé', 'Épicerie & Condiments', NULL, now()), -- ⟵ Nouilles de blé
  ('ing_nouille_udon', 'Nouilles udon', 'Épicerie & Condiments', NULL, now()), -- ⟵ Nouilles udon fraîches
  ('ing_oeuf', 'Œuf', 'Produits Frais & Crèmerie', NULL, now()), -- ⟵ Oeuf | Œuf
  ('ing_oignon_frit', 'Oignons frits', 'Fruits & Légumes', NULL, now()), -- ⟵ Oignons frits
  ('ing_oignon_vert', 'Oignons verts', 'Fruits & Légumes', NULL, now()), -- ⟵ oignons verts
  ('ing_oignon', 'Oignon', 'Fruits & Légumes', NULL, now()), -- ⟵ Oignon | Oignons
  ('ing_origan', 'Origan', 'Articles divers', NULL, now()), -- ⟵ Origan séché
  ('ing_pak_choi', 'Pak choi', 'Articles divers', NULL, now()), -- ⟵ Pak choi | Pak choï
  ('ing_paprika_fume', 'Paprika fumé', 'Épicerie & Condiments', NULL, now()), -- ⟵ Paprika fumé | Paprika fumé en poudre
  ('ing_paprika', 'Paprika', 'Épicerie & Condiments', NULL, now()), -- ⟵ paprika
  ('ing_parmesan', 'Parmesan', 'Produits Frais & Crèmerie', NULL, now()), -- ⟵ Parmesan râpé
  ('ing_parmigiano_reggiano_aop', 'Parmigiano reggiano aop', 'Articles divers', NULL, now()), -- ⟵ Parmigiano Reggiano AOP
  ('ing_pate_epicee_javanaise', 'Pâte épicée javanaise', 'Épicerie & Condiments', NULL, now()), -- ⟵ Pâte épicée javanaise
  ('ing_pate_feuilletee', 'Pâte feuilletée', 'Épicerie & Condiments', NULL, now()), -- ⟵ Pâte feuilletée
  ('ing_pate_tarte', 'Pâte à tarte', 'Épicerie & Condiments', NULL, now()), -- ⟵ Pâte à tarte
  ('ing_pave_boeuf_marine', 'Pavé de bœuf mariné', 'Articles divers', NULL, now()), -- ⟵ Pavé de bœuf mariné
  ('ing_pebe', 'Pèbè', 'Articles divers', NULL, now()), -- ⟵ pincée de pèbè moulu
  ('ing_pecorino_aop', 'Pecorino aop', 'Articles divers', NULL, now()), -- ⟵ Pecorino AOP râpé
  ('ing_persil', 'Persil', 'Fruits & Légumes', NULL, now()), -- ⟵ À soupe de persil | branches de persil | Persil | Persil frais
  ('ing_pesto_champignon', 'Pesto de champignons', 'Fruits & Légumes', NULL, now()), -- ⟵ Pesto de champignons
  ('ing_petit_piment_fort', 'Petit piment fort', 'Articles divers', NULL, now()), -- ⟵ petit piment fort
  ('ing_petit_pois_conserve', 'Petits pois en conserve', 'Épicerie & Condiments', NULL, now()), -- ⟵ Petits pois en conserve
  ('ing_piment_antillai', 'Piment antillais', 'Articles divers', NULL, now()), -- ⟵ Piment antillais
  ('ing_piment_cayenne_ou_1_piment_vert', 'Piments de cayenne ou 1 piment vert', 'Articles divers', NULL, now()), -- ⟵ À soupe de piments de Cayenne ou 1 piment vert
  ('ing_piment', 'Piment', 'Épicerie & Condiments', NULL, now()), -- ⟵ Piment | Piments | Piments (selon goût) | Piments séché
  ('ing_poivre_blanc', 'Poivre blanc', 'Épicerie & Condiments', NULL, now()), -- ⟵ poivre blanc
  ('ing_poivre_penja_ou_poivre_noir', 'Poivre de penja ou poivre noir', 'Épicerie & Condiments', NULL, now()), -- ⟵ Poivre de Penja ou poivre noir
  ('ing_poivre_sel', 'Poivre et sel', 'Épicerie & Condiments', NULL, now()), -- ⟵ Poivre et sel
  ('ing_poivre', 'Poivre', 'Épicerie & Condiments', NULL, now()), -- ⟵ Poivre | poivre noir
  ('ing_pomme_terre', 'Pommes de terre', 'Fruits & Légumes', NULL, now()), -- ⟵ Pommes de terre
  ('ing_potato_gnocchi', 'Potato gnocchi', 'Articles divers', NULL, now()), -- ⟵ Potato Gnocchi (refrigerated or shelf-stable)
  ('ing_poudre_colombo', 'Poudre de colombo', 'Articles divers', NULL, now()), -- ⟵ Poudre de colombo
  ('ing_poulet', 'Poulet', 'Viandes & Poissons', NULL, now()), -- ⟵ Morceaux de poulet | Poulet
  ('ing_raisin_sec_sultanine', 'Raisins secs sultanines', 'Articles divers', NULL, now()), -- ⟵ Raisins secs Sultanines
  ('ing_riz_risotto', 'Riz pour risotto', 'Épicerie & Condiments', NULL, now()), -- ⟵ Riz pour risotto
  ('ing_sauce_asiatique_sucree', 'Sauce asiatique sucrée', 'Épicerie & Condiments', NULL, now()), -- ⟵ Sauce asiatique sucrée
  ('ing_sauce_soja_reduite_sel', 'Sauce soja réduite en sel', 'Épicerie & Condiments', NULL, now()), -- ⟵ Sauce soja réduite en sel
  ('ing_sauce_worcestershire', 'Sauce worcestershire', 'Épicerie & Condiments', NULL, now()), -- ⟵ Sauce Worcestershire
  ('ing_saumon_ou', 'Saumon ou', 'Viandes & Poissons', NULL, now()), -- ⟵ Saumon frais ou surgelé
  ('ing_seche', 'Séché', 'Articles divers', NULL, now()), -- ⟵ Séché
  ('ing_sel_poivre', 'Sel, poivre', 'Épicerie & Condiments', NULL, now()), -- ⟵ Sel et poivre | Sel, poivre
  ('ing_sirop_agave', 'Sirop d''agave', 'Articles divers', NULL, now()), -- ⟵ sirop d'agave
  ('ing_sucre', 'Sucre', 'Épicerie & Condiments', NULL, now()), -- ⟵ Sucre | Sucre en poudre
  ('ing_thym', 'Thym', 'Fruits & Légumes', NULL, now()), -- ⟵ À soupe de thym | Thym séché
  ('ing_tomate_pelee_son_jus', 'Tomates pelées avec son jus', 'Fruits & Légumes', NULL, now()), -- ⟵ Tomates pelées (environ 720 g) avec son jus
  ('ing_tomate_pelee', 'Tomates pelées', 'Fruits & Légumes', NULL, now()), -- ⟵ Boîtes de tomates pelées
  ('ing_tomate', 'Tomate', 'Fruits & Légumes', NULL, now()), -- ⟵ Tomate | Tomates
  ('ing_vegan_facon_poulet', 'Vegan façon poulet', 'Viandes & Poissons', NULL, now()), -- ⟵ Emincés vegan façon poulet | Émincés vegan façon poulet
  ('ing_vegetable_broth', 'Vegetable broth', 'Articles divers', NULL, now()), -- ⟵ Vegetable broth (or water)
  ('ing_viande_boeuf', 'Viande au bœuf', 'Viandes & Poissons', NULL, now()), -- ⟵ Viande hachée au bœuf
  ('ing_vinaigre_balsamique_blanc_ou_riz', 'Vinaigre balsamique blanc ou de riz', 'Épicerie & Condiments', NULL, now()), -- ⟵ Vinaigre balsamique blanc ou de riz
  ('ing_vinaigre_vin_rouge_ou_cidre', 'Vinaigre de vin rouge ou de cidre', 'Épicerie & Condiments', NULL, now()), -- ⟵ Vinaigre de vin rouge ou de cidre
  ('ing_vinaigre', 'Vinaigre', 'Épicerie & Condiments', NULL, now()), -- ⟵ À soupe de vinaigre
  ('ing_whey', 'Whey', 'Articles divers', NULL, now()), -- ⟵ whey
  ('ing_yaourt_grecque', 'Yaourt à la grecque', 'Produits Frais & Crèmerie', NULL, now())  -- ⟵ Yaourt à la grecque
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = COALESCE(EXCLUDED.category, public.ingredients.category),
  image_url = COALESCE(public.ingredients.image_url, EXCLUDED.image_url),
  updated_at = EXCLUDED.updated_at;

COMMIT;
