const express = require('express');
const axios = require('axios');
const Papa = require('papaparse');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;
const META_TOKEN = process.env.META_TOKEN ? process.env.META_TOKEN.trim() : null;

// --- IDENTIFICADOR OFICIAL DE URUGUAY ---
const PHONE_NUMBER_ID = '1008035252394269';

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTKKZ2XtvAj_i310MNaCMYnaSbd1vsl-UjoACcth4hYq9pgq920NATvMyQZTXS_PbP8kA8nxjDRWcj-/pub?output=csv';
const TG_TOKEN = process.env.TELEGRAM_TOKEN;
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// --- INTERFAZ DE ALTO IMPACTO ---
async function enviarMenuPrincipal(remitente) {
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
                    header: { type: 'text', text: '🦅 SISTEMA S.I.G.A.' },
                    body: { text: '*Bienvenido a la IA de San José en Marcha.*\n\nSoy tu puente directo con la gestión departamental. Aquí puedes auditar, reportar y entender cómo avanza San José.\n\n_¿En qué frente operamos hoy?_' },
                    footer: { text: 'Transparencia Radical | SanJoséEnMarcha.uy' },
                    action: {
                        button: 'DESPLEGAR MENÚ',
                        sections: [
                            {
                                title: '🔍 TRANSPARENCIA ACTIVA',
                                rows: [
                                    { id: 'opt_1', title: 'S.I.G.A. Explica', description: 'Traduce términos técnicos y mitos' },
                                    { id: 'opt_6', title: 'Canal de Novedades', description: 'Únete a nuestra comunidad oficial' }
                                ]
                            },
                            {
                                title: '🚧 CONTROL CIUDADANO',
                                rows: [
                                    { id: 'opt_2', title: 'Portal de Denuncias', description: 'Reportes de ética y transparencia' },
                                    { id: 'opt_3', title: 'Monitor de Reclamos', description: 'Mapa de baches y servicios' }
                                ]
                            },
                            {
                                title: '🏛️ GESTIÓN Y EQUIPO',
                                rows: [
                                    { id: 'opt_4', title: 'Info Institucional', description: 'Horarios, Teléfonos y Gabinete' },
                                    { id: 'opt_5', title: 'Contacto Humano', description: 'Habla con un integrante del equipo' }
                                ]
                            }
                        ]
                    }
                }
            }
        });
    } catch (e) { console.error("Error Menú:", e.response?.data || e.message); }
}

async function enviarRespuestaIA(remitente, titulo, contenido, link = "") {
    let cuerpo = `${titulo}\n\n${contenido}`;
    if(link) cuerpo += `\n\n🔗 *Enlace:* ${link}`;
    cuerpo += `\n\n__________________________\n_Envía *0* para el Menú o visita_\n*SanJoseEnMarcha.uy* 🦅`;
    try {
        await axios({
            method: 'POST',
            url: `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
            headers: { 'Authorization': `Bearer ${META_TOKEN}`, 'Content-Type': 'application/json' },
            data: { messaging_product: 'whatsapp', to: remitente, text: { body: cuerpo } }
        });
    } catch (e) { console.error("Error Respuesta:", e.response?.data || e.message); }
}

// --- WEBHOOK INTELIGENTE ---
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

        const disparadores = ['hola', 'ola', 'buenas', 'buen dia', 'q tal', 'que tal', 'menu', '0', '.', 'inicio', 'siga', 'ayuda'];
        if (disparadores.includes(input) || input.length <= 2 || input === "") {
            await enviarMenuPrincipal(remitente); return;
        }

        if (input.includes('denuncia') || input.includes('queja')) input = 'opt_2';
        else if (input.includes('bache') || input.includes('luz') || input.includes('basura')) input = 'opt_3';

        switch(input) {
            case 'opt_1':
                await enviarRespuestaIA(remitente, "📖 *S.I.G.A. EXPLICA*", "La gestión no debe ser un secreto. Escribe cualquier término que no entiendas.\n\n_Ejemplo: licitación, viáticos, TOCAF._");
                break;
            case 'opt_2':
                await enviarRespuestaIA(remitente, "⚖️ *TRANSPARENCIA TOTAL*", "Tu denuncia es procesada con reserva. San José en Marcha vigila por ti.", "https://sanjoseenmarcha.uy/denuncias");
                break;
            case 'opt_3':
                await enviarRespuestaIA(remitente, "🚧 *MONITOR TERRITORIAL*", "Tu reporte alimenta el mapa de gestión en tiempo real.", "https://sanjoseenmarcha.uy/monitor-territorial");
                break;
            case 'opt_4':
                await enviarRespuestaIA(remitente, "🏛️ *INFO INSTITUCIONAL*", "📍 Sede: Asamblea 496\n📞 Tel: 4342 9000\n🕒 Lun a Vie (09-15hs)", "https://sanjoseenmarcha.uy/gabinete");
                break;
            case 'opt_5':
                if (TG_TOKEN && TG_CHAT_ID) {
                    await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, { chat_id: TG_CHAT_ID, text: `🚨 *ALERTA:* Vecino *wa.me/${remitente}* solicita contacto humano.`, parse_mode: 'Markdown' });
                }
                await enviarRespuestaIA(remitente, "👤 *CONEXIÓN HUMANA*", "He notificado a la mesa de entrada. Un compañero revisará tu caso pronto.");
                break;
            case 'opt_6':
                await enviarRespuestaIA(remitente, "📢 *CANAL DE NOVEDADES*", "Únete para recibir la información que la Intendencia no siempre cuenta.", "https://whatsapp.com/channel/0029VbC0IAD65yDKij0cZ62e");
                break;
        }

        if (input.length > 2 && !input.startsWith('opt_')) {
            const query = input.replace('siga ', '').trim();
            const resp = await axios.get(CSV_URL);
            const data = Papa.parse(resp.data, { header: true, skipEmptyLines: true }).data;
            const resu = data.find(i => {
                const p = i.Palabra?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";
                return p.includes(query);
            });
            if (resu) {
                let info = `*Término:* ${resu.Palabra}\n\n🏛️ *Explicación:* ${resu['Traduccion SIGA']}`;
                if(resu.Impacto) info += `\n\n⚠️ *Dato:* ${resu.Impacto.replace(/<[^>]*>?/gm, '')}`;
                await enviarRespuestaIA(remitente, "📖 *CONOCIMIENTO SIGA*", info);
            }
        }
    } catch (e) { console.error(e); }
});

app.get('/webhook', (req, res) => {
    if (req.query["hub.verify_token"] === 'SIGAMARCHA2026') res.status(200).send(req.query["hub.challenge"]);
});

app.listen(PORT, '0.0.0.0', () => console.log(`🤖 AGENTE SIGA URUGUAY v4.5 ONLINE`));
