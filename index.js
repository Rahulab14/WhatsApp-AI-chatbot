const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

// 🔹 Gemini ONLY
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🔹 Token
const WHAPI_TOKEN = process.env.WHAPI_TOKEN;

//////////////////////////////////////////////////////////////////
// 🧠 GEMINI (ONLY AI)
//////////////////////////////////////////////////////////////////
async function generateGeminiReply(userMessage) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
You are a helpful AI Academy assistant.

Course Info:
- Module 1 & 2: Free
- Module 3 & 4: Paid (₹499 total)
- Certificate after completion
- Payment: https://ai-academy.example.com/pricing

User: ${userMessage}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    return response.text();
}

//////////////////////////////////////////////////////////////////
// 🌐 WEBHOOK
//////////////////////////////////////////////////////////////////

app.get('/webhook', (req, res) => {
    res.send("Webhook is live 🚀");
});

app.post('/webhook', (req, res) => {
    // 1. ACKNOWLEDGE IMMEDIATELY (Prevents 502/Timeout errors from Whapi/ngrok)
    res.sendStatus(200); 

    // 2. PROCESS ASYNCHRONOUSLY
    (async () => {
        try {
            console.log("WEBHOOK HIT ✅");
            
            const msgObj = req.body?.messages?.[0];
            
            // ❗ Ignore own messages or empty messages
            if (!msgObj || msgObj?.from_me) {
                return;
            }

            const message = msgObj?.text?.body;
            const from = msgObj?.from;

            if (!message) return;

            console.log("TEXT:", message);
            let reply;

            //////////////////////////////////////////////////////////////
            // 🚀 ENTRY MESSAGE (Case-insensitive & trimmed)
            //////////////////////////////////////////////////////////////
            if (message.trim().toLowerCase() === "ai-academy") {
                console.log("Sending welcome...");
                reply = "Thank you for reaching out to the AI Academy! How can I help you today?";
            } else {
                //////////////////////////////////////////////////////////
                // 🧠 ONLY GEMINI
                //////////////////////////////////////////////////////////
                try {
                    reply = await generateGeminiReply(message);
                } catch (error) {
                    console.error("❌ Gemini failed:", error.message);
                    reply = "Sorry! Something went wrong while thinking. Please try again later.";
                }
            }

            //////////////////////////////////////////////////////////////
            // 📩 SEND MESSAGE
            //////////////////////////////////////////////////////////////
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

//////////////////////////////////////////////////////////////////
// 🚀 SERVER
//////////////////////////////////////////////////////////////////
app.listen(3000, () => {
    console.log("Server running on port 3000 🚀");
});
