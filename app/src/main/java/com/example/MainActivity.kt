package com.example

import android.annotation.SuppressLint
import android.graphics.Color
import android.os.Bundle
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.webkit.ConsoleMessage
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color as ComposeColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.webkit.WebViewAssetLoader
import java.io.ByteArrayInputStream
import kotlinx.coroutines.delay

class MainActivity : ComponentActivity() {

  private var webViewRef: WebView? = null
  private val isGameReadyState = mutableStateOf(false)

  private inner class AndroidGameBridge {
    @JavascriptInterface
    fun exitApp() {
      runOnUiThread { finish() }
    }

    @JavascriptInterface
    fun onGameReady() {
      runOnUiThread { isGameReadyState.value = true }
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge(
      statusBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
      navigationBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
    )

    WindowCompat.setDecorFitsSystemWindows(window, false)
    val insetsController = WindowCompat.getInsetsController(window, window.decorView)
    insetsController.systemBarsBehavior =
      WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    insetsController.hide(WindowInsetsCompat.Type.systemBars())

    setContent {
      var webViewInstance by remember { mutableStateOf<WebView?>(null) }
      var minSplashElapsed by remember { mutableStateOf(false) }
      var forceDismissSplash by remember { mutableStateOf(false) }
      val gameReady by isGameReadyState

      LaunchedEffect(Unit) {
        delay(1200L)
        minSplashElapsed = true
        delay(2300L)
        forceDismissSplash = true
      }

      val showSplash = (!gameReady || !minSplashElapsed) && !forceDismissSplash

      BackHandler {
        val wv = webViewInstance
        if (wv != null) {
          wv.evaluateJavascript("window.__ANIME_RUSH_BACK__ && window.__ANIME_RUSH_BACK__();", null)
        } else {
          finish()
        }
      }

      DisposableEffect(Unit) {
        onDispose {
          webViewRef?.destroy()
          webViewRef = null
        }
      }

      Box(modifier = Modifier.fillMaxSize().background(ComposeColor(0xFF070B19))) {
        AndroidView(
          modifier = Modifier.fillMaxSize(),
          factory = { context ->
            createGameWebView(context).also { created ->
              webViewRef = created
              webViewInstance = created
            }
          },
        )

        AnimatedVisibility(
          visible = showSplash,
          exit = fadeOut(animationSpec = tween(durationMillis = 380)),
        ) {
          AnimeRushSplashOverlay()
        }
      }
    }
  }

  @SuppressLint("SetJavaScriptEnabled")
  private fun createGameWebView(context: android.content.Context): WebView {
    val assetLoader = WebViewAssetLoader.Builder()
      .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(context))
      .build()

    return WebView(context).apply {
      layoutParams = ViewGroup.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT,
      )
      setBackgroundColor(Color.parseColor("#070B19"))
      isVerticalScrollBarEnabled = false
      isHorizontalScrollBarEnabled = false
      overScrollMode = View.OVER_SCROLL_NEVER

      settings.apply {
        javaScriptEnabled = true
        domStorageEnabled = true
        mediaPlaybackRequiresUserGesture = false
        allowFileAccess = false
        allowContentAccess = false
        mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        useWideViewPort = true
        loadWithOverviewMode = false
      }

      addJavascriptInterface(AndroidGameBridge(), "AndroidBridge")

      webChromeClient = object : WebChromeClient() {
        override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean {
          Log.d(
            "AnimeRushWebView",
            "${consoleMessage.messageLevel()}: ${consoleMessage.message()} (${consoleMessage.sourceId()}:${consoleMessage.lineNumber()})",
          )
          return true
        }
      }

      webViewClient = object : WebViewClient() {
        override fun shouldInterceptRequest(
          view: WebView,
          request: WebResourceRequest,
        ): WebResourceResponse? {
          val path = request.url.path.orEmpty().lowercase()
          if (request.url.host == "appassets.androidplatform.net" && path == "/favicon.ico") {
            return WebResourceResponse("image/x-icon", null, ByteArrayInputStream(ByteArray(0)))
          }
          val response = assetLoader.shouldInterceptRequest(request.url)
          if (response == null) {
            if (request.url.host == "appassets.androidplatform.net") {
              return WebResourceResponse(
                "text/plain",
                "UTF-8",
                404,
                "Not Found",
                emptyMap(),
                ByteArrayInputStream(ByteArray(0)),
              )
            }
            return null
          }
          val mimeType = when {
            path.endsWith(".js") || path.endsWith(".mjs") -> "application/javascript"
            path.endsWith(".css") -> "text/css"
            path.endsWith(".html") -> "text/html"
            path.endsWith(".json") -> "application/json"
            path.endsWith(".svg") -> "image/svg+xml"
            path.endsWith(".png") -> "image/png"
            path.endsWith(".jpg") || path.endsWith(".jpeg") -> "image/jpeg"
            else -> response.mimeType ?: "application/octet-stream"
          }
          val encoding =
            if (
              mimeType.startsWith("text/") ||
                mimeType == "application/javascript" ||
                mimeType == "application/json"
            ) {
              "UTF-8"
            } else {
              response.encoding
            }
          response.mimeType = mimeType
          response.encoding = encoding
          response.setStatusCodeAndReasonPhrase(200, "OK")
          val headers = HashMap(response.responseHeaders ?: emptyMap())
          headers["Access-Control-Allow-Origin"] = "*"
          response.responseHeaders = headers
          return response
        }

        override fun onPageFinished(view: WebView?, url: String?) {
          super.onPageFinished(view, url)
          view?.postDelayed({ isGameReadyState.value = true }, 400L)
        }

        override fun onReceivedError(
          view: WebView,
          request: WebResourceRequest,
          error: WebResourceError,
        ) {
          Log.e(
            "AnimeRushWebView",
            "WebView error ${error.errorCode}: ${error.description} (${request.url})",
          )
        }
      }

      loadUrl("https://appassets.androidplatform.net/assets/www/index.html")
    }
  }

  override fun onPause() {
    super.onPause()
    webViewRef?.evaluateJavascript(
      "window.dispatchEvent(new CustomEvent('anime-rush-pause'));",
      null,
    )
    webViewRef?.onPause()
  }

  override fun onResume() {
    super.onResume()
    webViewRef?.onResume()
    val insetsController = WindowCompat.getInsetsController(window, window.decorView)
    insetsController.hide(WindowInsetsCompat.Type.systemBars())
  }
}

