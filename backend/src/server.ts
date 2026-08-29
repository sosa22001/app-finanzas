import { app } from './app';
import { env, missingEnv } from './config/env';

if (missingEnv.length) {
  console.error('\nNo puedo arrancar sin esas variables. Revisa backend/.env\n');
  process.exit(1);
}

app.listen(env.port, () => {
  console.log(`API lista en http://localhost:${env.port}`);
});
