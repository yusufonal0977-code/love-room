package com.eclip.getloveroom;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.widget.RemoteViews;
import java.util.Iterator;
import org.json.JSONObject;

/** Ortak tuval: şövale gibi ahşap çerçevede ikinizin çizimi. Dokununca uygulamada çizim açılır; biri çizince ikisinde de görünür. */
public class DrawWidget extends AppWidgetProvider {
  @Override public void onUpdate(Context c, AppWidgetManager m, int[] ids) { render(c, m, ids); WidgetWorker.runNow(c); }
  @Override public void onEnabled(Context c) { WidgetWorker.schedule(c); }

  @Override public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, android.os.Bundle o) { render(c, m, new int[]{ id }); }
  static void show(Context c, AppWidgetManager m, int id, Art a, String ac, int code) {
    RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_image);
    v.setImageViewBitmap(R.id.img, a.bmp);
    v.setOnClickPendingIntent(R.id.root, Widgets.open(c, ac, code));
    m.updateAppWidget(id, v);
  }

  static void render(Context c, AppWidgetManager m, int[] ids) {
    String json = Bridge.prefs(c).getString("draw", null);
    boolean empty = json == null || json.equals("null") || json.equals("{}");
    Bitmap pic = paint(json);
    for (int id : ids) {
      Art a = Art.of(c, m, id, 250, 180);
      float w = a.w, h = a.h;
      a.card(Art.WOOD_L, Art.WOOD, 22);
      for (float y = 3; y < h; y += 7) a.rect(0, y, w, 0.8f, Color.argb(30, 0, 0, 0)); // ahşap damarı
      float top = 30, m0 = 10, cw = w - 2 * m0, ch = h - top - m0;
      a.roundRect(m0 - 2, top - 2, cw + 4, ch + 4, 12, Color.parseColor("#3a2214"));
      a.roundRect(m0, top, cw, ch, 10, Color.parseColor("#fffaf0"));
      // Çizim, tuvale oranı bozulmadan sığar
      float k = Math.min(cw / 4f, ch / 3f), dw = 4 * k - 8, dh = 3 * k - 6;
      float dx = m0 + (cw - dw) / 2, dy = top + (ch - dh) / 2;
      Paint p = new Paint(Paint.ANTI_ALIAS_FLAG); p.setFilterBitmap(true);
      a.g.drawBitmap(pic, null, new RectF(a.px(dx), a.px(dy), a.px(dx + dw), a.px(dy + dh)), p);
      if (empty) a.text(c, c.getString(R.string.draw_empty), w / 2, top + ch / 2 + 4, 11, cw - 16, Color.parseColor("#8a5638"), false, Paint.Align.CENTER, 7);
      // Başlık ve "çiz" düğmesi
      a.roundRect(10, 7, Math.min(w - 20, 120), 18, 9, Art.SUN);
      a.text(c, c.getString(R.string.w_draw), 18, 20, 10.5f, Math.min(w - 36, 104), Color.parseColor("#1a1608"), true, Paint.Align.LEFT, 7);
      a.roundRect(w - 50, 7, 40, 18, 9, Art.PINK);
      a.text(c, c.getString(R.string.draw_go), w - 30, 20, 10.5f, 34, Color.WHITE, true, Paint.Align.CENTER, 7);
      show(c, m, id, a, "draw", 1);
    }
  }

  /** Sitedeki tuvalle aynı: 0-1000 koordinatlı çizgiler, krem zemin, 4:3. */
  static Bitmap paint(String json) {
    int W = 480, H = 360;
    Bitmap b = Bitmap.createBitmap(W, H, Bitmap.Config.ARGB_8888);
    Canvas g = new Canvas(b);
    g.drawColor(Color.parseColor("#fffaf0"));
    if (json == null || json.equals("null")) return b;
    try {
      JSONObject all = new JSONObject(json);
      Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
      p.setStrokeCap(Paint.Cap.ROUND); p.setStrokeJoin(Paint.Join.ROUND);
      for (Iterator<String> it = all.keys(); it.hasNext(); ) {
        JSONObject st = all.optJSONObject(it.next());
        if (st == null) continue;
        String[] pts = st.optString("p", "").split(",");
        if (pts.length < 2) continue;
        try { p.setColor(Color.parseColor(st.optString("c", "#26160f"))); } catch (Exception e) { p.setColor(Color.BLACK); }
        float sw = (float) st.optDouble("s", 10) * W / 800f;
        p.setStrokeWidth(sw);
        float x0 = Float.parseFloat(pts[0]) / 1000f * W, y0 = Float.parseFloat(pts[1]) / 1000f * H;
        if (pts.length < 4) { p.setStyle(Paint.Style.FILL); g.drawCircle(x0, y0, sw / 2, p); continue; }
        Path path = new Path(); path.moveTo(x0, y0);
        for (int i = 2; i + 1 < pts.length; i += 2) path.lineTo(Float.parseFloat(pts[i]) / 1000f * W, Float.parseFloat(pts[i + 1]) / 1000f * H);
        p.setStyle(Paint.Style.STROKE); g.drawPath(path, p);
      }
    } catch (Exception ignored) { }
    return b;
  }
}
