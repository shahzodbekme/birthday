const { Bot } = require("grammy");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Tokenlarni tizim o'zgaruvchilaridan olamiz
const bot = new Bot(process.env.BOT_TOKEN);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    systemInstruction: "Sen aqlli va hazilkash yordamchisan. Isming — Shahzod AI."
});

bot.command("start", (ctx) => ctx.reply("Salom! Men tayyorman. Savol bering!"));

bot.on("message:text", async (ctx) => {
    try {
        await ctx.replyWithChatAction("typing");
        const result = await model.generateContent(ctx.message.text);
        const response = await result.response;
        await ctx.reply(response.text());
    } catch (e) {
        ctx.reply("Xatolik yuz berdi, keyinroq urinib ko'ring.");
    }
});

bot.start();
