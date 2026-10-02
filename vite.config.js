import { defineConfig } from 'vite';

// Assets relativos: el mismo build sirve en local y bajo
// https://<usuario>.github.io/<repositorio>/ sin fijar el nombre del repo.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022'
  }
});
