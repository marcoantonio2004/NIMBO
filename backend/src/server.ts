import { app } from './app';
import { env } from './config/env';
import { prisma } from './db/prisma';

const server = app.listen(env.PORT, () => {
  console.log(`\n✦ NIMBO Backend API activo en http://localhost:${env.PORT}`);
  console.log(`✦ Entorno: ${env.NODE_ENV}`);
  console.log(`✦ Base de datos: PostgreSQL (${env.DATABASE_URL.split('@')[1] || 'localhost'})\n`);
});

const gracefulShutdown = async () => {
  console.log('\nCerrando servidor NIMBO con gracia...');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Conexión con PostgreSQL cerrada. Proceso terminado.');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
