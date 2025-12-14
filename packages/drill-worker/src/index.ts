/**
 * Drill Worker Entry Point
 *
 * MVP: consume blunder events from SQS and ack them.
 * TODO: generate puzzles, schedule reviews.
 */

import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';

const queueUrl = process.env.BLUNDER_QUEUE_URL;
const sqsClient = queueUrl ? new SQSClient({}) : null;
const pollIntervalMs = Number(process.env.POLL_INTERVAL_MS || 5000);

console.log('Drill worker service starting...');
if (!queueUrl) {
  console.log('BLUNDER_QUEUE_URL not set. Worker idle.');
}

async function processMessage(body: string) {
  try {
    const payload = JSON.parse(body);
    console.log('Received blunder event:', payload);
    // TODO: Generate puzzle variants, schedule spaced repetition.
  } catch (err) {
    console.error('Failed to process message body', err);
  }
}

async function poll() {
  if (!sqsClient || !queueUrl) return;

  try {
    const res = await sqsClient.send(new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 5,
      WaitTimeSeconds: 10,
      VisibilityTimeout: 30,
    }));

    if (res.Messages && res.Messages.length > 0) {
      for (const msg of res.Messages) {
        if (!msg.ReceiptHandle || !msg.Body) continue;
        await processMessage(msg.Body);
        await sqsClient.send(new DeleteMessageCommand({
          QueueUrl: queueUrl,
          ReceiptHandle: msg.ReceiptHandle,
        }));
      }
    }
  } catch (err) {
    console.error('Error polling SQS', err);
  }
}

setInterval(poll, pollIntervalMs);

