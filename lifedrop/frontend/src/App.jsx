import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './context/store';
import { useSocket } from './hooks/useSocket';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import DonorsPage from './pages/DonorsPage';
import RequestsPage from './pages/RequestsPage';
import SOSPage from './pages/SOSPage';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import DonationHistoryPage from './pages/DonationHistoryPage';
import ChatPage from './pages/ChatPage';
import BloodBanksPage from './pages/BloodBanksPage';
import RequestDetailPage from './pages/RequestDetailPage';

// Layout
import AppLayout from './components/AppLayout';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

function AppInner() {
  const { isAuthenticated, refreshUser } = useAuthStore();
  useSocket(); // Initialize real-time socket

  useEffect(() => {
    if (isAuthenticated) refreshUser();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*"         element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/"                 element={<HomePage />} />
        <Route path="/donors"           element={<DonorsPage />} />
        <Route path="/requests"         element={<RequestsPage />} />
        <Route path="/requests/:id"     element={<RequestDetailPage />} />
        <Route path="/sos"              element={<SOSPage />} />
        <Route path="/profile"          element={<ProfilePage />} />
        <Route path="/notifications"    element={<NotificationsPage />} />
        <Route path="/donations"        element={<DonationHistoryPage />} />
        <Route path="/chat"             element={<ChatPage />} />
        <Route path="/chat/:userId"     element={<ChatPage />} />
        <Route path="/blood-banks"      element={<BloodBanksPage />} />
        <Route path="*"                 element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppInner />
        <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
