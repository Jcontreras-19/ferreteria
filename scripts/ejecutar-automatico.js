const { spawn } = require('child_process');
const fs = require('fs');
const logFile = 'ejecucion-automatica.log';

function escribirLog(mensaje) {
  const timestamp = new Date().toISOString();
  const linea = `[${timestamp}] ${mensaje}\n`;
  fs.appendFileSync(logFile, linea);
  console.log(mensaje);
}

function ejecutarComando(comando, descripcion) {
  return new Promise((resolve) => {
    escribirLog(`\n${'='.repeat(60)}`);
    escribirLog(`📌 ${descripcion}`);
    escribirLog(`${'='.repeat(60)}`);
    escribirLog(`Ejecutando: ${comando}\n`);
    
    const partes = comando.split(' ');
    const cmd = partes[0];
    const args = partes.slice(1);
    
    const proceso = spawn(cmd, args, {
      cwd: process.cwd(),
      shell: true,
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    proceso.stdout.on('data', (data) => {
      const texto = data.toString();
      stdout += texto;
      escribirLog(texto);
    });
    
    proceso.stderr.on('data', (data) => {
      const texto = data.toString();
      stderr += texto;
      escribirLog(`STDERR: ${texto}`);
    });
    
    proceso.on('close', (code) => {
      if (code === 0) {
        escribirLog(`✅ ${descripcion} - Completado exitosamente\n`);
        resolve(true);
      } else {
        escribirLog(`❌ Error en: ${descripcion} (código: ${code})\n`);
        resolve(false);
      }
    });
    
    proceso.on('error', (error) => {
      escribirLog(`❌ Error ejecutando: ${descripcion}`);
      escribirLog(error.message);
      resolve(false);
    });
  });
}

async function main() {
  // Limpiar archivo de log anterior
  if (fs.existsSync(logFile)) {
    fs.unlinkSync(logFile);
  }
  
  escribirLog('\n🚀 INICIANDO PROCESO AUTOMÁTICO');
  escribirLog('=====================================\n');
  
  // 1. Git Status
  await ejecutarComando('git status', 'Verificando estado de Git');
  
  // 2. Git Add
  await ejecutarComando('git add -A', 'Agregando cambios a Git');
  
  // 3. Git Commit
  const fecha = new Date().toLocaleString('es-MX');
  await ejecutarComando(
    `git commit -m "Auto: Cambios automáticos ${fecha}"`,
    'Creando commit'
  );
  
  // 4. Build
  const buildOk = await ejecutarComando('npm run build', 'Ejecutando build');
  
  if (!buildOk) {
    escribirLog('\n⚠️  Build falló. No se continuará con el push.');
    return;
  }
  
  // 5. Git Push
  await ejecutarComando('git push origin master', 'Subiendo a GitHub');
  
  escribirLog('\n✨ PROCESO COMPLETADO EXITOSAMENTE');
  escribirLog('=====================================\n');
  escribirLog(`\n📄 Log completo guardado en: ${logFile}`);
}

main().catch((error) => {
  escribirLog(`\n❌ ERROR FATAL: ${error.message}`);
  console.error(error);
  process.exit(1);
});
