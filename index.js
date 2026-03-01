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

// --- ESTRUCTURA DE MENÚ PROFESIONAL ---
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
                    header: { type: 'text', text: '🦅 Agente S.I.G.A.' },
                    body: { text: '¡Hola! Soy *BOT-Siga*, la inteligencia de *San José en Marcha*.\n\nMi misión es facilitarte el acceso a la gestión departamental. ¿Qué consulta deseas realizar?' },
                    footer: { text: 'Transparencia en SanJoseEnMarcha.uy' },
                    action: {
                        button: 'Abrir Menú',
                        sections: [
                            {
                                title: '📖 CONOCIMIENTO',
                                rows: [
                                    { id: 'btn_1', title: 'Diccionario Cívico', description: 'Traducción de términos de gestión' }
                                ]
                            },
                            {
                                title: '🚧 ACCIÓN Y CONTROL',
                                rows: [
                                    { id: 'btn_2', title: 'Realizar Denuncia', description: 'Canal seguro y confidencial' },
                                    { id: 'btn_3', title: 'Monitor Territorial', description: 'Ver reclamos en el mapa' }
                                ]
                            },
                            {
                                title: '🏛️ INSTITUCIONAL',
                                rows: [
                                    { id: 'btn_4', title: 'Info y Gabinete', description: 'Autoridades y horarios' },
                                    { id: 'btn_5', title: 'Hablar con Equipo', description: 'Solicitar contacto humano' }
                                ]
                            }
                        ]
                    }
                }
            }
        });
    } catch (e) { console.error("Error botones:", e.response?.data || e.message); }
}

async function enviarRespuestaIA(remitente, cuerpo) {
    const mensajeFinal = `${cuerpo}\n\n__________________________\n_Escribe *0* para volver o visita_\n*SanJoseEnMarcha.uy* 🦅`;
    try {
        await axios({
            method: 'POST',
            url: `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
            headers: { 'Authorization': `Bearer ${META_TOKEN}`, 'Content-Type': 'application/json' },
            data: { messaging_product: 'whatsapp', to: remitente, text: { body: mensajeFinal } }
        });
    } catch (e) { console.error("Error Meta:", e.response?.data || e.message); }
}

// --- WEBHOOK ---
app.post('/webhook', async (req, res) => {
    res.sendStatus(200);
    try {
        const val = req.body.entry?.[0]?.changes?.[0]?.value;
        if (!val?.messages?.[0]) return;
        const msg = val.messages[0];
        const remitente = msg.from;

        let input = "";
        if (msg.type === 'text') {
            input = msg.text.body.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        } else if (msg.type === 'interactive') {
            input = msg.interactive.list_reply?.id || "";
        }

        // Radar de Saludos y Comandos Globales
        const reset = ['hola', 'menu', '0', '.', 'buenas', 'inicio', 'siga'];
        if (reset.includes(input) || input === "") {
            await enviarMenuBotones(remitente);
            return;
        }

        // Lógica de Botones
        switch(input) {
            case 'btn_1':
                await enviarRespuestaIA(remitente, `📖 *DICCIONARIO CÍVICO S.I.G.A.*\n\nLa gestión pública tiene palabras difíciles. Yo te las explico.\n\nEscribe la palabra *SIGA* seguida del término.\n_Ejemplo: siga viaticos_`);
                break;
            case 'btn_2':
                await enviarRespuestaIA(remitente, `⚖️ *DENUNCIA SEGURA*\n\nSi detectas una irregularidad, tu reporte es vital para la transparencia de San José.\n\n🔗 *Portal de Denuncias:* https://sanjoseenmarcha.uy/denuncias`);
                break;
            case 'btn_3':
                await enviarRespuestaIA(remitente, `🚧 *MONITOR TERRITORIAL*\n\nAccede al mapa interactivo de reclamos de todo el departamento. Reporta y controla baches, luces y servicios.\n\n🔗 *Mapa:* https://sanjoseenmarcha.uy/monitor-territorial`);
                break;
            case 'btn_4':
                await enviarRespuestaIA(remitente, `🏛️ *INFORMACIÓN INSTITUCIONAL*\n\n📍 *Sede:* Asamblea 496\n📞 *Tel:* 4342 9000\n🕒 *Atención:* Lun a Vie (09:00 - 15:00 hs)\n\n👥 *Gabinete Departamental:* https://sanjoseenmarcha.uy/gabinete`);
                break;
            case 'btn_5':
                if (TG_TOKEN && TG_CHAT_ID) {
                    await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
                        chat_id: TG_CHAT_ID,
                        text: `🚨 *ALERTA SIGA:* Vecino *wa.me/${remitente}* solicita atención humana.`,
                        parse_mode: 'Markdown'
                    });
                }
                await enviarRespuestaIA(remitente, `👤 *CONEXIÓN HUMANA*\n\nTu solicitud fue enviada al equipo de San José en Marcha. Un integrante te responderá por este chat a la brevedad.`);
                break;
        }

        // Buscador Diccionario (Prefijo siga)
        if (input.startsWith('siga ')) {
            const query = input.replace('siga ', '').trim();
            const resp = await axios.get(CSV_URL);
            const data = Papa.parse(resp.data, { header: true, skipEmptyLines: true }).data;
            const resu = data.find(i => i.Palabra?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(query));

            if (resu) {
                let info = `📖 *RESULTADO S.I.G.A.*\n\n*Término:* ${resu.Palabra}\n🏛️ *Traducción:* ${resu['Traduccion SIGA']}`;
                if(resu.Impacto) info += `\n\n⚠️ *Impacto:* ${resu.Impacto.replace(/<[^>]*>?/gm, '')}`;
                await enviarRespuestaIA(remitente, info);
            } else {
                await enviarRespuestaIA(remitente, `❌ No encontré "${query}" en el diccionario. He reportado tu búsqueda para que el equipo añada este término pronto.`);
            }
        }

    } catch (e) { console.error(e); }
});

app.get('/webhook', (req, res) => {
    if (req.query["hub.verify_token"] === 'SIGAMARCHA2026') res.status(200).send(req.query["hub.challenge"]);
});

app.listen(PORT, '0.0.0.0', () => console.log(`🤖 BOT-SIGA IA v2.1 ONLINE`));
