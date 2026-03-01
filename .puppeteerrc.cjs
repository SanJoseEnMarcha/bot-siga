const {join} = require('path');

module.exports = {
  // Obliga al servidor a guardar Chrome dentro de nuestra base de operaciones
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
