// Copies the single-file build to jogar/KOTONOHA.html (play offline by opening the file).
import { copyFileSync, mkdirSync, statSync } from 'node:fs';
mkdirSync('jogar', { recursive: true });
copyFileSync('dist/index.html', 'jogar/KOTONOHA.html');
console.log(`jogar/KOTONOHA.html ${(statSync('jogar/KOTONOHA.html').size / 1e6).toFixed(2)} MB`);
