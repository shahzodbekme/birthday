const https = require('https');
const http = require('http');

// TOKENLARNI SHU YERGA YOZING
const TOKEN = "8263789071:AAEDCu_fRkOakUkT8EkzhUDjL10bpxDxWXI";
const ADMIN_ID = "6230877154";  
const GEMINI_KEY = "AIzaSyDDc8eJpPFLsevEnboYKvcRoDFQE__7Iao";

let lastUpdateId = 0;
let adminState = {};

// Render portini ochiq tutish
http.createServer((req, res) => {
    res.write("Video Downloader Bot is Live");
    res.end();
}).listen(process.env.PORT || 10000);

// Telegram API uchun universal funksiya
function api(method, params = {}) {
    return new Promise((resolve) => {
        const url = `https://api.telegram.org/bot${TOKEN}/${method}`;
        const req = https.request(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve(JSON.parse(body)));
        });
        req.write(JSON.stringify(params));
        req.end();
    });
}

// Cobalt API orqali video linkini olish
function getVideoUrl(videoLink) {
    return new Promise((resolve) => {
        const data = JSON.stringify({ url: videoLink, videoQuality: '720' });
        const options = {
            hostname: 'api.cobalt.tools',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    resolve(json.url || null);
                } catch (e) { resolve(null); }
            });
        });
        req.on('error', () => resolve(null));
        req.write(data);
        req.end();
    });
}

// Gemini AI javobi
function getAIResponse(prompt) {
    return new Promise((resolve) => {
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
        const data = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });
        const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    resolve(json.candidates[0].content.parts[0].text);
                } catch (e) { resolve("Hozir javob bera olmayman."); }
            });
        });
        req.write(data);
        req.end();
    });
}

async function handleMessage(msg) {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (!text) return;

    // 1. Linkni tekshirish (Instagram, YouTube, TikTok va h.k.)
    if (text.includes('http')) {
        await api('sendMessage', { chat_id: chatId, text: "⏳ Video tayyorlanyapti, kuting..." });
        const downloadUrl = await getVideoUrl(text);

        if (downloadUrl) {
            return api('sendVideo', { chat_id: chatId, video: downloadUrl, caption: "✅ Yuklab olindi!" });
        } else {
            return api('sendMessage', { chat_id: chatId, text: "❌ Videoni yuklab bo'lmadi. Linkni tekshiring." });
        }
    }

    // 2. Admin javob berish rejimi
    if (chatId.toString() === ADMIN_ID.toString() && adminState[ADMIN_ID]) {
        const targetId = adminState[ADMIN_ID];
        await api('sendMessage', { chat_id: targetId, text: `👨‍💻 **Admin:** ${text}` });
        delete adminState[ADMIN_ID];
        return api('sendMessage', { chat_id: ADMIN_ID, text: "✅ Yuborildi." });
    }

    // 3. Oddiy matn bo'lsa - AI javob beradi
    if (chatId.toString() !== ADMIN_ID.toString()) {
        const aiReply = await getAIResponse(text);
        await api('sendMessage', { chat_id: chatId, text: aiReply });
        await api('sendMessage', {
            chat_id: ADMIN_ID,
            text: `👤 ${msg.from.first_name}:\n${text}\n\n🤖 AI: ${aiReply}`,
            reply_markup: { inline_keyboard: [[{ text: "Javob berish", callback_data: `reply_${chatId}` }]] }
        });
    }
}

async function main() {
    try {
        const response = await api('getUpdates', { offset: lastUpdateId + 1, timeout: 30 });
        if (response.ok && response.result.length > 0) {
            for (const update of response.result) {
                lastUpdateId = update.update_id;
                if (update.message) await handleMessage(update.message);
                if (update.callback_query) {
                    const userId = update.callback_query.data.split('_')[1];
                    adminState[ADMIN_ID] = userId;
                    await api('sendMessage', { chat_id: ADMIN_ID, text: `📝 ID: ${userId} ga javob yozing:` });
                }
            }
        }
    } catch (e) { }
    setTimeout(main, 1000);
}

main();
