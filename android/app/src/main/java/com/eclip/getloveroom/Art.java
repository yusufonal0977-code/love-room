package com.eclip.getloveroom;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.os.Build;
import android.os.Bundle;
import android.text.TextUtils;
import android.text.TextPaint;

/**
 * Widget'ların ortak çizim araçları. Widget'lar tek bir resim olarak çizilir: sitedeki piksel yazı tipi (Pixelify Sans),
 * marka renkleri ve küçük piksel süsler (yıldız, kalp) her telefonda aynı görünsün diye.
 * Ölçüler dp cinsinden; resim ekran yoğunluğuyla (en çok 2.5x) çizilir.
 */
class Art {
  static final int NIGHT_TOP = Color.parseColor("#2a1f4d"), NIGHT_BOTTOM = Color.parseColor("#0d0b1a");
  static final int SUN = Color.parseColor("#fcdf4b"), INK = Color.parseColor("#fff6d8"), SOFT = Color.parseColor("#b8ad8a");
  static final int PINK = Color.parseColor("#ff4f7b"), WOOD = Color.parseColor("#5a3420"), WOOD_L = Color.parseColor("#8a5a36");
  private static Typeface regular, bold;

  final Canvas g; final Bitmap bmp; final float s, w, h; // s: dp → piksel, w/h: dp
  private Art(Bitmap b, float scale, float wdp, float hdp) { bmp = b; g = new Canvas(b); s = scale; w = wdp; h = hdp; }

  /** Widget'ın o anki boyutunda (dp) boş tuval. */
  static Art of(Context c, AppWidgetManager m, int id, float defW, float defH) {
    Bundle o = m.getAppWidgetOptions(id);
    float wdp = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0), hdp = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0);
    if (wdp < 40) wdp = defW;
    if (hdp < 40) hdp = defH;
    float sc = Math.min(2.5f, c.getResources().getDisplayMetrics().density);
    while (wdp * hdp * sc * sc > 900_000) sc -= 0.25f; // widget resimleri için bellek sınırı
    return new Art(Bitmap.createBitmap(Math.round(wdp * sc), Math.round(hdp * sc), Bitmap.Config.ARGB_8888), sc, wdp, hdp);
  }

  static Typeface font(Context c, boolean b) {
    if (regular == null) {
      try {
        regular = Typeface.createFromAsset(c.getAssets(), "PixelifySans.ttf");
        bold = Build.VERSION.SDK_INT >= 26 ? new Typeface.Builder(c.getAssets(), "PixelifySans.ttf").setFontVariationSettings("'wght' 700").build() : Typeface.create(regular, Typeface.BOLD);
      } catch (Exception e) { regular = Typeface.MONOSPACE; bold = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD); }
    }
    return b ? bold : regular;
  }

  float px(float dp) { return dp * s; }
  Paint fill(int color) { Paint p = new Paint(Paint.ANTI_ALIAS_FLAG); p.setColor(color); return p; }

  /** Yuvarlak köşeli arka plan, dikey renk geçişi. */
  void card(int top, int bottom, float radiusDp) {
    Paint p = fill(top);
    p.setShader(new LinearGradient(0, 0, 0, bmp.getHeight(), top, bottom, Shader.TileMode.CLAMP));
    RectF r = new RectF(0, 0, bmp.getWidth(), bmp.getHeight());
    Path clip = new Path(); clip.addRoundRect(r, px(radiusDp), px(radiusDp), Path.Direction.CW);
    g.clipPath(clip);
    g.drawRect(r, p);
  }
  void roundRect(float x, float y, float rw, float rh, float r, int color) { g.drawRoundRect(new RectF(px(x), px(y), px(x + rw), px(y + rh)), px(r), px(r), fill(color)); }
  void rect(float x, float y, float rw, float rh, int color) { g.drawRect(px(x), px(y), px(x + rw), px(y + rh), fill(color)); }
  void circle(float cx, float cy, float r, int color) { g.drawCircle(px(cx), px(cy), px(r), fill(color)); }

  /** Gece gökyüzündeki küçük piksel yıldızlar (yerleri sabit, her çizimde aynı). */
  void stars(float maxY, int n) {
    Paint p = fill(INK);
    for (int i = 0; i < n; i++) {
      float x = (i * 37 % 97) / 97f * w, y = (i * 53 % 89) / 89f * maxY;
      p.setAlpha(90 + (i * 41 % 120));
      float d = (i % 3 == 0) ? 2.2f : 1.4f;
      g.drawRect(px(x), px(y), px(x + d), px(y + d), p);
    }
  }
  /** Piksel kalp (7x6 ızgara), size: bir pikselin dp boyu. */
  void heart(float x, float y, float size, int color) {
    String[] m = { ".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..." };
    Paint p = fill(color);
    for (int r = 0; r < m.length; r++) for (int k = 0; k < 7; k++) if (m[r].charAt(k) == 'X') g.drawRect(px(x + k * size), px(y + r * size), px(x + (k + 1) * size), px(y + (r + 1) * size), p);
  }

  /** Yazı: dp boyutunda, hizalı; genişliğe sığmazsa küçülür (minDp'ye kadar), yine sığmazsa "…" ile kısalır. */
  float text(Context c, String t, float x, float y, float sizeDp, float maxWDp, int color, boolean b, Paint.Align align, float minDp) {
    if (t == null) t = "";
    TextPaint p = new TextPaint(Paint.ANTI_ALIAS_FLAG);
    p.setTypeface(font(c, b)); p.setColor(color); p.setTextAlign(align);
    float size = sizeDp;
    p.setTextSize(px(size));
    while (size > minDp && p.measureText(t) > px(maxWDp)) { size -= 0.5f; p.setTextSize(px(size)); }
    String fit = TextUtils.ellipsize(t, p, px(maxWDp), TextUtils.TruncateAt.END).toString();
    p.setShadowLayer(px(1.2f), 0, px(1), Color.argb(150, 0, 0, 0));
    g.drawText(fit, px(x), px(y), p);
    return size;
  }
  Path path() { return new Path(); }
}
