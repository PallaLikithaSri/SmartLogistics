import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { WorkerDashboard } from './pages/WorkerDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { CustomerView } from './pages/CustomerView';
import { Role } from './types';

const AppContent: React.FC = () => {
  const { currentUser } = useApp();

  if (!currentUser) {
    return <Login />;
  }

  return (
    <Layout>
      {currentUser.role === 'WORKER' && <WorkerDashboard />}
      {(currentUser.role === 'ADMIN' || currentUser.role === 'TEAM_LEADER' || currentUser.role === 'SUPER_ADMIN') && (
        <AdminDashboard mode={currentUser.role as Role} />
      )}
      {currentUser.role === 'CUSTOMER' && <CustomerView />}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
