package com.eclip.getloveroom;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.PictureInPictureParams;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Rational;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import org.json.JSONObject;

/**
 * Siteyi tam ekran açar. Tarayıcıdaki her şeyin uygulamada da çalışması için:
 * mikrofon/kamera izni, fotoğraf seçme, tam ekran video, geri tuşu (açık pencereyi kapatır),
 * davet linkleri (getloveroom.com linkleri uygulamada açılır), Google ile giriş (tarayıcıda yapılır, uygulamaya döner).
 */
public class MainActivity extends Activity {
  static final String SITE = "https://getloveroom.com/";
  private WebView web;
  private FrameLayout root;
  private View fullView;
  private WebChromeClient.CustomViewCallback fullCb;
  private ValueCallback<Uri[]> fileCb;
  private PermissionRequest pendingPerm;

  @SuppressLint("SetJavaScriptEnabled")
  @Override protected void onCreate(Bundle b) {
    super.onCreate(b);
    applyOrientation(this);
    root = new FrameLayout(this);
    web = new WebView(this);
    root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    setContentView(root);
    WebSettings s = web.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);
    s.setDatabaseEnabled(true);
    s.setMediaPlaybackRequiresUserGesture(false);
    s.setUserAgentString(s.getUserAgentString() + " GetLoveRoomApp/1");
    CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);
    web.addJavascriptInterface(new Bridge(this, this), "LoveRoomApp");
    web.setWebViewClient(new WebViewClient() {
      @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
        Uri u = r.getUrl();
        String host = u.getHost() == null ? "" : u.getHost();
        // Site, Firebase ve Spotify girişi uygulamada; diğer linkler (YouTube, GitHub, maç siteleri...) tarayıcıda
        if (host.endsWith("getloveroom.com") && !u.getPath().startsWith("/app-login")) return false;
        if (host.endsWith("firebaseapp.com") || host.endsWith("googleapis.com") || host.endsWith("spotify.com")) return false;
        openOutside(u);
        return true;
      }
    });
    web.setWebChromeClient(new WebChromeClient() {
      @Override public void onPermissionRequest(PermissionRequest req) {
        // Spotify'ın şifreli müziği (Widevine) için izin; mikrofon ve kamera için önce Android izni
        boolean media = false;
        for (String r : req.getResources()) if (!r.equals(PermissionRequest.RESOURCE_PROTECTED_MEDIA_ID)) media = true;
        if (!media || hasMedia()) { req.grant(req.getResources()); return; }
        pendingPerm = req;
        requestPermissions(new String[]{ Manifest.permission.RECORD_AUDIO, Manifest.permission.CAMERA }, 7);
      }
      @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
        if (fileCb != null) fileCb.onReceiveValue(null);
        fileCb = cb;
        try { startActivityForResult(p.createIntent(), 8); } catch (Exception e) { fileCb = null; return false; }
        return true;
      }
      // Tam ekran (YouTube videosu, "Tam ekran" düğmesi)
      @Override public void onShowCustomView(View view, CustomViewCallback cb) {
        if (fullView != null) { cb.onCustomViewHidden(); return; }
        fullView = view; fullCb = cb;
        root.addView(view, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        web.setVisibility(View.GONE);
        immersive(true);
      }
      @Override public void onHideCustomView() { exitFull(); }
    });
    web.loadUrl(urlFor(getIntent()));
    WidgetWorker.schedule(this);
  }

  private void exitFull() {
    if (fullView == null) return;
    root.removeView(fullView); fullView = null;
    web.setVisibility(View.VISIBLE);
    immersive(false);
    if (fullCb != null) { fullCb.onCustomViewHidden(); fullCb = null; }
  }
  @SuppressWarnings("deprecation")
  private void immersive(boolean on) {
    getWindow().getDecorView().setSystemUiVisibility(on
        ? View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        : View.SYSTEM_UI_FLAG_VISIBLE);
    if (!on) applyOrientation(this);
    else setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE); // video tam ekranı hep yatay
  }
  /** Kayıtlı ekran yönü: varsayılan yatay (sensörle iki yatay yön), istenirse dikey. */
  static void applyOrientation(Activity a) {
    String o = Bridge.prefs(a).getString("orientation", "landscape");
    a.setRequestedOrientation("portrait".equals(o) ? ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT : ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
  }
  void openOutside(Uri u) { try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { } }

  private boolean hasMedia() {
    return checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
        && checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
  }
  @Override public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
    if (code == 7 && pendingPerm != null) {
      boolean mic = checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
      boolean cam = checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
      java.util.List<String> ok = new java.util.ArrayList<>();
      for (String r : pendingPerm.getResources()) {
        if (r.equals(PermissionRequest.RESOURCE_AUDIO_CAPTURE) && mic) ok.add(r);
        if (r.equals(PermissionRequest.RESOURCE_VIDEO_CAPTURE) && cam) ok.add(r);
        if (r.equals(PermissionRequest.RESOURCE_PROTECTED_MEDIA_ID)) ok.add(r);
      }
      if (ok.isEmpty()) pendingPerm.deny(); else pendingPerm.grant(ok.toArray(new String[0]));
      pendingPerm = null;
    }
  }
  @Override protected void onActivityResult(int req, int res, Intent data) {
    if (req == 8 && fileCb != null) { fileCb.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(res, data)); fileCb = null; return; }
    super.onActivityResult(req, res, data);
  }

  /** Açılış adresi: widget (?ac=...), davet ya da paylaşılan getloveroom.com linki, yoksa ana sayfa. */
  static String urlFor(Intent i) {
    Uri d = i == null ? null : i.getData();
    if (d != null && "https".equals(d.getScheme()) && d.getHost() != null && d.getHost().endsWith("getloveroom.com")) {
      return d.buildUpon().appendQueryParameter("app", "1").build().toString();
    }
    String ac = i == null ? null : i.getStringExtra("ac");
    return ac == null ? SITE + "?app=1" : SITE + "?app=1&ac=" + ac;
  }
  @Override protected void onNewIntent(Intent i) {
    super.onNewIntent(i);
    Uri d = i.getData();
    if (d != null && "getloveroom".equals(d.getScheme())) { // Google girişi tarayıcıdan döndü
      String id = d.getQueryParameter("id");
      if (id == null) id = i.getStringExtra("id");
      web.evaluateJavascript("window.__lrGoogle && window.__lrGoogle(" + JSONObject.quote(id == null ? "" : id) + ")", null);
      return;
    }
    if (d != null && "https".equals(d.getScheme())) { web.loadUrl(urlFor(i)); return; } // davet linki
    String ac = i.getStringExtra("ac");
    if (ac != null) web.evaluateJavascript("window.__lrAction && window.__lrAction('" + ac.replaceAll("[^a-z]", "") + "')", null);
  }

  // Arka plana atılınca küçük pencere (görüşme sürerken kopmasın)
  @Override protected void onUserLeaveHint() {
    super.onUserLeaveHint();
    if (Build.VERSION.SDK_INT >= 26) {
      try { enterPictureInPictureMode(new PictureInPictureParams.Builder().setAspectRatio(new Rational(4, 3)).build()); } catch (Exception ignored) { }
    }
  }
  /** Geri tuşu: tam ekrandan çık; site açık bir pencereyi kapatırsa orada kal; yoksa uygulamayı arka plana al. */
  @SuppressWarnings("deprecation")
  @Override public void onBackPressed() {
    if (fullView != null) { exitFull(); return; }
    web.evaluateJavascript("window.__lrBack ? window.__lrBack() : false", (r) -> { if (!"true".equals(r)) moveTaskToBack(true); });
  }
  @Override protected void onPause() { super.onPause(); WidgetWorker.runNow(this); }
}
