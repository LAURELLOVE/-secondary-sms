// Builds the web app twice (once per Android app) and puts each build where its
// Android "flavor" expects it:  android/app/src/<admin|teacher>/assets/public
//
//   School Admin   (com.school.sms)          -> administrator sign-in, Phone SMS sender
//   School Teacher (com.school.sms.teacher)  -> teacher sign-in only
//
// Then run Gradle (or Android Studio) to make the APKs.
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const baseConfig = JSON.parse(readFileSync(resolve(root, 'capacitor.config.json'), 'utf8'));

const APPS = {
  admin: { appId: 'com.school.sms', appName: 'School Admin', backgroundColor: '#f4f5fb' },
  teacher: { appId: 'com.school.sms.teacher', appName: 'School Teacher', backgroundColor: '#f2f9f6' },
};

for (const [mode, meta] of Object.entries(APPS)) {
  console.log(`\n=== Building the ${meta.appName} web app ===`);
  execSync(`npx vite build --outDir dist-${mode} --emptyOutDir`, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, VITE_APP_MODE: mode },
  });

  const assets = resolve(root, `android/app/src/${mode}/assets`);
  rmSync(assets, { recursive: true, force: true });
  mkdirSync(assets, { recursive: true });
  cpSync(resolve(root, `dist-${mode}`), resolve(assets, 'public'), { recursive: true });
  writeFileSync(
    resolve(assets, 'capacitor.config.json'),
    JSON.stringify({ ...baseConfig, ...meta, webDir: 'public' }, null, 2) + '\n'
  );
}

execSync('npx cap update android', { cwd: root, stdio: 'inherit' });

// `cap update` also drops a generic copy of the web app here; it would be merged into both apps as stale files.
const legacy = resolve(root, 'android/app/src/main/assets');
rmSync(resolve(legacy, 'public'), { recursive: true, force: true });
if (existsSync(resolve(legacy, 'capacitor.config.json'))) rmSync(resolve(legacy, 'capacitor.config.json'));

console.log('\nDone. Now build the apps:  cd android && gradlew assembleDebug');
