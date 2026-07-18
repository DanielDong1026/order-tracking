import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { OrderProvider } from './context/OrderContext';
import App from './App';
import './index.css';

/**
 * 应用入口 — 精简挂载
 * ThemeProvider 已移至 App.jsx 以支持暗色模式 state 管理
 */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <OrderProvider>
        <App />
      </OrderProvider>
    </BrowserRouter>
  </React.StrictMode>
);
