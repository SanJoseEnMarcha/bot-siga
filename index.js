const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const Papa = require('papaparse');
const express = require('express');

// 1. TRAMPA PARA RENDER (El puerto falso)
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('🤖 Servidor S.I.G.A. (Motor Baileys) Activo y funcionando.'));
app.listen(port, '0.0.0.0', () => console.log(`📡 Puerto web abierto en ${port} para mantener vivo el sistema.`));

// 2. CONFIGURACIÓN DE BASE DE DATOS
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTKKZ2XtvAj_i310MNaCMYnaSbd1vsl-UjoACcth4hYq9pgq920NATvMyQZTXS_PbP8kA8nxjDRWcj-/pub?output=csv';

// 3. NUEVO MOTOR LIGERO (BAILEYS)
async function iniciarAgenteSIGA() {
    // Esto guarda la sesión para no pedir QR a cada rato
    const { state, saveCreds } = await useMultiFileAuthState('sesion_siga');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // Lo imprimimos nosotros manualmente abajo
        logger: pino({ level: 'silent' }), // Apaga los mensajes molestos del sistema
        browser: ["SIGA San Jose", "Chrome", "1.0.0"]
    });

    // Guardar credenciales automáticamente
    sock.ev.on('creds.update', saveCreds);

    // Control de conexión
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('=========================================');
            console.log('NUEVO CÓDIGO QR. ESCANEE CON WHATSAPP:');
            qrcode.generate(qr, { small: true });
            console.log('=========================================');
        }

        if (connection === 'close') {
            const reconectar = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('⚠️ Conexión cerrada. Reconectando:', reconectar);
            if (reconectar) iniciarAgenteSIGA();
        } else if (connection === 'open') {
            console.log('🤖 AGENTE S.I.G.A. EN LÍNEA Y OPERATIVO (MOTOR LIGERO).');
        }
    });

    // Recepción de mensajes
    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return; // Ignora los mensajes que envía el propio bot

        // Extraer el texto (Baileys lo guarda de forma diferente)
        const textoIn = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const texto = textoIn.toLowerCase().trim();
        const remitente = msg.key.remoteJid;

        if (!texto) return;

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
            await sock.sendMessage(remitente, { text: menu });
            return;
        }

        if (texto === '1') {
            await sock.sendMessage(remitente, { text: `📖 *MODO DESENCRIPTADOR ACTIVO*\n\nPara traducir un término burocrático, escribe la palabra *SIGA* seguida de lo que buscas.\n\n👉 *Ejemplos:* \nsiga viaticos\nsiga tocaf\nsiga licitacion` });
            return;
        }

        if (texto === '2') {
            await sock.sendMessage(remitente, { text: `🚧 *REPORTE CIUDADANO*\n\nEstamos construyendo esta central para que puedas enviarnos fotos de baches, luces rotas o basurales, y nosotros llevaremos el reclamo. ¡Pronto estará disponible! 🛠️` });
            return;
        }

        if (texto === '3') {
            await sock.sendMessage(remitente, { text: `🏛️ *INFO INTENDENCIA DE SAN JOSÉ*\n\n📍 *Dirección:* Asamblea 496, San José de Mayo.\n🕒 *Atención al público:* Lunes a Viernes de 09:00 a 15:00 hs.\n📞 *Teléfono:* 4322 5015` });
            return;
        }

        if (texto === '4') {
            await sock.sendMessage(remitente, { text: `👤 *CONEXIÓN HUMANA*\n\nHe notificado al equipo de San José en Marcha. Un compañero leerá tu mensaje y te responderá por este mismo chat a la brevedad. 🦅` });
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
                    await sock.sendMessage(remitente, { text: mensaje });
                } else {
                    await sock.sendMessage(remitente, { text: `❌ S.I.G.A. no encontró registros para "${busqueda}".` });
                }
            } catch (error) {
                console.error(error);
                await sock.sendMessage(remitente, { text: '⚠️ Error de conexión con el Servidor.' });
            }
        }
    });
}

iniciarAgenteSIGA();
