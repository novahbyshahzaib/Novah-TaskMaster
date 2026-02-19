package com.novah.taskmaster;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

public class MainActivity extends Activity {
    private WebView mWebView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        mWebView = new WebView(this);
        setContentView(mWebView);

        WebSettings webSettings = mWebView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true); // Needed to save tasks locally

        // THIS IS THE MAGIC BRIDGE: Connects Java to your JavaScript
        mWebView.addJavascriptInterface(new NovahBridge(this), "AndroidBridge");

        mWebView.setWebViewClient(new WebViewClient());
        mWebView.loadUrl("file:///android_asset/index.html");

        // Request basic Notification permission on start (For Android 13+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 1);
        }
    }

    // --- THE JAVASCRIPT INTERFACE ---
    // These functions can be triggered directly from your HTML/JS files!
    public class NovahBridge {
        Context mContext;

        NovahBridge(Context c) {
            mContext = c;
        }

        @JavascriptInterface
        public void setAlarm(String id, String title, String desc, long timeInMillis) {
            AlarmManager alarmManager = (AlarmManager) mContext.getSystemService(Context.ALARM_SERVICE);
            Intent intent = new Intent(mContext, AlarmReceiver.class);
            intent.putExtra("title", title);
            intent.putExtra("desc", desc);
            
            // Generate a unique ID for this specific task
            int reqCode = Math.abs(id.hashCode()); 
            PendingIntent pendingIntent = PendingIntent.getBroadcast(mContext, reqCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

            // Android 12+ requires exact alarm permissions
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timeInMillis, pendingIntent);
                } else {
                    Intent permIntent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                    mContext.startActivity(permIntent);
                }
            } else {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timeInMillis, pendingIntent);
            }
        }

        @JavascriptInterface
        public void askBatteryOptimization() {
            // This pops up the system screen asking to ignore battery limits!
            String packageName = mContext.getPackageName();
            PowerManager pm = (PowerManager) mContext.getSystemService(Context.POWER_SERVICE);
            if (!pm.isIgnoringBatteryOptimizations(packageName)) {
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + packageName));
                mContext.startActivity(intent);
            } else {
                Toast.makeText(mContext, "Battery optimization already ignored! Alarms will ring perfectly.", Toast.LENGTH_SHORT).show();
            }
        }
    }
}
