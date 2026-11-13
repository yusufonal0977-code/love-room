# Sitenin eski WebView'lerde çağırdığı köprü metotları (window.LoveRoomApp) isimleriyle kalmalı
-keepattributes JavascriptInterface
-keepclassmembers class com.eclip.getloveroom.Bridge {
    @android.webkit.JavascriptInterface <methods>;
}
