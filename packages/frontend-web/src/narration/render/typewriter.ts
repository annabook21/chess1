/**
 * Typewriter Effect
 * Renders text character by character with optional sound
 */

export interface TypewriterOptions {
  speed: number;          // ms per character
  pauseOnPunctuation: boolean;
  punctuationDelay: number;
  onComplete?: () => void;
  onCharacter?: (char: string, index: number) => void;
}

const DEFAULT_OPTIONS: TypewriterOptions = {
  speed: 30,
  pauseOnPunctuation: true,
  punctuationDelay: 150,
};

const PUNCTUATION = new Set(['.', '!', '?', ',', ';', ':']);

/** 
 * Create a typewriter effect generator
 * Returns an async iterator that yields partial text
 */
export async function* typewriterGenerator(
  text: string,
  options: Partial<TypewriterOptions> = {}
): AsyncGenerator<string, void, unknown> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let result = '';
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    result += char;
    
    opts.onCharacter?.(char, i);
    yield result;
    
    // Calculate delay
    let delay = opts.speed;
    if (opts.pauseOnPunctuation && PUNCTUATION.has(char)) {
      delay += opts.punctuationDelay;
    }
    
    await sleep(delay);
  }
  
  opts.onComplete?.();
}

/** Simple typewriter that returns final text after animation */
export const typewrite = async (
  text: string,
  onUpdate: (partial: string) => void,
  options: Partial<TypewriterOptions> = {}
): Promise<string> => {
  const generator = typewriterGenerator(text, options);
  let result = '';
  
  for await (const partial of generator) {
    result = partial;
    onUpdate(partial);
  }
  
  return result;
};

/** Cancel token for stopping typewriter mid-animation */
export class TypewriterController {
  private cancelled = false;
  private currentPromise: Promise<void> | null = null;
  
  async run(
    text: string,
    onUpdate: (partial: string) => void,
    options: Partial<TypewriterOptions> = {}
  ): Promise<boolean> {
    this.cancelled = false;
    
    const generator = typewriterGenerator(text, options);
    
    try {
      for await (const partial of generator) {
        if (this.cancelled) {
          onUpdate(text); // Show full text on cancel
          return false;
        }
        onUpdate(partial);
      }
      return true;
    } catch {
      return false;
    }
  }
  
  cancel(): void {
    this.cancelled = true;
  }
  
  isRunning(): boolean {
    return this.currentPromise !== null;
  }
}

/** Helper sleep function */
const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/** Skip to end instantly */
export const skipTypewriter = (
  onUpdate: (text: string) => void,
  fullText: string
): void => {
  onUpdate(fullText);
};

export default {
  typewriterGenerator,
  typewrite,
  TypewriterController,
  skipTypewriter,
};


