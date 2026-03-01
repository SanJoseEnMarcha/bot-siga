const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const Papa = require('papaparse');
const express = require('express');
const puppeteer = require('puppeteer'); // <-- Importamos el mapa del navegador

// 1. TRAMPA PARA RENDER: Puerto web falso
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
        executablePath: puppeteer.executablePath(), // <-- EL PUENTE DE ORO
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
    console.log('CÓDIGO QR GENERADO. ESCANEE CON WHATSAPP:');
    qrcode.generate(qr, { small: true });
    console.log('=========================================');
});

client.on('ready', () => {
    console.log('🤖 AGENTE S.I.G.A. EN LÍNEA Y OPERATIVO.');
});

client.on('message', async msg => {
    const texto = msg.body.toLowerCase().trim();

    if (texto === 'hola' || texto === 'menu' || texto === 'siga') {
        const respuesta = `*TERMINAL S.I.G.A. - SAN JOSÉ EN MARCHA* 🦅\n\n` +
                          `Bienvenido al Desencriptador Cívico.\n\n` +
                          `Para traducir un término, escriba la palabra *SIGA* seguida de lo que busca.\n\n` +
                          `👉 *Ejemplos:* \nsiga viaticos\nsiga tocaf`;
        msg.reply(respuesta);
        return;
    }

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
