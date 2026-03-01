const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const Papa = require('papaparse');
const express = require('express');
const puppeteer = require('puppeteer');

// 1. TRAMPA PARA RENDER (INTOCABLE)
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('🤖 Servidor S.I.G.A. Activo y funcionando.'));
app.listen(port, '0.0.0.0', () => console.log(`📡 Puerto web abierto en ${port} para mantener vivo el sistema.`));

// 2. CONFIGURACIÓN DEL BOT Y BASE DE DATOS
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTKKZ2XtvAj_i310MNaCMYnaSbd1vsl-UjoACcth4hYq9pgq920NATvMyQZTXS_PbP8kA8nxjDRWcj-/pub?output=csv';

// 3. MOTOR A DIETA + RUTA EXACTA DEL NAVEGADOR
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        executablePath: puppeteer.executablePath(),
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', 
            '--disable-gpu'
        ]
    }
});

client.on('qr', (qr) => {
    console.log('=========================================');
    console.log('CÓDIGO QR REQUERIDO. ESCANEE CON WHATSAPP:');
    qrcode.generate(qr, { small: true });
    console.log('=========================================');
});

client.on('ready', () => {
    console.log('🤖 AGENTE S.I.G.A. EN LÍNEA Y OPERATIVO.');
});

// ---------------------------------------------------------
// 🧠 CEREBRO DEL BOT: RECEPCIÓN DE MENSAJES
// ---------------------------------------------------------
client.on('message', async msg => {
    const texto = msg.body.toLowerCase().trim();

    // 1️⃣ SALUDO Y DESPLIEGUE DEL MENÚ PRINCIPAL
    const saludos = ['hola', 'menu', 'menú', 'buenas', 'buen dia', 'buen día', 'buenas tardes', 'buenas noches'];
    
    if (saludos.includes(texto)) {
        const menu = `*TERMINAL S.I.G.A. - SAN JOSÉ EN MARCHA* 🦅\n\n` +
                     `¡Hola! Soy tu asistente ciudadano. ¿En qué te puedo ayudar hoy? 👇\n\n` +
                     `Responde con el *NÚMERO* de la opción:\n\n` +
                     `*1️⃣* 📖 Desencriptador Cívico (Diccionario)\n` +
                     `*2️⃣* 🚧 Reportar un problema en mi barrio\n` +
                     `*3️⃣* 🏛️ Info y Horarios de la Intendencia\n` +
                     `*4️⃣* 👤 Hablar con el equipo (Humano)`;
        msg.reply(menu);
        return;
    }

    // 2️⃣ RESPUESTAS A LAS OPCIONES NUMÉRICAS
    if (texto === '1') {
        msg.reply(`📖 *MODO DESENCRIPTADOR ACTIVO*\n\nPara traducir un término burocrático, escribe la palabra *SIGA* seguida de lo que buscas.\n\n👉 *Ejemplos:* \nsiga viaticos\nsiga tocaf\nsiga licitacion`);
        return;
    }

    if (texto === '2') {
        msg.reply(`🚧 *REPORTE CIUDADANO*\n\nEstamos construyendo esta central para que puedas enviarnos fotos de baches, luces rotas o basurales, y nosotros llevaremos el reclamo. ¡Pronto estará disponible! 🛠️`);
        return;
    }

    if (texto === '3') {
        msg.reply(`🏛️ *INFO INTENDENCIA DE SAN JOSÉ*\n\n📍 *Dirección:* Asamblea 496, San José de Mayo.\n🕒 *Atención al público:* Lunes a Viernes de 09:00 a 15:00 hs.\n📞 *Teléfono:* 4322 5015`);
        return;
    }

    if (texto === '4') {
        msg.reply(`👤 *CONEXIÓN HUMANA*\n\nHe notificado al equipo de San José en Marcha. Un compañero leerá tu mensaje y te responderá por este mismo chat a la brevedad. 🦅`);
        return;
    }

    // 3️⃣ BUSCADOR DEL DICCIONARIO (EL NÚCLEO ORIGINAL)
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
                msg.reply(mensaje);
            } else {
                msg.reply(`❌ S.I.G.A. no encontró registros para "${busqueda}".`);
            }
        } catch (error) {
            console.error(error);
            msg.reply('⚠️ Error de conexión con el Servidor.');
        }
    }
});

client.initialize();
