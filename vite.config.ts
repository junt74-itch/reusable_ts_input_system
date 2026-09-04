import { defineConfig } from 'vite';

// GitHub Pages のプロジェクトサイトは /<リポジトリ名>/ 配下で配信されるため、
// デモのビルドとプレビューでは base を合わせる。開発サーバーはルート配信のまま。
const demoBase = '/reusable_ts_input_system/';

export default defineConfig(({ mode }) => ({
  base: mode === 'demo' ? demoBase : '/',
  build: mode === 'demo'
    ? { outDir: 'dist-demo' }
    : {
        outDir: 'dist',
        sourcemap: true,
        lib: {
          entry: 'src/index.ts',
          formats: ['es'],
          fileName: 'index',
        },
      },
}));