@Composable
private fun AnimeRushSplashOverlay() {
  Box(
    modifier =
      Modifier.fillMaxSize()
        .background(
          Brush.verticalGradient(
            colors =
              listOf(
                ComposeColor(0xFF040714),
                ComposeColor(0xFF0B1230),
                ComposeColor(0xFF070B19),
              )
          )
        )
  ) {
    Image(
      painter = painterResource(id = R.drawable.splash_anime_rush),
      contentDescription = "Anime Rush",
      contentScale = ContentScale.Fit,
      modifier = Modifier.fillMaxWidth().align(Alignment.Center),
    )

    Column(
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalArrangement = Arrangement.spacedBy(10.dp),
      modifier =
        Modifier.align(Alignment.BottomCenter)
          .navigationBarsPadding()
          .padding(horizontal = 32.dp, vertical = 32.dp)
          .widthIn(max = 320.dp),
    ) {
      LinearProgressIndicator(
        color = ComposeColor(0xFFFACC15),
        trackColor = ComposeColor(0x3338BDF8),
        modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(999.dp)),
      )
      Spacer(modifier = Modifier.height(2.dp))
      Text(
        text = "CHARGEMENT DU SANCTUAIRE...",
        color = ComposeColor(0xFFE2E8F0),
        fontSize = 12.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = 1.6.sp,
      )
    }
  }
}
