import { Telegraf, Context } from "telegraf";
import { message } from "telegraf/filters";
import { db } from "@workspace/db";
import { botUsersTable, analysesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "../lib/logger";
import fetch from "node-fetch";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN is required");
}

export const bot = new Telegraf(BOT_TOKEN);

async function getOrCreateUser(ctx: Context) {
  const from = ctx.from;
  if (!from) return null;

  const existing = await db
    .select()
    .from(botUsersTable)
    .where(eq(botUsersTable.telegramId, from.id))
    .limit(1);

  if (existing.length > 0) return existing[0];

  const [created] = await db
    .insert(botUsersTable)
    .values({
      telegramId: from.id,
      username: from.username ?? null,
      firstName: from.first_name ?? null,
      lastName: from.last_name ?? null,
    })
    .returning();

  return created;
}

async function analyzeImageWithAI(imageBuffer: Buffer): Promise<{
  analysisText: string;
  diseaseDetected: boolean;
  cropType: string | null;
  severity: string | null;
}> {
  const base64Image = imageBuffer.toString("base64");

  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 1024,
    messages: [
      {
        role: "system",
        content: `Siz tajribali agronomiksiz. Foydalanuvchi o'simlik yoki ekin rasmini yuboradi. Siz rasmni tahlil qilib, quyidagi ma'lumotlarni berasiz:
1. Ekin turi (agar aniqlanmasa, "noma'lum" yozing)
2. Kasallik yoki zararkunanda borligini aniqlang
3. Kasallik darajasi: "yengil", "o'rtacha", yoki "og'ir" (kasallik bo'lmasa null)
4. Batafsil tavsiya va davolash yo'llari

Javobni FAQAT JSON formatida bering:
{
  "cropType": "...",
  "diseaseDetected": true/false,
  "severity": "yengil"/"o'rtacha"/"og'ir"/null,
  "diagnosis": "...",
  "recommendations": ["..."]
}`,
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          },
          {
            type: "text",
            text: "Iltimos, bu o'simlik/ekin rasmini tahlil qiling.",
          },
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
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    }
  } catch {
    logger.warn("Could not parse AI JSON response, using raw text");
  }

  const diseaseDetected = parsed.diseaseDetected ?? false;
  const cropType = parsed.cropType ?? null;
  const severity = parsed.severity ?? null;

  let analysisText = "";
  if (parsed.diagnosis) {
    analysisText += `📋 *Tashxis:* ${parsed.diagnosis}\n\n`;
  }
  if (parsed.cropType) {
    analysisText += `🌱 *Ekin turi:* ${parsed.cropType}\n`;
  }
  if (diseaseDetected) {
    analysisText += `⚠️ *Kasallik aniqlandi:* Ha\n`;
    if (severity) {
      const severityMap: Record<string, string> = {
        yengil: "🟡 Yengil",
        "o'rtacha": "🟠 O'rtacha",
        og_ir: "🔴 Og'ir",
      };
      analysisText += `📊 *Darajasi:* ${severityMap[severity] ?? severity}\n`;
    }
  } else {
    analysisText += `✅ *Kasallik:* Aniqlanmadi\n`;
  }

  if (parsed.recommendations && parsed.recommendations.length > 0) {
    analysisText += `\n💡 *Tavsiyalar:*\n`;
    parsed.recommendations.forEach((rec, i) => {
      analysisText += `${i + 1}. ${rec}\n`;
    });
  }

  return {
    analysisText: analysisText || content,
    diseaseDetected,
    cropType,
    severity,
  };
}

async function analyzeTextWithAI(question: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 800,
    messages: [
      {
        role: "system",
        content: `Siz tajribali O'zbekiston agronomiksiz. Foydalanuvchilarga qishloq xo'jaligi bo'yicha savollariga aniq, qisqa va foydali javoblar bering. O'zbek tilida yozing. Agar savol qishloq xo'jaligiga aloqador bo'lmasa, faqat qishloq xo'jaligi bo'yicha yordam bera olishingizni ayting.`,
      },
      {
        role: "user",
        content: question,
      },
    ],
  });

  return response.choices[0]?.message?.content ?? "Kechirasiz, javob olishda xato yuz berdi.";
}

bot.start(async (ctx) => {
  await getOrCreateUser(ctx);
  await ctx.replyWithMarkdown(
    `🌾 *AI Agronom Botiga xush kelibsiz!*\n\n` +
      `Men sizga qishloq xo'jaligi bo'yicha yordam beraman:\n\n` +
      `📸 *Rasm tahlili* — O'simlik rasmini yuboring, kasallik va muammolarni aniqlayman\n` +
      `💬 *Savol-javob* — Qishloq xo'jaligi bo'yicha istalgan savolga javob beraman\n\n` +
      `Boshlash uchun rasm yuboring yoki savol yozing! 🌱`,
  );
});

bot.help(async (ctx) => {
  await ctx.replyWithMarkdown(
    `🌾 *AI Agronom Bot — Yordam*\n\n` +
      `*Buyruqlar:*\n` +
      `/start — Botni ishga tushirish\n` +
      `/help — Yordam\n\n` +
      `*Foydalanish:*\n` +
      `• 📸 O'simlik rasmini yuboring — kasallik tahlili\n` +
      `• 💬 Savol yozing — maslahat oling\n\n` +
      `*Tahlil qilinadigan narsalar:*\n` +
      `• Kasalliklar va zararkunandalar\n` +
      `• Ekin holati va sog'lig'i\n` +
      `• Tuproq va suv muammolari\n` +
      `• O'g'it va parvarish tavsiylari`,
  );
});

bot.on(message("photo"), async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) {
    await ctx.reply("Xato yuz berdi. Iltimos, qaytadan urinib ko'ring.");
    return;
  }

  const processingMsg = await ctx.reply("⏳ Rasm tahlil qilinmoqda, iltimos kuting...");

  try {
    const photos = ctx.message.photo;
    const largestPhoto = photos[photos.length - 1];
    const fileLink = await ctx.telegram.getFileLink(largestPhoto.file_id);

    const imageResponse = await fetch(fileLink.href);
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    const result = await analyzeImageWithAI(imageBuffer);

    await db.insert(analysesTable).values({
      userId: user.id,
      imageUrl: fileLink.href,
      analysisText: result.analysisText,
      diseaseDetected: result.diseaseDetected,
      cropType: result.cropType,
      severity: result.severity,
    });

    await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
    await ctx.replyWithMarkdown(
      `🔬 *Tahlil natijalari:*\n\n${result.analysisText}\n\n` +
        `---\n_Yana rasm yuboring yoki savol bering_ 🌱`,
    );
  } catch (err) {
    logger.error({ err }, "Image analysis error");
    await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
    await ctx.reply(
      "❌ Rasmni tahlil qilishda xato yuz berdi. Iltimos, qaytadan urinib ko'ring.",
    );
  }
});

bot.on(message("text"), async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user) {
    await ctx.reply("Xato yuz berdi. Iltimos, qaytadan urinib ko'ring.");
    return;
  }

  const text = ctx.message.text;
  if (text.startsWith("/")) return;

  const processingMsg = await ctx.reply("⏳ Javob tayyorlanmoqda...");

  try {
    const answer = await analyzeTextWithAI(text);
    await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
    await ctx.replyWithMarkdown(answer);
  } catch (err) {
    logger.error({ err }, "Text analysis error");
    await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
    await ctx.reply("❌ Xato yuz berdi. Iltimos, qaytadan urinib ko'ring.");
  }
});

bot.catch((err, ctx) => {
  logger.error({ err, update: ctx.update }, "Bot error");
});
