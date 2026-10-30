# Upload regression fixtures

These tiny, original 2×2 solid-color images were generated with Pillow and independently decoded before committing. They contain no client photos or metadata.

- `valid.png`, `valid.jpg`, `valid.webp`: RGB green, standard encoders.
- `alpha.png`: RGBA green with transparency.
- `progressive.jpg`: progressive JPEG.
- `lossless.webp`: lossless WebP.
- `animated.webp`: green and blue frames, 100 ms each, looping.
- `valid-no-app.jpg`: `valid.jpg` with its optional APP0 segment removed; still independently decodable.

Upload tests retain these fixed fixtures rather than generating inputs with the decoder under test. Truncated/corrupted variants are constructed in tests, including PNG without IEND, incomplete pixel data, and incomplete animation data.
