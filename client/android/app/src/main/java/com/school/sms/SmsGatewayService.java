package com.school.sms;

import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.telephony.SmsManager;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;

/**
 * Turns this phone into the school's SMS sender. While running it asks the school server
 * every few seconds "is there a text to send?", sends each one through the phone's own SIM,
 * then tells the server whether it went out.
 */
public class SmsGatewayService extends Service {
    static final String PREFS = "sms_gateway";
    static final String ACTION_SENT = "com.school.sms.SMS_SENT";
    static volatile boolean running = false;

    private static final String CHANNEL_ID = "sms_gateway";
    private static final int NOTIFICATION_ID = 4242;
    private static final long POLL_MS = 4000;

    private SharedPreferences prefs;
    private Thread worker;
    private volatile boolean stopped = false;
    private PowerManager.WakeLock wakeLock;

    private static class AuthException extends Exception {}

    private final BroadcastReceiver sentReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String id = intent.getStringExtra("id");
            if (id == null) return;
            int result = getResultCode();
            finish(id, result == Activity.RESULT_OK, result == Activity.RESULT_OK ? null : describe(result));
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        createChannel();
        ContextCompat.registerReceiver(this, sentReceiver, new IntentFilter(ACTION_SENT), ContextCompat.RECEIVER_NOT_EXPORTED);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (!prefs.getBoolean("enabled", false)) {
            stopSelf();
            return START_NOT_STICKY;
        }
        try {
            Notification notification = buildNotification();
            if (Build.VERSION.SDK_INT >= 34) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Exception e) {
            prefs.edit().putString("lastError", "Android would not keep the SMS service running. Open the app and press Start again.").apply();
            stopSelf();
            return START_NOT_STICKY;
        }

