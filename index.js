const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const Papa = require('papaparse');

// ⚠️ ENLACE AL DICCIONARIO S.I.G.A. EN GOOGLE DRIVE
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTKKZ2XtvAj_i310MNaCMYnaSbd1vsl-UjoACcth4hYq9pgq920NATvMyQZTXS_PbP8kA8nxjDRWcj-/pub?output=csv';

// Inicializar el bot forzando la ruta del navegador
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        // 🚨 ESTA ES LA LÍNEA TÁCTICA: Le decimos dónde está Chrome
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable'
    }
});

// Generar QR para escanear
client.on('qr', (qr) => {
    console.log('=========================================');
    console.log('CÓDIGO QR GENERADO. ESCANEE CON WHATSAPP:');
    qrcode.generate(qr, { small: true });
    console.log('=========================================');
});

client.on('ready', () => {
    console.log('🤖 AGENTE S.I.G.A. EN LÍNEA Y OPERATIVO.');
});

// Radar de mensajes
client.on('message', async msg => {
    const texto = msg.body.toLowerCase().trim();

    // Saludo inicial
    if (texto === 'hola' || texto === 'menu' || texto === 'siga') {
        const respuesta = `*TERMINAL S.I.G.A. - SAN JOSÉ EN MARCHA* 🦅\n\n` +
                          `Bienvenido al Desencriptador Cívico.\n\n` +
                          `Para traducir un término burocrático, escriba la palabra *SIGA* seguida de lo que busca.\n\n` +
                          `👉 *Ejemplos:* \nsiga viaticos\nsiga falero\nsiga licitacion`;
        msg.reply(respuesta);
        return;
    }

    // Buscador en la base de datos (Ej: "siga tocaf")
    if (texto.startsWith('siga ')) {
        const busqueda = texto.replace('siga ', '').trim();
        
        try {
            // Conectar a Google Drive
            const response = await axios.get(CSV_URL);
            const dataSiga = Papa.parse(response.data, { header: true, skipEmptyLines: true }).data;
            
            // Buscar coincidencia
            const resultado = dataSiga.find(item => 
                item.Palabra && (
                    item.Palabra.toLowerCase().includes(busqueda) || 
                    (item.Keywords && item.Keywords.toLowerCase().includes(busqueda))
                )
            );

            if (resultado) {
                // Armar el mensaje de respuesta
                let mensaje = `📖 *DICCIONARIO S.I.G.A.*\n\n`;
                mensaje += `*Término:* ${resultado.Palabra}\n`;
                mensaje += `_${resultado.Ambito}_\n\n`;
                mensaje += `🏛️ *Traducción Ciudadana:*\n${resultado['Traduccion SIGA']}\n\n`;
                
                // Limpiar HTML para WhatsApp
                if(resultado.Impacto) {
                    let impactoLimpio = resultado.Impacto.replace(/<[^>]*>?/gm, ''); 
                    mensaje += `⚠️ ${impactoLimpio}`;
                }

                msg.reply(mensaje);
            } else {
                msg.reply(`❌ S.I.G.A. no encontró registros para "${busqueda}". Intente con otra palabra.`);
            }

        } catch (error) {
            console.error("Error leyendo Drive:", error);
            msg.reply('⚠️ Error de conexión con el Servidor S.I.G.A. Intente más tarde.');
        }
    }
});

// Encender sistema
client.initialize();
