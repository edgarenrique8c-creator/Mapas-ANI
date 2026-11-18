/* Build: empaqueta src/app en un único public/assets/app.js (IIFE, sin dependencias externas en runtime). */
import esbuild from 'esbuild';


import fs from 'fs';
const watch = process.argv.includes('--watch');

const options = {
  entryPoints: ['src/app/main.js'],
  bundle: true,
  format: 'iife',
  target: ['es2019'],
  outfile: 'public/assets/app.js',
  minify: !watch,
  sourcemap: watch ? 'inline' : false,
  legalComments: 'none',
  loader: { '.css': 'text' },
  logLevel: 'info',
};

(async () => {
  if (watch) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
    console.log('watch activo');
  } else {
    await esbuild.build(options);
    const size = fs.statSync('public/assets/app.js').size;
    console.log(`app.js generado (${(size / 1024).toFixed(1)} kB)`);
  }
})();
