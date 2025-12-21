/**
 * ViewConfigContext
 * Provides view configuration and device mode throughout the app
 */

import { createContext, useContext, ReactNode, useMemo } from 'react';
import { useDeviceMode, DeviceModeState, DeviceMode } from '../hooks/useDeviceMode';
import { getViewConfig, ViewConfig } from '../config/viewConfig';

interface ViewConfigContextValue extends DeviceModeState {
  /** Current view configuration based on device mode */
  viewConfig: ViewConfig;
}

const ViewConfigContext = createContext<ViewConfigContextValue | null>(null);

interface ViewConfigProviderProps {
  children: ReactNode;
}

export function ViewConfigProvider({ children }: ViewConfigProviderProps) {
  const deviceMode = useDeviceMode();
  
  const viewConfig = useMemo(
    () => getViewConfig(deviceMode.mode),
    [deviceMode.mode]
  );
  
  const value = useMemo<ViewConfigContextValue>(
    () => ({
      ...deviceMode,
      viewConfig,
    }),
    [deviceMode, viewConfig]
  );
  
  return (
    <ViewConfigContext.Provider value={value}>
      {children}
    </ViewConfigContext.Provider>
  );
}

/**
 * Hook to access view configuration
 */
export function useViewConfig(): ViewConfigContextValue {
  const context = useContext(ViewConfigContext);
  if (!context) {
    throw new Error('useViewConfig must be used within a ViewConfigProvider');
  }
  return context;
}

/**
 * Hook to just get the view config (no device mode controls)
 */
export function useCurrentViewConfig(): ViewConfig {
  const { viewConfig } = useViewConfig();
  return viewConfig;
}

/**
 * Hook to check if current mode is mobile
 */
export function useIsMobile(): boolean {
  const { mode } = useViewConfig();
  return mode === 'mobile';
}

export type { DeviceMode, ViewConfigContextValue };
