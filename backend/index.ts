
import { router, json, error } from '@appdeploy/sdk';

const BACKEND_URL =
  'https://yashaibackend.yashkishorepower123.workers.dev/';

export const handler = router({
  'GET /api/_healthcheck': [
    async () => json({ message: 'Success' })
  ],

  'POST /api/assistant': [
    async ({ body }) => {
      try {
        const payload = body as {
          messages?: Array<{
            role: 'user' | 'assistant';
            content: string;
          }>;
        };

        if (
          !Array.isArray(payload?.messages) ||
          payload.messages.length === 0
        ) {
          return error('Please send a message.', 400);
        }

        const messages = payload.messages
          .slice(-16)
          .filter(
            (message) =>
              message &&
              ['user', 'assistant'].includes(message.role) &&
              typeof message.content === 'string'
          )
          .map((message) => ({
            role: message.role,
            content: message.content.slice(0, 12000)
          }));

        if (
          !messages.length ||
          messages[messages.length - 1].role !== 'user'
        ) {
          return error('A user message is required.', 400);
        }

        const response = await fetch(BACKEND_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ messages })
        });

        if (!response.ok) {
          console.error('Cloudflare backend status:', response.status);
          return error('The AI backend returned an error.', 502);
        }

        const data = await response.json() as {
          text?: string;
          reply?: string;
          response?: string;
          result?: string;
        };

        const answer =
          data.text ??
          data.reply ??
          data.response ??
          data.result;

        if (typeof answer !== 'string' || !answer.trim()) {
          console.error('Unexpected backend response format');
          return error(
            'Unexpected backend response. Check its JSON format.',
            502
          );
        }

        return json({ text: answer });
      } catch (err) {
        console.error('Assistant request failed:', err);
        return error(
          'Could not connect to the AI backend. Please try again.',
          502
        );
      }
    }
  ]
});
