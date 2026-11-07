package com.eclip.getloveroom;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.widget.RemoteViews;
import java.io.File;
import org.json.JSONObject;

/** Evcil dostumuz: sıcak oda, minderin üstünde piksel dost, adı, hali ve tokluk / sevgi / oyun çubukları. */
public class PetWidget extends AppWidgetProvider {
  @Override public void onUpdate(Context c, AppWidgetManager m, int[] ids) { render(c, m, ids); WidgetWorker.runNow(c); }
  @Override public void onEnabled(Context c) { WidgetWorker.schedule(c); }

  @Override public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, android.os.Bundle o) { render(c, m, new int[]{ id }); }
  static void show(Context c, AppWidgetManager m, int id, Art a, String ac, int code) {
    RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_image);
    v.setImageViewBitmap(R.id.img, a.bmp);
    v.setOnClickPendingIntent(R.id.root, Widgets.open(c, ac, code));
    m.updateAppWidget(id, v);
  }

  static int clamp(double v) { return (int) Math.max(0, Math.min(100, Math.round(v))); }

  static void render(Context c, AppWidgetManager m, int[] ids) {
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
    int low = Math.min(food, Math.min(love, play));
    String mood = c.getString(low >= 70 ? R.string.mood_happy : low >= 35 ? R.string.mood_ok : low == food ? R.string.mood_hungry : low == love ? R.string.mood_lonely : R.string.mood_bored);
    File img = new File(c.getFilesDir(), "pet.png");
    Bitmap sprite = img.exists() ? BitmapFactory.decodeFile(img.getPath()) : null;
    for (int id : ids) {
      Art a = Art.of(c, m, id, 250, 110);
      float w = a.w, h = a.h;
      a.card(Color.parseColor("#4a2c1e"), Color.parseColor("#1f140c"), 22);
      // Duvarda pencere ışığı ve tahta zemin
      a.rect(0, h * 0.7f, w, h * 0.3f, Art.WOOD);
      for (float x = -6; x < w; x += 18) a.rect(x, h * 0.7f, 1, h * 0.3f, Color.parseColor("#4a2a18"));
      a.rect(0, h * 0.7f, w, 1.5f, Color.parseColor("#2a170c"));
      float cx = w * 0.25f;
      a.g.drawOval(new RectF(a.px(cx - w * 0.16f), a.px(h * 0.74f), a.px(cx + w * 0.16f), a.px(h * 0.86f)), a.fill(Color.parseColor("#c8323c")));
      a.g.drawOval(new RectF(a.px(cx - w * 0.13f), a.px(h * 0.755f), a.px(cx + w * 0.13f), a.px(h * 0.83f)), a.fill(Color.parseColor("#e05a5a")));
      if (sprite != null) {
        float k = (float) Math.floor(Math.min(a.px(w * 0.36f) / sprite.getWidth(), a.px(h * 0.58f) / sprite.getHeight()));
        if (k < 1) k = 1;
        float sw = sprite.getWidth() * k, sh = sprite.getHeight() * k;
        Paint p = new Paint(); p.setFilterBitmap(false); // piksel net kalsın
        a.g.drawBitmap(sprite, null, new RectF(a.px(cx) - sw / 2, a.px(h * 0.8f) - sh, a.px(cx) + sw / 2, a.px(h * 0.8f)), p);
      } else a.heart(cx - 7, h * 0.45f, 2, Art.PINK);
      float x0 = w * 0.5f, bw = w * 0.44f;
      a.text(c, name, x0, h * 0.27f, h * 0.17f, bw, Art.SUN, true, Paint.Align.LEFT, 9);
      a.text(c, mood, x0, h * 0.4f, h * 0.095f, bw, Art.INK, false, Paint.Align.LEFT, 6);
      int[] vals = { food, love, play };
      int[] cols = { Color.parseColor("#ffb36b"), Art.PINK, Color.parseColor("#5b8def") };
      int[] labels = { R.string.food, R.string.love, R.string.play };
      for (int i = 0; i < 3; i++) {
        float y = h * (0.53f + i * 0.145f), lw = bw * 0.36f, bh = h * 0.065f;
        a.text(c, c.getString(labels[i]), x0, y + bh, h * 0.075f, lw - 3, Art.SOFT, false, Paint.Align.LEFT, 5);
        a.roundRect(x0 + lw, y, bw - lw, bh, bh / 2, Color.parseColor("#2a1a10"));
        a.roundRect(x0 + lw, y, Math.max(bh, (bw - lw) * vals[i] / 100f), bh, bh / 2, cols[i]);
      }
      show(c, m, id, a, "pet", 2);
    }
  }
}
