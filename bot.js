require("dotenv").config();
const { Bot, InlineKeyboard, Keyboard, GrammyError, HttpError } = require("grammy");

// Tokenni .env faylidan olish
const bot = new Bot(process.env.BOT_TOKEN);

// --- Yordamchi Funksiyalar (Klaviaturani generatsiya qilish) ---

const getYearKeyboard = () => {
    const keyboard = new InlineKeyboard();
    const currentYear = new Date().getFullYear();
    for (let y = 2000; y <= currentYear; y++) {
        keyboard.text(y.toString(), `year_${y}`);
        if ((y - 1999) % 4 === 0) keyboard.row();
    }
    return keyboard;
};

const getMonthKeyboard = (year) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const keyboard = new InlineKeyboard();
    months.forEach((m, i) => {
        keyboard.text(m, `month_${year}_${i + 1}`);
        if ((i + 1) % 4 === 0) keyboard.row();
    });
    return keyboard.row().text("⬅️ Orqaga", "back_to_start");
};

const getDayKeyboard = (year, month) => {
    const keyboard = new InlineKeyboard();
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
        keyboard.text(d.toString(), `day_${year}_${month}_${d}`);
        if (d % 7 === 0) keyboard.row();
    }
    return keyboard.row().text("⬅️ Orqaga", `year_${year}`);
};

// --- Bot Mantiqi ---

// /start komandasi
bot.command("start", async (ctx) => {
    try {
        await ctx.reply("To start, choose your birth year", {
            reply_markup: getYearKeyboard(),
        });
    } catch (e) { console.error("Start error:", e); }
});

// Yil tanlovini qayta ishlash
bot.callbackQuery(/^year_(\d+)$/, async (ctx) => {
    try {
        const year = ctx.match[1];
        await ctx.editMessageText(`Now choose your birth month (${year})`, {
            reply_markup: getMonthKeyboard(year),
        });
        await ctx.answerCallbackQuery(); // Tugma bosilganda aylanayotgan belgini to'xtatadi
    } catch (e) { console.error("Year selection error:", e); }
});

// Oy tanlovini qayta ishlash
bot.callbackQuery(/^month_(\d+)_(\d+)$/, async (ctx) => {
    try {
        const [_, year, month] = ctx.match;
        await ctx.editMessageText(`Choose your birth day`, {
            reply_markup: getDayKeyboard(year, month),
        });
        await ctx.answerCallbackQuery();
    } catch (e) { console.error("Month selection error:", e); }
});

// Kun tanlovini qayta ishlash
bot.callbackQuery(/^day_(\d+)_(\d+)_(\d+)$/, async (ctx) => {
    try {
        const [_, year, month, day] = ctx.match;
        const formattedDate = `${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`;
        
        const keyboard = new InlineKeyboard()
            .text("Confirm ✅", `confirm_${formattedDate}`)
            .text("Edit ✏️", "back_to_start");

        await ctx.editMessageText(`Chosen date: ${formattedDate}`, {
            reply_markup: keyboard,
        });
        await ctx.answerCallbackQuery();
    } catch (e) { console.error("Day selection error:", e); }
});

// Tasdiqlash va Joylashuv so'rash
bot.callbackQuery(/^confirm_(.+)$/, async (ctx) => {
    try {
        const date = ctx.match[1];
        await ctx.deleteMessage();
        
        const locationBtn = new Keyboard()
            .requestLocation("🌍 Share timezone")
            .resized()
            .oneTime();

        await ctx.reply(`📅 Date saved: ${date}\n\nTo work correctly, the bot needs to know your timezone. Please send your location:`, {
            reply_markup: locationBtn,
        });
        await ctx.answerCallbackQuery();
    } catch (e) { console.error("Confirmation error:", e); }
});

// Joylashuv kelganda javob berish
bot.on("message:location", async (ctx) => {
    try {
        await ctx.reply(`✅ Your timezone is: Asia/Tashkent\nYour current time: ${new Date().toLocaleTimeString('uz-UZ')}`, {
            reply_markup: { remove_keyboard: true }
        });
    } catch (e) { console.error("Location error:", e); }
});

// Orqaga qaytish mantiqi
bot.callbackQuery("back_to_start", async (ctx) => {
    try {
        await ctx.editMessageText("To start, choose your birth year", {
            reply_markup: getYearKeyboard(),
        });
        await ctx.answerCallbackQuery();
    } catch (e) { console.error("Back to start error:", e); }
});

// --- GLOBAL XATOLIKLARNI USHLASH (CRITICAL) ---
bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    const e = err.error;
    if (e instanceof GrammyError) {
        console.error("Error in request:", e.description);
    } else if (e instanceof HttpError) {
        console.error("Could not contact Telegram:", e);
    } else {
        console.error("Unknown error:", e);
    }
});

// Botni ishga tushirish
bot.start();
console.log("Bot @avtomess uslubida muvaffaqiyatli ishga tushdi...");