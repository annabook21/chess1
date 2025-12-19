/**
 * Template Loader
 * Loads and manages narration templates from packs
 */

import { NarrationTag } from './types';

// Import all templates at build time using Vite's glob import
const templateModules = import.meta.glob('./packs/*/**/*.md', { 
  query: '?raw', 
  import: 'default',
  eager: true 
});

interface TemplateEntry {
  packId: string;
  tag: NarrationTag;
  variant: string;
  content: string;
}

/** Parse template modules into structured entries */
const parseTemplates = (): TemplateEntry[] => {
  const entries: TemplateEntry[] = [];
  
  for (const [path, content] of Object.entries(templateModules)) {
    // Path format: ./packs/{packId}/{tag}/{variant}.md
    const match = path.match(/\.\/packs\/([^/]+)\/([^/]+)\/([^.]+)\.md$/);
    if (match && typeof content === 'string') {
      const [, packId, tag, variant] = match;
      entries.push({
        packId,
        tag: tag as NarrationTag,
        variant,
        content: content.trim(),
      });
    }
  }
  
  return entries;
};

// Cache parsed templates
let cachedTemplates: TemplateEntry[] | null = null;

/** Get all templates */
export const getAllTemplates = (): TemplateEntry[] => {
  if (!cachedTemplates) {
    cachedTemplates = parseTemplates();
  }
  return cachedTemplates;
};

/** Get templates for a specific pack and tag */
export const getTemplatesForTag = (
  packId: string,
  tag: NarrationTag
): TemplateEntry[] => {
  return getAllTemplates().filter(
    t => t.packId === packId && t.tag === tag
  );
};

/** 
 * Select a template deterministically based on seed
 * This ensures the same template is shown on rerenders
 */
export const selectTemplate = (
  packId: string,
  tag: NarrationTag,
  seed: number
): TemplateEntry | null => {
  const templates = getTemplatesForTag(packId, tag);
  
  if (templates.length === 0) {
    return null;
  }
  
  // Deterministic selection based on seed
  const index = Math.abs(seed) % templates.length;
  return templates[index];
};

/** Generate a seed from game context */
export const generateSeed = (gameId: string, turnNumber: number): number => {
  let hash = 0;
  const str = `${gameId}-${turnNumber}`;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return hash;
};

export default {
  getAllTemplates,
  getTemplatesForTag,
  selectTemplate,
  generateSeed,
};




