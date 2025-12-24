/**
 * Bedrock Client
 *
 * Client for AWS Bedrock with retry logic, circuit breaker, and improved error handling
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { Buffer } from 'buffer';

interface GenerateOptions {
  temperature?: number;
  timeout?: number;
  retries?: number;
  context?: {
    chosenMove: string;
    bestMove: string;
    evalDelta: number;
  };
}

export class BedrockClient {
  private client: BedrockRuntimeClient;

  // Circuit breaker state
  private failureCount = 0;
  private lastFailureTime = 0;
  private circuitOpen = false;
  private readonly FAILURE_THRESHOLD = 5;
  private readonly RESET_TIMEOUT = 60000; // 1 minute

  constructor() {
    // Always use real client - AWS SDK will use IAM role credentials in ECS
    this.client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-west-2',
    });
  }

  async generateText(prompt: string, options?: GenerateOptions): Promise<string> {
    // Check circuit breaker
    if (this.circuitOpen) {
      const now = Date.now();
      if (now - this.lastFailureTime > this.RESET_TIMEOUT) {
        console.log('[BEDROCK] Circuit breaker reset, trying again');
        this.circuitOpen = false;
        this.failureCount = 0;
      } else {
        console.warn('[BEDROCK] Circuit breaker open, using fallback');
        return this.getFallbackExplanation(options?.context);
      }
    }

    const retries = options?.retries ?? 2;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const text = await this.invokeModel(prompt, options);

        // Reset failure count on success
        this.failureCount = 0;

        return text;
      } catch (error: any) {
        const isRetryable = [
          'ThrottlingException',
          'ServiceUnavailableException',
          'InternalServerException',
        ].includes(error.name);

        if (isRetryable && attempt < retries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.warn(`[BEDROCK] Retry ${attempt + 1}/${retries} after ${delay}ms (${error.name})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Track failures for circuit breaker
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.failureCount >= this.FAILURE_THRESHOLD) {
          console.error('[BEDROCK] Circuit breaker opened after', this.failureCount, 'failures');
          this.circuitOpen = true;
        }

        // Not retryable or out of retries
        console.error('[BEDROCK] Failed after', attempt + 1, 'attempts:', error);
        return this.getFallbackExplanation(options?.context);
      }
    }

    return this.getFallbackExplanation(options?.context);
  }

  private async invokeModel(prompt: string, options?: GenerateOptions): Promise<string> {
    // Use Claude 3.5 Sonnet v2 via Bedrock
    const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0';
    const temperature = options?.temperature ?? 0.7; // More varied, natural explanations
    const maxTokens = 500; // ~375 words (sufficient for detailed explanation)

    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: maxTokens,
        temperature,
        messages: [{
          role: 'user',
          content: [{ type: 'text', text: prompt }],
        }],
      }),
    });

    const response = await this.client.send(command);
    const bodyString = Buffer.from(response.body as Uint8Array).toString('utf-8');
    const responseBody = JSON.parse(bodyString);

    // Log token usage for monitoring
    if (responseBody.usage) {
      const cost = (
        (responseBody.usage.input_tokens / 1000) * 0.003 +
        (responseBody.usage.output_tokens / 1000) * 0.015
      );

      console.log('[BEDROCK] Token usage:', {
        input: responseBody.usage.input_tokens,
        output: responseBody.usage.output_tokens,
        cost: `$${cost.toFixed(4)}`,
      });
    }

    // Claude returns content in messages format
    const text = responseBody.content?.[0]?.text;
    if (text) {
      console.log('[BEDROCK] Response:', text.substring(0, 100) + '...');
      return text;
    }

    console.warn('[BEDROCK] No text in response:', responseBody);
    return this.getFallbackExplanation(options?.context);
  }

  private getFallbackExplanation(context?: {
    chosenMove: string;
    bestMove: string;
    evalDelta: number;
  }): string {
    if (!context) {
      return 'Unable to generate detailed explanation. Please try again.';
    }

    const { chosenMove, bestMove, evalDelta } = context;

    if (evalDelta < -200) {
      return `Your move ${chosenMove} was a significant blunder (${(evalDelta / 100).toFixed(1)} pawns lost). The engine's best move ${bestMove} would have maintained a better position. Look for hanging pieces and tactical threats.`;
    } else if (evalDelta < -50) {
      return `Your move ${chosenMove} was inaccurate (${(evalDelta / 100).toFixed(1)} pawns lost). The computer prefers ${bestMove}. Try to calculate deeper to find stronger moves.`;
    } else {
      return `Your move ${chosenMove} was reasonable but not optimal. The engine suggests ${bestMove} as slightly better. Both moves are playable at your level.`;
    }
  }
}
