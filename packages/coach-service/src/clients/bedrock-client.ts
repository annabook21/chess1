/**
 * Bedrock Client
 * 
 * Client for AWS Bedrock
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { Buffer } from 'buffer';

export class BedrockClient {
  private client: BedrockRuntimeClient;

  constructor() {
    // Always use real client - AWS SDK will use IAM role credentials in ECS
    this.client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-west-2',
    });
  }

  async generateText(prompt: string): Promise<string> {
    try {
      // Use Claude 3.5 Sonnet v2 via Bedrock
      const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0';
      
      const command = new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 200,
          temperature: 0.3,
          messages: [{
            role: 'user',
            content: [{ type: 'text', text: prompt }],
          }],
        }),
      });

      const response = await this.client.send(command);
      const bodyString = Buffer.from(response.body as Uint8Array).toString('utf-8');
      const responseBody = JSON.parse(bodyString);
      
      // Claude returns content in messages format
      const text = responseBody.content?.[0]?.text;
      if (text) {
        console.log('[COACH] Bedrock response:', text.substring(0, 100) + '...');
        return text;
      }
      
      console.warn('[COACH] No text in Bedrock response:', responseBody);
      return this.getFallbackExplanation(prompt);
    } catch (error) {
      console.error('[COACH] Bedrock error:', error);
      return this.getFallbackExplanation(prompt);
    }
  }

  private getFallbackExplanation(prompt: string): string {
    // Extract concept from prompt for contextual fallback
    const conceptMatch = prompt.match(/Concept: (\w+)/i);
    const concept = conceptMatch ? conceptMatch[1].toLowerCase() : 'development';
    
    const explanations: Record<string, string> = {
      development: 'This move develops a piece to an active square, following opening principles.',
      center_control: 'This move helps control the center, a key strategic goal in the opening.',
      tactics: 'This move creates tactical opportunities. Look for forcing moves!',
      piece_activity: 'This move improves piece activity and coordination.',
      king_safety: 'This move contributes to king safety - always an important consideration.',
      pawn_structure: 'This move maintains or improves your pawn structure.',
      fork: 'This creates a fork threat - attacking two pieces at once!',
      pin: 'This creates a pin, restricting the opponent\'s piece movement.',
    };

    return explanations[concept] || 'This move follows sound chess principles.';
  }
}
