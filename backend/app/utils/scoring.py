"""
Module de calcul de vulnérabilité selon le nouveau Référentiel CNIVE (FEV)
6 dimensions avec échelle de notation complète (1 à 20)
"""

# Échelle de notation CNIVE
VULNERABILITY_SCALE = {
    1: {"label": "Très faible / nulle", "color": "blue"},
    2: {"label": "Très faible / nulle", "color": "blue"},
    3: {"label": "Très faible / nulle", "color": "blue"},
    4: {"label": "Très faible / nulle", "color": "blue"},
    5: {"label": "Faible", "color": "blue"},
    6: {"label": "Faible", "color": "green"},
    7: {"label": "Faible", "color": "green"},
    8: {"label": "Faible", "color": "green"},
    9: {"label": "Faible", "color": "green"},
    10: {"label": "Modérée", "color": "green"},
    11: {"label": "Modérée", "color": "orange"},
    12: {"label": "Modérée", "color": "orange"},
    13: {"label": "Modérée", "color": "orange"},
    14: {"label": "Modérée", "color": "orange"},
    15: {"label": "Élevée", "color": "orange"},
    16: {"label": "Élevée", "color": "red"},
    17: {"label": "Élevée", "color": "red"},
    18: {"label": "Élevée", "color": "red"},
    19: {"label": "Élevée", "color": "red"},
    20: {"label": "Critique", "color": "red"}
}

