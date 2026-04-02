const https = require('https');
const http = require('http');

// TOKENLARNI SHU YERGA YOZING
const TOKEN = "8263789071:AAEDCu_fRkOakUkT8EkzhUDjL10bpxDxWXI";
const ADMIN_ID = "6230877154";  
const GEMINI_KEY = "AIzaSyDDc8eJpPFLsevEnboYKvcRoDFQE__7Iao";

let lastUpdateId = 0;
let adminState = {}; 

// Render uchun port
http.createServer((req, res) => {
    res.write("AI Smart Bot is running");
    res.end();
}).listen(process.env.PORT || 10000);

// Telegram API
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

// Gemini AI orqali javob olish
function getAIResponse(prompt) {
    return new Promise((resolve) => {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
        const data = JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        });

        const req = https.request(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    if (json.candidates && json.candidates[0].content) {
                        resolve(json.candidates[0].content.parts[0].text);
                    } else {
                        console.log("AI xatosi:", body);
                        resolve("Hozircha tushunmadim, qaytadan yozing.");
                    }
                } catch (e) {
                    resolve("Xatolik yuz berdi. Birozdan so'ng urining.");
                }
            });
        });
        req.on('error', (e) => resolve("Aloqa uzildi: " + e.message));
        req.write(data);
        req.end();
    });
}

async function main() {
    try {
        const response = await api('getUpdates', { offset: lastUpdateId + 1, timeout: 30 });
        if (response.ok && response.result.length > 0) {
            for (const update of response.result) {
                lastUpdateId = update.update_id;
                if (update.message) await handleMessage(update.message);
                if (update.callback_query) await handleCallback(update.callback_query);
            }
        }
    } catch (e) { console.error(e.message); }
    setTimeout(main, 1000);
}

async function handleMessage(msg) {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;

    // Start komandasi
    if (text === '/start') {
        return api('sendMessage', { chat_id: chatId, text: "Assalomu alaykum! Men AI yordamchiman. Savolingizni yozing." });
    }

    // Admin javob yozayotgan holat
    if (chatId.toString() === ADMIN_ID.toString() && adminState[ADMIN_ID]) {
        const targetUserId = adminState[ADMIN_ID];
        await api('sendMessage', { chat_id: targetUserId, text: `👨‍💻 **Admin javobi:**\n\n${text}`, parse_mode: 'Markdown' });
        await api('sendMessage', { chat_id: ADMIN_ID, text: "✅ Javob yuborildi." });
        delete adminState[ADMIN_ID];
        return;
    }

    // Foydalanuvchi yozganda: AI javob beradi va adminga xabar ketadi
    if (chatId.toString() !== ADMIN_ID.toString()) {
        await api('sendChatAction', { chat_id: chatId, action: 'typing' });
        
        const aiReply = await getAIResponse(text);
        await api('sendMessage', { chat_id: chatId, text: aiReply });

        // Adminga bildirishnoma
        await api('sendMessage', {
            chat_id: ADMIN_ID,
            text: `👤 **Kimdan:** ${msg.from.first_name}\n🆔 **ID:** ${chatId}\n📝 **Savol:** ${text}\n\n🤖 **AI javobi:** ${aiReply}`,
            reply_markup: {
                inline_keyboard: [[{ text: "O'zim javob yozish ✍️", callback_data: `reply_${chatId}` }]]
            }
        });
    }
}

async function handleCallback(query) {
    if (query.data.startsWith('reply_')) {
        const userId = query.data.split('_')[1];
        adminState[ADMIN_ID] = userId;
        await api('answerCallbackQuery', { callback_query_id: query.id });
        await api('sendMessage', { chat_id: ADMIN_ID, text: `📝 ID: ${userId} uchun shaxsiy javobingizni yozing:` });
    }
}

main();
