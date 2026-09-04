# reusable_ts_input_system

ブラウザ向けゲームで共通利用する、ゲームフレームワーク非依存の入力ライブラリです。
[企画書](https://innate-fahrenheit-708.notion.site/TypeScript-3d115c7a88dd80e3a36aff272f7e3695)を基に開発します。

MVP の入力 API（Action / Axis / Action Map / Binding / デバイス層）は実装済みです。

## デモ

[https://junt74-itch.github.io/reusable_ts_input_system/](https://junt74-itch.github.io/reusable_ts_input_system/)

Keyboard / Gamepad / Pointer の入力診断ページです。`main` ブランチへの push で GitHub Actions が自動デプロイします。
ローカルで確認する場合は `bun run dev` を使用してください。

## 仕様

[入力フレームワーク仕様書](docs/specification.md)に、MVP の範囲、入力モデル、テスト方針を記載しています。
確定した実装契約（公開 API・Binding 形式・フレーム更新規約など）は [実装方針書](docs/design-decisions.md) を参照してください。

ゲーム側は各フレームのゲームロジック実行前に `input.update()` を呼ぶ設計です。
更新順序は「物理入力取得 → 前フレームとの差分算出 → Processor 適用 → Binding 解決 → Action / Axis 確定 → ゲームロジックから参照」を基本とします。
詳細は仕様書の「フレーム更新規約」を参照してください。

### クイックスタート

```typescript
import {
  createInputSystem,
  defineInputConfig,
  key,
  pad,
  keyAxis2D,
  stick,
} from 'reusable-ts-input-system';

const config = defineInputConfig({
  initialMap: 'gameplay',
  maps: {
    gameplay: {
      actions: {
        confirm: [key('Enter'), key('Space'), pad('south')],
        cancel: [key('Escape'), pad('east')],
      },
      axes2D: {
        move: [keyAxis2D({ up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' }), stick('left')],
      },
    },
  },
});

const input = createInputSystem(config);

function gameLoop() {
  input.update();

  if (input.action('confirm').wasPressed()) {
    // 決定処理
  }

  const move = input.axis2D('move').value;
  // move.x / move.y をゲームロジックに渡す

  input.activateMap('gameplay'); // ゲーム状態に応じて Map を切り替え

  requestAnimationFrame(gameLoop);
}
```

## 開発を始める

Bun 1.3.10 で動作確認しています。依存関係の管理と Vite の実行には Bun を使用します。

```sh
bun install --frozen-lockfile
bun run dev
```

ターミナルに表示される URL（通常は http://localhost:5173）で動作確認ページを開きます。

## コマンド

| コマンド | 内容 |
| --- | --- |
| `bun run dev` | ブラウザ確認用の開発サーバーを起動 |
| `bun run typecheck` | ソース・デモ・テスト・Vite 設定を strict モードで型チェック |
| `bun run test` | Bun テストランナーで単体テストを実行 |
| `bun run build` | 型チェック後、ライブラリの ESM・ソースマップ・型定義を `dist/` に生成 |
| `bun run build:demo` | 確認ページを `dist-demo/` にビルド |
| `bun run preview` | ビルド済みの確認ページをプレビュー（先に `build:demo` を実行） |

## 構成

- `src/index.ts`: ライブラリの公開エントリーポイント
- `src/core/`: InputManager、Action / Axis、Binding、Action Map
- `src/devices/`: Keyboard / Gamepad / Pointer デバイス層
- `src/processors/`: デッドゾーン、反転、スケール、クランプ
- `tests/`: Bun テストランナーによる単体テスト
- `demo/main.ts` / `demo/config.ts` / `demo/ui.ts` / `demo/style.css`: ブラウザ動作確認デモ
- `index.html`: デモページの HTML エントリ
- `docs/demo-references/`: デモページの UI リファレンス画像
- `docs/design-decisions.md`: MVP 確定仕様（実装契約）
- `docs/specification.md`: 企画・仕様の全体像
- `.github/workflows/deploy-demo.yml`: デモページを GitHub Pages へデプロイするワークフロー
- `vite.config.ts`: ESM ライブラリと確認ページのビルド設定
- `tsconfig.json`: 共通の型チェック設定
- `tsconfig.build.json`: ライブラリの型定義出力設定
- `bun.lock`: 依存バージョンを固定するロックファイル。変更時もリポジトリで管理します。

ランタイム依存はありません。配布時の入口は `package.json` の `exports` に定義しています。
npm への誤公開を防ぐため `private: true` としています。パッケージ公開時に解除してください。

`tests/` 配下に Action 解決、Action Map 切り替え、Axis 合成、デッドゾーン、Gamepad などの単体テストを追加済みです。

## ライセンス

[MIT License](LICENSE)
