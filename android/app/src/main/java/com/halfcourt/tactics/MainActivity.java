package com.halfcourt.tactics;

import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.Window;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.splashscreen.SplashScreenViewProvider;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private Boolean darkAppearance;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Hand off a plain system background to the one branded web intro.
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        registerPlugin(AppearanceBarsPlugin.class);
        super.onCreate(savedInstanceState);
        splashScreen.setOnExitAnimationListener(SplashScreenViewProvider::remove);
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        // Capacitor restores its own bar style during the configuration change.
        if (darkAppearance != null) setAppearanceBars(darkAppearance);
    }

    @SuppressWarnings("deprecation")
    void setAppearanceBars(boolean dark) {
        darkAppearance = dark;
        Window window = getWindow();
        int background = dark ? Color.rgb(18, 26, 35) : getColor(R.color.app_window_background);
        // Under enforced edge-to-edge, the decor draws behind transparent bars.
        window.getDecorView().setBackgroundColor(background);
        if (Build.VERSION.SDK_INT < 35) {
            window.setStatusBarColor(background);
            window.setNavigationBarColor(background);
        }
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
        controller.setAppearanceLightStatusBars(!dark);
        controller.setAppearanceLightNavigationBars(!dark);
    }
}