        if (wakeLock == null) {
            PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "school-sms:gateway");
            wakeLock.setReferenceCounted(false);
            wakeLock.acquire();
        }
        if (worker == null || !worker.isAlive()) {
            stopped = false;
            worker = new Thread(this::loop, "sms-gateway");
            worker.start();
        }
        running = true;
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        stopped = true;
        running = false;
        if (worker != null) worker.interrupt();
        try {
            unregisterReceiver(sentReceiver);
        } catch (Exception ignored) {
            // already gone
        }
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    // ------------------------------------------------------------------ polling

    private void loop() {
        int failures = 0;
        while (!stopped) {
            long delay = POLL_MS;
            try {
                JSONArray messages = claim();
                if (failures > 0) prefs.edit().putString("lastError", "").apply();
                failures = 0;
                for (int i = 0; i < messages.length(); i++) {
                    JSONObject m = messages.getJSONObject(i);
                    sendOne(m.getString("id"), m.getString("to"), m.getString("body"));
                }
                if (messages.length() > 0) delay = 500;
            } catch (AuthException e) {
                prefs.edit()
                        .putBoolean("enabled", false)
                        .putString("lastError", "The phone's sign-in key was rejected. Open the app and press Start again.")
                        .apply();
                stopSelf();
                return;
            } catch (Exception e) {
                failures++;
                prefs.edit().putString("lastError", "Cannot reach the school server. Check the phone's internet.").apply();
                delay = Math.min(POLL_MS * (1 + failures), 30000);
            }
            try {
                Thread.sleep(delay);
            } catch (InterruptedException e) {
                return;
            }
        }
    }

    private HttpURLConnection open(String path, String method) throws Exception {
        String base = prefs.getString("baseUrl", "");
        String token = prefs.getString("token", "");
        HttpURLConnection c = (HttpURLConnection) new URL(base + path).openConnection();
        c.setRequestMethod(method);
        c.setConnectTimeout(20000);
        c.setReadTimeout(70000); // a sleeping free-tier server can take a while to wake
        c.setRequestProperty("Authorization", "Bearer " + token);
        c.setRequestProperty("Accept", "application/json");
        return c;
    }

    private static String read(java.io.InputStream in) throws Exception {
        try (BufferedReader r = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = r.readLine()) != null) sb.append(line);
            return sb.toString();
        }
    }

    private JSONArray claim() throws Exception {
        HttpURLConnection c = open("/api/sms-gateway/claim", "GET");
        try {
            int code = c.getResponseCode();
            if (code == 401 || code == 403) throw new AuthException();
            if (code != 200) throw new Exception("Server answered " + code);
            return new JSONObject(read(c.getInputStream())).getJSONArray("messages");
        } finally {
            c.disconnect();
        }
    }

    private void postResult(String id, boolean ok, String error) {
        for (int attempt = 0; attempt < 2; attempt++) {
            HttpURLConnection c = null;
            try {
                c = open("/api/sms-gateway/" + id + "/result", "POST");
                c.setRequestProperty("Content-Type", "application/json");
                c.setDoOutput(true);
                JSONObject body = new JSONObject();
                body.put("ok", ok);
                if (error != null) body.put("error", error);
                try (OutputStream out = c.getOutputStream()) {
                    out.write(body.toString().getBytes(StandardCharsets.UTF_8));
                }
                if (c.getResponseCode() == 200) return;
            } catch (Exception ignored) {
                // retry once; the server marks unconfirmed messages as failed on its own
            } finally {
                if (c != null) c.disconnect();
            }
        }
    }

    // ------------------------------------------------------------------ sending

    private void sendOne(String id, String to, String body) {
        try {
            SmsManager sms = Build.VERSION.SDK_INT >= 31 ? getSystemService(SmsManager.class) : SmsManager.getDefault();
            ArrayList<String> parts = sms.divideMessage(body);
            ArrayList<PendingIntent> sentIntents = new ArrayList<>();
            for (int i = 0; i < parts.size(); i++) {
                if (i == parts.size() - 1) {
                    Intent intent = new Intent(ACTION_SENT).setPackage(getPackageName()).putExtra("id", id);
                    sentIntents.add(PendingIntent.getBroadcast(this, id.hashCode(), intent,
                            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
                } else {
                    sentIntents.add(null);
                }
            }
            if (parts.size() == 1) {
                sms.sendTextMessage(to, null, body, sentIntents.get(0), null);
            } else {
                sms.sendMultipartTextMessage(to, null, parts, sentIntents, null);
            }
        } catch (SecurityException e) {
            finish(id, false, "SMS permission is off for this app");
        } catch (Exception e) {
            finish(id, false, "Could not send: " + e.getMessage());
        }
    }

    private void finish(String id, boolean ok, String error) {
        SharedPreferences.Editor edit = prefs.edit();
        if (ok) {
            edit.putInt("sent", prefs.getInt("sent", 0) + 1).putLong("lastSentAt", System.currentTimeMillis());
        } else {
            edit.putInt("failed", prefs.getInt("failed", 0) + 1).putString("lastError", error == null ? "Send failed" : error);
        }
        edit.apply();
        new Thread(() -> postResult(id, ok, error), "sms-gateway-report").start();
    }

    private static String describe(int resultCode) {
        switch (resultCode) {
            case SmsManager.RESULT_ERROR_GENERIC_FAILURE:
                return "The phone could not send it (check airtime and the SIM)";
            case SmsManager.RESULT_ERROR_NO_SERVICE:
                return "No mobile network signal";
            case SmsManager.RESULT_ERROR_RADIO_OFF:
                return "Airplane mode is on";
            case SmsManager.RESULT_ERROR_NULL_PDU:
                return "The message could not be built";
            default:
                return "Send failed (code " + resultCode + ")";
        }
    }

    // ------------------------------------------------------------------ notification

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "SMS sending", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Shown while this phone is sending school sign-in codes by SMS");
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }

    private Notification buildNotification() {
        PendingIntent open = PendingIntent.getActivity(this, 0, new Intent(this, MainActivity.class),
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.stat_notify_chat)
                .setContentTitle("School SMS")
                .setContentText("Sending sign-in codes from this phone")
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setContentIntent(open)
                .build();
    }
}
