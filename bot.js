const https = require('https');
const http = require('http');

// TOKENLARNI SHU YERGA YOZING
const TOKEN = "8263789071:AAEDCu_fRkOakUkT8EkzhUDjL10bpxDxWXI";
const ADMIN_ID = "6230877154"; 

let lastUpdateId = 0;
let adminState = {}; 

// Render uchun port (O'zgartirmang)
http.createServer((req, res) => {
    res.write("AI Bot is running");
    res.end();
}).listen(process.env.PORT || 10000);

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
    } catch (e) { console.error("Xatolik:", e.message); }
    setTimeout(main, 1000);
}

async function handleMessage(msg) {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === '/start') {
        return api('sendMessage', { chat_id: chatId, text: "Assalomu alaykum! Xabaringizni yozing." });
    }

    // Admin javob yozayotgan holat
    if (chatId.toString() === ADMIN_ID.toString() && adminState[ADMIN_ID]) {
        const targetUserId = adminState[ADMIN_ID];
        await api('sendMessage', { 
            chat_id: targetUserId, 
            text: `👨‍💻 **Admin javobi:**\n\n${text}`, 
            parse_mode: 'Markdown' 
        });
        await api('sendMessage', { chat_id: ADMIN_ID, text: "✅ Javob yuborildi." });
        delete adminState[ADMIN_ID];
        return;
    }

    // Foydalanuvchidan adminga
    if (chatId.toString() !== ADMIN_ID.toString()) {
        await api('sendMessage', {
            chat_id: ADMIN_ID,
            text: `📩 **Yangi xabar!**\nKimdan: ${msg.from.first_name}\nID: ${chatId}\n\nMatn: ${text}`,
            reply_markup: {
                inline_keyboard: [[
                    { text: "Javob berish ✍️", callback_data: `reply_${chatId}` }
                ]]
            }
        });
        return api('sendMessage', { chat_id: chatId, text: "Xabaringiz yuborildi." });
    }
}

async function handleCallback(query) {
    const data = query.data;
    if (data.startsWith('reply_')) {
        const userId = data.split('_')[1];
        adminState[ADMIN_ID] = userId;
        await api('answerCallbackQuery', { callback_query_id: query.id });
        await api('sendMessage', { 
            chat_id: ADMIN_ID, 
            text: `📝 ID: ${userId} uchun javob yozing:` 
        });
    }
}

main();
