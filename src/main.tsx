import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { AppProvider } from './context/AppContext';

// Add sample data for demo purposes
const loadDemoData = () => {
  // Sample query history items
  const historyItems = [
    {
      id: 'h1',
      query: 'Show monthly revenue trends by product category for 2023',
      timestamp: new Date('2023-10-15T14:30:00'),
      result: null,
      favorite: true,
      tags: ['dashboard', 'revenue', 'trends']
    },
    {
      id: 'h2',
      query: 'Calculate customer churn rate by segment for Q2',
      timestamp: new Date('2023-09-05T10:15:00'),
      result: null,
      favorite: false,
      tags: ['customer', 'churn', 'KPI']
    },
    {
      id: 'h3',
      query: 'What is the average order value by region?',
      timestamp: new Date('2023-08-22T16:45:00'),
      result: null,
      favorite: true,
      tags: ['sales', 'orders']
    }
  ];

  localStorage.setItem('demoHistoryItems', JSON.stringify(historyItems));
};

// Load demo data
loadDemoData();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
