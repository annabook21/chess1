/**
 * Bedrock Client
 * 
 * Client for AWS Bedrock (or mock for local dev)
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { Buffer } from 'buffer';

export class BedrockClient {
  private client: BedrockRuntimeClient | null;
  private useMock: boolean;

  constructor() {
    // Use mock if AWS credentials not available
    this.useMock = !process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID;
    
    if (!this.useMock) {
      this.client = new BedrockRuntimeClient({
        region: process.env.AWS_REGION || 'us-east-1',
      });
    } else {
      this.client = null;
      console.log('Using mock Bedrock client (set AWS credentials for real API)');
    }
  }

  async generateText(prompt: string): Promise<string> {
    if (this.useMock || !this.client) {
      return this.mockGenerateText(prompt);
    }

    try {
      // Use Claude 4.5 Sonnet (Anthropic) via Bedrock
      const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0';
      
      const command = new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 200,
          temperature: 0.2, // low temp for deterministic-ish explanations
          messages: [{
            role: 'user',
            content: [{ text: prompt }],
          }],
        }),
      });

      const response = await this.client.send(command);
      const bodyString = Buffer.from(response.body as Uint8Array).toString('utf-8');
      const responseBody = JSON.parse(bodyString);
      // Claude returns content in messages format
      return responseBody.content?.[0]?.text || 'Good move!';
    } catch (error) {
      console.error('Bedrock error, falling back to mock:', error);
      return this.mockGenerateText(prompt);
    }
  }

  private mockGenerateText(prompt: string): string {
    // Simple mock that extracts concept and generates basic explanation
    const conceptMatch = prompt.match(/Concept: (\w+)/);
    const concept = conceptMatch ? conceptMatch[1] : 'development';
    
    const explanations: Record<string, string> = {
      development: 'This move develops a piece to an active square, following opening principles.',
      center_control: 'This move helps control the center, a key strategic goal.',
      tactics: 'This move creates tactical opportunities and threats.',
      piece_activity: 'This move improves piece activity and coordination.',
      king_safety: 'This move contributes to king safety.',
      pawn_structure: 'This move maintains or improves pawn structure.',
    };

    return explanations[concept] || 'This move follows sound chess principles.';
  }
}

