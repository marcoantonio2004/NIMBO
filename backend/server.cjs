const mod = require('./app.cjs');
const app = mod.default || mod.app || mod;
module.exports = app;
