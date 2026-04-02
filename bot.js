const https = require('https');
const http = require('http');

// TOKENLARNI SHU YERGA YOZING
const TOKEN = "8263789071:AAEDCu_fRkOakUkT8EkzhUDjL10bpxDxWXI";
const ADMIN_ID = "6230877154";  
const GEMINI_KEY = "AIzaSyDDc8eJpPFLsevEnboYKvcRoDFQE__7Iao"

let lastUpdateId = 0;
let adminState = {};
let userPersona = {}; // Har bir foydalanuvchi qaysi personani tanlaganini saqlaydi

// Render porti
http.createServer((req, res) => {
    res.write("Multi-Persona AI Bot is Live");
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

// Gemini AI Persona tizimi
function getAIResponse(prompt, persona) {
    let systemInstruction = "";
    if (persona === "critic") systemInstruction = "Sen qattiqqo'l tanqidchi va filosofsan. Har bir gapga shubha bilan qara va foydalanuvchini o'ylantir.";
    else if (persona === "friend") systemInstruction = "Sen juda quvnoq, hazilkash va yaqin do'stsan. O'zbekcha 'ko'cha' tilida, do'stona va quvnoq gaplash.";
    else systemInstruction = "Sen aqlli va odobli yordamchisan. Har bir savolga aniq va foydali javob ber.";

    return new Promise((resolve) => {
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
        const data = JSON.stringify({
            contents: [{ parts: [{ text: `${systemInstruction}\n\nFoydalanuvchi: ${prompt}` }] }]
        });
        const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    resolve(json.candidates[0].content.parts[0].text);
                } catch (e) { resolve("Hozircha dam olyapman."); }
            });
        });
        req.write(data);
        req.end();
    });
}

// Video yuklash (Cobalt)
function getVideoUrl(videoLink) {
    return new Promise((resolve) => {
        const data = JSON.stringify({ url: videoLink });
        const options = { hostname: 'api.cobalt.tools', method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' } };
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => { try { resolve(JSON.parse(body).url); } catch (e) { resolve(null); } });
        });
        req.write(data);
        req.end();
    });
}

async function handleMessage(msg) {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (!text) return;

    // Start va Persona tanlash
    if (text === '/start' || text === '/persona') {
        return api('sendMessage', {
            chat_id: chatId,
            text: "Kim bilan suhbatlashishni xohlaysiz?",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🤖 Aqlli Yordamchi", callback_data: "set_helper" }],
                    [{ text: "🧐 Qattiqqo'l Tanqidchi", callback_data: "set_critic" }],
                    [{ text: "😎 Quvnoq Do'st", callback_data: "set_friend" }]
                ]
            }
        });
    }

    // Video link bo'lsa
    if (text.includes('http')) {
        await api('sendMessage', { chat_id: chatId, text: "🎥 Video yuklanyapti..." });
        const vUrl = await getVideoUrl(text);
        if (vUrl) return api('sendVideo', { chat_id: chatId, video: vUrl });
        else return api('sendMessage', { chat_id: chatId, text: "❌ Xato!" });
    }

    // AI bilan suhbat
    const persona = userPersona[chatId] || "helper";
    const reply = await getAIResponse(text, persona);
    await api('sendMessage', { chat_id: chatId, text: reply });
}

async function main() {
    const response = await api('getUpdates', { offset: lastUpdateId + 1, timeout: 30 });
    if (response.ok && response.result.length > 0) {
        for (const update of response.result) {
            lastUpdateId = update.update_id;
            if (update.message) await handleMessage(update.message);
            if (update.callback_query) {
                const chatId = update.callback_query.message.chat.id;
                const data = update.callback_query.data;
                if (data.startsWith('set_')) {
                    userPersona[chatId] = data.replace('set_', '');
                    await api('answerCallbackQuery', { callback_query_id: update.callback_query.id, text: "Tanlandi!" });
                    await api('sendMessage', { chat_id: chatId, text: "Yaxshi, endi men shu xarakterda javob beraman. Savolingizni yozing!" });
                }
            }
        }
    }
    setTimeout(main, 1000);
}

main();
