import os
import json
import time
import re
import httpx
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

# Configuration des clés d'API
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
XKIRO_API_KEY = os.getenv("XKIRO_API_KEY")

# Compteur d'alternance intelligent (Round-Robin)
_call_counter = 0


def _clean_json_response(raw_text: str) -> Optional[Dict[str, Any]]:
    """Extrait et nettoie un objet JSON même si le modèle inclut des balises markdown"""
    if not raw_text:
        return None
    try:
        # Essayer directement
        return json.loads(raw_text.strip())
    except Exception:
        pass

    # Chercher un bloc ```json ... ```
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw_text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except Exception:
            pass

    # Chercher la première accolade ouvrante et dernière fermante
    start = raw_text.find("{")
    end = raw_text.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(raw_text[start : end + 1])
        except Exception:
            pass

    return None


def _call_groq(prompt: str) -> Optional[Dict[str, Any]]:
    """Appel à Groq - Ultra-rapide via Qwen 27B vLLM"""
    if not GROQ_API_KEY:
        return None
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "qwen/qwen3.8-27b",
        "messages": [
            {
                "role": "system",
                "content": "Tu es l'Expert IA Senior du Ministère de l'Éducation Nationale du Sénégal (CNIVE). Tu réponds exclusivement en JSON valide.",
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
        "max_tokens": 1000,
    }
    try:
        with httpx.Client(timeout=12.0) as client:
            res = client.post(url, headers=headers, json=payload)
            if res.status_code == 200:
                data = res.json()
                raw_content = data["choices"][0]["message"]["content"]
                parsed = _clean_json_response(raw_content)
                if parsed:
                    parsed["_provider"] = "Groq (Qwen 27B Ultra-Rapide)"
                    return parsed
    except Exception as e:
        print(f"[LLM Router] Groq error: {e}")
    return None


def _call_openrouter(prompt: str) -> Optional[Dict[str, Any]]:
    """Appel à OpenRouter - Raisonnement approfondi via Llama 3.3 70B Instruct"""
    if not OPENROUTER_API_KEY:
        return None
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://cnive.senecarte.sn",
        "X-Title": "CNIVE National Education Senegal",
    }
    payload = {
        "model": "meta-llama/llama-3.3-70b-instruct",
        "messages": [
            {
                "role": "system",
                "content": "Tu es l'Expert IA Senior du Ministère de l'Éducation Nationale du Sénégal (CNIVE). Tu réponds exclusivement en JSON valide.",
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
        "max_tokens": 1000,
    }
    try:
        with httpx.Client(timeout=15.0) as client:
            res = client.post(url, headers=headers, json=payload)
            if res.status_code == 200:
                data = res.json()
                raw_content = data["choices"][0]["message"]["content"]
                parsed = _clean_json_response(raw_content)
                if parsed:
                    parsed["_provider"] = "OpenRouter (Meta Llama 3.3 70B Instruct)"
                    return parsed
    except Exception as e:
        print(f"[LLM Router] OpenRouter error: {e}")
    return None


def _call_xkiro(prompt: str) -> Optional[Dict[str, Any]]:
    """Appel à xKiro Gateway - Passerelle alternative multi-modèles"""
    if not XKIRO_API_KEY:
        return None
    url = "https://api.xkiro.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {XKIRO_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "deepseek-chat",
        "messages": [
            {
                "role": "system",
                "content": "Tu es l'Expert IA Senior du Ministère de l'Éducation Nationale du Sénégal (CNIVE). Tu réponds exclusivement en JSON valide.",
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
        "max_tokens": 1000,
    }
    try:
        with httpx.Client(timeout=12.0) as client:
            res = client.post(url, headers=headers, json=payload)
            if res.status_code == 200:
                data = res.json()
                raw_content = data["choices"][0]["message"]["content"]
                parsed = _clean_json_response(raw_content)
                if parsed:
                    parsed["_provider"] = "xKiro AI Gateway (DeepSeek / Multi-LLM)"
                    return parsed
    except Exception as e:
        print(f"[LLM Router] xKiro error: {e}")
    return None


def generate_intelligent_analysis(pupil_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Exécute une analyse prédictive et qualitative approfondie via le meilleur LLM disponible.
    Alterne intelligemment entre les fournisseurs (Groq, OpenRouter, xKiro)
    avec basculement automatique en cas d'erreur ou d'épuisement de quota.
    """
    global _call_counter
    _call_counter += 1

    prompt = f"""Tu es l'Expert IA Senior du Ministère de l'Éducation Nationale du Sénégal au sein du CNIVE.
Analyse le profil psychosocial, académique et environnemental de cet élève :

- Nom complet : {pupil_data.get('pupil_name')}
- Matricule CNIVE : {pupil_data.get('cnive_id')}
- Établissement : {pupil_data.get('school_name', 'Non spécifié')}
- Classe : {pupil_data.get('grade', 'Non spécifiée')}
- Scores Fiche d'Évaluation de Vulnérabilités (FEV échelle 1-20, Max 120) :
  * Économique : {pupil_data.get('economic_score', 1)}/20
  * Scolaire : {pupil_data.get('school_score', 1)}/20
  * Santé & Nutrition : {pupil_data.get('health_nutrition_score', 1)}/20
  * Familiale & Sociale : {pupil_data.get('family_social_score', 1)}/20
  * Protection : {pupil_data.get('protection_score', 1)}/20
  * Environnementale : {pupil_data.get('environmental_score', 1)}/20
  * Score Global FEV : {pupil_data.get('total_score', 30)}/120 (Classification: {pupil_data.get('classification', 'NON_EVALUE')})
- Absentéisme : {pupil_data.get('unjustified_absences', 0)} absence(s) non justifiée(s)
- Moyenne Académique : {pupil_data.get('academic_score', 'En attente d\'évaluation')}
- Affiliation CMU : {'Enrôlé CMU' if pupil_data.get('cmu_enrolled') else 'Non enrôlé (Risque sanitaire)'}
- Interventions antérieures : {pupil_data.get('completed_interventions', 0)} intervention(s) réalisée(s)

Produis une expertise de haute précision au format JSON strict :
{{
  "synthese_diagnostique": "Synthèse psychosociale et pédagogique précise de 2 à 3 phrases mettant en relief les fragilités majeures.",
  "facteurs_de_risque_prioritaires": ["Facteur critique 1", "Facteur critique 2", "Facteur critique 3"],
  "plan_action_recommande": ["Action concrète 1 (Pédagogique)", "Action concrète 2 (Sociale/Cantine)", "Action concrète 3 (Médicale/Protection)"],
  "niveau_risque_ia": "CRITICAL" | "HIGH" | "MODERATE" | "LOW",
  "score_risque_ia": un nombre entier entre 0 et 100,
  "trajectoire_previsionnelle": "AGGRAVATION" | "STABLE" | "AMELIORATION"
}}"""

    # Liste des fournisseurs ordonnés avec alternance
    providers = [_call_openrouter, _call_groq, _call_xkiro]
    # Alternance selon l'indice d'appel
    start_index = _call_counter % len(providers)
    ordered_providers = providers[start_index:] + providers[:start_index]

    t0 = time.time()
    for provider_func in ordered_providers:
        result = provider_func(prompt)
        if result and "synthese_diagnostique" in result:
            latency = int((time.time() - t0) * 1000)
            result["latency_ms"] = latency
            result["is_live_llm"] = True
            return result

    # Fallback souverain déterministe si aucune API n'est joignable
    return {
        "synthese_diagnostique": (
            f"Analyse multimodale souveraine pour {pupil_data.get('pupil_name')}. "
            f"FEV évalué à {pupil_data.get('total_score', 30)}/120 avec {pupil_data.get('unjustified_absences', 0)} absence(s) signalée(s)."
        ),
        "facteurs_de_risque_prioritaires": [
            "Score de vulnérabilité multidimensionnel FEV",
            "Suivi de l'assiduité scolaire et absences non justifiées",
        ],
        "plan_action_recommande": [
            "Maintien de l'inscription à la cantine scolaire",
            "Visite de médiation sociale à domicile",
            "Tutorat personnalisé en classe",
        ],
        "niveau_risque_ia": pupil_data.get("classification", "MODERATE"),
        "score_risque_ia": min(
            100, int((pupil_data.get("total_score", 30) - 30) / 90 * 100)
        ),
        "trajectoire_previsionnelle": "STABLE",
        "_provider": "Moteur Heuristique Intégré CNIVE (Secours)",
        "is_live_llm": False,
        "latency_ms": int((time.time() - t0) * 1000),
    }
