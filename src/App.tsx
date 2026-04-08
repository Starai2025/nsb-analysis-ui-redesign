import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import AskTheContract from './components/AskTheContract';
import IntakePage from './pages/IntakePage';
import DecisionSummaryPage from './pages/DecisionSummaryPage';
import ReportPage from './pages/ReportPage';
import SourcesPage from './pages/SourcesPage';
import DraftResponsePage from './pages/DraftResponsePage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-surface">
        <Sidebar />
        <div className="ml-64 flex flex-col min-h-screen">
          <TopBar />
          <main className="flex-1 overflow-x-hidden">
            <Routes>
              <Route path="/" element={<Navigate to="/intake" replace />} />
              <Route path="/intake" element={<IntakePage />} />
              <Route path="/summary" element={<DecisionSummaryPage />} />
              <Route path="/report" element={<ReportPage />} />
              <Route path="/sources" element={<SourcesPage />} />
              <Route path="/draft" element={<DraftResponsePage />} />
              {/* Fallback for other routes */}
              <Route path="*" element={<div className="p-8 text-center text-on-surface-variant">Page under construction</div>} />
            </Routes>
          </main>
          <AskTheContract />
        </div>
      </div>
    </BrowserRouter>
  );
}
