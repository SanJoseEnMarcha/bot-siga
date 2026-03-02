const express = require('express');
const axios = require('axios');
const Papa = require('papaparse');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;
const META_TOKEN = process.env.META_TOKEN ? process.env.META_TOKEN.trim() : null;

// --- IDENTIFICADOR OFICIAL URUGUAY (092 404 606) ---
const PHONE_NUMBER_ID = '1008035252394269'; 

// --- LAS DOS BASES DE DATOS OFICIALES ---
const CSV_DICCIONARIO_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTKKZ2XtvAj_i310MNaCMYnaSbd1vsl-UjoACcth4hYq9pgq920NATvMyQZTXS_PbP8kA8nxjDRWcj-/pub?output=csv';
const CSV_DMR_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSCx1fDUJt7byF6CETqsqIycMFy0A5yt-k-I4hghZWFIHZWgiSZJNjVQI5BIF9YOsaoPJc-HYbUDioT/pub?output=csv';

const TG_TOKEN = process.env.TELEGRAM_TOKEN;
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// --- NUEVO MENÚ OMNICANAL (Sincronizado con Web) ---
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
                    body: { text: '*Bienvenido a la IA de San José en Marcha.*\n\nSoy tu puente directo con la gestión departamental. Elige una opción para operar:' },
                    footer: { text: 'Transparencia Radical | SanJoseEnMarcha.uy' },
                    action: {
                        button: 'DESPLEGAR MENÚ',
                        sections: [
                            {
                                title: '🔍 TRANSPARENCIA Y VERDAD',
                                rows: [
                                    { id: 'opt_1', title: 'Desencriptador Cívico', description: 'Diccionario de la Intendencia' },
                                    { id: 'opt_7', title: 'Dato Mata Relato', description: 'Contrastamos relatos con datos' },
                                    { id: 'opt_9', title: 'Semáforo de Gestión', description: 'Audita el gasto en tiempo real' }
                                ]
                            },
                            {
                                title: '🚧 TERRITORIO EN MARCHA',
                                rows: [
                                    { id: 'opt_8', title: 'Mi Barrio Propone', description: 'Envía tu idea para San José' },
                                    { id: 'opt_2', title: 'Portal de Denuncias', description: 'Reportes de ética y transparencia' },
                                    { id: 'opt_3', title: 'Mapa de Inversión', description: 'Monitor de obras y servicios' }
                                ]
                            },
                            {
                                title: '🏛️ POLÍTICA Y COMUNIDAD',
                                rows: [
                                    { id: 'opt_10', title: 'Radar Legislativo', description: 'Actividad de la Junta y Elecciones' },
                                    { id: 'opt_6', title: 'Canal de Novedades', description: 'Únete a nuestra comunidad oficial' },
                                    { id: 'opt_5', title: 'Contacto Humano', description: 'Habla con el equipo' }
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

// ==========================================
// 1. EL "OÍDO" DE WHATSAPP
// ==========================================
app.post('/webhook', async (req, res) => {
    res.sendStatus(200);
    try {
        const val = req.body.entry?.[0]?.changes?.[0]?.value;
        if (!val?.messages?.[0]) return;
        const msg = val.messages[0];
        const remitente = msg.from;

        let input = "";
        let rawInput = "";
        
        // --- RADAR INTELIGENTE E INTERCEPCIÓN ---
        if (msg.type === 'text') {
            rawInput = msg.text.body;
            input = rawInput.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
            
            if (TG_TOKEN && TG_CHAT_ID && input.length > 0) {
                await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
                    chat_id: TG_CHAT_ID,
                    text: `💬 _Historial de wa.me/${remitente}:_\n"${rawInput}"`,
                    parse_mode: 'Markdown',
                    disable_notification: true
                }).catch(e => console.error(e));
            }
        } else if (msg.type === 'interactive') {
            input = msg.interactive.list_reply?.id || "";
            if (TG_TOKEN && TG_CHAT_ID) {
                await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
                    chat_id: TG_CHAT_ID,
                    text: `🔘 _wa.me/${remitente} seleccionó una opción del menú._`,
                    parse_mode: 'Markdown',
                    disable_notification: true
                }).catch(e => console.error(e));
            }
        }

        // 💡 INTERCEPTOR DE PROPUESTAS ("MI BARRIO PROPONE")
        if (input.startsWith('propongo')) {
            if (TG_TOKEN && TG_CHAT_ID) {
                await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
                    chat_id: TG_CHAT_ID,
                    text: `💡 *NUEVA PROPUESTA CIUDADANA* 💡\nDe: wa.me/${remitente}\n\n"${rawInput}"`,
                    parse_mode: 'Markdown'
                }).catch(e => console.error(e));
            }
            await enviarRespuestaIA(remitente, "✅ *PROPUESTA REGISTRADA*", "¡Excelente iniciativa! Hemos archivado tu propuesta y notificado al equipo técnico de San José en Marcha. La sumaremos a nuestro Banco de Proyectos barriales.");
            return;
        }

        // RADAR DE SALUDOS
        const disparadores = ['hola', 'ola', 'holis', 'olis', 'buenas', 'guenas', 'buen dia', 'buenas tardes', 'buenas noches', 'q tal', 'que tal', 'menu', '0', '.', 'inicio', 'siga', 'ayuda', 'info', 'comandante'];
        if (disparadores.includes(input) || input.length <= 2 || input === "") {
            await enviarMenuPrincipal(remitente); return;
        }

        // COMANDOS DEL MENÚ OMNICANAL
        switch(input) {
            case 'opt_1':
                await enviarRespuestaIA(remitente, "🔑 *EL DESENCRIPTADOR CÍVICO*", "Escribe cualquier término que no entiendas de la gestión departamental para decodificarlo.\n\n_Ejemplo: licitación, viáticos, presupuesto._", "https://sanjoseenmarcha.uy/el-desencriptador-civico");
                return;
            case 'opt_7':
                await enviarRespuestaIA(remitente, "⚖️ *DATO MATA RELATO*", "Envíanos cualquier frase, promesa o relato de un político. El sistema S.I.G.A. lo cruzará con documentos oficiales para decirte la verdad.\n\n_Ejemplo: Escribe 'horas extras', 'peaje' o 'déficit'._", "https://sanjoseenmarcha.uy/fact-checking");
                return;
            case 'opt_9':
                await enviarRespuestaIA(remitente, "🚦 *SEMÁFORO DE GESTIÓN*", "Controla el estado de las obras, adjudicaciones y finanzas del departamento con nuestro sistema de auditoría visual interactivo.", "https://sanjoseenmarcha.uy/semaforo");
                return;
            case 'opt_8':
                await enviarRespuestaIA(remitente, "💡 *MI BARRIO PROPONE*", "¡Tu idea es el motor de San José!\n\nPara enviarla, simplemente escribe un mensaje que empiece con la palabra *PROPONGO* seguida de tu barrio y tu idea.\n\n_Ejemplo: PROPONGO en el Barrio Centro poner más luces en la plaza._");
                return;
            case 'opt_2':
                await enviarRespuestaIA(remitente, "⚖️ *TRANSPARENCIA TOTAL*", "Tu denuncia es procesada con reserva absoluta. San José en Marcha vigila por ti.", "https://sanjoseenmarcha.uy/denuncias");
                return;
            case 'opt_3':
                await enviarRespuestaIA(remitente, "🗺️ *MAPA DE INVERSIÓN*", "Conoce dónde se invierten los recursos y reporta fallas en los servicios públicos de tu barrio. Ingresa al mapa interactivo:", "https://sanjoseenmarcha.uy/mapa-de-inversion");
                return;
            case 'opt_10':
                await enviarRespuestaIA(remitente, "🏛️ *RADAR LEGISLATIVO*", "La transparencia también exige vigilar a quienes legislan. Accede a los informes sobre la Junta Departamental y el escenario electoral.", "https://sanjoseenmarcha.uy/legislativo");
                return;
            case 'opt_6':
                await enviarRespuestaIA(remitente, "📢 *CANAL OFICIAL DE NOVEDADES*", "¡Únete a nuestra comunidad oficial para recibir reportes de obras y transparencia!\n\n👉 *Únete aquí:* \nhttps://whatsapp.com/channel/0029Vb7ZMKZA2pLG3a3SL60T");
                return;
            case 'opt_5':
                if (TG_TOKEN && TG_CHAT_ID) {
                    await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, { 
                        chat_id: TG_CHAT_ID, 
                        text: `🚨 🚨 🚨 *ALERTA DE ASISTENCIA HUMANA* 🚨 🚨 🚨\n\nEl vecino *wa.me/${remitente}* necesita atención.\n\n_Para responderle desde aquí, copie y pegue:_ \n\`/responder ${remitente} Hola vecino, el equipo de San José en Marcha está a su disposición. ¿En qué lo podemos ayudar?\``, 
                        parse_mode: 'Markdown' 
                    }).catch(e => console.error(e));
                }
                await enviarRespuestaIA(remitente, "👤 *CONEXIÓN HUMANA*", "He notificado a la mesa de entrada. Un integrante del equipo de San José en Marcha revisará tu caso pronto.");
                return;
        }

        // 🛡️ DOBLE MOTOR DE BÚSQUEDA
        if (input.length > 2 && !input.startsWith('opt_')) {
            const query = input.replace('siga ', '').trim();

            const respDict = await axios.get(CSV_DICCIONARIO_URL);
            const dataDict = Papa.parse(respDict.data, { header: true, skipEmptyLines: true }).data;
            const resuDict = dataDict.find(i => {
                const p = i.Palabra?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";
                return p !== "" && (p.includes(query) || query.includes(p));
            });

            if (resuDict) {
                let info = `*Término:* ${resuDict.Palabra}\n\n🏛️ *Explicación:* ${resuDict['Traduccion SIGA']}`;
                if(resuDict.Impacto) info += `\n\n⚠️ *Dato Clave:* ${resuDict.Impacto.replace(/<[^>]*>?/gm, '')}`;
                await enviarRespuestaIA(remitente, "🔑 *DESENCRIPTADOR CÍVICO*", info);
                return;
            }

            const respDMR = await axios.get(CSV_DMR_URL);
            const dataDMR = Papa.parse(respDMR.data, { header: true, skipEmptyLines: true }).data;
            const resuDMR = dataDMR.find(i => {
                const p = i.PalabraClave?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";
                return p !== "" && (p.includes(query) || query.includes(p));
            });

            if (resuDMR) {
                let info = `${resuDMR.Veredicto}\n\n${resuDMR.Respuesta}`;
                if(resuDMR.Link && resuDMR.Link.trim() !== "" && resuDMR.Link.toLowerCase() !== "undefined") {
                    info += `\n\n🔗 *Fuente/Prueba:* ${resuDMR.Link}`;
                }
                await enviarRespuestaIA(remitente, "⚖️ *DATO MATA RELATO*", info);
                return;
            }

            await enviarRespuestaIA(remitente, "🤔 *MENSAJE NO RECONOCIDO*", "No logré encontrar esa palabra en mis registros ni reconocer el comando.\n\n💡 Si querías enviar una idea, recuerda empezar la frase con la palabra *PROPONGO*.\n\n👉 *Escribe 'Hola' o 'Menú' para ver las opciones principales.*");
        }
    } catch (e) { console.error("Error Crítico WA:", e.message); }
});

