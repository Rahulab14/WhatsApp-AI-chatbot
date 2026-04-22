import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.warn("WARNING: GEMINI_API_KEY is not set in environment variables.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const sessions = {};

const COURSE_INFO = process.env.COURSE_INFO || "We do not have course details currently.";

const SYSTEM_PROMPT = `
You are the AI Academy WhatsApp Chatbot. You represent the AI Academy.
You must answer questions related to the AI Academy course based strictly on the following details:
${COURSE_INFO}

Guidelines:
- Reply in 3 sentences or fewer.
- Reject queries that are out-of-context or unrelated to the AI Academy. Politely decline to answer those.
- Maintain a helpful, professional, yet conversational tone.
- Reply in the same language the user initiates with.
`;

function getSession(userId) {
    if (!sessions[userId]) {
        sessions[userId] = {
            history: [],
            lastInteraction: Date.now()
        };
    }
    return sessions[userId];
}

function checkStaticIntents(message) {
    const text = message.toLowerCase().trim();

    if (text === "ai-academy") {
        return "Thank you for reaching out to the AI Academy! How can I help you today?";
    }
    
    if (text.includes("price") || text.includes("fees") || text.includes("cost") || text.includes("fee")) {
        return "The fee for the AI Academy course varies based on your region. Please let me know your location or respond with 'Enroll' to register and an advisor will contact you with exact details.";
    }
    
    if (text === "enroll" || text.includes("want to enroll") || text.includes("register")) {
        return "Great! To complete your enrollment, please provide your Full Name and Email Address in your next message (e.g., 'Name: John Doe, Email: john@example.com').";
    }

    if (text.startsWith("name:") && text.includes("email:")) {
        return "Thank you for providing your details! Our admission counselor will reach out to you within 24 hours.";
    }
    
    return null;
}

export async function processMessage(userId, message) {
    try {
        const session = getSession(userId);
        session.lastInteraction = Date.now();

        const staticResponse = checkStaticIntents(message);
        if (staticResponse) {
            return staticResponse;
        }

        if (!GEMINI_API_KEY) {
            return "Systems are currently down. Please reach out to an advisor.";
        }
        
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const chatHistory = session.history.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        const chat = model.startChat({
            history: chatHistory,
            generationConfig: {
                maxOutputTokens: 150,
                temperature: 0.2,
            }
        });

        const promptWithContext = `Instruction: ${SYSTEM_PROMPT}\n\nUser: ${message}`;
        const result = await chat.sendMessage(promptWithContext);
        const textResponse = result.response.text();

        session.history.push({ role: 'user', content: message });
        session.history.push({ role: 'bot', content: textResponse });
        
        if (session.history.length > 20) {
            session.history = session.history.slice(session.history.length - 20);
        }

        return textResponse;
    } catch (error) {
        console.error("Chatbot processing error:", error.message);
        return "I'm having a little trouble understanding right now. Would you like to speak to a counselor? Send 'Enroll' to register.";
    }
}
