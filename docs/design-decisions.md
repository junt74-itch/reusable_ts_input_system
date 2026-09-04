# 実装方針書（MVP 確定仕様）

[入力フレームワーク仕様書](./specification.md)の「実装前に決める事項」を MVP 実装向けに確定したものです。
仕様書が方向性を示すのに対し、本書は実装が従う契約を定めます。両者が矛盾する場合は本書を優先します。

## 1. モジュール構成

```text
src/
├─ index.ts                  公開エントリーポイント
├─ core/
│  ├─ types.ts               公開型定義（Binding / Config / State / Options）
│  ├─ Binding.ts             Binding のヘルパー関数と正規化
│  ├─ Action.ts              Action の状態解決
│  ├─ Axis1D.ts              Axis1D の状態解決
│  ├─ Axis2D.ts              Axis2D の状態解決
│  ├─ ActionMap.ts           Map 単位の Action / Axis 保持と有効化
│  └─ InputManager.ts        createInputSystem の実体
├─ devices/
│  ├─ Device.ts              デバイス共通インターフェースと DigitalState ユーティリティ
│  ├─ KeyboardDevice.ts
│  ├─ GamepadDevice.ts
│  └─ PointerDevice.ts
└─ processors/
   ├─ index.ts
   ├─ DeadZone.ts
   ├─ Invert.ts
   ├─ Scale.ts
   └─ Clamp.ts
```

`prompts/` と `persistence/` は Phase 2 のため MVP では作成しません。
Binding が JSON 化可能なプレーンオブジェクトであることのみ保証します。

Core（`src/core`）はブラウザ API を直接呼びません。DOM への依存は `src/devices` に閉じ込めます。
`src/core` と `src/processors` は `typeof window` 等の参照を含めないこと。

## 2. 公開 API

### 2.1 生成

```typescript
const input = createInputSystem(config, options);
```

- `config` はジェネリクスで受け取り、`maps` のキー・`actions` / `axes1D` / `axes2D` のキーから名前の型を推論します。
- 利用者に `as const` を要求しません。オブジェクトリテラル直渡しでキーが推論されれば十分です。
- `defineInputConfig(config)` を型補完用ヘルパーとして提供します（実体は引数をそのまま返す恒等関数）。

### 2.2 InputSystem

| メンバー | 内容 |
| --- | --- |
| `update()` | 1 フレーム分の状態を確定する |
| `action(name)` | `ActionState` を返す |
| `axis1D(name)` | `Axis1DState` を返す |
| `axis2D(name)` | `Axis2DState` を返す |
| `activateMap(name)` | 有効な Action Map を切り替える |
| `activeMap` | 現在有効な Map 名 |
| `currentDevice` | `"keyboard" \| "gamepad" \| "pointer"` |
| `pointer` | `PointerSnapshot`（position / delta / wheel） |
| `gamepad` | `GamepadSnapshot`（connected / id / index） |
| `devices` | `{ keyboard, gamepad, pointer }`。テストからの仮想入力注入に使用 |
| `attach()` | DOM リスナーを登録（`autoAttach: false` 時に使用）。多重呼び出しは無視 |
| `dispose()` | すべてのリスナーを解除し、状態をリセット |

`action()` / `axis1D()` / `axis2D()` は定義ごとに同一インスタンスを返します（毎回生成しない）。

```typescript
interface ActionState {
  isPressed(): boolean;   // held
  wasPressed(): boolean;
  wasReleased(): boolean;
}
interface Axis1DState { readonly value: number }
interface Axis2DState { readonly value: Readonly<Vector2> }  // { x, y }
```

`Axis2DState.value` は毎フレーム同一オブジェクトを更新して返します（アロケーション回避）。

### 2.3 未知の名前の扱い

- 型レベル：`ActionName<C>` などの union により、定義外の名前はコンパイルエラー。
- 実行時：どの Map にも存在しない名前を渡した場合は `Error` を throw（fail fast）。
- 存在するが現在の Map に含まれない名前：throw せず、非アクティブ状態（`false` / `0` / `{x:0,y:0}`）を返す。
- `activateMap()` に未知の Map 名：`Error` を throw。

