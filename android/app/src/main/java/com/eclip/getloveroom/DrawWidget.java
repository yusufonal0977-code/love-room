package com.eclip.getloveroom;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.widget.RemoteViews;
import java.util.Iterator;
import org.json.JSONObject;

/** Ortak tuval: ikinizin şövaledeki çizimi. Dokununca uygulamada çizim açılır; biri çizince ikisinde de görünür. */
public class DrawWidget extends AppWidgetProvider {
  @Override public void onUpdate(Context c, AppWidgetManager m, int[] ids) { render(c, m, ids); WidgetWorker.runNow(c); }
  @Override public void onEnabled(Context c) { WidgetWorker.schedule(c); }

  static void render(Context c, AppWidgetManager m, int[] ids) {
    if (ids.length == 0) return;
    RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_draw);
    v.setImageViewBitmap(R.id.drawImg, paint(Bridge.prefs(c).getString("draw", null)));
    Widgets.hint(v, R.id.drawHint, !Widgets.signedIn(c));
    v.setOnClickPendingIntent(R.id.root, Widgets.open(c, "draw", 1));
    for (int id : ids) m.updateAppWidget(id, v);
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
