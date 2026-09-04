# デモページ UI リファレンス

ゲームパッド診断デモ（`demo/`）の UI 設計参考画像を置きます。

## ファイル

| ファイル | 内容 |
| --- | --- |
| [xbox-360-controller-tester.png](./xbox-360-controller-tester.png) | Xbox 360 Controller（XInput STANDARD GAMEPAD）のリアルタイム診断 UI |

## 参考 UI の構成

- **ヘッダー**: コントローラ名、接続状態（INDEX / CONNECTED / MAPPING / TIMESTAMP / VIBRATION）
- **ボタン表示**: B0–B16 の数値とバー
- **スティック表示**: L/R 各軸の数値と円形ビジュアライザ
- **コントローラ図**: 右側にライトブルーのアウトライン図
- **操作ボタン**: Test Circularity、Vibration（1 sec / infinite）

デモ実装時は Gamepad API の生値を可視化し、入力ライブラリの動作確認に使えるレイアウトを目指します。