### 2.4 オプション

```typescript
interface InputSystemOptions {
  keyboardTarget?: EventTarget;              // 既定 window
  pointerTarget?: EventTarget;               // 既定 window
  autoAttach?: boolean;                      // 既定 true（DOM が無い環境では自動的に false）
  preventDefault?: boolean;                  // 既定 true
  gamepadSource?: () => ArrayLike<GamepadLike | null>;  // 既定 navigator.getGamepads()
  gamepadIndex?: number;                     // 使用パッドを固定
  deadZone?: { inner?: number; outer?: number };        // 既定 0.15 / 0.95
  triggerThreshold?: number;                 // 既定 0.5
  deviceSwitchThreshold?: number;            // 既定 0.5
  initialDevice?: DeviceKind;                // 既定 "keyboard"
}
```

すべて省略可能。`exactOptionalPropertyTypes` が有効なため、内部で既定値へ解決した `ResolvedOptions` を組み立てて使うこと。

## 3. Binding のデータ形式

すべて JSON 化可能なプレーンオブジェクトとし、`device` を判別子にします。

```typescript
type ButtonBinding =
  | { device: 'keyboard'; code: string }
  | { device: 'gamepad'; button: GamepadButtonName }
  | { device: 'pointer'; button: PointerButtonName };

type Axis1DBinding =
  | { device: 'keyboard'; negative: string; positive: string }
  | { device: 'gamepad'; source: GamepadAxis1DSource }
  | { device: 'gamepad'; negative: GamepadButtonName; positive: GamepadButtonName }
  | { device: 'pointer'; source: 'wheelX' | 'wheelY' };

type Axis2DBinding =
  | { device: 'keyboard'; up: string; down: string; left: string; right: string }
  | { device: 'gamepad'; source: 'leftStick' | 'rightStick' | 'dpad' }
  | { device: 'pointer'; source: 'position' | 'delta' };
```

- `GamepadButtonName`: `south` / `east` / `west` / `north` / `leftShoulder` / `rightShoulder` / `leftTrigger` / `rightTrigger` / `select` / `start` / `leftStick` / `rightStick` / `dpadUp` / `dpadDown` / `dpadLeft` / `dpadRight`（standard mapping の index 0〜15 に対応）。
- `GamepadAxis1DSource`: `leftStickX` / `leftStickY` / `rightStickX` / `rightStickY` / `leftTrigger` / `rightTrigger`。
- `PointerButtonName`: `primary`(0) / `middle`(1) / `secondary`(2)。
- 各 Binding は任意で `processors?: ProcessorConfig[]` を持てます（Axis 系のみ有効）。

### 3.1 ヘルパー

宣言を短く書くための恒等関数を提供します。返り値は上記のプレーンオブジェクトそのものです。

```typescript
key('Enter')                                  // { device:'keyboard', code:'Enter' }
pad('south')                                  // { device:'gamepad', button:'south' }
mouse('primary')                              // { device:'pointer', button:'primary' }
keyAxis1D('KeyA', 'KeyD')                     // negative, positive
keyAxis2D({ up:'KeyW', down:'KeyS', left:'KeyA', right:'KeyD' })
stick('left')                                 // { device:'gamepad', source:'leftStick' }
dpad()                                        // { device:'gamepad', source:'dpad' }
```

### 3.2 設定

```typescript
interface InputConfig {
  maps: Record<string, ActionMapConfig>;
  initialMap?: string;      // 省略時は maps の先頭キー
}
interface ActionMapConfig {
  actions?: Record<string, readonly ButtonBinding[]>;
  axes1D?: Record<string, readonly Axis1DBinding[] | Axis1DDefinition>;
  axes2D?: Record<string, readonly Axis2DBinding[] | Axis2DDefinition>;
}
interface Axis1DDefinition { bindings: readonly Axis1DBinding[]; processors?: ProcessorConfig[] }
interface Axis2DDefinition { bindings: readonly Axis2DBinding[]; processors?: ProcessorConfig[]; normalize?: boolean }
```

