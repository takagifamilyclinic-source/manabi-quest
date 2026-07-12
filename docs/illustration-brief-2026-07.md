# まなびクエスト イラスト刷新 指示書（他AI用）

作成日: 2026-07-12 ／ 対象: 東北モンスター図鑑 全40体（通常20＋進化20）＋アプリアイコン3種
目的: バラバラの画風・背景を、**上質なチビ/カワイイ系 × 共通の淡い背景**で完全に統一する。

---

## 0. この指示書の使い方（重要）

各イラストのプロンプトは **「① 共通スタイルブロック（毎回同じ・全40体に必ず前置き）」＋「② 各キャラの中身（1体ずつ違う）」** の組み合わせで作る。
つまり **①は固定コピペ、②だけ差し替え** る。これで40体が同じ画風・同じ背景・同じ枠取りに揃う。

- プロンプトは**英語で入れる**のを推奨（画像AIは英語のほうが安定）。日本語しか使えないAIなら②を訳して使う。
- 生成順は「通常→その進化後」をペアで連続して作ると、対（つい）の統一が取りやすい。
- **背景は透過しない**（＝共通の淡い背景を塗り込む）。

---

## 1. 技術仕様（全カット共通・厳守）

| 項目 | 指定 |
|---|---|
| 画像比率 | **縦4:5**（必ず。図鑑グリッドが崩れるため他比率禁止） |
| 解像度 | **1024×1280 推奨**（上質・Retina対応）。最低でも 512×640 |
| 形式 | PNG |
| 背景 | **不透過**・下記「共通背景」を塗る（シーンや小物・文字・枠線は描かない） |
| 構図 | 全身・中央・正面〜3/4・足元は接地。**上下左右に約10〜12%の余白**、キャラは画面高の約80%を占める |
| 文字 | 画像内に文字・ロゴ・サイン・ウォーターマーク一切なし |

### ファイル名（既存を上書きするので**完全一致**させる）
- 通常: `assets/mon-<id>.png`
- 進化後: `assets/evo-<id>.png`
- 進化後は通常と**同じ<id>**（例: `mon-yukibo.png` の進化は `evo-yukibo.png`）。§4の一覧に全idあり。

---

## 2. ① 共通スタイルブロック（全40体に必ず前置き・固定コピペ）

英語（そのまま貼る）:

```
Adorable kawaii chibi mascot creature, official collectible "monster dex" card art for a children's learning app.
Proportions: cute chibi, about 2 to 2.5 heads tall, rounded soft body, short limbs, big head.
Face: large glossy rounded eyes with a bright highlight, small friendly smile, gentle happy expression, soft rosy cheek blush. Friendly and cute, absolutely NOT scary.
Rendering: clean bold rounded outlines (dark-tinted, not pure black), soft cel shading with gentle gradients, soft ambient occlusion, warm soft key light from top-left, subtle rim light, semi-glossy premium toy-like finish, crisp and high quality.
Background: ONE consistent soft studio backdrop for every card — a smooth very pale cool background, off-white softly graduating to a light blue-lavender at the edges, faint soft glow behind the character, and a subtle soft round drop shadow under the feet. No scenery, no props on the floor, no text, no border, no frame.
Full body, centered, character fills about 80 percent of a tall 4:5 frame, small even margins on all sides.
Consistent art style across the whole set: same lighting, same background, same outline weight, same eye style.
```

日本語での意図（AIが日本語のみのとき用の要約）:
> 児童向け学習アプリの「モンスター図鑑」カード絵。2〜2.5頭身の**丸くて可愛いチビ**。大きなツヤ目＋やさしい笑顔＋ほお赤み。**太めの丸い主線＋やわらかいセル塗り＋左上からの光**の上質仕上げ。背景は**全カード共通の淡い冷色**（オフホワイト→縁が淡いブルーラベンダー、足元にやわらかい丸い影）。風景・小物・文字・枠は描かない。全身・中央・4:5・上下左右に均等な余白。**怖くしない**。

