export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  baileys: {
    authDir: process.env.BAILEYS_AUTH_DIR ?? './data/baileys-auth',
  },
  autoReply: {
    defaultMessage:
      process.env.DEFAULT_AUTO_REPLY_MESSAGE ??
      'Halo! Pesan Anda sudah kami terima.',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? '',
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    systemPrompt:
      process.env.OPENAI_SYSTEM_PROMPT ??
      'Kamu adalah asisten customer service yang ramah dan membantu. Jawab dengan bahasa Indonesia yang sopan.',
  },
  ai: {
    conversationHistoryLimit: parseInt(
      process.env.AI_CONVERSATION_HISTORY_LIMIT ?? '10',
      10,
    ),
  },
  database: {
    url:
      process.env.DATABASE_URL ??
      'postgres://postgres:postgres@localhost:5432/wa_bot',
  },
});
