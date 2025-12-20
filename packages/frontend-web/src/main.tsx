import ReactDOM from 'react-dom/client';
import App from './App';
import AppXState from './AppXState';
import { MaiaProvider } from './maia';
import { ThemeProvider } from './theme';
import { AchievementProvider } from './achievements';
import { AudioProvider } from './audio';
import { ErrorBoundary } from './ErrorBoundary';
import { 
  GameMachineProvider, 
  MaiaBridge, 
  NarrationBridge,
  USE_XSTATE 
} from './machines';
import './index.css';

/**
 * App with XState state machine integration
 * 
 * The GameMachineProvider wraps the app and provides access to the
 * game state machine. The MaiaBridge and NarrationBridge connect
 * the machine to the Maia neural network and narration system.
 * 
 * Set USE_XSTATE to true in ./machines/GameProvider.tsx to enable.
 * 
 * Current status (Phase 2):
 * - XState machine infrastructure is complete
 * - AppXState component consumes from machine context
 * - Actors for API calls use invoke pattern
 * - Tests pass with mocked actors
 */
function AppWithXState() {
  return (
    <GameMachineProvider>
      <MaiaBridge>
        <NarrationBridge>
          <AppXState />
        </NarrationBridge>
      </MaiaBridge>
    </GameMachineProvider>
  );
}

/**
 * Main app entry point
 * 
 * When USE_XSTATE is true, the app uses XState for state management.
 * When false (default), the app uses the existing useState-based approach.
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <ThemeProvider defaultTheme="cursed-castle-spirit">
      <AudioProvider debug={import.meta.env.DEV}>
        <AchievementProvider>
          <MaiaProvider initialRating={1500} autoLoad={true} useWorker={true}>
            {USE_XSTATE ? <AppWithXState /> : <App />}
          </MaiaProvider>
        </AchievementProvider>
      </AudioProvider>
    </ThemeProvider>
  </ErrorBoundary>
);
