package com.halfcourt.tactics;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AppearanceBars")
public class AppearanceBarsPlugin extends Plugin {
    @PluginMethod
    public void setAppearance(PluginCall call) {
        String appearance = call.getString("appearance");
        if (!"glass".equals(appearance) && !"realistic".equals(appearance)) {
            call.reject("Invalid appearance");
            return;
        }

        getBridge().executeOnMainThread(() -> {
            if (!(getActivity() instanceof MainActivity)) {
                call.reject("Appearance bars are unavailable");
                return;
            }
            ((MainActivity) getActivity()).setAppearanceBars("realistic".equals(appearance));
            call.resolve();
        });
    }
}
