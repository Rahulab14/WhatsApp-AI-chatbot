import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const WHAPI_TOKEN = process.env.WHAPI_TOKEN;
const WHAPI_API_URL = process.env.WHAPI_API_URL || 'https://gate.whapi.cloud';

if (!WHAPI_TOKEN) {
    console.warn("WARNING: WHAPI_TOKEN is not set in environment variables.");
}

function isValidNumber(phone) {
    if (phone.includes('@s.whatsapp.net')) {
        return true;
    }
    return /^\d{10,15}$/.test(phone.replace(/\D/g, ''));
}

export async function sendMessage(to, body) {
    if (!isValidNumber(to)) {
        console.error(`Invalid WhatsApp number format: ${to}`);
        throw new Error("Invalid phone number");
    }

    try {
        const response = await axios.post(`${WHAPI_API_URL}/messages/text`, {
            to: to,
            body: body,
        }, {
            headers: {
                'Authorization': `Bearer ${WHAPI_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        return response.data;
    } catch (error) {
        console.error("Whapi API Error:", error.response?.data || error.message);
        throw error;
    }
}


