// Neon Coast — make.fun hand-in program (Node 22, standard library only).
//
// The entry is plain static files: app/ (index.html plus its CSS and ES
// modules, sample photos included) and screenshots/ (real renders of the
// app). This program copies both into the output directory and writes
// /output/dossier.json with buildDossier from the vendored make.fun
// library, so the sealed scorer can check the entry and the judge can read
// it. Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Serve the app locally with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// Caps mirror the gate so this program refuses an entry the scorer would
// refuse: at most 4 screenshots, each at most 256 KiB; app/ at most 993
// files and 48 MiB in all, with no path over 1000 bytes. The dossier text
// is capped at 160 KiB; /output as a whole shares the platform's 1000-entry
// and 64 MiB caps with app/ and screenshots/.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
console.log(`Neon Coast entry written to ${out}`);
