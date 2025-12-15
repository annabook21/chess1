import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { MaiaProvider } from './maia';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MaiaProvider initialRating={1500} autoLoad={true}>
      <App />
    </MaiaProvider>
  </React.StrictMode>
);