app.get('/webhook', (req, res) => {
    if (req.query["hub.verify_token"] === 'SIGAMARCHA2026') res.status(200).send(req.query["hub.challenge"]);
});

// ==========================================
// 2. EL "COMANDO DE FUEGO" (Recibe órdenes de Telegram)
// ==========================================
app.post('/telegram-webhook', async (req, res) => {
    res.sendStatus(200); 
    try {
        const tgMsg = req.body.message;
        if (!tgMsg || !tgMsg.text) return;

        const texto = tgMsg.text.trim();
        
        if (texto.startsWith('/responder')) {
            const partes = texto.split(' ');
            if (partes.length < 3) {
                await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, { chat_id: tgMsg.chat.id, text: `⚠️ *Error de formato.*\nDebe escribir: \`/responder NUMERO Su mensaje\``, parse_mode: 'Markdown' });
                return;
            }
            const numeroDestino = partes[1]; 
            const mensajeRespuesta = partes.slice(2).join(' '); 

            await axios({ method: 'POST', url: `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`, headers: { 'Authorization': `Bearer ${META_TOKEN}`, 'Content-Type': 'application/json' }, data: { messaging_product: 'whatsapp', to: numeroDestino, text: { body: mensajeRespuesta } } });
            await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, { chat_id: tgMsg.chat.id, text: `✅ *Respuesta enviada con éxito al vecino ${numeroDestino}*` });
        }
    } catch (error) { console.error("Error Comando de Fuego:", error.message); }
});

app.listen(PORT, '0.0.0.0', () => console.log(`🤖 AGENTE SIGA URUGUAY v5.2 (OMNICANALIDAD WEB) ONLINE`));
