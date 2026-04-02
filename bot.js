const https = require('https');

// Tokenlarni o'zgaruvchilardan olamiz
const TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID; // Sizning Telegram ID'ngiz

let lastUpdateId = 0;

// Telegram API ga so'rov yuborish funksiyasi
function api(method, params = {}) {
    return new Promise((resolve) => {
        const url = `https://api.telegram.org/bot${TOKEN}/${method}`;
        const data = JSON.stringify(params);

        const req = https.request(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve(JSON.parse(body)));
        });

        req.write(data);
        req.end();
    });
}

// Xabarlarni tekshirish (Long Polling)
async function getUpdates() {
    const response = await api('getUpdates', {
        offset: lastUpdateId + 1,
        timeout: 30
    });

    if (response.ok && response.result.length > 0) {
        for (const update of response.result) {
            lastUpdateId = update.update_id;
            handleUpdate(update);
        }
    }
    getUpdates(); // Keyingi tekshiruv
}

// Xabarlarni qayta ishlash mantiqi
async function handleUpdate(update) {
    if (!update.message) return;

    const chatId = update.message.chat.id;
    const text = update.message.text;
    const userId = update.message.from.id;

    // 1. Start komandasi
    if (text === '/start') {
        return api('sendMessage', {
            chat_id: chatId,
            text: "Salom! Savolingizni yozib qoldiring, admin tez orada javob beradi."
        });
    }

    // 2. Adminga xabar yuborish (Foydalanuvchidan kelgan xabar)
    if (chatId.toString() !== ADMIN_ID.toString()) {
        await api('sendMessage', {
            chat_id: ADMIN_ID,
            text: `📩 **Yangi xabar!**\nKimdan: ${update.message.from.first_name}\nID: ${userId}\n\nMatn: ${text}`,
            parse_mode: 'Markdown'
        });
        return api('sendMessage', { chat_id: chatId, text: "Xabaringiz adminga yetkazildi. Kuting." });
    }

    // 3. Admin javob qaytarishi (Reply usulida)
    if (chatId.toString() === ADMIN_ID.toString() && update.message.reply_to_message) {
        // Admin xabarga "Reply" qilib yozsa, o'sha foydalanuvchiga ketadi
        const replyText = update.message.reply_to_message.text;
        const targetUserId = replyText.match(/ID: (\d+)/)?.[1];

        if (targetUserId) {
            await api('sendMessage', {
                chat_id: targetUserId,
                text: `👨‍💻 **Admin javobi:**\n\n${text}`,
                parse_mode: 'Markdown'
            });
            return api('sendMessage', { chat_id: ADMIN_ID, text: "✅ Javob yuborildi." });
        }
    }
}

// Botni ishga tushirish
console.log("Bot ishlamoqda...");
getUpdates();