---

## 3. 統一のためのルール（品質の肝）

1. **背景は40体すべて同一**。キャラの色だけが変わり、背景は変えない（これが「統一感」の主因）。
2. **通常→進化後は"同じ個体の成長"** に見せる。進化後は「同じ配色・同じ識別特徴を保ったまま、ひとまわり大きく・少し立派に・ディテール増し・軽いオーラ/きらめき」。別キャラに見せない。可愛さとチビ頭身は維持。
3. **タイプ配色の目安**（キャラ本体の色。背景には反映しない）:
   - ゆき=白〜淡い水色 ／ まつり=赤・金・提灯オレンジ ／ たべもの=各食材の色 ／ しぜん=緑・土色・雪 ／ でんせつ=金・朱でやや特別感
4. **レア度**: SR（なまはげん・たつこりん）は控えめな**きらめき/淡いオーラ**を足して特別感を出す。ただし画風・背景・頭身は共通のまま。
5. **怖さゼロ**: 牙・角・鬼・オオカミ等は「丸く・小さく・にっこり」。小さい子が見ても可愛いこと最優先（現行のなまはげん＝武器・鋭い牙は不可）。

---

## 4. ② 各キャラの中身（1体ずつ・全20系統）

各項目 = 「共通スタイルブロックの後ろに続ける英語サブジェクト」＋「進化後の差分」。
`type/rarity` は配色とレア演出の目安。**残すべき識別特徴**を崩さないこと。

### ゆきタイプ

**1. yukibo ／ ゆきぼう（ゆき・N）**
- 通常 `mon-yukibo.png`: `a tiny round white snow spirit, chubby snowball body, little icicle-tuft on head, a small kamakura snow-hut hood over its shoulders, pale ice-blue accents.`
- 進化 `evo-yukibo.png` だいゆきぼう: 一回り大きくふかふか、頭に小さな雪の冠（かまくら型）、周りに舞う雪の結晶を追加。

**2. yukiusa ／ ゆきうさ（ゆき・N）**
- 通常 `mon-yukiusa.png`: `a fluffy pure-white snow rabbit, red leaf ears (real yukiusagi style), tiny red berry eyes, round snowball body.`
- 進化 `evo-yukiusa.png` おおゆきうさ: ふさふさ長めの耳、体を大きく、足元に小さな雪の山。

**3. fubukimaru ／ ふぶきまる（ゆき・R）**
- 通常 `mon-fubukimaru.png`: `a chibi wolf pup, white and pale-blue fur with subtle snowflake markings, fluffy oversized tail, cute friendly face.`
- 進化 `evo-fubukimaru.png` だいふぶきまる: 体を大きく、氷のたてがみ、周囲に渦巻く雪のオーラ。

### まつりタイプ

**4. chochinmaru ／ ちょうちんまる（まつり・R）**
- 通常 `mon-chochinmaru.png`: `a small cheerful festival fairy holding a tall bamboo pole strung with many glowing red-and-gold paper lanterns (Akita kanto festival), warm glow.`
- 進化 `evo-chochinmaru.png` だいちょうちんまる: 竿を高く・提灯を増やし、全体が温かく発光。

**5. nebutaro ／ ねぶたろう（まつり・R）**
- 通常 `mon-nebutaro.png`: `a cute chibi warrior made of a glowing painted paper lantern (nebuta float style), colorful paper-art body, friendly brave smile, warm inner light.`
- 進化 `evo-nebutaro.png` だいねぶたろう: 一回り大きく、紙細工の装飾を豪華に、発光を強める。

**6. bondenkun ／ ぼんでんくん（まつり・R）**
- 通常 `mon-bondenkun.png`: `a happy little festival spirit carrying a tall decorated bonden pole with colorful streamers and paper decorations (Yokote winter festival).`
- 進化 `evo-bondenkun.png` だいぼんでんくん: 竿を大きく、飾りと房を増やして華やかに。

