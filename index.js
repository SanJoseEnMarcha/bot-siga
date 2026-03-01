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

// --- MOTOR DE RESPUESTAS INTERACTIVAS ---
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
                    header: { type: 'text', text: '🦅 Eje Central S.I.G.A.' },
                    body: { text: 'Soy *BOT-Siga*, la inteligencia de *San José en Marcha*.\n\nHe sido diseñado para romper el muro entre la Intendencia y tú. ¿En qué frente operamos hoy?' },
                    footer: { text: 'Transparencia total en SanJoseEnMarcha.uy' },
                    action: {
                        button: 'Abrir Panel',
                        sections: [
                            {
                                title: '🔍 TRANSPARENCIA Y LÉXICO',
                                rows: [
                                    { id: 'btn_1', title: '📖 Diccionario Cívico', description: 'Traduce la burocracia a idioma vecino' }
                                ]
                            },
                            {
                                title: '🚧 ACCIÓN TERRITORIAL',
                                rows: [
                                    { id: 'btn_2', title: '⚖️ Denuncia Segura', description: 'Reporta irregularidades con reserva' },
                                    { id: 'btn_3', title: '📍 Reclamos Inteligentes', description: 'Monitor Territorial de San José' }
                                ]
                            },
                            {
                                title: '🏛️ INSTITUCIONAL',
                                rows: [
                                    { id: 'btn_4', title: '👥 Gabinete y Horarios', description: 'Quién es quién en la gestión' },
                                    { id: 'btn_5', title: '👤 Contacto Directo', description: 'Habla con un integrante del equipo' }
                                ]
                            }
                        ]
                    }
                }
            }
        });
    } catch (e) { console.error("Error botones:", e.response?.data || e.message); }
}

async function enviarRespuestaIA(remitente, titulo, contenido, link = "") {
    let cuerpo = `${titulo}\n\n${contenido}`;
    if(link) cuerpo += `\n\n🔗 *Más info:* ${link}`;
    cuerpo += `\n\n__________________________\n_Escribe *0* para el Menú o visita_\n*SanJoseEnMarcha.uy* 🦅`;

    try {
        await axios({
            method: 'POST',
            url: `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
            headers: { 'Authorization': `Bearer ${META_TOKEN}`, 'Content-Type': 'application/json' },
            data: { messaging_product: 'whatsapp', to: remitente, text: { body: cuerpo } }
        });
    } catch (e) { console.error("Error Meta:", e.response?.data || e.message); }
}

// --- WEBHOOK PRINCIPAL ---
app.post('/webhook', async (req, res) => {
    res.sendStatus(200);
    try {
        const val = req.body.entry?.[0]?.changes?.[0]?.value;
        if (!val?.messages?.[0]) return;
        const msg = val.messages[0];
        const remitente = msg.from;

        // 1. DETECCIÓN DE UBICACIÓN (INNOVACIÓN GPS)
        if (msg.type === 'location') {
            await enviarRespuestaIA(remitente, "📍 *UBICACIÓN RECIBIDA*", "He detectado tus coordenadas. En San José en Marcha usamos esta tecnología para que tu reclamo sea exacto. \n\nPara completar el reporte en el mapa oficial, pulsa aquí:", "https://sanjoseenmarcha.uy/monitor-territorial");
            return;
        }

        let input = "";
        if (msg.type === 'text') input = msg.text.body.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        else if (msg.type === 'interactive') input = msg.interactive.list_reply?.id || "";

        // SALUDOS Y RESET
        if (['hola', 'menu', '0', '.', 'buenas', 'info', 'inicio'].includes(input) || input === "") {
            await enviarMenuBotones(remitente);
            return;
        }

        // ACCIONES POR BOTÓN
        switch(input) {
            case 'btn_1':
                await enviarRespuestaIA(remitente, "📖 *DICCIONARIO CÍVICO*", "La burocracia se diseñó para no entenderse. Nosotros la desencriptamos.\n\nEscribe *SIGA* seguido de la palabra (Ej: siga licitacion).");
                break;
            case 'btn_2':
                await enviarRespuestaIA(remitente, "⚖️ *DENUNCIA SEGURA*", "La transparencia es la base de nuestra marcha. Tu denuncia es procesada con total reserva en nuestro portal oficial:", "https://sanjoseenmarcha.uy/denuncias");
                break;
            case 'btn_3':
                await enviarRespuestaIA(remitente, "🚧 *MONITOR TERRITORIAL*", "No solo reportas, controlas. Mira el mapa de baches, luces e incidencias de todo el departamento aquí:", "https://sanjoseenmarcha.uy/monitor-territorial");
                break;
            case 'btn_4':
                await enviarRespuestaIA(remitente, "🏛️ *INFO INSTITUCIONAL*", "📍 *Sede:* Asamblea 496\n📞 *Central:* 4342 9000\n🕒 *Atención:* Lun a Vie (09-15hs)\n\nConoce a quienes lideran cada área en el Gabinete:", "https://sanjoseenmarcha.uy/gabinete");
                break;
            case 'btn_5':
                if (TG_TOKEN && TG_CHAT_ID) {
                    await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
                        chat_id: TG_CHAT_ID,
                        text: `🚨 *ALERTA SIGA:* El vecino *wa.me/${remitente}* solicita contacto humano urgente.`,
                        parse_mode: 'Markdown'
                    });
                }
                await enviarRespuestaIA(remitente, "👤 *CONEXIÓN HUMANA*", "Tu solicitud ha sido enviada al centro de mando. Un integrante del equipo de San José en Marcha revisará tu caso para responderte por este medio.");
                break;
        }

        // BUSCADOR SIGA
        if (input.startsWith('siga ')) {
            const query = input.replace('siga ', '').trim();
            const resp = await axios.get(CSV_URL);
            const data = Papa.parse(resp.data, { header: true, skipEmptyLines: true }).data;
            const resu = data.find(i => i.Palabra?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(query));

            if (resu) {
                let info = `*Término:* ${resu.Palabra}\n\n🏛️ *Traducción:* ${resu['Traduccion SIGA']}`;
                if(resu.Impacto) info += `\n\n⚠️ *Impacto en tu vida:* ${resu.Impacto.replace(/<[^>]*>?/gm, '')}`;
                await enviarRespuestaIA(remitente, "📖 *RESULTADO S.I.G.A.*", info);
            } else {
                await enviarRespuestaIA(remitente, "❌ *SIN RESULTADOS*", `No encontré "${query}" en nuestro radar. Pero no te preocupes, ya lo he reportado para que nuestro equipo lo traduzca pronto.`);
            }
        }

    } catch (e) { console.error(e); }
});

app.get('/webhook', (req, res) => {
    if (req.query["hub.verify_token"] === 'SIGAMARCHA2026') res.status(200).send(req.query["hub.challenge"]);
});

app.listen(PORT, '0.0.0.0', () => console.log(`🤖 BOT-SIGA IA v2.0 ONLINE`));
