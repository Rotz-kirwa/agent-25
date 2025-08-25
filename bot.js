const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require("@whiskeysockets/baileys")
const { Boom } = require("@hapi/boom")

function detectLanguage(text) {
    const swahiliWords = ['habari', 'hujambo', 'asante', 'karibu', 'sawa', 'nzuri', 'vizuri', 'mambo', 'poa', 'freshi', 'naomba', 'tafadhali', 'pole', 'hongera', 'nina', 'niko', 'nataka', 'nahitaji', 'saa', 'sangapi', 'vipi', 'kwaheri', 'sasa']
    const lowerText = text.toLowerCase()
    return swahiliWords.some(word => lowerText.includes(word)) ? 'sw' : 'en'
}

function generateSmartResponse(text, lang) {
    const lowerText = text.toLowerCase()
    
    if (lowerText.includes('hi') || lowerText.includes('hello') || lowerText.includes('hujambo') || lowerText.includes('habari') || lowerText.includes('sasa')) {
        const timeOfDay = new Date().getHours()
        if (timeOfDay < 12) {
            return lang === 'sw' ? 'Habari za asubuhi! Nimefurahi kusikia kutoka kwako. Nini kiko akilini mwako leo?' : 'Good morning! Great to hear from you. What\'s on your mind today?'
        } else if (timeOfDay < 18) {
            return lang === 'sw' ? 'Habari za mchana! Je, siku yako inakwendaje?' : 'Good afternoon! How is your day going?'
        } else {
            return lang === 'sw' ? 'Habari za jioni! Natumai umepata siku nzuri.' : 'Good evening! Hope you had a good day.'
        }
    }
    
    if (lowerText.includes('advice') || lowerText.includes('ushauri')) {
        if (lowerText.includes('21') || lowerText.includes('young')) {
            return lang === 'sw' ? 
                'Umri wa miaka 21 ni wakati mzuri wa maisha! Hapa kuna ushauri muhimu: 1) Jifunze ujuzi mpya kila siku 2) Unda mahusiano mazuri 3) Okoa pesa kidogo 4) Jali afya yako 5) Usiogope kufanya makosa - ni sehemu ya kujifunza. Je, kuna eneo maalum unachotaka ushauri zaidi?' :
                'Age 21 is a great time in life! Here\'s important advice: 1) Learn new skills daily 2) Build good relationships 3) Save some money 4) Take care of your health 5) Don\'t fear making mistakes - it\'s part of learning. Is there a specific area you\'d like more advice on?'
        }
        return lang === 'sw' ? 
            'Nimefurahi kutoa ushauri! Lakini ningependa kujua zaidi kuhusu hali yako ili niweze kukupa ushauri unaofaa. Je, ni kuhusu kazi, mahusiano, elimu, au jambo lingine?' :
            'I\'m happy to give advice! But I\'d like to know more about your situation so I can give you suitable advice. Is it about work, relationships, education, or something else?'
    }
    
    if (lowerText.includes('time') || lowerText.includes('saa') || lowerText.includes('sangapi')) {
        const now = new Date()
        const timeStr = now.toLocaleTimeString('en-US', { hour12: false })
        return lang === 'sw' ? `Saa sasa ni ${timeStr}. Je, kuna kitu kingine unachotaka kujua?` : `Current time is ${timeStr}. Is there anything else you'd like to know?`
    }
    
    if (lowerText.includes('how are you') || lowerText.includes('habari yako') || lowerText.includes('mambo vipi')) {
        return lang === 'sw' ? 'Mimi ni mzuri, asante kwa kuuliza! Natumai wewe pia uko vizuri. Je, kuna kitu unachotaka tuzungumze?' : 'I\'m doing well, thanks for asking! I hope you\'re doing well too. Is there something you\'d like to talk about?'
    }
    
    if (lowerText === 'good' || lowerText === 'fine' || lowerText === 'okay' || lowerText === 'nzuri' || lowerText === 'poa') {
        return lang === 'sw' ? 'Vizuri sana! Nimefurahi kusikia hivyo. Je, kuna kitu unachotaka tuzungumze au kujua?' : 'That\'s great! I\'m happy to hear that. Is there something you\'d like to talk about or know?'
    }
    
    if (lowerText === 'yeah' || lowerText === 'yes' || lowerText === 'ndio' || lowerText === 'sawa') {
        return lang === 'sw' ? 'Sawa! Nini ungependa tuzungumze? Niko hapa kukusaidia.' : 'Alright! What would you like to talk about? I\'m here to help.'
    }
    
    if (lowerText.includes('thank') || lowerText.includes('asante')) {
        return lang === 'sw' ? 'Karibu sana! Nimefurahi kukusaidia. Je, kuna kitu kingine?' : 'You\'re very welcome! I\'m happy to help. Is there anything else?'
    }
    
    if (lowerText.includes('bye') || lowerText.includes('kwaheri')) {
        return lang === 'sw' ? 'Kwaheri! Tuonane tena. Uwe na siku njema!' : 'Goodbye! See you again. Have a great day!'
    }
    
    return lang === 'sw' ? 
        'Naelewa unachosema. Je, unaweza kunieleza zaidi ili niweze kukusaidia vizuri zaidi?' :
        'I understand what you\'re saying. Could you tell me more so I can help you better?'
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info")
    const sock = makeWASocket({ auth: state })

    sock.ev.on("creds.update", saveCreds)

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update
        
        if (qr) {
            console.log("📱 QR Code:", qr)
            console.log("Scan this QR code with WhatsApp")
            
            const fs = require('fs')
            const html = `<!DOCTYPE html>
<html>
<head>
    <title>WhatsApp QR Code</title>
    <script src="https://cdn.jsdelivr.net/npm/qrious@4.0.2/dist/qrious.min.js"></script>
</head>
<body>
    <h2>Scan this QR code with WhatsApp</h2>
    <canvas id="qrcode"></canvas>
    <script>
        window.onload = function() {
            new QRious({
                element: document.getElementById('qrcode'),
                value: "${qr}",
                size: 256
            });
        };
    </script>
</body>
</html>`
            fs.writeFileSync('qr.html', html)
            console.log("🌐 QR code saved to qr.html - open in browser")
        }
        
        if (connection === "close") {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            console.log("❌ Disconnected", lastDisconnect?.error, " Reconnect:", shouldReconnect)
            if (shouldReconnect) startBot()
        } else if (connection === "open") {
            console.log("✅ WhatsApp connected!")
        }
    })

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify") return

        const msg = messages[0]
        if (!msg.message || msg.key.fromMe) return

        const sender = msg.key.remoteJid
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text
        
        if (!text) return
        
        console.log(`📩 New message from ${sender}: ${text}`)

        try {
            const language = detectLanguage(text)
            const response = generateSmartResponse(text, language)
            
            setTimeout(async () => {
                await sock.sendMessage(sender, { text: response })
                console.log(`🤖 Reply sent (${language}): ${response}`)
            }, 1000 + Math.random() * 2000)
            
        } catch (error) {
            console.error("❌ Error:", error)
            const errorMsg = detectLanguage(text) === 'sw' ? 
                "Samahani, kuna hitilafu kidogo. Jaribu tena! 😅" : 
                "Sorry, there was a small error. Please try again! 😅"
            await sock.sendMessage(sender, { text: errorMsg })
        }
    })
}

startBot()