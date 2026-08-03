import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { BasketProvider } from './basket';
import './styles.css';
import './catalogue.css';
import './basket.css';

const root = document.getElementById('app');
if (!root) throw new Error('Application root not found.');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <BasketProvider>
        <App />
      </BasketProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
