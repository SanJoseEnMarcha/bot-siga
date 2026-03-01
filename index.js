const express = require('express');
const axios = require('axios');
const Papa = require('papaparse');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const META_TOKEN = process.env.META_TOKEN ? process.env.META_TOKEN.trim() : null;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'SIGAMARCHA2026';
const PHONE_NUMBER_ID = '961831007021911'; 
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTKKZ2XtvAj_i310MNaCMYnaSbd1vsl-UjoACcth4hYq9pgq920NATvMyQZTXS_PbP8kA8nxjDRWcj-/pub?output=csv';

const MENU_TEXT = `*TERMINAL S.I.G.A. - SAN JOSÉ EN MARCHA* 🦅\n\n` +
                 `¡Hola! Soy tu asistente ciudadano. ¿En qué te puedo ayudar hoy? 👇\n\n` +
                 `Responde con el *NÚMERO* de la opción:\n\n` +
                 `*1️⃣* 📖 Desencriptador Cívico (Diccionario)\n` +
                 `*2️⃣* ⚖️ Realizar una Denuncia\n` +
                 `*3️⃣* 🚧 Monitor Territorial (Reclamos)\n` +
                 `*4️⃣* 🏛️ Info y Gabinete de la Intendencia\n` +
                 `*5️⃣* 👤 Hablar con el equipo (Humano)`;

const VOLVER_MENU = `\n\nEscribe *0* o *Menú* para volver al inicio. 🔙`;

// 1. VERIFICACIÓN DE META
app.get('/webhook', (req, res) => {
    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];
    if (mode && token) {
        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

// 2. FUNCIÓN PARA ENVIAR MENSAJES
async function enviarMensaje(remitente, texto) {
    try {
        await axios({
            method: 'POST',
            url: `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
            headers: {
                'Authorization': `Bearer ${META_TOKEN}`,
                'Content-Type': 'application/json'
            },
            data: {
                messaging_product: 'whatsapp',
                to: remitente,
                text: { body: texto }
            }
        });
    } catch (error) {
        console.error("❌ Error enviando mensaje:", error.response ? error.response.data : error.message);
    }
}

// 3. RECEPCIÓN Y LÓGICA
app.post('/webhook', async (req, res) => {
    res.sendStatus(200); 
    try {
        let body = req.body;
        if (body.object === 'whatsapp_business_account') {
            let entry = body.entry[0];
            let changes = entry.changes[0];
            let value = changes.value;
            
            if (value.messages && value.messages[0]) {
                let msg = value.messages[0];
                let remitente = msg.from;
                
                if (msg.type === 'text') {
                    let texto = msg.text.body.toLowerCase().trim();
                    console.log(`📩 Mensaje de ${remitente}: ${texto}`);

                    if (['hola', 'menu', 'menú', '0', 'inicio', 'buenas'].includes(texto)) {
                        await enviarMensaje(remitente, MENU_TEXT);
                        return;
                    }

                    if (texto === '1') {
                        await enviarMensaje(remitente, `📖 *MODO DESENCRIPTADOR ACTIVO*\n\nPara traducir un término burocrático, escribe la palabra *SIGA* seguida de lo que buscas.\n\n👉 *Ejemplos:* \nsiga viaticos\nsiga tocaf` + VOLVER_MENU);
                        return;
                    }

                    if (texto === '2') {
                        await enviarMensaje(remitente, `⚖️ *CANAL DE DENUNCIAS*\n\nPuedes realizar tu denuncia de forma segura y oficial a través de nuestro portal:\n\n🔗 https://sanjoseenmarcha.uy/denuncias` + VOLVER_MENU);
                        return;
                    }

                    if (texto === '3') {
                        await enviarMensaje(remitente, `🚧 *MONITOR TERRITORIAL*\n\nAccede a nuestro sistema inteligente de reclamos para reportar incidencias en el mapa:\n\n🔗 https://sanjoseenmarcha.uy/monitor-territorial` + VOLVER_MENU);
                        return;
                    }

                    if (texto === '4') {
                        await enviarMensaje(remitente, `🏛️ *INFORMACIÓN INSTITUCIONAL*\n\n📍 *Dirección:* Asamblea 496, San José de Mayo.\n🕒 *Horario dependencias:* Lunes a Viernes de 09:00 a 15:00 hs.\n📞 *Teléfono Central:* 4342 9000\n\n👥 *Conoce al Gabinete:* \n🔗 https://sanjoseenmarcha.uy/gabinete` + VOLVER_MENU);
                        return;
                    }

                    if (texto === '5') {
                        await enviarMensaje(remitente, `👤 *CONEXIÓN HUMANA*\n\nHe notificado al equipo. Un compañero te responderá por aquí a la brevedad.` + VOLVER_MENU);
                        return;
                    }

                    if (texto.startsWith('siga ')) {
                        const busqueda = texto.replace('siga ', '').trim();
                        try {
                            const response = await axios.get(CSV_URL);
                            const dataSiga = Papa.parse(response.data, { header: true, skipEmptyLines: true }).data;
                            const resultado = dataSiga.find(item => 
                                item.Palabra && (item.Palabra.toLowerCase().includes(busqueda) || (item.Keywords && item.Keywords.toLowerCase().includes(busqueda)))
                            );

                            if (resultado) {
                                let mensaje = `📖 *DICCIONARIO S.I.G.A.*\n\n*Término:* ${resultado.Palabra}\n\n🏛️ *Traducción Ciudadana:*\n${resultado['Traduccion SIGA']}\n\n`;
                                if(resultado.Impacto) mensaje += `⚠️ ${resultado.Impacto.replace(/<[^>]*>?/gm, '')}`;
                                await enviarMensaje(remitente, mensaje + VOLVER_MENU);
                            } else {
                                await enviarMensaje(remitente, `❌ No encontré "${busqueda}". Prueba con otra palabra o escribe *0* para el menú.`);
                            }
                        } catch (e) { await enviarMensaje(remitente, '⚠️ Error en base de datos.'); }
                    }
                }
            }
        }
    } catch (err) { console.error(err); }
});

app.listen(PORT, '0.0.0.0', () => console.log(`🤖 S.I.G.A. OFICIAL - PUERTO ${PORT}`));
