package com.school.sms;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/** Lets the web app start/stop the phone's SMS sending service and read how it is doing. */
@CapacitorPlugin(
        name = "SmsGateway",
        permissions = {@Permission(strings = {Manifest.permission.SEND_SMS}, alias = "sms")}
)
public class SmsGatewayPlugin extends Plugin {

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(SmsGatewayService.PREFS, Context.MODE_PRIVATE);
    }

    @PluginMethod
    public void start(PluginCall call) {
        String baseUrl = call.getString("baseUrl");
        String token = call.getString("token");
        if (baseUrl == null || baseUrl.isEmpty() || token == null || token.isEmpty()) {
            call.reject("Missing the server address or key");
            return;
        }
        while (baseUrl.endsWith("/")) baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        prefs().edit().putString("baseUrl", baseUrl).putString("token", token).apply();

        if (getPermissionState("sms") != PermissionState.GRANTED) {
            requestPermissionForAlias("sms", call, "smsPermissionCallback");
            return;
        }
        begin(call);
    }

    @PermissionCallback
    private void smsPermissionCallback(PluginCall call) {
        if (getPermissionState("sms") == PermissionState.GRANTED) {
            begin(call);
        } else {
            call.reject("SMS permission was not allowed. Open the app settings and allow SMS.");
        }
    }

    private void begin(PluginCall call) {
        prefs().edit().putBoolean("enabled", true).putString("lastError", "").apply();
        askForNotifications();
        ContextCompat.startForegroundService(getContext(), new Intent(getContext(), SmsGatewayService.class));
        call.resolve(statusObject());
    }

    private void askForNotifications() {
        if (Build.VERSION.SDK_INT >= 33 && getActivity() != null
                && ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(getActivity(), new String[]{Manifest.permission.POST_NOTIFICATIONS}, 4243);
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        prefs().edit().putBoolean("enabled", false).apply();
        getContext().stopService(new Intent(getContext(), SmsGatewayService.class));
        call.resolve(statusObject());
    }

    @PluginMethod
    public void status(PluginCall call) {
        call.resolve(statusObject());
    }

    /** Opens the battery screen so the phone can be told not to put the sender to sleep. */
    @PluginMethod
    public void openBatterySettings(PluginCall call) {
        try {
            startSettings(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS));
        } catch (Exception e) {
            openAppDetails();
        }
        call.resolve();
    }

    /** App info page (where "Allow restricted settings" lives on newer Android). */
    @PluginMethod
    public void openAppSettings(PluginCall call) {
        openAppDetails();
        call.resolve();
    }

    private void openAppDetails() {
        startSettings(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getContext().getPackageName())));
    }

    private void startSettings(Intent intent) {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
    }

    private JSObject statusObject() {
        SharedPreferences p = prefs();
        PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        JSObject o = new JSObject();
        o.put("enabled", p.getBoolean("enabled", false));
        o.put("running", SmsGatewayService.running);
        o.put("smsPermission", getPermissionState("sms") == PermissionState.GRANTED);
        o.put("sent", p.getInt("sent", 0));
        o.put("failed", p.getInt("failed", 0));
        o.put("lastSentAt", p.getLong("lastSentAt", 0));
        o.put("lastError", p.getString("lastError", ""));
        o.put("batteryUnrestricted", pm != null && pm.isIgnoringBatteryOptimizations(getContext().getPackageName()));
        return o;
    }
}
