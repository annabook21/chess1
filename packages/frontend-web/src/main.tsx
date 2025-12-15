import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { MaiaProvider } from './maia';
import { ThemeProvider } from './theme';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="cursed-castle-spirit">
      <MaiaProvider initialRating={1500} autoLoad={true}>
        <App />
      </MaiaProvider>
    </ThemeProvider>
  </React.StrictMode>
);

