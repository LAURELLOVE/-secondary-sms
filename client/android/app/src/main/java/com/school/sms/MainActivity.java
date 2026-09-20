package com.school.sms;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Only the Administrator app can send SMS; the Teacher app doesn't even load the plugin.
        if (getResources().getBoolean(R.bool.sms_gateway_enabled)) {
            registerPlugin(SmsGatewayPlugin.class);
        }
        super.onCreate(savedInstanceState);
    }
}
