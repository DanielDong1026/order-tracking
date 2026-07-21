import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { OrderProvider } from './context/OrderContext';
import { CustomerProvider } from './context/CustomerContext';
import { FactoryProvider } from './context/FactoryContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <FactoryProvider>
          <CustomerProvider>
            <OrderProvider>
              <App />
            </OrderProvider>
          </CustomerProvider>
        </FactoryProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
);
