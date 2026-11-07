package com.eclip.getloveroom;

import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/** Sitenin uygulamaya verdiği bilgiler ve istekleri (window.LoveRoomApp). Yalnızca kendi sitemiz yüklenir. */
public class Bridge {
  private final Context ctx;
  private final java.lang.ref.WeakReference<MainActivity> act;
  Bridge(Context c, MainActivity a) { ctx = c.getApplicationContext(); act = new java.lang.ref.WeakReference<>(a); }
  static SharedPreferences prefs(Context c) { return c.getSharedPreferences("lr", Context.MODE_PRIVATE); }

  /** Oturum: { rid, uid, refreshToken, lang } — widget'lar Firebase'den bununla okur. */
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
      try (FileOutputStream o = new FileOutputStream(new File(ctx.getFilesDir(), "pet.png"))) { o.write(decode(dataUrl)); }
      prefs(ctx).edit().putString("petKey", key).apply();
      WidgetWorker.runNow(ctx);
    } catch (Exception ignored) { }
  }
  /** Bir şey değişti (çizim, hayvan bakımı): widget'ları hemen yenile. */
  @JavascriptInterface public void refresh() { WidgetWorker.runNow(ctx); }
  /** Ekran yönü: "landscape" (varsayılan) ya da "portrait"; telefonda kalıcı. */
  @JavascriptInterface public String orientation() { return prefs(ctx).getString("orientation", "landscape"); }
  @JavascriptInterface public void setOrientation(String o) {
    prefs(ctx).edit().putString("orientation", "portrait".equals(o) ? "portrait" : "landscape").apply();
    MainActivity a = act.get();
    if (a != null) a.runOnUiThread(() -> MainActivity.applyOrientation(a));
  }
  @JavascriptInterface public String version() { return BuildConfig.VERSION_NAME; }

  /** Google ile giriş: Google, uygulama içindeki sayfada girişe izin vermez; tarayıcıda yapılır, sonuç getloveroom://auth ile döner. */
  @JavascriptInterface public void googleLogin() {
    Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(MainActivity.SITE + "app-login.html")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    ctx.startActivity(i);
  }

  /** Görseli galeriye (Resimler/Get Love Room) kaydeder. */
  @JavascriptInterface public boolean saveImage(String dataUrl, String name) {
    try {
      byte[] data = decode(dataUrl);
      String mime = dataUrl.startsWith("data:image/png") ? "image/png" : "image/jpeg";
      if (Build.VERSION.SDK_INT >= 29) {
        ContentValues v = new ContentValues();
        v.put(MediaStore.Images.Media.DISPLAY_NAME, name);
        v.put(MediaStore.Images.Media.MIME_TYPE, mime);
        v.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Get Love Room");
        Uri u = ctx.getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, v);
        try (OutputStream o = ctx.getContentResolver().openOutputStream(u)) { o.write(data); }
      } else {
        File dir = new File(ctx.getExternalFilesDir(Environment.DIRECTORY_PICTURES), "Get Love Room");
        dir.mkdirs();
        try (FileOutputStream o = new FileOutputStream(new File(dir, name))) { o.write(data); }
      }
      return true;
    } catch (Exception e) { return false; }
  }

  /** Görseli telefonun paylaşım menüsüyle paylaşır (Instagram, WhatsApp...). */
  @JavascriptInterface public boolean shareImage(String dataUrl, String text, String name) {
    try {
      File dir = new File(ctx.getCacheDir(), "share"); dir.mkdirs();
      File f = new File(dir, name.replaceAll("[^\\w.-]", "_"));
      try (FileOutputStream o = new FileOutputStream(f)) { o.write(decode(dataUrl)); }
      Uri u = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".files", f);
      Intent s = new Intent(Intent.ACTION_SEND).setType(dataUrl.startsWith("data:image/png") ? "image/png" : "image/jpeg")
          .putExtra(Intent.EXTRA_STREAM, u).putExtra(Intent.EXTRA_TEXT, text).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
      ctx.startActivity(Intent.createChooser(s, null).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION));
      return true;
    } catch (Exception e) { return false; }
  }

  private static byte[] decode(String dataUrl) { return Base64.decode(dataUrl.substring(dataUrl.indexOf(',') + 1), Base64.DEFAULT); }
}
