const express = require('express');
const axios = require('axios');
const Papa = require('papaparse');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const META_TOKEN = process.env.META_TOKEN ? process.env.META_TOKEN.trim() : null;
const PHONE_NUMBER_ID = '961831007021911'; 
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTKKZ2XtvAj_i310MNaCMYnaSbd1vsl-UjoACcth4hYq9pgq920NATvMyQZTXS_PbP8kA8nxjDRWcj-/pub?output=csv';

const TG_TOKEN = process.env.TELEGRAM_TOKEN;
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// --- FUNCIÓN PARA ENVIAR BOTONES (LISTA INTERACTIVA) ---
async function enviarMenuBotones(remitente) {
    try {
        await axios({
            method: 'POST',
            url: `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
            headers: { 'Authorization': `Bearer ${META_TOKEN}`, 'Content-Type': 'application/json' },
            data: {
                messaging_product: 'whatsapp',
                to: remitente,
                type: 'interactive',
                interactive: {
                    type: 'list',
                    header: { type: 'text', text: '🦅 Terminal S.I.G.A.' },
                    body: { text: '¡Hola! Soy *BOT-Siga*, la IA de *San José en Marcha*. Estoy aquí para ayudarte a entender la gestión y mejorar nuestro departamento.\n\n¿Qué frente operamos hoy?' },
                    footer: { text: 'Más info en: SanJoseEnMarcha.uy' },
                    action: {
                        button: 'Ver Opciones',
                        sections: [{
                            title: 'Gestión Ciudadana',
                            rows: [
                                { id: 'btn_1', title: '📖 Diccionario Cívico', description: 'Desencripta la burocracia' },
                                { id: 'btn_2', title: '⚖️ Realizar Denuncia', description: 'Canal seguro y transparente' },
                                { id: 'btn_3', title: '🚧 Reclamos (Monitor)', description: 'Baches, luces y más' },
                                { id: 'btn_4', title: '🏛️ Info Intendencia', description: 'Horarios y Gabinete' },
                                { id: 'btn_5', title: '👤 Hablar con Equipo', description: 'Atención por un humano' }
                            ]
                        }]
                    }
                }
            }
        });
    } catch (e) { console.error("Error enviando botones:", e.response?.data || e.message); }
}

// --- FUNCIÓN PARA MENSAJES DE TEXTO SIMPLES ---
async function enviarMensaje(remitente, texto) {
    try {
        await axios({
            method: 'POST',
            url: `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
            headers: { 'Authorization': `Bearer ${META_TOKEN}`, 'Content-Type': 'application/json' },
            data: {
                messaging_product: 'whatsapp',
                to: remitente,
                text: { body: texto + `\n\n_Escribe *0* o *Menú* para volver._ 🔙` }
            }
        });
    } catch (e) { console.error("❌ Error Meta:", e.response?.data || e.message); }
}

// --- WEBHOOK ---
app.get('/webhook', (req, res) => {
    if (req.query["hub.verify_token"] === 'SIGAMARCHA2026') res.status(200).send(req.query["hub.challenge"]);
});

app.post('/webhook', async (req, res) => {
    res.sendStatus(200);
    try {
        const entry = req.body.entry?.[0]?.changes?.[0]?.value;
        if (!entry?.messages?.[0]) return;

        const msg = entry.messages[0];
        const remitente = msg.from;
        let texto = "";

        // CAPTURAR SI ES TEXTO O SI ES UN BOTÓN PRESIONADO
        if (msg.type === 'text') {
            texto = msg.text.body.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        } else if (msg.type === 'interactive') {
            texto = msg.interactive.list_reply?.id || "";
        }

        // 1. DISPARADOR DE MENÚ (Si saluda, pone un punto, escribe 0, etc.)
        const disparadores = ['hola', 'menu', '0', 'inicio', 'buenas', 'buen dia', '.', 'info', 'ayuda'];
        if (disparadores.includes(texto) || texto === "") {
            await enviarMenuBotones(remitente);
            return;
        }

        // 2. LÓGICA DE RESPUESTAS SEGÚN BOTÓN O NÚMERO
        if (texto === 'btn_1' || texto === '1') {
            await enviarMensaje(remitente, `📖 *MODO DESENCRIPTADOR*\n\nEscribe la palabra *SIGA* seguida del término que no entiendes.\n\n_Ejemplo: siga viaticos_`);
        } else if (texto === 'btn_2' || texto === '2') {
            await enviarMensaje(remitente, `⚖️ *DENUNCIA SEGURA*\nTu reporte es fundamental. Realízalo aquí:\n🔗 https://sanjoseenmarcha.uy/denuncias`);
        } else if (texto === 'btn_3' || texto === '3') {
            await enviarMensaje(remitente, `🚧 *MONITOR TERRITORIAL*\nReporta incidencias en tiempo real:\n🔗 https://sanjoseenmarcha.uy/monitor-territorial`);
        } else if (texto === 'btn_4' || texto === '4') {
            await enviarMensaje(remitente, `🏛️ *INFO INSTITUCIONAL*\n\n📍 *Asamblea 496*\n🕒 *Horario:* Lun a Vie (09:00 - 15:00)\n📞 *Tel:* 4342 9000\n👥 *Gabinete:* https://sanjoseenmarcha.uy/gabinete`);
        } else if (texto === 'btn_5' || texto === '5') {
            // ALERTA TELEGRAM
            if (TG_TOKEN && TG_CHAT_ID) {
                await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
                    chat_id: TG_CHAT_ID,
                    text: `🚨 *¡ALERTA HUMANA!*\nCiudadano: *wa.me/${remitente}*\nEsperando en Business Suite.`,
                    parse_mode: 'Markdown'
                });
            }
            await enviarMensaje(remitente, `👤 *CONEXIÓN HUMANA*\nHe avisado al equipo de San José en Marcha. Un compañero te contactará pronto.`);
        }

        // 3. DICCIONARIO INTELIGENTE
        if (texto.startsWith('siga ')) {
            const busqueda = texto.replace('siga ', '').trim();
            const response = await axios.get(CSV_URL);
            const dataSiga = Papa.parse(response.data, { header: true, skipEmptyLines: true }).data;
            const resultado = dataSiga.find(item => {
                const p = item.Palabra?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";
                return p.includes(busqueda);
            });

            if (resultado) {
                let resp = `📖 *DICCIONARIO S.I.G.A.*\n\n*Término:* ${resultado.Palabra}\n\n🏛️ *Traducción Ciudadana:*\n${resultado['Traduccion SIGA']}\n`;
                if(resultado.Impacto) resp += `\n⚠️ *Impacto:* ${resultado.Impacto.replace(/<[^>]*>?/gm, '')}`;
                await enviarMensaje(remitente, resp);
            } else {
                await enviarMensaje(remitente, `❌ No encontré "${busqueda}". Prueba con otra palabra.`);
            }
        }

    } catch (err) { console.error("Error:", err); }
});

app.listen(PORT, '0.0.0.0', () => console.log(`🤖 BOT-SIGA IA ONLINE`));
