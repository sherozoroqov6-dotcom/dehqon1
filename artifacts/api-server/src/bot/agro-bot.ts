import { Telegraf, Context } from "telegraf";
import { message } from "telegraf/filters";
import { db } from "@workspace/db";
import { botUsersTable, analysesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "../lib/logger";
import fetch from "node-fetch";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is required");

export const bot = new Telegraf(BOT_TOKEN);

const VISION_MODEL = process.env.VISION_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct";
const TEXT_MODEL = process.env.TEXT_MODEL ?? "llama-3.3-70b-versatile";

async function getOrCreateUser(ctx: Context) {
  if (!db) return null;
  const from = ctx.from;
  if (!from) return null;
  try {
    const existing = await db.select().from(botUsersTable).where(eq(botUsersTable.telegramId, from.id)).limit(1);
    if (existing.length > 0) return existing[0];
    const [created] = await db.insert(botUsersTable).values({
      telegramId: from.id,
      username: from.username ?? null,
      firstName: from.first_name ?? null,
      lastName: from.last_name ?? null,
    }).returning();
    return created;
  } catch (err) {
    logger.warn({ err }, "DB error in getOrCreateUser");
    return null;
  }
}

async function analyzeImageWithAI(imageBuffer: Buffer): Promise<{
  analysisText: string;
  diseaseDetected: boolean;
  cropType: string | null;
  severity: string | null;
}> {
  const base64Image = imageBuffer.toString("base64");
  const response = await openai.chat.completions.create({
    model: VISION_MODEL,
    max_tokens: 800,
    messages: [
      {
        role: "system",
        content: `Siz O'zbekiston agronomisiz. Foydalanuvchi o'simlik yoki ekin rasmini yuboradi.
Rasmni tahlil qiling va FAQAT quyidagi JSON formatida javob bering (boshqa hech narsa yozmang):
{
  "cropType": "ekin turi yoki noma'lum",
  "diseaseDetected": true yoki false,
  "severity": "yengil" yoki "o'rtacha" yoki "og'ir" yoki null,
  "diagnosis": "kasallik/muammo tavsifi (1-2 jumla)",
  "recommendations": ["1-tavsiya", "2-tavsiya", "3-tavsiya"]
}`,
      },
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
          { type: "text", text: "Bu o'simlik rasmini tahlil qiling." },
        ],
      },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  let parsed: {
    cropType?: string;
    diseaseDetected?: boolean;
    severity?: string | null;
    diagnosis?: string;
    recommendations?: string[];
  } = {};
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
  } catch {
    logger.warn("Could not parse AI JSON response");
  }

  const diseaseDetected = parsed.diseaseDetected ?? false;
  const cropType = parsed.cropType ?? null;
  const severity = parsed.severity ?? null;

  let analysisText = "🔬 Tahlil natijalari:\n\n";
  if (cropType) analysisText += `🌱 Ekin turi: ${cropType}\n`;
  if (parsed.diagnosis) analysisText += `📋 Tashxis: ${parsed.diagnosis}\n`;
  if (diseaseDetected) {
    analysisText += `⚠️ Kasallik aniqlandi: Ha\n`;
    if (severity) {
      const map: Record<string, string> = { yengil: "🟡 Yengil", "o'rtacha": "🟠 O'rtacha", "og'ir": "🔴 Og'ir" };
      analysisText += `📊 Darajasi: ${map[severity] ?? severity}\n`;
    }
  } else {
    analysisText += `✅ Kasallik: Aniqlanmadi\n`;
  }
  if (parsed.recommendations?.length) {
    analysisText += `\n💡 Tavsiyalar:\n`;
    parsed.recommendations.slice(0, 4).forEach((r, i) => { analysisText += `${i + 1}. ${r}\n`; });
  }

  return { analysisText: analysisText || content, diseaseDetected, cropType, severity };
}

async function analyzeTextWithAI(question: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: TEXT_MODEL,
    max_tokens: 500,
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content: `Siz O'zbekiston agronomisiz. Qishloq xo'jaligi savollariga O'zbek tilida aniq, qisqa (3-5 jumla) javob bering. Bir fikrni bir marta ayting, takrorlamang. Savol qishloq xo'jaligiga aloqasiz bo'lsa, faqat qishloq xo'jaligi bo'yicha yordam bera olishingizni ayting.`,
      },
      { role: "user", content: question },
    ],
  });
  return response.choices[0]?.message?.content?.trim() ?? "Kechirasiz, javob olishda xato yuz berdi.";
}

bot.start(async (ctx) => {
  try { await getOrCreateUser(ctx); } catch (err) { logger.warn({ err }, "getOrCreateUser failed"); }
  await ctx.reply(
    "🌾 AI Agronom Botiga xush kelibsiz!\n\n" +
    "Men sizga qishloq xo'jaligi bo'yicha yordam beraman:\n\n" +
    "📸 Rasm tahlili — O'simlik rasmini yuboring, kasallik va muammolarni aniqlayman\n" +
    "💬 Savol-javob — Qishloq xo'jaligi bo'yicha istalgan savolga javob beraman\n\n" +
    "Boshlash uchun rasm yuboring yoki savol yozing! 🌱"
  );
});

bot.help(async (ctx) => {
  await ctx.reply(
    "🌾 AI Agronom Bot — Yordam\n\n" +
    "Buyruqlar:\n/start — Botni ishga tushirish\n/help — Yordam\n\n" +
    "Foydalanish:\n📸 O'simlik rasmini yuboring — kasallik tahlili\n💬 Savol yozing — maslahat oling"
  );
});

bot.on(message("photo"), async (ctx) => {
  let user = null;
  try { user = await getOrCreateUser(ctx); } catch (err) { logger.warn({ err }, "getOrCreateUser failed"); }

  const processingMsg = await ctx.reply("⏳ Rasm tahlil qilinmoqda...");
  try {
    const photos = ctx.message.photo;
    const largestPhoto = photos[photos.length - 1];
    const fileLink = await ctx.telegram.getFileLink(largestPhoto.file_id);
    const imageResponse = await fetch(fileLink.href);
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const result = await analyzeImageWithAI(imageBuffer);

    if (db && user) {
      try {
        await db.insert(analysesTable).values({
          userId: user.id,
          imageUrl: fileLink.href,
          analysisText: result.analysisText,
          diseaseDetected: result.diseaseDetected,
          cropType: result.cropType,
          severity: result.severity,
        });
      } catch (err) { logger.warn({ err }, "Failed to save analysis"); }
    }

    await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
    await ctx.reply(result.analysisText + "\n\nYana rasm yuboring yoki savol bering 🌱");
  } catch (err) {
    logger.error({ err }, "Image analysis error");
    try { await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id); } catch {}
    await ctx.reply("❌ Rasmni tahlil qilishda xato yuz berdi. Qaytadan urinib ko'ring.");
  }
});

bot.on(message("text"), async (ctx) => {
  try { await getOrCreateUser(ctx); } catch (err) { logger.warn({ err }, "getOrCreateUser failed"); }
  const text = ctx.message.text;
  if (text.startsWith("/")) return;

  const processingMsg = await ctx.reply("⏳ Javob tayyorlanmoqda...");
  try {
    const answer = await analyzeTextWithAI(text);
    await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
    await ctx.reply(answer);
  } catch (err) {
    logger.error({ err }, "Text analysis error");
    try { await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id); } catch {}
    await ctx.reply("❌ Xato yuz berdi. Qaytadan urinib ko'ring.");
  }
});

bot.catch((err, ctx) => {
  logger.error({ err, update: ctx.update }, "Bot error");
});
