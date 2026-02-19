package com.novah.taskmaster;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;

public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String title = intent.getStringExtra("title");
        String desc = intent.getStringExtra("desc");

        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        String channelId = "novah_task_alarms";

        // Grab the loudest system alarm sound available
        Uri alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (alarmSound == null) {
            alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        }

        Notification.Builder builder;

        // Modern Android requires "Channels" for notifications
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    channelId,
                    "Novah Urgent Tasks",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Rings loud for scheduled tasks");
            channel.setSound(alarmSound, null);
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 500, 500, 500});
            notificationManager.createNotificationChannel(channel);
            
            builder = new Notification.Builder(context, channelId);
        } else {
            builder = new Notification.Builder(context)
                    .setPriority(Notification.PRIORITY_MAX)
                    .setVibrate(new long[]{0, 500, 500, 500})
                    .setSound(alarmSound);
        }

        // Clicking the notification opens the app
        Intent openAppIntent = new Intent(context, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        builder.setSmallIcon(android.R.drawable.ic_popup_reminder)
               .setContentTitle("🚨 " + title)
               .setContentText(desc)
               .setContentIntent(pendingIntent)
               .setAutoCancel(true);

        // Fire the alarm!
        notificationManager.notify((int) System.currentTimeMillis(), builder.build());
    }
}
