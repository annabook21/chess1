import { MoveResult } from './index';

export function parseMoveFromText(text: string): MoveResult {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  const moveLine = lines.find(l => l.toUpperCase().includes('MOVE:'));
  const justLine = lines.find(l => l.toUpperCase().includes('JUSTIFICATION:'));

  const move = moveLine?.split(':')[1]?.trim() || '';
  const justification = justLine?.split(':').slice(1).join(':').trim() || '';

  return { move, justification };
}

export function parseAnthropicToolUse(response: any): MoveResult {
  try {
    const toolUse = response.content?.find((c: any) => c.type === 'tool_use');
    if (toolUse?.input) {
      return {
        move: toolUse.input.next_move || '',
        justification: toolUse.input.justification || '',
        threats: toolUse.input.threats || undefined,
      };
    }
  } catch {
    // Fall through
  }
  return { move: '', justification: '' };
}

