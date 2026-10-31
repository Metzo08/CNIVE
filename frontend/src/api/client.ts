import axios from 'axios';
import { API_URL } from '../config';

/**
 * Axios instance centralisée pour toutes les requêtes API
 * Cela prévient les bugs liés aux URLs codées en dur (ex: http://localhost:8001).
 */
const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Intercepteur pour injecter le token d'authentification automatiquement si besoin
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Intercepteur pour la gestion des erreurs globales
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            // Utilisateur déconnecté ou token expiré
            if (error.response.status === 401) {
                // On vérifie si on est déjà sur la page de login pour éviter les boucles
                if (window.location.pathname !== '/login') {
                    console.warn("Session expirée ou non autorisée. Redirection vers login...");
                    localStorage.removeItem('token');
                    // On utilise replace pour ne pas polluer l'historique
                    window.location.replace('/login?expired=true');
                }
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;