配列を直接書いた場合は `{ bindings: [...] }` と同義です。

## 4. フレーム更新規約

`update()` の内部順序を固定します。

1. 各デバイスの `poll()`：Gamepad はこの時点で `gamepadSource()` を読み、Keyboard / Pointer はイベントで蓄積済みの状態を確定する。
2. デバイス層のエッジ算出：前フレーム状態との差分と、フレーム内に蓄積された押下／解放回数から `pressedThisFrame` / `releasedThisFrame` を決める。
3. Processor 適用（デッドゾーン等）。
4. Binding 解決。
5. Action / Axis の当該フレーム値を確定。
6. デバイス層のフレーム蓄積値（押下回数・解放回数・wheel・delta）をリセット。

### 4.1 フレーム境界の規約

- 同一フレーム内の押下＋解放：`wasPressed()` と `wasReleased()` が同じフレームで両方 `true`、`isPressed()` は `false`。
- 同一フレームで複数回 `update()`：2 回目以降は差分・蓄積値が空のため、すべてのエッジが `false` になる。
- キーリピート：`KeyboardEvent.repeat === true` の `keydown` は無視する。
- `blur` / `visibilitychange`(hidden) / `pointercancel`：全物理入力を強制解放する。押下中だった入力は次の `update()` で `wasReleased()` が `true` になる。

### 4.2 Action の解決

Binding の論理和で解決します。`held` は「いずれかの Binding が押下中」です。

```text
held        = OR(binding.held)
anyPressed  = OR(binding.pressedThisFrame)
wasPressed  = !prevHeld && (held || anyPressed)
wasReleased = prevHeld ? !held : (anyPressed && !held)
```

- Enter を押したまま Gamepad south を押しても、`wasPressed()` は再度 `true` にならない。
- 片方を離してももう片方が押下中なら `wasReleased()` は `false`。

## 5. Action Map

- MVP は同時に 1 つの Map のみ有効。stack は Phase 2。
- `activateMap()` 時、旧 Map の Action / Axis は即座に非アクティブ状態にリセットする（`wasReleased()` は発生させない）。
- 新 Map の Action は、切り替え時点の物理状態を `prevHeld` として初期化する。押しっぱなしのキーは `isPressed()` が `true` になるが、`wasPressed()` は `true` にならない。
- 同じ Map を再度 `activateMap()` した場合は何もしない。

## 6. Axis の合成

### 6.1 座標系と Keyboard 合成

Axis2D の座標系は **Y 上向きが正の数学座標系** に統一します。画面座標への変換はゲーム側が行います。

Keyboard 合成は `positive` 押下で `+1`、`negative` 押下で `-1`、同時押しは `0`（加算）。
Axis2D の Y 軸は `up` が `+1`、`down` が `-1`。

Gamepad の Y 軸はブラウザ標準では下向きが正のため、**スティックの Y 値は符号を反転して取り込みます**。
これにより、同じ Axis2D に Keyboard と Gamepad の Binding を混在させても向きが一致します。
`dpad` も `dpadUp` が `+1`、`dpadDown` が `-1` です。

Pointer の `position` / `delta` はブラウザの生値（Y 下向きが正）のままとします。ピクセル値であり Axis の正規化対象外のためです。

### 6.2 複数 Binding の合成

同一 Axis に複数 Binding がある場合は**最大絶対値（Axis2D は最大ベクトル長）の Binding が勝つ**。加算しません。
同値の場合は宣言順で先に書かれた Binding を採用します。

### 6.3 正規化

Axis2D は `normalize !== false` のとき、長さが 1 を超える場合のみ長さ 1 に正規化します。
キーボードの斜め入力は `(0.7071, 0.7071)` になります。デッドゾーン処理済みのスティック値は 1 を超えないため影響を受けません。

