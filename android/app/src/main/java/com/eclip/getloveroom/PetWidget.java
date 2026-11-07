package com.eclip.getloveroom;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.widget.RemoteViews;
import java.io.File;
import org.json.JSONObject;

/** Evcil dostumuz: resmi, adı ve tokluk / sevgi / oyun durumu (sitedeki gibi saatle azalır). */
public class PetWidget extends AppWidgetProvider {
  @Override public void onUpdate(Context c, AppWidgetManager m, int[] ids) { render(c, m, ids); WidgetWorker.runNow(c); }
  @Override public void onEnabled(Context c) { WidgetWorker.schedule(c); }

  static int clamp(double v) { return (int) Math.max(0, Math.min(100, Math.round(v))); }

  static void render(Context c, AppWidgetManager m, int[] ids) {
    if (ids.length == 0) return;
    RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_pet);
    String name = c.getString(R.string.pet_default);
    int food = 80, love = 80, play = 80;
    try {
      String s = Bridge.prefs(c).getString("pet", null);
      if (s != null && !s.equals("null")) {
        JSONObject p = new JSONObject(s);
        name = p.optString("name", name);
        double hrs = Math.max(0, (System.currentTimeMillis() - p.optLong("at", System.currentTimeMillis())) / 3600000.0);
        food = clamp(p.optDouble("food", 80) - hrs * 4); love = clamp(p.optDouble("love", 80) - hrs * 3); play = clamp(p.optDouble("play", 80) - hrs * 3.5);
      }
    } catch (Exception ignored) { }
    v.setTextViewText(R.id.petName, name);
    v.setProgressBar(R.id.barFood, 100, food, false);
    v.setProgressBar(R.id.barLove, 100, love, false);
    v.setProgressBar(R.id.barPlay, 100, play, false);
    File img = new File(c.getFilesDir(), "pet.png");
    if (img.exists()) {
      Bitmap src = BitmapFactory.decodeFile(img.getPath());
      if (src != null) v.setImageViewBitmap(R.id.petImg, Bitmap.createScaledBitmap(src, src.getWidth() * 6, src.getHeight() * 6, false)); // piksel net kalsın
    }
    Widgets.hint(v, R.id.petHint, !Widgets.signedIn(c));
    v.setOnClickPendingIntent(R.id.root, Widgets.open(c, "pet", 2));
    for (int id : ids) m.updateAppWidget(id, v);
  }
}
