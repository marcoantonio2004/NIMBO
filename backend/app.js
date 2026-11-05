const path = require('path');
const searchPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../node_modules'),
  path.resolve(process.cwd(), 'node_modules'),
  path.resolve(process.cwd(), '../node_modules'),
];
for (const p of searchPaths) {
  if (!module.paths.includes(p)) {
    module.paths.push(p);
  }
}

let app;
let loadError = null;

try {
  const mod = require('./app.cjs');
  app = mod.default || mod.app || mod;
} catch (err) {
  loadError = err;
  console.error('FATAL ERROR LOADING APP.CJS:', err);
}

const handler = (req, res) => {
  if (loadError || !app) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(
      JSON.stringify(
        {
          status: 'error',
          error: 'Backend initialization failed',
          message: loadError ? loadError.message : 'App is undefined',
          stack: loadError ? loadError.stack : null,
        },
        null,
        2
      )
    );
  }
  return app(req, res);
};

if (app && typeof app === 'function') {
  Object.setPrototypeOf(handler, app);
}

handler.default = handler;
handler.app = handler;

module.exports = handler;
module.exports.default = handler;
