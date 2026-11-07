package com.eclip.getloveroom;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

/** Widget'ların ortak parçaları: dokununca uygulamada ilgili pencere açılır. */
class Widgets {
  static PendingIntent open(Context c, String ac, int code) {
    Intent i = new Intent(c, MainActivity.class).putExtra("ac", ac).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    return PendingIntent.getActivity(c, code, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
  }
  static boolean signedIn(Context c) { return Bridge.prefs(c).getString("session", null) != null; }
  static void hint(RemoteViews v, int id, boolean show) { v.setViewVisibility(id, show ? android.view.View.VISIBLE : android.view.View.GONE); }
}
