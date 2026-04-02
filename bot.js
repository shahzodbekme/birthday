const https = require('https');
const http = require('http');

// TOKENLARNI SHU YERGA YOZING
const TOKEN = "8263789071:AAEDCu_fRkOakUkT8EkzhUDjL10bpxDxWXI";
const ADMIN_ID = "ID_RAQAMINGIZ"; 

// Majburiy obuna kanallari (Masalan: @kanal_nomi)
const CHANNELS = ["@avtomess"]; 

// Kino ma'lumotlar bazasi (Kod: Video_File_ID)
// Video File ID ni olish uchun botga kinoni yuborsangiz logsda chiqadi
const MOVIES = {
    "101": { title: "Forsaj 10", file_id: "BAACAgIAAxkBAA..." },
    "102": { title: "O'rgimchak odam", file_id: "BAACAgIAAxkBAA..." },
    "103": { title: "Avatar 2", file_id: "BAACAgIAAxkBAA..." }
};

let lastUpdateId = 0;

// Render portini ochiq tutish
http.createServer((req, res) => {
    res.write("Movie Bot is running");
    res.end();
}).listen(process.env.PORT || 10000);

// Telegram API funksiyasi
function api(method, params = {}) {
    return new Promise((resolve) => {
        const url = `https://api.telegram.org/bot${TOKEN}/${method}`;
        const req = https.request(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(body)); } catch (e) { resolve({ ok: false }); }
            });
        });
        req.write(JSON.stringify(params));
        req.end();
    });
}

// Kanalga a'zolikni tekshirish
async function checkSubscription(userId) {
    for (const channel of CHANNELS) {
        const res = await api('getChatMember', { chat_id: channel, user_id: userId });
        if (!res.ok || (res.result.status === 'left' || res.result.status === 'kicked')) {
            return false;
        }
    }
    return true;
}

async function handleMessage(msg) {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;

    // 1. A'zolikni tekshirish
    const isSubscribed = await checkSubscription(chatId);

    if (!isSubscribed) {
        let channelButtons = CHANNELS.map(ch => [{ text: `A'zo bo'lish ➕`, url: `https://t.me/${ch.replace('@', '')}` }]);
        channelButtons.push([{ text: "Tekshirish ✅", callback_data: "check_sub" }]);

        return api('sendMessage', {
            chat_id: chatId,
            text: "❌ **Botdan foydalanish uchun quyidagi kanallarga a'zo bo'lishingiz shart!**",
            reply_markup: { inline_keyboard: channelButtons },
            parse_mode: 'Markdown'
        });
    }

    // 2. Start komandasi
    if (text === '/start') {
        return api('sendMessage', {
            chat_id: chatId,
            text: "✅ Xush kelibsiz! Kino kodini yuboring:",
            reply_markup: { remove_keyboard: true }
        });
    }

    // 3. Kino kodini tekshirish
    if (MOVIES[text]) {
        const movie = MOVIES[text];
        return api('sendVideo', {
            chat_id: chatId,
            video: movie.file_id,
            caption: `🎬 **Nomi:** ${movie.title}\n🔢 **Kodi:** ${text}`
        });
    } else {
        // Agar kino topilmasa
        return api('sendMessage', {
            chat_id: chatId,
            text: "😔 Kechirasiz, bu kod bilan kino topilmadi. Qaytadan urinib ko'ring."
        });
    }
}

async function main() {
    try {
        const response = await api('getUpdates', { offset: lastUpdateId + 1, timeout: 30 });
        if (response.ok && response.result.length > 0) {
            for (const update of response.result) {
                lastUpdateId = update.update_id;
                
                if (update.message) {
                    await handleMessage(update.message);
                }
                
                if (update.callback_query) {
                    const chatId = update.callback_query.message.chat.id;
                    const isSub = await checkSubscription(chatId);
                    
                    await api('answerCallbackQuery', { callback_query_id: update.callback_query.id });
                    
                    if (isSub) {
                        await api('sendMessage', { chat_id: chatId, text: "✅ Rahmat! Endi kino kodini yozishingiz mumkin." });
                    } else {
                        await api('sendMessage', { chat_id: chatId, text: "⚠️ Hali ham hamma kanallarga a'zo bo'lmadingiz!" });
                    }
                }
            }
        }
    } catch (e) { console.log("Xato:", e.message); }
    setTimeout(main, 1000);
}

main();
