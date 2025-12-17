import ReactDOM from 'react-dom/client';
import App from './App';
import { MaiaProvider } from './maia';
import { ThemeProvider } from './theme';
import { AchievementProvider } from './achievements';
import { AudioProvider } from './audio';
import { ErrorBoundary } from './ErrorBoundary';
import './index.css';

// Use createRoot without StrictMode to prevent double-rendering issues with React 19
ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <ThemeProvider defaultTheme="cursed-castle-spirit">
      <AudioProvider debug={import.meta.env.DEV}>
        <AchievementProvider>
          <MaiaProvider initialRating={1500} autoLoad={false} useWorker={false}>
            <App />
          </MaiaProvider>
        </AchievementProvider>
      </AudioProvider>
    </ThemeProvider>
  </ErrorBoundary>
);
