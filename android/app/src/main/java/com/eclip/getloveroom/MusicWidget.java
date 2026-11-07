package com.eclip.getloveroom;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.graphics.Color;
import android.graphics.Paint;
import android.widget.RemoteViews;
import org.json.JSONObject;

/** Pikabımız: plak, kol ve evde şimdi çalan şarkı (YouTube listesi ya da Spotify). Dokununca uygulamada pikap açılır. */
public class MusicWidget extends AppWidgetProvider {
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
    String title = null, sub = null;
    try {
      String y = Bridge.prefs(c).getString("ytradio", null);
      if (y != null && !y.equals("null")) { JSONObject o = new JSONObject(y); if (o.has("list")) { title = o.optString("title", null); sub = c.getString(R.string.music_yt); } }
      String s = Bridge.prefs(c).getString("music", null);
      if (title == null && s != null && !s.equals("null")) {
        JSONObject o = new JSONObject(s);
        if (o.optBoolean("playing")) { title = o.optString("trackName", o.optString("name", null)); sub = o.optString("artist", "Spotify"); }
      }
    } catch (Exception ignored) { }
    boolean on = title != null && !title.isEmpty();
    for (int id : ids) {
      Art a = Art.of(c, m, id, 250, 72);
      float w = a.w, h = a.h, r = Math.min(h * 0.4f, w * 0.18f), cx = 12 + r, cy = h / 2;
      a.card(Art.NIGHT_TOP, Art.NIGHT_BOTTOM, 22);
      a.stars(h, 10);
      // Plak: oluklar, sarı etiket, delik; üstünde pikap kolu
      a.circle(cx, cy, r, Color.parseColor("#141018"));
      Paint ring = new Paint(Paint.ANTI_ALIAS_FLAG); ring.setStyle(Paint.Style.STROKE); ring.setStrokeWidth(a.px(0.8f)); ring.setColor(Color.parseColor("#3a3046"));
      for (float k = 0.55f; k < 0.95f; k += 0.13f) a.g.drawCircle(a.px(cx), a.px(cy), a.px(r * k), ring);
      a.circle(cx, cy, r * 0.36f, on ? Art.SUN : Art.SOFT);
      a.heart(cx - r * 0.21f, cy - r * 0.15f, r * 0.06f, Art.PINK);
      a.circle(cx, cy, r * 0.05f, Color.parseColor("#141018"));
      Paint arm = new Paint(Paint.ANTI_ALIAS_FLAG); arm.setColor(Color.parseColor("#d9d2c0")); arm.setStrokeWidth(a.px(2)); arm.setStrokeCap(Paint.Cap.ROUND);
      a.g.drawLine(a.px(cx + r * 0.95f), a.px(cy - r * 0.95f), a.px(cx + r * 0.35f), a.px(cy + r * 0.1f), arm);
      a.circle(cx + r * 0.95f, cy - r * 0.95f, 2.4f, Color.parseColor("#d9d2c0"));
      float x0 = cx + r + 12, tw = w - x0 - (on ? 30 : 12);
      a.text(c, c.getString(R.string.w_music), x0, h * 0.3f, Math.min(10.5f, h * 0.16f), tw, Art.SUN, true, Paint.Align.LEFT, 7);
      a.text(c, on ? title : c.getString(R.string.music_quiet), x0, h * 0.58f, Math.min(14, h * 0.21f), tw, Art.INK, true, Paint.Align.LEFT, 11); // uzun ad küçülmeden kısalır
      a.text(c, on ? (sub == null ? "" : sub) : c.getString(R.string.music_tap), x0, h * 0.82f, Math.min(10, h * 0.15f), tw, Art.SOFT, false, Paint.Align.LEFT, 6);
      if (on) { // ekolayzır
        float[] hs = { 0.35f, 0.6f, 0.45f, 0.75f };
        for (int i = 0; i < 4; i++) a.roundRect(w - 26 + i * 4.5f, cy + h * 0.2f - h * 0.4f * hs[i], 3, h * 0.4f * hs[i], 1, Art.SUN);
      }
      show(c, m, id, a, "music", 4);
    }
  }
}
