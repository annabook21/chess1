import ReactDOM from 'react-dom/client';
import App from './App';
import { MaiaProvider } from './maia';
import { ThemeProvider } from './theme';
import { AchievementProvider } from './achievements';
import { AudioProvider } from './audio';
import { ErrorBoundary } from './ErrorBoundary';
import './index.css';

// DEBUGGING: Testing ALL providers with simple test app
ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <ThemeProvider defaultTheme="cursed-castle-spirit">
      <AudioProvider debug={import.meta.env.DEV}>
        <AchievementProvider>
          <MaiaProvider initialRating={1500} autoLoad={true} useWorker={true}>
            <App />
          </MaiaProvider>
        </AchievementProvider>
      </AudioProvider>
    </ThemeProvider>
  </ErrorBoundary>
);
