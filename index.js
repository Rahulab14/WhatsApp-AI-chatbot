import express from 'express';
import axios from 'axios';
import 'dotenv/config';
import { processMessage } from './chatbot.js';

const app = express();
app.use(express.json());

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

const WHAPI_TOKEN = process.env.WHAPI_TOKEN;

app.get('/', (req, res) => {
    res.send("Chatbot server is running! 🤖 Use /webhook for the WhatsApp webhook.");
});

app.get('/webhook', (req, res) => {
    res.send("Webhook is live 🚀");
});

app.post(['/webhook', '/webhook/whapi'], (req, res) => {
    console.log(`POST ${req.path} hit!`);
    res.sendStatus(200); 

    (async () => {
        try {
            console.log("WEBHOOK HIT ✅");
            
            const msgObj = req.body?.messages?.[0];
            
            if (!msgObj || msgObj?.from_me) {
                return;
            }

            const message = msgObj?.text?.body;
            const from = msgObj?.from;

            if (!message) return;

            console.log(`FROM: ${from} | TEXT: ${message}`);

            const reply = await processMessage(from, message);

            if (from && reply) {
                console.log("Sending reply to:", from);
                await axios.post(
                    "https://gate.whapi.cloud/messages/text",
                    {
                        to: from,
                        body: reply
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${WHAPI_TOKEN}`
                        }
                    }
                );
                console.log("Reply sent! ✅");
            }

        } catch (error) {
            console.error("❌ ASYNC PROCESS ERROR:", error.message);
        }
    })();
});

async function setWebhook() {
    const RENDER_URL = process.env.RENDER_URL;
    if (!RENDER_URL) {
        console.log("⚠️ RENDER_URL not set. Skipping webhook registration.");
        return;
    }
    const baseUrl = RENDER_URL.replace(/\/$/, '').replace(/\/webhook(\/whapi)?$/, '');
    const webhookUrl = `${baseUrl}/webhook`;
    
    try {
        await axios.patch(
            "https://gate.whapi.cloud/settings",
            {
                webhook_url: webhookUrl,
                webhook_enabled: true
            },
            {
                headers: {
                    Authorization: `Bearer ${WHAPI_TOKEN}`
                }
            }
        );
        console.log(`✅ Webhook successfully set to: ${webhookUrl}`);
    } catch (error) {
        console.error("❌ Failed to set webhook:", error.response?.data || error.message);
    }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT} 🚀`);
    await setWebhook();
});
