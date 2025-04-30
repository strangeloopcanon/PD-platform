import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import ConnectionPage from './pages/ConnectionPage';
import MetadataPage from './pages/MetadataPage';
import QueryPage from './pages/QueryPage';
import NotebookPage from './pages/NotebookPage';
import { AppProvider } from './context/AppContext';

function App() {
  return (
    <AppProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/connect" element={<ConnectionPage />} />
          <Route path="/metadata" element={<MetadataPage />} />
          <Route path="/query" element={<QueryPage />} />
          <Route path="/notebook" element={<NotebookPage />} />
        </Routes>
      </Layout>
    </AppProvider>
  );
}

export default App;