**7. kokeshimaru ／ こけしまる（まつり・N）**
- 通常 `mon-kokeshimaru.png`: `a round wooden kokeshi doll character, smooth cylindrical body painted with cute flowers, rosy cheeks, simple happy face.`
- 進化 `evo-kokeshimaru.png` おおこけしまる: 背を高く、花模様を豪華に、頭飾りを追加。

### たべものタイプ

**8. yakisoban ／ やきそばん（たべもの・R）**
- 通常 `mon-yakisoban.png`: `a chibi yakisoba noodle blob creature wearing a sunny-side-up fried egg as a hat, glossy brown noodles, red pickled-ginger accent (Yokote yakisoba).`
- 進化 `evo-yakisoban.png` おおやきそばん: 大きく湯気立てて、目玉焼き帽子を立派に、具材トッピング増し。

**9. iburin ／ いぶりん（たべもの・N）**
- 通常 `mon-iburin.png`: `a small cozy smoked-radish lizard, warm amber-brown body (iburigakko pickle), gentle sleepy smile, a tiny wisp of smoke.`
- 進化 `evo-iburin.png` おおいぶりん: 一回り大きく、色を深い飴色に、煙のうずまきを追加。

**10. hatahatan ／ はたはたん（たべもの・N）**
- 通常 `mon-hatahatan.png`: `a chibi sandfish creature (hatahata, Akita fish), pale silvery body with cute yellow lightning-bolt markings, round friendly eyes.`
- 進化 `evo-hatahatan.png` おおはたはたん: 体を大きく、稲妻マークを発光させる。

**11. kiritanpon ／ きりたんぽん（たべもの・N）**
- 通常 `mon-kiritanpon.png`: `a chibi grilled rice-stick creature on a cedar skewer (kiritanpo), toasty golden surface, cute face.`
- 進化 `evo-kiritanpon.png` だいきりたんぽん: 大きく、こんがりした焼き目を濃く、湯気を添える。

**12. zundamaru ／ ずんだまる（たべもの・N）**
- 通常 `mon-zundamaru.png`: `a round sweet green edamame-bean fairy (zunda), soft pastel-green body, tiny bean-pod details, sweet happy face.`
- 進化 `evo-zundamaru.png` おおずんだまる: 大きく、そばに小さな餅、色みを鮮やかに。

**13. ringoro ／ りんごろう（たべもの・N）**
- 通常 `mon-ringoro.png`: `a round glossy red apple creature with a small green leaf tail, shiny highlight, cute cheeks (Aomori apple).`
- 進化 `evo-ringoro.png` おおりんごろう: 大きくツヤを増し、頭にりんごの花を添える。

**14. sakuranbou ／ さくらんぼう（たべもの・N）**
- 通常 `mon-sakuranbou.png`: `twin little cherry fairies joined by their stems, glossy red cherries, two cute faces, small leaf (Yamagata cherry).`
- 進化 `evo-sakuranbou.png` おおさくらんぼう: 実を大きく、桜の花びらを添えて華やかに。

**15. inaniwan ／ いなにわん（たべもの・N）**
- 通常 `mon-inaniwan.png`: `a graceful silky white noodle spirit (Inaniwa udon), soft flowing noodle ribbons forming its body, elegant gentle smile.`
- 進化 `evo-inaniwan.png` おおいなにわん: 麺のリボンを長く優雅に、淡い光沢を足す。

### しぜんタイプ

**16. akitan ／ あきたん（しぜん・R）** ※アプリ看板候補
- 通常 `mon-akitan.png`: `a fluffy loyal Akita-dog puppy, cream-and-white fur, curled tail, upright triangle ears, big warm friendly eyes.`
- 進化 `evo-akitan.png` だいあきたん: 一回り大きく凛々しく、でもふわふわ可愛さは維持、首に小さな注連縄風の飾り。

