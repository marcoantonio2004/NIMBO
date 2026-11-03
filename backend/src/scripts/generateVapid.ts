import webpush from 'web-push';

const vapidKeys = webpush.generateVAPIDKeys();

console.log('\n=======================================');
console.log('   NIMBO — Generador de Llaves VAPID  ');
console.log('=======================================\n');
console.log('Copia estas claves en tu archivo .env o en el panel de variables de entorno de tu servidor:\n');
console.log(`VAPID_PUBLIC_KEY="${vapidKeys.publicKey}"`);
console.log(`VAPID_PRIVATE_KEY="${vapidKeys.privateKey}"\n`);
