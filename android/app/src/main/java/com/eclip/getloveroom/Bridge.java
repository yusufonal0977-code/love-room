package com.eclip.getloveroom;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import java.io.File;
import java.io.FileOutputStream;

/** Sitenin uygulamaya verdiği bilgiler (window.LoveRoomApp). Yalnızca kendi sitemiz yüklenir. */
public class Bridge {
  private final Context ctx;
  Bridge(Context c) { ctx = c.getApplicationContext(); }
  static SharedPreferences prefs(Context c) { return c.getSharedPreferences("lr", Context.MODE_PRIVATE); }

  /** Oturum: { rid, uid, refreshToken, lang, names } — widget'lar Firebase'den bununla okur. */
  @JavascriptInterface public void session(String json) {
    prefs(ctx).edit().putString("session", json).apply();
    WidgetWorker.runNow(ctx);
  }
  /** Çıkış yapınca widget'lar boşalsın. */
  @JavascriptInterface public void logout() {
    prefs(ctx).edit().clear().apply();
    WidgetWorker.runNow(ctx);
  }
  /** Evcil hayvanın piksel resmi (PNG dataURL); türü/rengi değişince site yeniden gönderir. */
  @JavascriptInterface public void petImage(String key, String dataUrl) {
    try {
      byte[] png = Base64.decode(dataUrl.substring(dataUrl.indexOf(',') + 1), Base64.DEFAULT);
      try (FileOutputStream o = new FileOutputStream(new File(ctx.getFilesDir(), "pet.png"))) { o.write(png); }
      prefs(ctx).edit().putString("petKey", key).apply();
      WidgetWorker.runNow(ctx);
    } catch (Exception ignored) { }
  }
  /** Bir şey değişti (çizim, hayvan bakımı): widget'ları hemen yenile. */
  @JavascriptInterface public void refresh() { WidgetWorker.runNow(ctx); }
  @JavascriptInterface public String version() { return "1"; }
}
