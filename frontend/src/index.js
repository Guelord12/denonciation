import React from 'react';
import ReactDOM from 'react-dom/client';
import './assets/theme.css';
// import './i18n';
import App from './App';

console.log('index.js exécuté');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <div>Test direct</div>
  </React.StrictMode>
);