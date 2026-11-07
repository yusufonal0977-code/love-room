package com.eclip.getloveroom;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import androidx.annotation.NonNull;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.util.concurrent.TimeUnit;
import org.json.JSONObject;

/** Firebase'den widget verisini okur, önbelleğe yazar ve bütün widget'ları yeniden çizer. */
public class WidgetWorker extends Worker {
  public WidgetWorker(@NonNull Context c, @NonNull WorkerParameters p) { super(c, p); }

  static void schedule(Context c) {
    Constraints net = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
    WorkManager.getInstance(c).enqueueUniquePeriodicWork("lr-widgets", ExistingPeriodicWorkPolicy.KEEP,
        new PeriodicWorkRequest.Builder(WidgetWorker.class, 15, TimeUnit.MINUTES).setConstraints(net).build());
  }
  static void runNow(Context c) {
    WorkManager.getInstance(c).enqueueUniqueWork("lr-now", ExistingWorkPolicy.REPLACE, new OneTimeWorkRequest.Builder(WidgetWorker.class).build());
  }

  @NonNull @Override public Result doWork() {
    Context c = getApplicationContext();
    SharedPreferences p = Bridge.prefs(c);
    try {
      String s = p.getString("session", null);
      if (s != null) {
        JSONObject ses = new JSONObject(s);
        Firebase fb = new Firebase(c, ses);
        String rid = ses.getString("rid");
        String draw = fb.get("live/" + rid + "/draw");
        String pet = fb.get("live/" + rid + "/pet");
        String rel = fb.get("live/" + rid + "/rel");
        SharedPreferences.Editor e = p.edit();
        if (draw != null) e.putString("draw", draw);
        if (pet != null) e.putString("pet", pet);
        if (rel != null) e.putString("rel", rel);
        e.apply();
      }
    } catch (Exception ignored) { /* çevrimdışı: önbellekteki son hal çizilir */ }
    updateAll(c);
    return Result.success();
  }

  static void updateAll(Context c) {
    AppWidgetManager m = AppWidgetManager.getInstance(c);
    DrawWidget.render(c, m, m.getAppWidgetIds(new ComponentName(c, DrawWidget.class)));
    PetWidget.render(c, m, m.getAppWidgetIds(new ComponentName(c, PetWidget.class)));
    ClockWidget.render(c, m, m.getAppWidgetIds(new ComponentName(c, ClockWidget.class)));
  }
}
