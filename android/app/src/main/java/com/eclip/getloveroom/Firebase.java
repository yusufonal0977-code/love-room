package com.eclip.getloveroom;

import android.content.Context;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import org.json.JSONObject;

/** Firebase Realtime Database'den REST ile okur. Oturumun yenileme anahtarıyla kısa ömürlü giriş anahtarı alınır. */
class Firebase {
  static final String API_KEY = "AIzaSyCrFiwx-bcYCBKXWHYoK0EQvnmxr3teUdU"; // sitedeki config.js ile aynı (herkese açık anahtar)
  static final String DB = "https://love-room-aaf7e-default-rtdb.europe-west1.firebasedatabase.app/";
  private final Context ctx;
  private final JSONObject ses;
  Firebase(Context c, JSONObject s) { ctx = c; ses = s; }

  private String idToken() throws Exception {
    android.content.SharedPreferences p = Bridge.prefs(ctx);
    long exp = p.getLong("idExp", 0);
    String tok = p.getString("idToken", null);
    if (tok != null && System.currentTimeMillis() < exp) return tok;
    String body = "grant_type=refresh_token&refresh_token=" + URLEncoder.encode(ses.getString("refreshToken"), "UTF-8");
    JSONObject r = new JSONObject(http("https://securetoken.googleapis.com/v1/token?key=" + API_KEY, body));
    tok = r.getString("id_token");
    p.edit().putString("idToken", tok).putLong("idExp", System.currentTimeMillis() + (r.optLong("expires_in", 3600) - 120) * 1000).apply();
    return tok;
  }
  String get(String path) throws Exception { return http(DB + path + ".json?auth=" + idToken(), null); }

  static String http(String url, String post) throws Exception {
    HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
    c.setConnectTimeout(10000); c.setReadTimeout(15000);
    if (post != null) {
      c.setRequestMethod("POST"); c.setDoOutput(true);
      c.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
      try (OutputStream o = c.getOutputStream()) { o.write(post.getBytes("UTF-8")); }
    }
    int code = c.getResponseCode();
    try (InputStream in = code < 400 ? c.getInputStream() : c.getErrorStream()) {
      ByteArrayOutputStream b = new ByteArrayOutputStream(); byte[] buf = new byte[8192]; int n;
      while (in != null && (n = in.read(buf)) > 0) b.write(buf, 0, n);
      if (code >= 400) throw new Exception("HTTP " + code);
      return b.toString("UTF-8");
    }
  }
}
