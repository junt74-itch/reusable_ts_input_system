# TypeScript 入力フレームワーク仕様

## 位置づけと実装状況

本書は[企画書「TypeScriptでの入力フレームワーク」](https://innate-fahrenheit-708.notion.site/TypeScript-3d115c7a88dd80e3a36aff272f7e3695)を基に、リポジトリで管理する開発仕様をまとめたものです。
企画書の参照日は 2026-09-04 です。

MVP の入力機能（Keyboard / Gamepad / Pointer、Action / Axis、Action Map、Binding、Processor、Current Device）は実装済みです。
確定した公開 API・Binding 形式・フレーム更新規約・デバイス層の契約は [実装方針書](./design-decisions.md) に記載しています。
本書のコード例のうち、実装方針書と一致する部分はそのまま利用できます。
企画書で確定していない Phase 2 以降の項目は「Phase 2 候補」にまとめ、実装済みの仕様と混同しないようにします。

## 目的

ブラウザ上の TypeScript ゲームで繰り返し利用できる、最小かつ拡張可能な入力基盤を提供します。
Keyboard / Gamepad / Pointer の物理入力を、ゲーム上の意味を持つ Action / Axis に変換します。
ゲーム側が `KeyboardEvent.code`、Gamepad の button index、個別のブラウザイベントを直接扱う必要を減らします。

Core は PixiJS、Three.js、Phaser、Babylon.js、React などに依存しません。
依存先は JavaScript ランタイムとブラウザ標準 API を基本とし、DOM への依存は可能な限りデバイス層に閉じ込めます。
Unity Input System の完全再現は目標としません。

## 基本原則

1. 物理入力とゲーム上の意味を分離します。
2. ゲーム側は主に Action / Axis を参照します。
3. ゲームループから毎フレーム状態を読む Pull 型 API を基本とします。
4. Action Map / Input Context によってゲーム状態ごとの入力を切り替えます。
5. デジタル入力とアナログ入力を共通の基盤で扱います。
6. Binding は宣言的なデータとし、将来の変更・保存に対応できる境界を保ちます。
7. 入力判定と操作説明・ボタン画像などの Presentation を分離します。
8. 仮想デバイスを注入できる構造にして、入力状態を自動テスト可能にします。

イベント購読 API は将来追加できますが、Core の必須要件には含めません。

## MVP の対象範囲

| 項目 | 必要な動作 |
| --- | --- |
| Keyboard | `event.code` によるキー指定、押下・保持・解放 |
| Gamepad | 接続・切断、ボタン、アナログ軸、standard mapping、デッドゾーン |
| Pointer | 座標、主・副ボタン、押下・保持・解放、ホイール |
| Action | デジタル入力の現在状態とフレーム単位の変化 |
| Axis1D / Axis2D | 1 軸・2 軸の値、Keyboard からの 2 軸合成 |
| Action Map | ゲーム状態に応じた有効入力の切り替え |
| Binding | 1 つの意味入力に対する複数の物理入力の割り当て |
| Current Device | 直近に有効な入力を行ったデバイスの判定 |
| 設定 | コードから宣言できる型安全な入力定義 |

## 入力デバイス

### Keyboard

ブラウザの Keyboard Events を利用し、`event.code` ベースで物理キーを指定します。
key down / key up を受け取り、held とフレーム単位の pressed / released を扱います。
IME や文字入力用 TextInput は主対象外とし、ゲーム操作入力と分離します。

### Gamepad

`navigator.getGamepads()` によるポーリングで状態を取得します。
接続・切断、button の pressed / held / released、analog axis を扱います。
MVP は standard mapping を前提とし、全機種の個別対応は行いません。

ゲーム側には button index を直接露出させず、以下の論理名で指定できる方向とします。

- `south` / `east` / `west` / `north`
- `leftShoulder` / `rightShoulder`
- `leftTrigger` / `rightTrigger`
- `select` / `start`
- `leftStick` / `rightStick`
- `dpadUp` / `dpadDown` / `dpadLeft` / `dpadRight`

Xbox の A や PlayStation の × といった表示差は Presentation 層で扱います。

### Pointer / Mouse

pointer position、primary / secondary button、pressed / held / released、wheel を扱います。
将来の touch 対応を考慮し、可能な限り Mouse Events ではなく Pointer Events を基盤にします。
touch や高度な gesture の対応は MVP の必須要件ではありません。

## 入力モデルと API の方向性

### Action

オン / オフで表すデジタル入力です。`confirm`、`cancel`、`pause`、`interact`、`attack`、`jump` などを定義します。

| API 案 | 意味 |
| --- | --- |
| `isPressed()` | 現在押されているか |
| `wasPressed()` | 当該フレームで押されたか |
| `wasReleased()` | 当該フレームで解放されたか |

pressed / released は変化があった 1 フレームだけ有効とし、held は押下中に継続します。
複数 Binding のデジタル入力は OR で解決します。

### Axis1D / Axis2D

Axis1D は概ね -1.0〜+1.0 の一次元値で、`throttle`、`horizontal`、`zoom` などを表します。
Axis2D は `move`、`look`、`menuNavigate` などの二次元値を表します。
Keyboard の WASD など、複数のデジタル入力から Axis2D を合成できるようにします。

```typescript
const { x, y } = input.axis2D("move").value;
```

### Action Map / Input Context

ゲーム状態に応じて入力の意味を切り替えます。

| Map の例 | A / Enter の意味 | スティック / 方向キーの意味 |
| --- | --- | --- |
| `quiz` | 回答決定 | 選択肢移動 |
| `exploration` | 調べる | キャラクター移動 |
| `menu` | 決定 | メニュー移動 |

```typescript
input.activateMap("quiz");
```

複数 Map の stack 運用は Phase 2 候補とします。

### ゲーム側の利用例

```typescript
const input = createInputSystem(config);

function update() {
  input.update();

  if (input.action("confirm").wasPressed()) {
    confirm();
  }

  const move = input.axis2D("move").value;
  // move をゲームロジックに渡す。
}
```

利用者が Keyboard / Gamepad / Pointer の個別クラスを通常操作する必要のない、小さな公開 API を目指します。

## フレーム更新規約

ゲーム側は各フレームのゲームロジック実行前に `input.update()` を呼びます。
処理順序は以下を基本とします。

1. ブラウザ API から最新の物理入力を取得します。
2. 前フレームとの差分から pressed / released を算出します。
3. Processor を適用します。
4. Binding を解決します。
5. Action / Axis の当該フレーム値を確定します。
6. ゲームロジックが入力を参照します。

物理入力の変化と、複数 Binding を解決した後の Action の変化の詳細は、実装時に明文化します。

## Binding と設定データ

Action と物理入力の対応を Binding として定義します。1 つの Action に複数の Binding を指定できるようにします。

```typescript
// 実装済みの Binding 形式の例。[実装方針書](./design-decisions.md) を参照。
const confirmBinding = {
  action: "confirm",
  bindings: [
    { device: "keyboard", code: "Enter" },
    { device: "keyboard", code: "Space" },
    { device: "gamepad", button: "south" },
  ],
};
```

ゲームごとの設定は TypeScript オブジェクトや JSON などで宣言的に記述できる方向とし、TypeScript 利用時の型安全を優先します。
Binding は `{ device, ... }` のプレーンオブジェクト形式で、`defineInputConfig()` と Binding ヘルパー（`key()` / `pad()` など）で型推論付きに定義します。

将来の Rebinding に向け、Binding の取得・変更、重複検出、初期化、JSON へのシリアライズ、localStorage などへの保存に適したデータ構造を検討します。
MVP では Runtime Rebinding UI は対象外ですが、割り当てを実装内にハードコードすることしかできない構造にはしません。

## Processor とデッドゾーン

生の入力値を加工する処理を、将来 Processor として分離できる構造にします。
候補は dead zone / invert / scale / clamp です。初期段階では必要な処理の固定実装も許容します。

```text
Gamepad Stick → DeadZone → Invert Y → Scale → Axis2D "look"
```

スティックの無操作時の微小値を抑えるため、デッドゾーンを提供します。
axial / radial を実装済みです。既定値・再スケーリング方法は [実装方針書](./design-decisions.md) の Processor 節を参照してください。

## Current Device Detection

直近に有効な入力を行ったデバイスを追跡します。

```typescript
input.currentDevice; // "keyboard" | "pointer" | "gamepad"
```

操作説明やキーアイコンの表示切り替えに使用します。
スティックの微小ノイズだけで Gamepad に切り替わらないよう、Axis 入力には判定閾値を設けます。

## Input Prompt / Glyph

将来、`input.getPrompt("confirm")` のような要求から Enter / Space / A / × などの論理プロンプトを取得できる設計を検討します。
Core が返すものは文字列・ID・メタデータとし、画像や Sprite の描画はゲーム側の Presentation に委ねます。
この API は MVP の必須要件ではありません。

## アーキテクチャとモジュール案

```text
Application / Game
        ↓
   InputManager
        ↓
Action / Axis1D / Axis2D
        ↓
   Action Map
        ↓
    Bindings
        ↓
Keyboard / Gamepad / Pointer
        ↓
Browser Standard APIs
```

以下は企画書のモジュール案です。MVP では `prompts/` と `persistence/` は未実装です。実装済みの構成は [実装方針書](./design-decisions.md) のモジュール構成を参照してください。

```text
src/
├─ index.ts
├─ core/
│  ├─ InputManager.ts
│  ├─ Action.ts
│  ├─ Axis1D.ts
│  ├─ Axis2D.ts
│  ├─ ActionMap.ts
│  └─ Binding.ts
├─ devices/
│  ├─ KeyboardDevice.ts
│  ├─ GamepadDevice.ts
│  └─ PointerDevice.ts
├─ processors/
│  ├─ DeadZone.ts
│  ├─ Scale.ts
│  └─ Invert.ts
├─ prompts/
│  └─ InputPrompt.ts
└─ persistence/
   └─ BindingSerializer.ts
```

## パッケージ・ビルド方針

TypeScript ライブラリとして独立配布できる構成にします。

- Bun を依存管理・実行環境に使用します。
- Vite で ESM ライブラリをビルドします。
- TypeScript で strict な型チェックと型定義の出力を行います。
- `package.json` の `exports` を公開入口とします。
- ライブラリの成果物は `dist/`、ブラウザ確認ページは `dist-demo/` に出力します。
- 入力ロジックの単体テストには Bun のテストランナーを使用します（`tests/` に実装済み）。

公開 API は `src/index.ts` から提供しています。ライセンスは MIT です。
npm への誤公開を防ぐためパッケージは `private: true` のままとし、公開パッケージ名と対応環境は別途決定します。
開発コマンドは [README](../README.md) を参照してください。

## テスト方針と MVP の受け入れ条件

物理デバイス層と Action 解決層を分離し、テスト時に仮想入力を注入します。目視テストだけに依存しません。

以下を自動テストの対象にします。

- pressed が 1 フレームだけ有効になること。
- released が 1 フレームだけ有効になること。
- held が押下中に継続すること。
- 複数 Binding が OR で解決されること。
- Action Map の切り替えが反映されること。
- デッドゾーン境界で値が期待どおり処理されること。
- Keyboard / Gamepad の切り替えと currentDevice 判定が機能すること。

MVP 完了には、上記に加えて Keyboard / Gamepad / Pointer の基本入力、Axis1D / Axis2D、Gamepad 接続・切断、宣言的設定、ゲームエンジンへの依存ゼロを確認します。
実ブラウザ・実デバイスでも取得処理とゲーム側の利用を検証します。

### 最初の実戦検証：「クイズ無人島」

| モード | 必要な入力 |
| --- | --- |
| Quiz / ADV | up / down / left / right、confirm、cancel、menu |
| 3D Exploration | move Axis2D、look Axis2D、interact、menu、cancel |

同一 Input System で両モードを Action Map 切り替えによって扱えることを検証します。
成功条件は、ゲーム側で `keydown` の直接監視や `navigator.getGamepads()`、button index の判定を原則不要にし、Action / Axis だけで操作を記述できることです。

## Phase 2 候補

実ゲームへの投入後、必要性を確認して追加します。

- Runtime Rebinding と Binding の JSON 保存・復元
- Input Prompt / Glyph メタデータ
- Processor の拡充
- Combo / chord 入力
- Hold / Tap / Double Tap などの Interaction
- 複数 Action Map の stack 運用
- 複数 Gamepad / Player 管理
- Touch / Gesture
- 利用者向けの仮想入力注入機能（MVP テスト用の注入可能な構造とは区別）

## 初期段階の非目標

- Unity Input System の完全互換
- 全 Gamepad 機種への個別対応
- ネイティブ OS の HID API、Bluetooth 管理
- VR / XR Controller、MIDI Controller
- 高度な Gesture Recognizer
- 複数プレイヤーへの Gamepad Pairing
- ゲーム内キー設定画面
- PixiJS / Three.js などへの専用統合層

## 実装前に決める事項

以下は企画書だけでは確定しない項目でした。
MVP 実装に向けて [実装方針書](./design-decisions.md) で確定済みです。
各項目の詳細は実装方針書の該当節を参照してください。

| 項目 | 決める内容 | 状態 |
| --- | --- | --- |
| 公開 API / 設定型 | 名前の型推論、Binding の表現、未知の Action / Map の扱い | 決定済み → [§2 公開 API](./design-decisions.md#2-公開-api)、[§3 Binding](./design-decisions.md#3-binding-のデータ形式) |
| ライフサイクル | 初期化・破棄、イベント解除、フォーカス喪失時の入力リセット | 決定済み → [§10 ライフサイクル](./design-decisions.md#10-ライフサイクル) |
| フレーム境界 | 同一フレーム内の押下と解放、複数回 update、キーリピートの扱い | 決定済み → [§4 フレーム更新規約](./design-decisions.md#4-フレーム更新規約) |
| Action 解決 | 複数 Binding の切り替わりと Action の pressed / released の関係 | 決定済み → [§4.2 Action の解決](./design-decisions.md#42-action-の解決) |
| Map 切り替え | 既存 Map の無効化、押下中の切り替え時の状態 | 決定済み → [§5 Action Map](./design-decisions.md#5-action-map) |
| Axis 合成 | 逆方向同時押し、斜めの正規化、複数デバイスの値の優先・合成 | 決定済み → [§6 Axis の合成](./design-decisions.md#6-axis-の合成) |
| Gamepad | 使用パッドの選択、非 standard mapping、切断時の状態、Trigger の閾値 | 決定済み → [§8.2 GamepadDevice](./design-decisions.md#82-gamepaddevice) |
| Pointer | 座標系、監視対象、wheel の単位とフレームごとの蓄積・リセット | 決定済み → [§8.3 PointerDevice](./design-decisions.md#83-pointerdevice) |
| ノイズ処理 | デッドゾーン方式・既定値、currentDevice の初期値と判定優先順位 | 決定済み → [§7 Processor](./design-decisions.md#7-processor)、[§9 Current Device Detection](./design-decisions.md#9-current-device-detection) |
| ブラウザ操作 | preventDefault、入力フォーム操作との共存 | 決定済み → [§8.1 KeyboardDevice](./design-decisions.md#81-keyboarddevice) |
| 配布・互換性 | 対応ブラウザ、公開パッケージ名、ライセンス | ライセンスは MIT に決定。公開パッケージ名・対応ブラウザは別途決定 |

仕様を変更する際は、MVP 要件・Phase 2 候補・実装状況を併せて更新し、関連するテストで確定した動作を検証します。
