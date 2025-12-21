/**
 * Overlay Providers Index
 * All available overlay providers
 */

export { AttacksProvider } from './AttacksProvider';
export { ThreatsProvider } from './ThreatsProvider';
export { KeySquaresProvider } from './KeySquaresProvider';
export { HoverPreviewProvider } from './HoverPreviewProvider';
export { SelectedMoveProvider } from './SelectedMoveProvider';

import { AttacksProvider } from './AttacksProvider';
import { ThreatsProvider } from './ThreatsProvider';
import { KeySquaresProvider } from './KeySquaresProvider';
import { HoverPreviewProvider } from './HoverPreviewProvider';
import { SelectedMoveProvider } from './SelectedMoveProvider';
import type { OverlayProvider } from '../types';

/** All registered overlay providers */
export const ALL_PROVIDERS: OverlayProvider[] = [
  AttacksProvider,
  ThreatsProvider,
  KeySquaresProvider,
  HoverPreviewProvider,
  SelectedMoveProvider,
];

/** Get provider by ID */
export function getProvider(id: string): OverlayProvider | undefined {
  return ALL_PROVIDERS.find(p => p.id === id);
}

/** Get all default-enabled providers */
export function getDefaultProviders(): OverlayProvider[] {
  return ALL_PROVIDERS.filter(p => p.defaultEnabled);
}