**17. chokaigan ／ ちょうかいがん（しぜん・R）**
- 通常 `mon-chokaigan.png`: `a gentle small rounded rock creature shaped like a snowy mountain (Mt. Chokai), stone-grey body with a white snowy peak head, calm kind eyes.`
- 進化 `evo-chokaigan.png` だいちょうかいがん: 山体を大きく、雪の稜線を増やして荘厳に、でも表情はやさしく。

**18. shirakamin ／ しらかみん（しぜん・R）**
- 通常 `mon-shirakamin.png`: `a little ancient beech-tree forest spirit (Shirakami), round wooden body, leafy green hair, gentle friendly face.`
- 進化 `evo-shirakamin.png` おおしらかみん: 大きく、葉の茂りを豊かに、小鳥や木の実を添える。

### でんせつタイプ（SR＝控えめなきらめき）

**19. namahagen ／ なまはげん（でんせつ・SR）** ★怖くしない最重要
- 通常 `mon-namahagen.png`: `a CHUBBY cute friendly oni (namahage), round soft red face, small rounded horns, big happy eyes, tiny harmless fangs, wearing a straw cape, holding a toy-like wooden ono, playful mischievous but adorable smile. Cute and friendly, NOT scary at all.`
- 進化 `evo-namahagen.png` おおなまはげん: 一回り大きく、藁蓑を立派に、朱と金でやや特別感＋控えめなきらめき。やはり可愛く。

**20. tazukohime ／ たつこりん（でんせつ・SR）**
- 通常 `mon-tazukohime.png`: `a cute chibi lake princess spirit of Lake Tazawa, long flowing golden hair, gentle mermaid-like fish tail, soft golden glow, kind graceful smile.`
- 進化 `evo-tazukohime.png` りゅうたつこりん: 伝説どおり**小さな龍の姫**へ。金の龍の角・ひれ・うろこを可愛く付与、金色の淡いオーラ（SR）、あくまでチビ可愛く。

---

## 5. アプリアイコン（3サイズ・正方形）

図鑑カードと同じ画風で、**看板キャラ1体のバスト（顔〜胸）**をアイコン化する。推奨は **あきたん（Akita犬パピー）**（地元色＋万人受け）。別のお気に入りがあれば差し替え可。

- 共通スタイルブロックのうち「full body / 4:5」の部分だけ外し、代わりに:
  `Bust portrait (face and chest), centered, big friendly eyes, filling the frame with small margins. Square 1:1. Full-bleed rounded app-icon background using the app's brand indigo gradient (deep indigo #1a2456 to #3f51a5), the character bright in front. No text, no logo.`
- 書き出し3種（**同一絵からリサイズ**でOK・完全一致名）:
  - `assets/icon-512.png` … 512×512
  - `assets/icon-192.png` … 192×192
  - `assets/icon-180.png` … 180×180
- iOS ホーム画面用なので**不透過**・角丸はOS側で処理されるため**四角の全面塗り**でよい。

---

## 6. 納品チェックリスト（受け取り時に確認）

- [ ] 40体すべて **同じ淡い背景・同じ光・同じ主線・同じ目のスタイル**で揃っている
- [ ] 通常⇄進化後が **同一個体の成長**に見える（配色・特徴が一致、進化後だけ大きく立派）
- [ ] 比率 **4:5**（アイコンのみ 1:1）／ 画像内に **文字・枠・ウォーターマークなし**
- [ ] 怖い表現ゼロ（特に なまはげん）
- [ ] ファイル名が §4/§5 と**完全一致**（`mon-<id>.png` / `evo-<id>.png` / `icon-<px>.png`）
- [ ] SR 2体（namahagen・tazukohime）に控えめなきらめき

## 7. こちら（Claude）側の作業（納品後）
1. `assets/` に上書き保存（同名で置換）。
2. 画像を変えたら **`sw.js` の CACHE バージョンを上げる**（上げないと既存ユーザーに更新が届かない）。
3. `git push` → 数分で GitHub Pages に反映。live で図鑑を目視確認。
> ※ 生成し直したPNGを渡してもらえれば、この3手順は当方で実施します。
