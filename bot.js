const https = require('https');
const http = require('http');

// TOKENLARNI SHU YERGA YOZING
const TOKEN = "8263789071:AAEDCu_fRkOakUkT8EkzhUDjL10bpxDxWXI";
const ADMIN_ID = "XXXXXXXXX"; // MyIDBot bergan raqamli IDingiz

let lastUpdateId = 0;

// Render uchun "Uyg'otuvchi" server
http.createServer((req, res) => {
    res.write("Bot is alive!");
    res.end();
}).listen(process.env.PORT || 10000);

// Telegramga so'rov yuborish funksiyasi
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

// Xabarlarni tekshirish
async function main() {
    try {
        const response = await api('getUpdates', { offset: lastUpdateId + 1, timeout: 30 });
        if (response.ok && response.result.length > 0) {
            for (const update of response.result) {
                lastUpdateId = update.update_id;
                if (update.message && update.message.text) {
                    const chatId = update.message.chat.id;
                    const text = update.message.text;
                    
                    // Botga xabar kelsa, o'sha xabarni o'ziga qaytaradi (Echo)
                    await api('sendMessage', { 
                        chat_id: chatId, 
                        text: `Siz yozdingiz: ${text}` 
                    });
                }
            }
        }
    } catch (e) {
        console.log("Xato yuz berdi:", e.message);
    }
    setTimeout(main, 1000); // Har 1 soniyada tekshirish
}

main();
