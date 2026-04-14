import React, { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import AskTheContract from './components/AskTheContract';
import WakeUp from './components/WakeUp';
import IntakePage from './pages/IntakePage';
import DecisionSummaryPage from './pages/DecisionSummaryPage';
import ReportPage from './pages/ReportPage';
import SourcesPage from './pages/SourcesPage';
import DraftResponsePage from './pages/DraftResponsePage';

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const handleReady = useCallback(() => setAppReady(true), []);

  return (
    <BrowserRouter>
      {/* Cold-start wake-up screen — shown until /api/health responds */}
      <WakeUp onReady={handleReady} />

      <div className={`min-h-screen bg-surface transition-opacity duration-500 ${appReady ? 'opacity-100' : 'opacity-0'}`}>
        <Sidebar />
        <div className="ml-64 flex flex-col min-h-screen">
          <TopBar />
          <main className="flex-1 overflow-x-hidden">
            <Routes>
              <Route path="/" element={<Navigate to="/intake" replace />} />
              <Route path="/intake"   element={<IntakePage />} />
              <Route path="/summary"  element={<DecisionSummaryPage />} />
              <Route path="/report"   element={<ReportPage />} />
              <Route path="/sources"  element={<SourcesPage />} />
              <Route path="/draft"    element={<DraftResponsePage />} />
              <Route path="*" element={<Navigate to="/intake" replace />} />
            </Routes>
          </main>
          <AskTheContract />
        </div>
      </div>
    </BrowserRouter>
  );
}
