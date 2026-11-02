import React, { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";

// Pages avec Lazy Loading (Code Splitting) pour améliorer la performance (Chunk < 500kB)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const PupilsList = lazy(() => import("./pages/PupilsList"));
const PupilForm = lazy(() => import("./pages/PupilForm"));
const PupilProfile = lazy(() => import("./pages/PupilProfile"));
const HealthRecords = lazy(() => import("./pages/HealthRecords"));
const VulnerabilityAssessment = lazy(() => import("./pages/VulnerabilityAssessment"));
const AlertsPage = lazy(() => import("./pages/AlertsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const CardsManagement = lazy(() => import("./pages/CardsManagement"));
const Login = lazy(() => import("./pages/Login"));
const AIAnalyticsPage = lazy(() => import("./pages/AIAnalyticsPage"));
const AuditLogPage = lazy(() => import("./pages/AuditLogPage"));
const InterventionsPage = lazy(() => import("./pages/InterventionsPage"));
const MapPage = lazy(() => import("./pages/MapPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const TeamPage = lazy(() => import("./pages/TeamPage"));
const ArchivesPage = lazy(() => import("./pages/ArchivesPage"));
const PublicPupilProfile = lazy(() => import("./pages/PublicPupilProfile"));

// Un Loader simple pendant le chargement initial
const PageLoader = () => (
  <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', color: '#64748b' }}>
    <div className="w-8 h-8 border-4 border-slate-200 border-t-primary-500 rounded-full animate-spin"></div>
  </div>
);

function App() {
  // Préchargement en arrière-plan des pages principales après le premier rendu pour une fluidité instantanée
  useEffect(() => {
    const timer = setTimeout(() => {
      import("./pages/Dashboard");
      import("./pages/PupilsList");
      import("./pages/PupilProfile");
      import("./pages/VulnerabilityAssessment");
      import("./pages/AlertsPage");
      import("./pages/InterventionsPage");
      import("./pages/HealthRecords");
      import("./pages/CardsManagement");
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="pupils" element={<PupilsList />} />
                <Route path="pupils/new" element={<PupilForm />} />
                <Route path="pupils/edit/:id" element={<PupilForm />} />
                <Route path="pupils/:id" element={<PupilProfile />} />
                <Route path="health" element={<HealthRecords />} />
                <Route path="vulnerability" element={<VulnerabilityAssessment />} />
                <Route path="alerts" element={<AlertsPage />} />
                <Route path="cards" element={<CardsManagement />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="analytics" element={<AIAnalyticsPage />} />
                <Route path="audit" element={<AuditLogPage />} />
                <Route path="interventions" element={<InterventionsPage />} />
                <Route path="map" element={<MapPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="team" element={<TeamPage />} />
                <Route path="archives" element={<ArchivesPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
              <Route path="/scan/:id" element={<PublicPupilProfile />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
