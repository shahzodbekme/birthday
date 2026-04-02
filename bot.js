const https = require('https');
const http = require('http');

// TOKENLARNI SHU YERGA YOZING
const TOKEN = "8263789071:AAEDCu_fRkOakUkT8EkzhUDjL10bpxDxWXI";

let lastUpdateId = 0;

// Render uchun server (Uyg'oq turishi uchun)
http.createServer((req, res) => {
    res.write("Currency Bot is running");
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

// Markaziy Bankdan kurslarni olish
function getExchangeRates() {
    return new Promise((resolve) => {
        https.get('https://nbu.uz/uz/exchange-rates/json/', (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(body)); } catch (e) { resolve([]); }
            });
        }).on('error', () => resolve([]));
    });
}

async function handleMessage(msg) {
    const chatId = msg.chat.id;
    const text = msg.text ? msg.text.toUpperCase() : "";

    if (text === '/START') {
        return api('sendMessage', { 
            chat_id: chatId, 
            text: "Xush kelibsiz! Valyuta kursini bilish uchun bosing:",
            reply_markup: {
                keyboard: [[{ text: "💵 Kurslarni ko'rish" }], [{ text: "🔄 Konverter" }]],
                resize_keyboard: true
            }
        });
    }

    if (text === "💵 KURSLARNI KO'RISH") {
        const rates = await getExchangeRates();
        const usd = rates.find(r => r.code === "USD");
        const eur = rates.find(r => r.code === "EUR");
        const rub = rates.find(r => r.code === "RUB");

        let response = `📌 **Bugungi kurslar:**\n\n`;
        response += `🇺🇸 USD: ${usd ? usd.cb_price : "Noma'lum"} so'm\n`;
        response += `🇪🇺 EUR: ${eur ? eur.cb_price : "Noma'lum"} so'm\n`;
        response += `🇷🇺 RUB: ${rub ? rub.cb_price : "Noma'lum"} so'm`;

        return api('sendMessage', { chat_id: chatId, text: response, parse_mode: 'Markdown' });
    }

    if (text === "🔄 KONVERTER") {
        return api('sendMessage', { chat_id: chatId, text: "Hisoblash uchun miqdorni yozing (masalan: 100 usd yoki 500000 so'm)" });
    }

    // Oddiy konvertatsiya (masalan: 100 USD)
    const match = text.match(/(\d+)\s*(USD|EUR|RUB|SO'M|SOM)/);
    if (match) {
        const amount = parseFloat(match[1]);
        const currency = match[2];
        const rates = await getExchangeRates();
        const rate = rates.find(r => r.code === (currency === "SO'M" || currency === "SOM" ? "USD" : currency));

        if (rate) {
            let result;
            if (currency === "USD" || currency === "EUR" || currency === "RUB") {
                result = (amount * parseFloat(rate.cb_price)).toLocaleString();
                return api('sendMessage', { chat_id: chatId, text: `✅ ${amount} ${currency} = ${result} so'm` });
            } else {
                result = (amount / parseFloat(rate.cb_price)).toFixed(2);
                return api('sendMessage', { chat_id: chatId, text: `✅ ${amount} so'm = ${result} USD` });
            }
        }
    }
}

async function main() {
    const response = await api('getUpdates', { offset: lastUpdateId + 1, timeout: 30 });
    if (response.ok && response.result.length > 0) {
        for (const update of response.result) {
            lastUpdateId = update.update_id;
            if (update.message) await handleMessage(update.message);
        }
    }
    setTimeout(main, 1000);
}

main();