正規化は `normalize` オプションによって切り替わる単一の処理でなければなりません。
`normalize: false` を指定した場合、キーボードの斜め入力は `(1, 1)` のまま返ります。
デバイス層や Binding 解決の内部に、`normalize` の値を無視する固定の斜め補正を持たせないでください。
`{ device:'pointer', source:'position' | 'delta' }` の Binding は正規化・デッドゾーンの対象外とします（ピクセル値をそのまま返す）。

## 7. Processor

```typescript
type ProcessorConfig =
  | { type: 'deadZone'; inner?: number; outer?: number; mode?: 'radial' | 'axial' }
  | { type: 'invert'; x?: boolean; y?: boolean }
  | { type: 'scale'; factor: number }
  | { type: 'clamp'; min?: number; max?: number };
```

- 実装は `Vector2` を受けて `Vector2` を返す純粋関数とし、Axis1D は `{ x: value, y: 0 }` として同じ経路を通す。
- 既定のデッドゾーン：Axis2D のスティック系は radial、Axis1D の軸・トリガーは axial。`inner=0.15` / `outer=0.95`。
- 再スケーリング：`inner < |v| < outer` を `0〜1` に線形再マップし、`|v| >= outer` は `1` に飽和。`|v| <= inner` は `0`。
- トリガー（`leftTrigger` / `rightTrigger`）は `0〜1` の片側値として扱い、負側へは写像しない。
- Gamepad 由来の Axis Binding には、`processors` 未指定でも既定デッドゾーンを自動適用する。Keyboard / Pointer 由来には適用しない。

## 8. デバイス層

共通インターフェース：

```typescript
interface InputDevice {
  poll(): void;       // 物理状態の確定
  endFrame(): void;   // フレーム蓄積値のリセット
  reset(): void;      // 全入力の強制解放
  attach(): void;
  detach(): void;
}
```

### 8.1 KeyboardDevice

- DOM リスナー（`keydown` / `keyup`）はイベントから `code` を取り出し、`handleKeyDown(code)` / `handleKeyUp(code)` を呼ぶだけにする。テストはこの 2 つのメソッドを直接呼んで仮想入力を注入できる。
- `preventDefault: true` のとき、いずれかの Map の Binding に含まれる `code` かつイベントの `target` が編集可能要素（`input` / `textarea` / `select` / `contenteditable`）でない場合のみ `preventDefault()` を呼ぶ。
- 押下中の code は `Set<string>` で保持。フレーム内の押下・解放は `Map<string, {pressed:number, released:number}>` で蓄積。

### 8.2 GamepadDevice

- `poll()` で `gamepadSource()` を呼び、対象パッドを選ぶ。選択規則：`gamepadIndex` 指定があればその index、なければ `mapping === 'standard'` かつ `connected` な最小 index、それも無ければ `connected` な最小 index。
- Gamepad オブジェクトはフレーム毎に別インスタンスになるため、値をコピーして保持する。
- 切断時：全ボタンを強制解放し、軸を 0 にする。押下中だったボタンは次フレームに `releasedThisFrame` が立つ。
- トリガーは `buttons[6] / buttons[7]` の `value` をアナログ値として使い、デジタル判定は `value >= triggerThreshold`（既定 0.5）。`pressed` フラグは参照しない。
- `GamepadLike` として必要最小限の構造型（`index` / `id` / `mapping` / `connected` / `buttons` / `axes`）を定義し、テストからモックを渡せるようにする。DOM の `Gamepad` 型に依存しない。
- ブラウザの `gamepadconnected` / `gamepaddisconnected` は購読してもよいが、状態の正は必ず `poll()` の結果とする。

### 8.3 PointerDevice

