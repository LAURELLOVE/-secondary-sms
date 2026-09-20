// Preview one of the two Android apps in the browser:  npm run dev:admin  /  npm run dev:teacher
import { spawn } from 'node:child_process';

const mode = process.argv[2] === 'teacher' ? 'teacher' : 'admin';
const port = mode === 'teacher' ? '5175' : '5174';
spawn('npx', ['vite', '--port', port, '--strictPort'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, VITE_APP_MODE: mode },
});
