package app.usosmobile

import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.webkit.CookieManager
import android.webkit.URLUtil
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebSettingsCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature

/**
 * One screen: a WebView on USOSweb with the shared USOS Mobile scripts injected at
 * document start, before USOS renders (see scripts/build.mjs).
 */
class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView

    /** Used only when the WebView is too old for addDocumentStartJavaScript. */
    private var lateInjection = false

    override fun onCreate(savedInstanceState: Bundle?) {
        // Light icons on the USOS-coloured bars; the bar colour itself is the root background.
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
        )
        super.onCreate(savedInstanceState)
        preferHighRefreshRate()

        webView = WebView(this)
        val root = FrameLayout(this).apply {
            setBackgroundColor(ContextCompat.getColor(context, R.color.bar))
            addView(webView, FrameLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT))
        }
        setContentView(root)

        // Keep the page out from under the system bars, the cutout and the keyboard.
        ViewCompat.setOnApplyWindowInsetsListener(root) { v, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            val ime = insets.getInsets(WindowInsetsCompat.Type.ime())
            v.setPadding(bars.left, bars.top, bars.right, maxOf(bars.bottom, ime.bottom))
            WindowInsetsCompat.CONSUMED
        }

        configureWebView()

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() = onBack(this)
        })

        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            webView.loadUrl(START_URL)
        }
    }

    /**
     * Ask for the display's highest refresh rate at the current resolution. In "auto" mode many
     * phones keep a WebView at 60 Hz, because it doesn't vote for a higher frame rate itself.
     */
    private fun preferHighRefreshRate() {
        val display = ContextCompat.getDisplayOrDefault(this)
        val current = display.mode
        val best = display.supportedModes
            .filter { it.physicalWidth == current.physicalWidth && it.physicalHeight == current.physicalHeight }
            .maxByOrNull { it.refreshRate } ?: return
        window.attributes = window.attributes.apply {
            preferredDisplayModeId = best.modeId
            preferredRefreshRate = best.refreshRate
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        WebView.setWebContentsDebuggingEnabled(applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0)

        // The native scrollbar spans the whole WebView and would overlap the page's own
        // top bar and bottom nav; inner scrollers (sheets, wide tables) are unaffected.
        webView.isVerticalScrollBarEnabled = false
        webView.isHorizontalScrollBarEnabled = false

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true // settings + collapsed-tile state live in localStorage
            allowFileAccess = false
            allowContentAccess = false
            setSupportMultipleWindows(false) // target=_blank opens in place
        }
        // Our themes (incl. dark) are real CSS; never let WebView auto-darken the page.
        if (WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING)) {
            WebSettingsCompat.setAlgorithmicDarkeningAllowed(webView.settings, false)
        }
        CookieManager.getInstance().setAcceptCookie(true)

        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            WebViewCompat.addDocumentStartJavaScript(webView, asset("usm.js"), setOf(USOSWEB))
            WebViewCompat.addDocumentStartJavaScript(webView, asset("usm-cas.js"), setOf(CAS))
        } else {
            lateInjection = true
            Toast.makeText(this, R.string.old_webview, Toast.LENGTH_LONG).show()
        }

        // Default WebChromeClient = native alert()/confirm() dialogs (USOS uses them).
        webView.webChromeClient = WebChromeClient()
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                if (!request.isForMainFrame) return false
                val uri = request.url
                if (uri.scheme == "https" && uri.host in IN_APP_HOSTS) return false
                openExternally(uri)
                return true
            }

            override fun onPageStarted(view: WebView, url: String, favicon: android.graphics.Bitmap?) {
                if (!lateInjection) return
                when (Uri.parse(url).host) {
                    Uri.parse(USOSWEB).host -> view.evaluateJavascript(asset("usm.js"), null)
                    Uri.parse(CAS).host -> view.evaluateJavascript(asset("usm-cas.js"), null)
                }
            }
        }

        webView.setDownloadListener { url, userAgent, contentDisposition, mimeType, _ ->
            download(url, userAgent, contentDisposition, mimeType)
        }
    }

    /** Back: first close our sheets / USOS dialogs (USM.back() in main.js), then history, then leave. */
    private fun onBack(callback: OnBackPressedCallback) {
        webView.evaluateJavascript(
            "(function(){try{return !!(window.USM&&USM.back&&USM.back())}catch(e){return false}})()",
        ) { handled ->
            when {
                handled == "true" -> Unit
                webView.canGoBack() -> webView.goBack()
                else -> {
                    // Let the system do its default (move the task back / predictive back to home).
                    callback.isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                    callback.isEnabled = true
                }
            }
        }
    }

    private fun openExternally(uri: Uri) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE))
        } catch (_: ActivityNotFoundException) {
            Toast.makeText(this, R.string.no_app_for_link, Toast.LENGTH_SHORT).show()
        }
    }

    /** Downloads go through DownloadManager with the session cookies (USOS files need login). */
    private fun download(url: String, userAgent: String, contentDisposition: String?, mimeType: String?) {
        val uri = Uri.parse(url)
        if (uri.scheme != "https") return openExternally(uri)
        val name = URLUtil.guessFileName(url, contentDisposition, mimeType)
        try {
            val request = DownloadManager.Request(uri)
                .setMimeType(mimeType)
                .addRequestHeader("Cookie", CookieManager.getInstance().getCookie(url) ?: "")
                .addRequestHeader("User-Agent", userAgent)
                .setTitle(name)
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name)
            } else {
                // Android 8–9: public Downloads would need a runtime permission; app folder needs none.
                request.setDestinationInExternalFilesDir(this, Environment.DIRECTORY_DOWNLOADS, name)
            }
            getSystemService(DownloadManager::class.java).enqueue(request)
            Toast.makeText(this, getString(R.string.download_started, name), Toast.LENGTH_SHORT).show()
        } catch (_: Exception) {
            Toast.makeText(this, R.string.download_failed, Toast.LENGTH_SHORT).show()
        }
    }

    private val assetCache = mutableMapOf<String, String>()
    private fun asset(name: String): String =
        assetCache.getOrPut(name) { assets.open(name).bufferedReader().use { it.readText() } }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onPause() {
        webView.onPause()
        CookieManager.getInstance().flush() // keep the USOS session across process death
        super.onPause()
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }

    private companion object {
        const val USOSWEB = "https://usosweb.polsl.pl"
        const val CAS = "https://usoscas.polsl.pl"
        const val START_URL = "$USOSWEB/kontroler.php?_action=home/index"
        val IN_APP_HOSTS = setOf("usosweb.polsl.pl", "usoscas.polsl.pl")
    }
}
