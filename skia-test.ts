import * as sk from 'skia-n-api';
import * as fs from "fs";
import * as path from "path";

function draw(canvas):void {

    const fill = sk.skPaintNew();
    sk.skPaintSetColor(fill, sk.skColorSetArgb(0xFF, 0xFF, 0xFF, 0xFF));
    sk.skCanvasDrawPaint(canvas, fill);

    sk.skPaintSetColor(fill, sk.skColorSetArgb(0xFF, 0xFF, 0x00, 0xFF));
    const rect = new Float32Array([
        100,
        100,
        540,
        380
    ]);
    sk.skCanvasDrawRect(canvas, rect.buffer, fill);

    const stroke = sk.skPaintNew();
    sk.skPaintSetColor(stroke, sk.skColorSetArgb(0xFF, 0xFF, 0x00, 0x00));
    sk.skPaintSetAntialias(stroke, true);
    sk.skPaintSetStyle(stroke, sk.enums.STROKE_SK_PAINT_STYLE);
    sk.skPaintSetStrokeWidth(stroke, 5.0);
    const path = sk.skPathNew();

    sk.skPathMoveTo(path, 50.0, 50.0);
    sk.skPathLineTo(path, 590.0, 50.0);
    sk.skPathCubicTo(path, -490.0, 50.0, 1130.0, 430.0, 50.0, 430.0);
    sk.skPathLineTo(path, 590.0, 430.0);
    const intervals = new Float32Array([10, 20]);
    const effect = sk.skPathEffectCreateDash(intervals.buffer, 2, 25);
    sk.skPaintSetPathEffect(stroke, effect);
    sk.skCanvasDrawPath(canvas, path, stroke);
    sk.skPathDelete(path);
    sk.skPaintDelete(stroke);

    sk.skPaintSetColor(fill, sk.skColorSetArgb(0x80, 0x00, 0xFF, 0x00));
    const rect2 = new Float32Array([
        120,
        120,
        520,
        360
    ]);
    const mask = sk.skMaskfilterNewBlur(sk.enums.NORMAL_SK_BLUR_STYLE, 10.0);
    sk.skPaintSetMaskfilter(fill, mask);
    sk.skCanvasDrawOval(canvas, rect2.buffer, fill);
    sk.skPaintDelete(fill);

    const familyName = "Times New Roman";
    const style = sk.skFontstyleNew(400, 1, sk.enums.UPRIGHT_SK_FONT_STYLE_SLANT);
    const typeface = sk.skTypefaceCreateFromNameWithFontStyle(familyName, style);
    const text = sk.skPaintNew();
    sk.skPaintSetAntialias(text, true);
    sk.skPaintSetColor(text, sk.skColorSetArgb(0xFF, 0xFF, 0x00, 0x00));
    sk.skPaintSetTextsize(text, 50.0);
    sk.skPaintSetTypeface(text, typeface);
    const str = "skiaJS";
    sk.skCanvasDrawText(canvas, str, str.length, 1000.0, 50.0, text);
    sk.skPaintDelete(text);

    const size = new Int32Array([10, 10]);
    const shader = sk.skPaintNew();
    const noise = sk.skShaderNewPerlinNoiseTurbulence(0.8, 0.3, 10, 0.383928392, size.buffer);
    sk.skPaintSetShader(shader, noise);
    const rect3 = new Float32Array([560.0, 100.0, 940.0, 380.0]);
    sk.skCanvasDrawRect(canvas, rect3.buffer, shader);
    sk.skPaintDelete(shader);

    const s = 200;
    const info2 = new Int32Array([
        0, 0, s, s, sk.enums.GRAY_8_SK_COLORTYPE, sk.enums.OPAQUE_SK_ALPHATYPE
    ]);
    const bitmap = sk.skPaintNew();
    const img = sk.skBitmapNew();
    sk.skBitmapTryAllocPixels(img, info2.buffer, s);
    const pixels = new Uint8Array(s * s);
    for (let i = 0; i < s * s; i++) {
        if (i % 2 == 0 && i % 3 == 0) {
            pixels[i] = 0xFF;
        } else {
            pixels[i] = 0x00;
        }
    }
    sk.skBitmapSetPixels(img, pixels.buffer);
    sk.skCanvasDrawBitmap(canvas, img, 1000.0, 100.0, bitmap);
    sk.skPaintDelete(bitmap);

    sk.skCanvasSave(canvas);
    const stroke2 = sk.skPaintNew();
    sk.skPaintSetColor(stroke2, sk.skColorSetArgb(0xFF, 0x00, 0x00, 0xFF));
    sk.skPaintSetAntialias(stroke2, true);
    sk.skPaintSetStyle(stroke2, sk.enums.STROKE_SK_PAINT_STYLE);
    sk.skPaintSetStrokeWidth(stroke2, 5.0);
    const path2 = sk.skPathNew();
    const svg = "m451.111 451.111h-451.111v-451.111h451.111zm-386.667-64.444h322.222v-322.223h-322.222z";
    sk.skPathParseSvgString(path2, svg);
    sk.skCanvasTranslate(canvas, 1000.0, 500.0);
    sk.skCanvasScale(canvas, 0.2, 0.2);
    sk.skCanvasDrawPath(canvas, path2, stroke2);
    sk.skCanvasRestore(canvas);
    sk.skPathDelete(path2);
    sk.skPaintDelete(stroke2);

    sk.skCanvasSave(canvas);
    const luma = sk.skColorfilterNewLumaColor();
    const imgfilter = sk.skImagefilterNewColorFilter(luma, null, null);
    //const imgpaint = sk.skPaintNew();
    //sk.skPaintSetImagefilter(imgpaint, imgfilter);

    //const url = "icon.png";
    //const encoded = sk.skDataNewFromFile(url);
    //const rect4 = new Int32Array([0, 0, 1024, 1024]);
    //const image2 = sk.skImageNewFromEncoded(encoded, rect4.buffer);
    //sk.skCanvasScale(canvas, 0.2, 0.2);
    //sk.skCanvasDrawImage(canvas, image2, 1000.0, 2500.0, imgpaint);
    //sk.skCanvasRestore(canvas);

    const pointfill = sk.skPaintNew();
    const points = new Float32Array([900.0, 600.0, 1000.0, 700.0]);
    sk.skCanvasDrawPoints(canvas, sk.enums.LINES_SK_POINT_MODE, 2, points.buffer, pointfill);
    sk.skPaintDelete(pointfill);

    const rrect = sk.skPaintNew();
    const rounded = sk.skRrectNew();
    const rect6 = new Float32Array([460.0, 500.0, 740.0, 700.0]);
    sk.skRrectSetRectXy(rounded, rect6.buffer, 50, 50);
    sk.skCanvasDrawRrect(canvas, rounded, rrect);
    sk.skPaintDelete(rrect);
}

function main(): void {
    const info = new Int32Array([
        0, 0, 1280, 720, sk.enums.RGBA_8888_SK_COLORTYPE, sk.enums.OPAQUE_SK_ALPHATYPE
    ]);
    const surface = sk.skSurfaceNewRaster(info.buffer, 1280 * 4, null);
    const canvas = sk.skSurfaceGetCanvas(surface);
    draw(canvas);
    const image = sk.skSurfaceNewImageSnapshot(surface);
    const imgData = sk.skImageEncode(image);
    const buffer = sk.getMemory(sk.skDataGetData(imgData), BigInt(sk.skDataGetSize(imgData)));
    fs.writeFileSync(path.join(__dirname, 'skia.png'), new Int8Array(buffer));
}

main();