- `pointerdown` / `pointerup` / `pointermove` / `wheel` / `pointercancel` / `contextmenu` を購読。
- 座標：`pointerTarget` が `Element` の場合は `getBoundingClientRect()` を用いた要素相対座標、それ以外は `clientX/Y`。
- `delta`：フレーム内の移動量の合計。`update()` ごとにリセット。
- `wheel`：フレーム内の `deltaX` / `deltaY` の合計。`update()` ごとにリセット。単位は `WheelEvent.deltaMode` を問わず生値のまま（正規化しない）ことを明記する。
- テスト注入用に `handlePointerDown(button)` / `handlePointerUp(button)` / `handlePointerMove(x, y)` / `handleWheel(dx, dy)` を公開する。

## 9. Current Device Detection

- 初期値は `initialDevice`（既定 `"keyboard"`）。
- 切り替え条件：
  - Keyboard：いずれかのキーが `pressedThisFrame`。
  - Pointer：いずれかのボタンが `pressedThisFrame`、または wheel の入力があった。**カーソル移動だけでは切り替えない。**
  - Gamepad：いずれかのボタンが `pressedThisFrame`、またはデッドゾーン処理後の軸の絶対値が `deviceSwitchThreshold`（既定 0.5）を超えた。
- 同一フレームに複数デバイスの入力があった場合の優先順位は `gamepad` > `keyboard` > `pointer`。
- 判定は Binding に紐づかない物理入力全体を対象とする（Map に無い入力でも切り替わる）。

## 10. ライフサイクル

- `createInputSystem()` は `autoAttach !== false` かつ DOM が利用可能なら即座に `attach()` する。DOM が無い環境（Bun のテスト）では自動 attach しない。
- `dispose()` 後の `update()` はエラーにせず、全状態を非アクティブのまま維持する。
- `attach()` / `detach()` は冪等。

## 11. テスト

`tests/` 配下に `bun:test` で記述し、`package.json` に `"test": "bun test"` を追加します。
DOM を前提にせず、`autoAttach: false` と `devices.*.handle*()` / `gamepadSource` のモックで仮想入力を注入します。

必須のテスト観点（仕様書「テスト方針」より）：

1. `wasPressed()` が 1 フレームだけ `true` になること。
2. `wasReleased()` が 1 フレームだけ `true` になること。
3. `isPressed()` が押下中に継続すること。
4. 複数 Binding が OR で解決されること（片方保持中のもう片方の押下・解放でエッジが立たないこと）。
5. Action Map 切り替えが反映されること（旧 Map 無効化、押下中の切り替えで `wasPressed()` が立たないこと）。
6. デッドゾーン境界（`inner` 直下・直上、`outer` 以上）で期待どおりの値になること。
7. Keyboard / Gamepad の切り替えで `currentDevice` が期待どおりになること（スティックの微小値で切り替わらないこと）。

加えて、同一フレーム内の押下＋解放、Axis2D の斜め正規化、逆方向同時押しで 0 になること、複数 Binding の最大値採用、Gamepad 切断時の強制解放、トリガー閾値も検証します。

## 12. デモページ

`demo/` を「Gamepad 診断＋入力ライブラリ動作確認」ページとして実装します。
[UI リファレンス](./demo-references/README.md)のレイアウトを参考にしつつ、本ライブラリの API のみを使って値を表示します。

- Gamepad の接続状態、ボタン（論理名）、スティック値の可視化。
- `quiz` / `exploration` の 2 つの Action Map を定義し、切り替えボタンで挙動が変わることを示す。
- Action の `isPressed` / `wasPressed` / `wasReleased`、Axis1D / Axis2D の値、`currentDevice` の表示。
- `requestAnimationFrame` ループの先頭で `input.update()` を呼ぶ。
- デモコードは `src/index.ts` の公開 API のみを import し、内部モジュールへ直接 import しない。

## 13. 非目標（MVP では実装しない）

Runtime Rebinding UI、Input Prompt / Glyph、Combo / chord、Hold / Tap Interaction、Map の stack、複数 Gamepad / Player、Touch / Gesture。
ただし Binding がプレーンデータであることにより、将来の保存・再割り当てを妨げない構造を維持します。
