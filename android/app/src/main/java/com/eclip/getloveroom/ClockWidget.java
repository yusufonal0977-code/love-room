package com.eclip.getloveroom;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.widget.RemoteViews;
import java.util.Calendar;
import org.json.JSONObject;

/** İlişki saatimiz: sevgili olduğunuz günden bu yana kaçıncı gün; kavuşma günü girildiyse kaç gün kaldı. */
public class ClockWidget extends AppWidgetProvider {
  @Override public void onUpdate(Context c, AppWidgetManager m, int[] ids) { render(c, m, ids); WidgetWorker.runNow(c); }
  @Override public void onEnabled(Context c) { WidgetWorker.schedule(c); }

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
    if (ids.length == 0) return;
    RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_clock);
    String big = "–", sub = c.getString(R.string.clock_unset), meet = "";
    try {
      String s = Bridge.prefs(c).getString("rel", null);
      if (s != null && !s.equals("null")) {
        JSONObject r = new JSONObject(s);
        Calendar since = day(r.optString("since", null));
        if (since != null) { big = String.valueOf(daysFrom(since) + 1); sub = c.getString(R.string.clock_days); }
        Calendar m2 = day(r.optString("meet", null));
        if (m2 != null) { long left = -daysFrom(m2); if (left > 0) meet = c.getString(R.string.clock_meet, left); else if (left == 0) meet = c.getString(R.string.clock_meet_today); }
      }
    } catch (Exception ignored) { }
    v.setTextViewText(R.id.clockBig, big);
    v.setTextViewText(R.id.clockSub, sub);
    v.setTextViewText(R.id.clockMeet, meet);
    Widgets.hint(v, R.id.clockMeet, meet.length() > 0);
    v.setOnClickPendingIntent(R.id.root, Widgets.open(c, "clock", 3));
    for (int id : ids) m.updateAppWidget(id, v);
  }
}
