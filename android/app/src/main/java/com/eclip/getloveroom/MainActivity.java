package com.eclip.getloveroom;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.PictureInPictureParams;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Rational;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/** Siteyi tam ekran açar; sesli/görüntülü sohbet, fotoğraf seçme ve widget köprüsü burada. */
public class MainActivity extends Activity {
  static final String SITE = "https://getloveroom.com/";
  private WebView web;
  private ValueCallback<Uri[]> fileCb;
  private PermissionRequest pendingPerm;

  @SuppressLint("SetJavaScriptEnabled")
  @Override protected void onCreate(Bundle b) {
    super.onCreate(b);
    web = new WebView(this);
    setContentView(web);
    WebSettings s = web.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);
    s.setDatabaseEnabled(true);
    s.setMediaPlaybackRequiresUserGesture(false);
    s.setUserAgentString(s.getUserAgentString() + " GetLoveRoomApp/1");
    CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);
    web.addJavascriptInterface(new Bridge(this), "LoveRoomApp");
    web.setWebViewClient(new WebViewClient() {
      @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
        Uri u = r.getUrl();
        String host = u.getHost() == null ? "" : u.getHost();
        // Site ve giriş sayfaları uygulamada; diğer linkler (YouTube, Spotify, GitHub...) tarayıcıda
        if (host.endsWith("getloveroom.com") || host.endsWith("firebaseapp.com") || host.endsWith("googleapis.com")) return false;
        try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }
        return true;
      }
    });
    web.setWebChromeClient(new WebChromeClient() {
      @Override public void onPermissionRequest(PermissionRequest req) {
        // Mikrofon ve kamera: önce Android izni, sonra sayfaya ver
        if (hasMedia()) req.grant(req.getResources());
        else { pendingPerm = req; requestPermissions(new String[]{ Manifest.permission.RECORD_AUDIO, Manifest.permission.CAMERA }, 7); }
      }
      @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
        if (fileCb != null) fileCb.onReceiveValue(null);
        fileCb = cb;
        try { startActivityForResult(p.createIntent(), 8); } catch (Exception e) { fileCb = null; return false; }
        return true;
      }
    });
    web.loadUrl(urlFor(getIntent()));
    WidgetWorker.schedule(this);
  }

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
      }
      if (ok.isEmpty()) pendingPerm.deny(); else pendingPerm.grant(ok.toArray(new String[0]));
      pendingPerm = null;
    }
  }
  @Override protected void onActivityResult(int req, int res, Intent data) {
    if (req == 8 && fileCb != null) { fileCb.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(res, data)); fileCb = null; return; }
    super.onActivityResult(req, res, data);
  }

  /** Widget'a dokununca ilgili pencere açılsın (?ac=draw|pet|clock). */
  static String urlFor(Intent i) {
    String ac = i == null ? null : i.getStringExtra("ac");
    return ac == null ? SITE + "?app=1" : SITE + "?app=1&ac=" + ac;
  }
  @Override protected void onNewIntent(Intent i) {
    super.onNewIntent(i);
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
  @Override public void onBackPressed() { if (web.canGoBack()) web.goBack(); else super.onBackPressed(); }
  @Override protected void onPause() { super.onPause(); WidgetWorker.runNow(this); }
}
