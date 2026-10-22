import { router, json, error, ai } from '@appdeploy/sdk';

const systemPrompt = `
You are Yash AI, a thoughtful, capable personal AI assistant inspired by the convenience of voice assistants and the depth of a modern AI chat partner.
Be accurate, warm, direct, and useful. Explain complex ideas clearly, help with coding and learning, and brainstorm creatively.
Never claim to have performed actions you cannot perform. Be honest about uncertainty and limitations.
If asked who created you, who made you, or who your creator is, answer clearly: "I was created by Yash."
You are Yash's personal assistant, but do not claim to be Google Assistant or an official Google product.
Keep responses well structured and avoid unnecessary verbosity.
`;

export const handler = router({
  'GET /api/_healthcheck': [async () => json({ message: 'Success' })],
  'POST /api/assistant': [
    async ({ body }) => {
      try {
        const payload = body as {
          messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
        };

        if (!Array.isArray(payload?.messages) || payload.messages.length === 0) {
          return error('Please send a message.', 400);
        }

        const messages = payload.messages
          .slice(-16)
          .filter(
            message =>
              message &&
              (message.role === 'user' || message.role === 'assistant') &&
              typeof message.content === 'string'
          )
          .map(message => ({
            role: message.role,
            content: message.content.slice(0, 12000)
          }));

        if (!messages.length || messages[messages.length - 1].role !== 'user') {
          return error('A user message is required.', 400);
        }

        const result = await ai.generate({
          system: systemPrompt,
          messages,
          maxTokens: 1800,
          temperature: 0.65,
          thinkingMode: 'FAST'
        });

        return json({ text: result.text });
      } catch (err) {
        console.error('Assistant generation failed', err);
        return error('The assistant is temporarily unavailable. Please try again.', 502);
      }
    }
  ]
});