# Définition complète du référentiel FEV avec 20 options par dimension
VULNERABILITY_REFERENCE = {
    "economic": {
        "title": "Vulnérabilité économique",
        "description": "Capacité du ménage à assurer les besoins scolaires et alimentaires de l’élève",
        "options": {
            1: "Richesse ou aisance financière. Besoins scolaires et alimentaires couverts avec anticipation.",
            2: "Foyer très stable financièrement. Fournitures complètes et de haute qualité achetées en avance.",
            3: "Foyer stable. Aucun manque matériel, légers arbitrages budgétaires sans impact sur l'élève.",
            4: "Revenus réguliers. L'élève possède l'essentiel mais l'achat de certains extras est différé.",
            5: "Les parents disposent d’une activité régulière et l’élève possède les fournitures nécessaires ;",
            6: "Activité régulière mais revenus justes. Retard mineur sur l'achat d'un ou deux manuels non essentiels.",
            7: "Revenus instables. L'élève réutilise d'anciennes fournitures, légers retards de fournitures.",
            8: "Difficultés financières occasionnelles. Un repas sauté par mois dans le ménage, transport parfois difficile.",
            9: "Retards notables sur les fournitures de base. Difficultés récurrentes pour la cantine.",
            10: "Retards dans l’achat des fournitures, difficultés occasionnelles pour le transport ou la cantine ;",
            11: "Retards importants et prolongés dans l'achat des fournitures. L'élève doit partager ses cahiers.",
            12: "Manque chronique de fournitures essentielles. Difficultés fréquentes de transport entraînant des retards scolaires.",
            13: "L'élève manque de vêtements ou fournitures de base. Cantine scolaire impayée de manière prolongée.",
            14: "Absences scolaires ponctuelles (1-2 jours/mois) dues à l'impossibilité de payer le transport ou d'acheter des serviettes hygiéniques.",
            15: "L’élève manque régulièrement de fournitures, s’absente faute de moyens économiques (achat de serviettes hygiéniques par exp ) ou exerce une activité génératrice de revenus ;",
            16: "L'élève passe plusieurs heures par semaine à travailler (vente à la sauvette, etc.) pour aider le foyer.",
            17: "Insécurité alimentaire modérée dans le ménage. L'élève s'absente fréquemment pour travailler ou par faim.",
            18: "L'élève est contraint à des travaux pénibles ou de longue durée, compromettant gravement sa scolarité.",
            19: "Situation de faim régulière. L'élève ne possède plus aucune fourniture et le risque d'abandon est immédiat.",
            20: "Mendicité, faim fréquente, (abandon scolaire imminent) ou absence totale de prise en charge."
        }
    },
    "school": {
        "title": "Vulnérabilité scolaire",
        "description": "Niveau d’assiduité et maintien de l’élève dans le système scolaire",
        "options": {
            1: "Excellent niveau scolaire, assiduité parfaite, participation active et leadership en classe.",
            2: "Très bon niveau scolaire. Aucun retard ni absence, participation régulière.",
            3: "Niveau scolaire satisfaisant. Assiduité normale, élève calme et appliqué.",
            4: "Élève sérieux mais aux résultats moyens. Suivi scolaire normal sans problème d'assiduité.",
            5: "L’élève suit normalement les cours et participe activement aux activités scolaires (avec/sans résultats satisfaisants) ;",
            6: "Quelques retards occasionnels le matin (1-2 fois par mois), résultats scolaires en légère baisse.",
            7: "Absences très limitées (1-2 jours par trimestre), légères difficultés d'apprentissage.",
            8: "Baisse temporaire mais visible des résultats scolaires, manque régulier de concentration en classe.",
            9: "Retards répétés, démotivation passagère, résultats sous la moyenne dans certaines matières clés.",
            10: "Quelques retards, baisse temporaire des résultats ou absences limitées ;",
            11: "Absences répétées non justifiées (3-4 jours par trimestre), difficultés scolaires importantes.",
            12: "Retards d'apprentissage accumulés (risque de redoublement faible à modéré), absences fréquentes.",
            13: "Absentéisme régulier. L'élève montre un désintérêt grandissant pour l'école.",
            14: "Faibles résultats généralisés, lacunes graves non comblées, absentéisme de plus en plus marqué.",
            15: "Absences fréquentes, faibles résultats répétés, risque de redoublement ou de décrochage ;",
            16: "Décrochage scolaire partiel (absences prolongées de plusieurs semaines).",
            17: "Risque d'abandon imminent en raison d'une démotivation totale ou de l'influence négative de pairs déscolarisés.",
            18: "Exclusions temporaires répétées dues à des problèmes de comportement ou refus fréquents de venir à l'école.",
            19: "Déscolarisation de fait : l'élève ne vient pratiquement plus à l'école depuis plus d'un mois.",
            20: "Déscolarisation, abandon scolaire, refus fréquent de venir à l’école (manque de motivation, influence « négative ») ou exclusion répétée."
        }
    },
    "health_nutrition": {
        "title": "Vulnérabilité sanitaire et nutritionnelle",
        "description": "Etat de santé et accès aux soins/alimentation adéquate",
        "options": {
            1: "Santé excellente. Suivi médical régulier et préventif, alimentation saine et diversifiée.",
            2: "Très bonne santé générale. Visites de contrôle annuelles, aucun problème de croissance.",
            3: "Bonne santé. Foyer attentif à la nutrition de l'enfant, légers maux saisonniers bien traités.",
            4: "Santé globale satisfaisante. Accès correct aux soins essentiels en cas de maladie.",
            5: "L’enfant fréquente régulièrement l’école sans problème majeur de santé ou de nutrition et a accès aux soins de santé ; l’accès règle le problème de la prévention pour une prise en charge effective en cas de maladie.",
            6: "Épisodes de maladies légères (grippes, maux de ventre) occasionnels mais rapidement soignés.",
            7: "Alimentation parfois irrégulière (saut de repas très rare), suivi médical réactif en cas de besoin.",
            8: "Maladies fréquentes (ex: paludisme saisonnier) prises en charge tardivement.",
            9: "Signes de fatigue légère ou carences nutritionnelles mineures, suivi médical incomplet.",
            10: "Maladies fréquentes mais partiellement prises en charge, alimentation irrégulière ou suivi médical partiel ;",
            11: "Absences scolaires régulières pour raisons de santé. Traitement médical incomplet faute de moyens.",
            12: "Fatigue chronique visible en classe due à une alimentation insuffisante ou déséquilibrée.",
            13: "Malnutrition modérée naissante ou handicap physique limitant l'activité, peu accompagné.",
            14: "Affection chronique non stabilisée entraînant des absences répétées (plus de 5 jours par trimestre).",
            15: "Absences répétées pour raison médicale, fatigue chronique, malnutrition modérée ou handicap tous les aspects sont peu pris en charge ;",
            16: "Malnutrition modérée sévère avérée, absences très fréquentes pour maladie sans prise en charge médicale.",
            17: "Maladie chronique grave non suivie médicalement, douleur ou gêne permanente perturbant l'apprentissage.",
            18: "Handicap physique ou sensoriel sévère sans aucun accompagnement ni aménagement à l'école.",
            19: "Signes physiques de malnutrition sévère (émaciation, léthargie) ou absence totale d'accès aux médicaments essentiels.",
            20: "Malnutrition sévère, maladie chronique non suivie, handicap sans accompagnement ou absence totale de soins."
        }
    },
    "family_social": {
        "title": "Vulnérabilité familiale et sociale",
        "description": "Niveau d’encadrement et de stabilité familiale de l’enfant",
        "options": {
            1: "Foyer très uni et stable financièrement et socialement. Encadrement scolaire exceptionnel par les deux parents.",
            2: "Structure familiale stable. Soutien scolaire et affectif régulier des parents.",
            3: "Famille stable. Très légères difficultés de suivi scolaire dues au manque de temps des parents.",
            4: "Foyer correct. L'enfant bénéficie d'un encadrement adéquat bien que les ressources temporelles soient limitées.",
            5: "L’enfant est correctement encadré et ses besoins essentiels sont couverts ;",
            6: "L'enfant vit avec ses deux parents mais le suivi scolaire est faible par manque d'instruction des parents.",
            7: "L'enfant vit avec un parent isolé (famille monoparentale) qui assure correctement l'essentiel mais avec fatigue.",
            8: "Famille monoparentale ou tuteur manifestant un faible intérêt pour la scolarité de l'élève.",
            9: "L'enfant vit avec un tuteur (oncle, tante) assurant un suivi minimaliste et fluctuant.",
            10: "L’enfant vit avec le ou les parent (s) survivant ou un ou des tuteur (s) assurant partiellement le suivi scolaire et social ;",
            11: "Changements fréquents de lieu de résidence ou de tuteur au cours de l'année scolaire.",
            12: "Instabilité émotionnelle visible chez l'enfant liée à des tensions familiales ou conflits réguliers au foyer.",
            13: "Difficultés économiques majeures du tuteur impactant le suivi scolaire (l'enfant est délaissé).",
            14: "Rupture progressive du lien avec les parents biologiques, tuteur distant ou indifférent.",
            15: "Difficultés économiques, faible suivi scolaire, instabilité émotionnelle ou changements fréquents de tuteur ;",
            16: "Parent survivant ou tuteur en situation de grande détresse (maladie grave, perte totale d'autonomie).",
            17: "Enfant confié à un tiers sans aucun lien de parenté et exploité pour des tâches ménagères excessives.",
            18: "Perte de tutelle parentale imminente (parent incarcéré ou déficient mental) sans relais familial organisé.",
            19: "Enfant en rupture familiale partielle, dormant occasionnellement en dehors du foyer.",
            20: "Enfant orphelin, enfants de parents déviants (drogués), enfants en perte de tutelle parentale (prison, déficient, perte de ressources, etc.), confié sans suivi, en situation de rue, victime d’exploitation ou de négligence sévère."
        }
    },
    "protection": {
        "title": "Vulnérabilité liée à la protection de l'enfant",
        "description": "Niveau d’exposition aux violences, abus ou exploitation",
        "options": {
            1: "Environnement familial, scolaire et communautaire exemplaire en matière de sécurité, de bientraitance et d'écoute.",
            2: "Très haut niveau de protection. Parents très vigilants et cadre de vie hautement sécurisé.",
            3: "Protection adéquate. Cadre sûr, sensibilisation correcte de l'enfant aux risques extérieurs.",
            4: "Protection globalement satisfaisante. Supervision parentale régulière.",
            5: "L’élève bénéficie d’une protection familiale, scolaire et communautaire adéquate ;",
            6: "Supervision parentale ponctuellement relâchée en fin de journée, quartier globalement sûr.",
            7: "Exposition occasionnelle à des conflits verbaux dans le voisinage ou le chemin de l'école.",
            8: "Négligence éducative légère (manque de surveillance après l'école), exposition passive à des risques de rue.",
            9: "Quartier instable, environnement scolaire sujet à des tensions ou des bagarres régulières.",
            10: "Négligence, faible supervision ou exposition occasionnelle à des risques ; 10 points",
            11: "Harcèlement verbal ou moqueries répétées par d'autres élèves à l'école, non résolus.",
            12: "Exposition régulière à la violence verbale ou psychologique au sein du foyer ou de la communauté.",
            13: "Exploitation économique légère (l'élève doit vendre des produits dans la rue après l'école).",
            14: "Chemin de l'école ou environnement immédiat dangereux (agressions fréquentes signalées).",
            15: "Cas isolés de harcèlement, Violences répétées, exploitation économique ou environnement communautaire dangereux ; 15 points",
            16: "Violences physiques régulières au sein du foyer (châtiments corporels sévères).",
            17: "Menace de mariage précoce ou pratiques traditionnelles néfastes planifiées par la famille.",
            18: "Danger immédiat d'exploitation sexuelle ou de traite (sollicitations suspectes répétées).",
            19: "Enfant en situation de rue une grande partie de la journée, sans aucun repère protecteur.",
            20: "Abus sexuels, traite, exploitation sévère, enfant en situation de rue ou danger immédiat. 20 points"
        }
    },
    "environmental": {
        "title": "Vulnérabilité environnementale",
        "description": "Niveau d’exposition aux risques environnementaux et aux catastrophes",
        "options": {
            1: "Logement moderne, salubre, hautement sécurisé dans un quartier résidentiel avec assainissement parfait.",
            2: "Logement de bonne qualité, raccordement complet eau/électricité, aucun risque naturel.",
            3: "Quartier résidentiel stable. Logement propre et bien aéré, accès aisé aux commodités.",
            4: "Quartier stable. Logement décent avec accès normal et sécurisé aux services de base.",
            5: "Quartier stable, logement sécurisé et accès normal aux services de base ;",
            6: "Logement exigu ou mal aéré, mais dans un quartier stable et sécurisé.",
            7: "Problèmes mineurs d'assainissement dans la rue (ordures), accès à l'eau potable parfois restreint.",
            8: "Inondations très temporaires de la rue en saison des pluies (sans impact sur le logement).",
            9: "Pollution modérée (proximité d'une route majeure ou d'une décharge), humidité importante dans le logement.",
            10: "Inondations ponctuelles, problèmes d’assainissement ou pollution modérée ;",
            11: "Inondations annuelles récurrentes obligeant à surélever le mobilier. Assainissement défaillant.",
            12: "Logement précaire (matériaux fragiles) situé dans une zone inondable à chaque forte pluie.",
            13: "Insalubrité majeure de la zone d'habitation (eaux usées stagnantes permanentes), risques sanitaires élevés.",
            14: "Zone très insécurisée (vols, agressions fréquentes dans le quartier) impactant la sérénité du foyer.",
            15: "Habitat dans une zone insécurisée, inondable, insalubrité importante ou déplacements fréquents liés aux catastrophes ;",
            16: "Logement gravement endommagé par une inondation récente, réparations de fortune insuffisantes.",
            17: "Risque d'expulsion locative imminent ou insécurité foncière extrême.",
            18: "Exposition permanente à un danger industriel ou naturel majeur (glissement de terrain, érosion côtière).",
            19: "Logement totalement insalubre ou détruit, hébergement d'urgence précaire et très instable.",
            20: "Perte de logement après inondation, exposition permanente à des risques majeurs ou déplacement forcé durable."
        }
    }
}

