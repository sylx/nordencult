# 閉じる操作を組み込んだ装飾枠

素材: `src/assets/ui/skins/ornate-close-frame.png`

組み込みの `image_gen` ツールで生成。`medium-frame.png` は金属の質感の参考として使用。画像を四辺 25% で nine-slice し、角を 64px に固定して使う。右上の円形部分に、実際に操作できる透明なボタンと × を重ねる。

生成プロンプト:

```text
Use case: ui-mockup / game UI production asset.
Create one standalone square ornamental window frame PNG with TRUE TRANSPARENT background and completely transparent empty center. This is a nine-slice scalable frame asset for a medieval fantasy strategy game, NOT a screenshot or mockup. Reference image is material/style reference only: aged warm gilded bronze, sculpted acanthus leaves, elegant antique relief, dark recessed metal and narrow double beveled rails. Design a NEW frame with a special integrated close mechanism.
Composition: square 1024x1024 canvas; frame outermost silhouette stays inside 16px margin. Four corners fit within their respective 256x256 corner tiles. Straight top/bottom/left/right rails, uninterrupted and perfectly aligned; all rails between the corner tiles have constant cross sections, suitable for stretching. Overall physical rail thickness about 48-60 source pixels, medium weight. Broad open center transparent. All three normal corners have ornate intertwined sculpted foliage.
CRITICAL TOP RIGHT CORNER: The top rail and right rail transform into complex interwoven curling gold vines/acanthus scrollwork that wrap over and under the rim of a small dark round recessed push medallion. The button and corner ornament MUST be sculpted as a single continuous object, not a separate button sitting inside the window. The top-right corner's 256x256 tile must contain a circular dark bronze recessed button face centered at source position (896,128) with diameter about 112px. Surround the button with intertwined sculptural gilded curls that visibly join both adjacent rails. Do NOT put any X, letter or symbol on the button face; leave its center dark and empty for an accessible live UI cross icon. Do not place any buttons anywhere else. The round face must remain easy to see amid the intricate curls.
Lighting: crisp high quality hand-painted realistic embossed metal, top-left highlights, dark deep recesses, restrained weathering. Flat orthographic view, no perspective.
No background panel, no paper, no text, no labels, no title, no checkerboard rendered into the image, no rectangle button, no separate ivory control. Only the metal frame and integrated empty dark round button face, all surrounding/interior negative space genuine alpha.
```
