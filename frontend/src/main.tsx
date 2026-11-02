import { setupSafeDomNodePatch } from './utils/domSafety'

// Installer le patch de sécurité DOM immédiatement avant tout rendu React
setupSafeDomNodePatch()

import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import 'leaflet/dist/leaflet.css'
import './index.css'
import './App.css'
import './i18n/config'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes de cache actif pour navigation instantanée
            gcTime: 1000 * 60 * 15,   // 15 minutes en mémoire
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
})

const rootElement = document.getElementById('root');
if (rootElement) {
    createRoot(rootElement).render(
        <ErrorBoundary fallbackTitle="Interruption du système cnive">
            <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                    <App />
                </BrowserRouter>
            </QueryClientProvider>
        </ErrorBoundary>
    );
}

// Enregistrement du Service Worker PWA (Mode hors-ligne)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
            console.warn('Enregistrement Service Worker PWA ignoré :', err);
        });
    });
}