def get_classification(total_score: float) -> str:
    """
    Classification FEV
    Seuils ajustés sur la somme des dimensions (Min 6, Max 120)
    """
    if total_score <= 45:    # Moyenne <= 7.5
        return "LOW"
    elif total_score <= 75:  # Moyenne <= 12.5
        return "MODERATE"
    elif total_score <= 105: # Moyenne <= 17.5
        return "HIGH"
    else:                    # Moyenne > 17.5
        return "CRITICAL"

def assess_vulnerability(assessment_data: dict) -> dict:
    """
    Évalue la vulnérabilité complète
    """
    dimension_scores = {}
    total_score = 0
    critical_criteria = []
    
    for dim_id in VULNERABILITY_REFERENCE.keys():
        score = int(assessment_data.get(dim_id, 1))
        # Contrainte entre 1 et 20
        score = max(1, min(20, score))
        dimension_scores[dim_id] = score
        total_score += score
        
        # Un score >= 16 est considéré comme critique dans la dimension
        if score >= 16:
            critical_criteria.append({
                "dimension": dim_id,
                "label": VULNERABILITY_REFERENCE[dim_id]["title"],
                "severity": "CRITICAL",
                "score": score
            })
            
    return {
        "dimension_scores": dimension_scores,
        "total_score": float(total_score),
        "classification": get_classification(total_score),
        "critical_criteria": critical_criteria
    }
