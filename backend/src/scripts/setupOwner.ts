import readline from 'readline';
import { AuthService } from '../modules/auth/auth.service';
import { env } from '../config/env';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => rl.question(query, resolve));
};

async function run() {
  console.log('\n=======================================');
  console.log('   NIMBO — Inicialización Propietario  ');
  console.log('=======================================\n');

  try {
    const isCompleted = await AuthService.isSetupCompleted();
    if (isCompleted) {
      console.log('⚠️  El sistema ya tiene configurada su cuenta propietaria única.');
      console.log('No se permite la creación de cuentas adicionales por seguridad.\n');
      process.exit(0);
    }

    const name = await question('Nombre del propietario (ej. Marco): ');
    const email = await question('Correo electrónico del propietario: ');
    const password = await question('Contraseña maestra (mínimo 10 caracteres): ');
    const timezone = (await question('Zona horaria [America/Mexico_City]: ')) || 'America/Mexico_City';

    if (!name || !email || password.length < 10) {
      console.error('❌ Datos inválidos. La contraseña debe tener al menos 10 caracteres.');
      process.exit(1);
    }

    console.log('\nConfigurando cuenta propietaria y categorías iniciales...');
    const owner = await AuthService.setupOwner({
      setupSecret: env.SETUP_SECRET,
      email: email.trim().toLowerCase(),
      password,
      name: name.trim(),
      timezone: timezone.trim(),
    });

    console.log('✅ ¡Propietario configurado con éxito!');
    console.log(`👤 Nombre: ${owner.name}`);
    console.log(`📧 Email: ${owner.email}`);
    console.log(`🌐 Zona Horaria: ${owner.timezone}`);
    console.log('\nPuedes iniciar sesión en la aplicación web con estas credenciales.\n');
  } catch (err) {
    console.error('❌ Error configurando propietario:', err);
  } finally {
    rl.close();
    process.exit(0);
  }
}

run();
