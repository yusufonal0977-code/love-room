package com.eclip.getloveroom;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.graphics.Color;
import android.graphics.Paint;
import android.widget.RemoteViews;
import java.util.Calendar;
import org.json.JSONObject;

/** İlişki saatimiz: gece gökyüzü, güneş ile ay arasında kalp, büyük gün sayısı; kavuşma günü girildiyse pembe şerit. */
public class ClockWidget extends AppWidgetProvider {
  @Override public void onUpdate(Context c, AppWidgetManager m, int[] ids) { render(c, m, ids); WidgetWorker.runNow(c); }
  @Override public void onEnabled(Context c) { WidgetWorker.schedule(c); }

  @Override public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, android.os.Bundle o) { render(c, m, new int[]{ id }); }
  static void show(Context c, AppWidgetManager m, int id, Art a, String ac, int code) {
    RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_image);
    v.setImageViewBitmap(R.id.img, a.bmp);
    v.setOnClickPendingIntent(R.id.root, Widgets.open(c, ac, code));
    m.updateAppWidget(id, v);
  }

  static Calendar day(String ymd) {
    if (ymd == null || ymd.length() < 10) return null;
    Calendar k = Calendar.getInstance(); k.clear();
    k.set(Integer.parseInt(ymd.substring(0, 4)), Integer.parseInt(ymd.substring(5, 7)) - 1, Integer.parseInt(ymd.substring(8, 10)));
    return k;
  }
  static long daysFrom(Calendar a) {
    Calendar t = Calendar.getInstance(); Calendar today = Calendar.getInstance(); today.clear();
    today.set(t.get(Calendar.YEAR), t.get(Calendar.MONTH), t.get(Calendar.DAY_OF_MONTH));
    return Math.round((today.getTimeInMillis() - a.getTimeInMillis()) / 86400000.0);
  }

  static void render(Context c, AppWidgetManager m, int[] ids) {
    String big = null, meet = null;
    try {
      String s = Bridge.prefs(c).getString("rel", null);
      if (s != null && !s.equals("null")) {
        JSONObject r = new JSONObject(s);
        Calendar since = day(r.optString("since", null));
        if (since != null) big = String.valueOf(daysFrom(since) + 1);
        Calendar m2 = day(r.optString("meet", null));
        if (m2 != null) { long left = -daysFrom(m2); if (left > 0) meet = c.getString(R.string.clock_meet, left); else if (left == 0) meet = c.getString(R.string.clock_meet_today); }
      }
    } catch (Exception ignored) { }
    for (int id : ids) {
      Art a = Art.of(c, m, id, 160, 160);
      float w = a.w, h = a.h, cy = h * 0.2f;
      a.card(Art.NIGHT_TOP, Art.NIGHT_BOTTOM, 22);
      a.stars(h * 0.55f, 18);
      // Güneş (sen ya da partnerin) · kalp · ay
      a.circle(w / 2 - 20, cy, 6.5f, Art.SUN);
      for (int k = 0; k < 8; k++) { double an = k * Math.PI / 4; a.circle(w / 2 - 20 + (float) Math.cos(an) * 9.5f, cy + (float) Math.sin(an) * 9.5f, 1.2f, Art.SUN); }
      a.circle(w / 2 + 20, cy, 7, Art.INK);
      a.circle(w / 2 + 23.5f, cy - 2.5f, 6.2f, Color.parseColor("#251c47"));
      a.heart(w / 2 - 5.25f, cy - 4.5f, 1.5f, Art.PINK);
      if (big != null) {
        a.text(c, big, w / 2, h * 0.64f, h * 0.36f, w * 0.86f, Art.SUN, true, Paint.Align.CENTER, 14);
        a.text(c, c.getString(R.string.clock_days), w / 2, h * 0.77f, h * 0.085f, w * 0.9f, Art.INK, false, Paint.Align.CENTER, 7);
      } else {
        a.text(c, c.getString(R.string.clock_unset), w / 2, h * 0.58f, h * 0.085f, w * 0.88f, Art.INK, false, Paint.Align.CENTER, 6);
      }
      if (meet != null) {
        a.roundRect(w * 0.1f, h * 0.83f, w * 0.8f, h * 0.11f, h * 0.055f, Art.PINK);
        a.text(c, meet, w / 2, h * 0.907f, h * 0.068f, w * 0.74f, Color.WHITE, true, Paint.Align.CENTER, 6);
      } else {
        a.text(c, "getloveroom.com", w / 2, h * 0.92f, h * 0.055f, w * 0.8f, Art.SOFT, false, Paint.Align.CENTER, 5);
      }
      show(c, m, id, a, "clock", 3);
    }
  }
}
