const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const Papa = require('papaparse');
const express = require('express');

// 1. TRAMPA PARA RENDER: Abrimos un puerto web falso para que no nos apague el bot
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('🤖 Servidor S.I.G.A. Activo y funcionando.'));
app.listen(port, () => console.log(`📡 Puerto web abierto en ${port} para mantener vivo el sistema.`));

// 2. CONFIGURACIÓN DEL BOT
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTKKZ2XtvAj_i310MNaCMYnaSbd1vsl-UjoACcth4hYq9pgq920NATvMyQZTXS_PbP8kA8nxjDRWcj-/pub?output=csv';

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
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
