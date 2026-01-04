import './index.css'
import App from './App.tsx'
import React from 'react';
import ReactDOM from 'react-dom/client';
import { FilterProvider } from './FilterContext.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <FilterProvider>
      <App />
    </FilterProvider>
  </React.StrictMode>
);
