package com.eclip.getloveroom;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.widget.RemoteViews;
import org.json.JSONObject;

/** Pikap: evde şimdi çalan şarkı (YouTube listesi ya da Spotify). Dokununca uygulamada pikap açılır. */
public class MusicWidget extends AppWidgetProvider {
  @Override public void onUpdate(Context c, AppWidgetManager m, int[] ids) { render(c, m, ids); WidgetWorker.runNow(c); }
  @Override public void onEnabled(Context c) { WidgetWorker.schedule(c); }

  static void render(Context c, AppWidgetManager m, int[] ids) {
    if (ids.length == 0) return;
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
    RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_music);
    v.setTextViewText(R.id.musicTitle, title != null && !title.isEmpty() ? title : c.getString(R.string.music_quiet));
    v.setTextViewText(R.id.musicSub, title != null ? (sub == null ? "" : sub) : c.getString(R.string.music_tap));
    v.setOnClickPendingIntent(R.id.root, Widgets.open(c, "music", 4));
    for (int id : ids) m.updateAppWidget(id, v);
  }
}
