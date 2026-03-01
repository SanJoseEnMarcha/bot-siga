const express = require('express');
const axios = require('axios');
const Papa = require('papaparse');

const app = express();
app.use(express.json()); // Fundamental para leer los mensajes de Meta

const PORT = process.env.PORT || 3000;
const META_TOKEN = process.env.META_TOKEN; 
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'SIGAMARCHA2026';
const PHONE_NUMBER_ID = '961831007021911'; // SU IDENTIFICADOR OFICIAL
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTKKZ2XtvAj_i310MNaCMYnaSbd1vsl-UjoACcth4hYq9pgq920NATvMyQZTXS_PbP8kA8nxjDRWcj-/pub?output=csv';

// 1. VERIFICACIÓN DE META (El escudo de seguridad)
app.get('/webhook', (req, res) => {
    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];

    if (mode && token) {
        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            console.log("✅ WEBHOOK VERIFICADO POR META");
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

// 2. FUNCIÓN PARA ENVIAR MENSAJES (El Cañón)
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
        console.error("❌ Error enviando mensaje a Meta:", error.response ? error.response.data : error.message);
    }
}

// 3. RECEPCIÓN DE MENSAJES (La Antena)
app.post('/webhook', async (req, res) => {
    // Le decimos a Meta "Mensaje recibido" rápido para que no nos corte
    res.sendStatus(200); 

    try {
        let body = req.body;
        
        // Verificamos que sea un mensaje de WhatsApp válido
        if (body.object === 'whatsapp_business_account') {
            let entry = body.entry[0];
            let changes = entry.changes[0];
            let value = changes.value;
            
            // Si hay un mensaje de texto
            if (value.messages && value.messages[0]) {
                let msg = value.messages[0];
                let remitente = msg.from; // Número de quien escribe
                
                if (msg.type === 'text') {
                    let texto = msg.text.body.toLowerCase().trim();
                    console.log(`📩 Mensaje recibido de ${remitente}: ${texto}`);

                    // --- LÓGICA DEL MENÚ ---
                    const saludos = ['hola', 'menu', 'menú', 'buenas', 'buen dia', 'buen día'];
                    
                    if (saludos.includes(texto)) {
                        const menu = `*TERMINAL S.I.G.A. - SAN JOSÉ EN MARCHA* 🦅\n\n` +
                                     `¡Hola! Soy tu asistente ciudadano. ¿En qué te puedo ayudar hoy? 👇\n\n` +
                                     `Responde con el *NÚMERO* de la opción:\n\n` +
                                     `*1️⃣* 📖 Desencriptador Cívico (Diccionario)\n` +
                                     `*2️⃣* 🚧 Reportar un problema en mi barrio\n` +
                                     `*3️⃣* 🏛️ Info y Horarios de la Intendencia\n` +
                                     `*4️⃣* 👤 Hablar con el equipo (Humano)`;
                        await enviarMensaje(remitente, menu);
                        return;
                    }

                    if (texto === '1') {
                        await enviarMensaje(remitente, `📖 *MODO DESENCRIPTADOR ACTIVO*\n\nPara traducir un término burocrático, escribe la palabra *SIGA* seguida de lo que buscas.\n\n👉 *Ejemplos:* \nsiga viaticos\nsiga tocaf\nsiga licitacion`);
                        return;
                    }

                    if (texto === '2') {
                        await enviarMensaje(remitente, `🚧 *REPORTE CIUDADANO*\n\nEstamos construyendo esta central para que puedas enviarnos fotos de baches, luces rotas o basurales. ¡Pronto estará disponible! 🛠️`);
                        return;
                    }

                    if (texto === '3') {
                        await enviarMensaje(remitente, `🏛️ *INFO INTENDENCIA DE SAN JOSÉ*\n\n📍 *Dirección:* Asamblea 496, San José de Mayo.\n🕒 *Atención al público:* Lunes a Viernes de 09:00 a 15:00 hs.\n📞 *Teléfono:* 4322 5015`);
                        return;
                    }

                    if (texto === '4') {
                        await enviarMensaje(remitente, `👤 *CONEXIÓN HUMANA*\n\nHe notificado al equipo de San José en Marcha. Un compañero te responderá por este chat a la brevedad. 🦅`);
                        return;
                    }

                    // --- LÓGICA DEL DICCIONARIO ---
                    if (texto.startsWith('siga ')) {
                        const busqueda = texto.replace('siga ', '').trim();
                        try {
                            const response = await axios.get(CSV_URL);
                            const dataSiga = Papa.parse(response.data, { header: true, skipEmptyLines: true }).data;
                            const resultado = dataSiga.find(item => 
                                item.Palabra && (
                                    item.Palabra.toLowerCase().includes(busqueda) || 
                                    (item.Keywords && item.Keywords.toLowerCase().includes(busqueda))
                                )
                            );

                            if (resultado) {
                                let mensaje = `📖 *DICCIONARIO S.I.G.A.*\n\n*Término:* ${resultado.Palabra}\n_${resultado.Ambito}_\n\n🏛️ *Traducción Ciudadana:*\n${resultado['Traduccion SIGA']}\n\n`;
                                if(resultado.Impacto) {
                                    let impactoLimpio = resultado.Impacto.replace(/<[^>]*>?/gm, ''); 
                                    mensaje += `⚠️ ${impactoLimpio}`;
                                }
                                await enviarMensaje(remitente, mensaje);
                            } else {
                                await enviarMensaje(remitente, `❌ S.I.G.A. no encontró registros para "${busqueda}".`);
                            }
                        } catch (error) {
                            console.error("Error leyendo CSV:", error);
                            await enviarMensaje(remitente, '⚠️ Error de conexión con la Base de Datos.');
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.error("Error procesando webhook:", err);
    }
});

// 4. ARRANQUE DEL SERVIDOR
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🤖 AGENTE S.I.G.A. (META API) EN LÍNEA EN EL PUERTO ${PORT}`);
});
