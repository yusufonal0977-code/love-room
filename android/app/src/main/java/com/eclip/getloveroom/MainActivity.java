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
import android.window.OnBackInvokedDispatcher;
import android.view.WindowInsets;
import androidx.webkit.ScriptHandler;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import java.util.Collections;
import java.util.Set;
import org.json.JSONObject;

/**
 * Siteyi tam ekran açar. Tarayıcıdaki her şeyin uygulamada da çalışması için:
 * mikrofon/kamera izni, fotoğraf seçme, tam ekran video, geri tuşu (açık pencereyi kapatır),
 * davet linkleri (getloveroom.com linkleri uygulamada açılır), Google ile giriş (tarayıcıda yapılır, uygulamaya döner).
 */
public class MainActivity extends Activity {
  static final String SITE = "https://getloveroom.com/";
  static final String ORIGIN = "https://getloveroom.com";
  private static final Set<String> ORIGINS = Collections.singleton(ORIGIN);
  private WebView web;
  private Bridge bridge;
  private ScriptHandler shim;
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
    root.setBackgroundColor(0xFF000000);
    // Android 15+ uygulamayı kenardan kenara çizer: içerik durum/gezinme çubuklarının ve kamera çentiğinin altında kalmasın
    root.setOnApplyWindowInsetsListener((v, ins) -> {
      if (Build.VERSION.SDK_INT >= 30) {
        android.graphics.Insets bar = ins.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
        v.setPadding(bar.left, bar.top, bar.right, bar.bottom);
      } else {
        v.setPadding(ins.getSystemWindowInsetLeft(), ins.getSystemWindowInsetTop(), ins.getSystemWindowInsetRight(), ins.getSystemWindowInsetBottom());
      }
      return ins;
    });
    WebSettings s = web.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);
    s.setDatabaseEnabled(true);
    s.setMediaPlaybackRequiresUserGesture(false);
    // Güvenlik: yerel dosyalara erişim yok, şifresiz içerik yok, Google Güvenli Tarama açık
    s.setAllowFileAccess(false);
    s.setAllowContentAccess(false);
    s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    s.setGeolocationEnabled(false);
    if (Build.VERSION.SDK_INT >= 26) s.setSafeBrowsingEnabled(true);
    s.setUserAgentString(s.getUserAgentString() + " GetLoveRoomApp/2");
    CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);
    bridge = new Bridge(this, this);
    installBridge();
    web.setWebViewClient(new WebViewClient() {
      @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
        Uri u = r.getUrl();
        String host = u.getHost() == null ? "" : u.getHost();
        // Site, kendi Firebase girişimiz ve Spotify girişi uygulamada; diğer linkler (YouTube, GitHub, maç siteleri...) tarayıcıda.
        // Alan adı tam eşleşmeli: "kotugetloveroom.com" gibi benzer adresler uygulamada açılmaz.
        if (!"https".equals(u.getScheme())) { openOutside(u); return true; }
        String path = u.getPath() == null ? "" : u.getPath();
        if (isOurHost(host) && !path.startsWith("/app-login")) return false;
        if (host.equals(AUTH_HOST) || host.endsWith(".googleapis.com") || host.equals("accounts.spotify.com")) return false;
        openOutside(u);
        return true;
      }
    });
    web.setWebChromeClient(new WebChromeClient() {
      @Override public void onPermissionRequest(PermissionRequest req) {
        // Spotify'ın şifreli müziği (Widevine) için izin; mikrofon ve kamera için önce Android izni
        boolean media = false;
        for (String r : req.getResources()) if (!r.equals(PermissionRequest.RESOURCE_PROTECTED_MEDIA_ID)) media = true;
        // Mikrofon ve kamera yalnızca bizim sitemize: TV'de açılan başka bir site kamerayı isteyemez
        Uri o = req.getOrigin();
        if (media && (o == null || !"https".equals(o.getScheme()) || !isOurHost(o.getHost() == null ? "" : o.getHost()))) { req.deny(); return; }
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
    if (Build.VERSION.SDK_INT >= 33) getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::goBack);
  }

  static final String AUTH_HOST = "love-room-aaf7e.firebaseapp.com";
  static boolean isOurHost(String h) { return "getloveroom.com".equals(h) || "www.getloveroom.com".equals(h); }

  /** Köprü: mesaj kanalı varsa yalnızca getloveroom.com ana çerçevesine verilir; yoksa (çok eski WebView) eski yol. */
  private void installBridge() {
    if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER) && WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
      WebViewCompat.addWebMessageListener(web, "LoveRoomNative", ORIGINS, (view, msg, origin, isMainFrame, reply) -> {
        if (isMainFrame && msg.getData() != null) bridge.handle(msg.getData());
      });
      refreshShim();
    } else {
      web.addJavascriptInterface(bridge, "LoveRoomApp");
    }
  }
  /** window.LoveRoomApp'i tanımlayan aracı betik; ekran yönü değişince güncel durumla yeniden konur. */
  void refreshShim() {
    if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) return;
    if (shim != null) shim.remove();
    String js = "(function(){if(window.top!==window||window.LoveRoomApp)return;var st=" + bridge.stateJson() + ";"
        + "var p=function(m,a){try{LoveRoomNative.postMessage(JSON.stringify({m:m,a:a}))}catch(e){}};"
        + "window.LoveRoomApp={session:function(j){p('session',[j])},logout:function(){p('logout',[])},"
        + "petImage:function(k,d){p('petImage',[k,d])},sceneArt:function(k,d){p('sceneArt',[k,d])},refresh:function(){p('refresh',[])},"
        + "googleLogin:function(){p('googleLogin',[])},orientation:function(){return st.orientation},"
        + "setOrientation:function(o){st.orientation=o==='portrait'?'portrait':'landscape';p('setOrientation',[st.orientation])},"
        + "canPinWidget:function(){return !!st.canPin},pinWidget:function(k){p('pinWidget',[k]);return !!st.canPin},"
        + "version:function(){return st.version},saveImage:function(d,n){p('saveImage',[String(d),n]);return true},"
        + "shareImage:function(d,t,n){p('shareImage',[String(d),t,n]);return true}};})();";
    shim = WebViewCompat.addDocumentStartJavaScript(web, js, ORIGINS);
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
    if (d != null && "https".equals(d.getScheme()) && d.getHost() != null && isOurHost(d.getHost())) {
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
      if (!Bridge.checkLoginState(this, d.getQueryParameter("s"))) id = ""; // bizim başlatmadığımız giriş: reddet
      web.evaluateJavascript("window.__lrGoogle && window.__lrGoogle(" + JSONObject.quote(id == null ? "" : id) + ")", null);
      return;
    }
    if (d != null && "https".equals(d.getScheme()) && d.getHost() != null && isOurHost(d.getHost())) { web.loadUrl(urlFor(i)); return; } // davet linki
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
  @Override public void onBackPressed() { goBack(); } // Android 12 ve öncesi; 13+ OnBackInvokedCallback
  private void goBack() {
    if (fullView != null) { exitFull(); return; }
    web.evaluateJavascript("window.__lrBack ? window.__lrBack() : false", (r) -> { if (!"true".equals(r)) moveTaskToBack(true); });
  }
  @Override protected void onPause() { super.onPause(); WidgetWorker.runNow(this); }
}
