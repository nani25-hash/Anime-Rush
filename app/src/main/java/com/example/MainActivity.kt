package com.example

import android.annotation.SuppressLint
import android.content.Context
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
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color as ComposeColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.lifecycle.lifecycleScope
import androidx.webkit.WebViewAssetLoader
import com.example.data.local.LocalGameRepository
import com.example.data.model.PlayerProfile
import java.io.ByteArrayInputStream
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

class MainActivity : ComponentActivity() {

  private var webViewRef: WebView? = null
  private val isGameReadyState = mutableStateOf(false)
  @Volatile private var latestProfileCache: PlayerProfile? = null

  private lateinit var localGameRepository: LocalGameRepository

  private fun emitToWeb(eventType: String, payload: JSONObject) {
    val webView = webViewRef ?: return
    val escapedType = JSONObject.quote(eventType)
    val payloadLiteral = payload.toString()
    webView.post {
      webView.evaluateJavascript(
        "window.__ANIME_RUSH_BRIDGE_EVENT__ && window.__ANIME_RUSH_BRIDGE_EVENT__($escapedType, $payloadLiteral);",
        null,
      )
    }
  }

  private fun emitError(action: String, throwable: Throwable) {
    emitToWeb(
      "error",
      JSONObject().apply {
        put("action", action)
        put("message", throwable.localizedMessage ?: "Erreur réseau ou permissions")
      },
    )
  }

  private fun syncProfileToWeb(profile: PlayerProfile) {
    latestProfileCache = profile
    emitToWeb("profile", profile.toJsonObject())
  }

  private suspend fun refreshSocialBundle() {
    val inboxRes = localGameRepository.listInbox()
    val lbRes = localGameRepository.fetchLocalLeaderboard()

    val payload =
      JSONObject().apply {
        put("friends", JSONArray())
        put("friendRequests", JSONArray())
        put(
          "inbox",
          JSONArray(inboxRes.getOrDefault(emptyList()).map { it.toJsonObject() }),
        )
        put(
          "leaderboard",
          JSONArray(lbRes.getOrDefault(emptyList()).map { it.toJsonObject() }),
        )
      }
    emitToWeb("socialBundle", payload)
  }

  private inner class AndroidGameBridge {
    @JavascriptInterface
    fun exitApp() {
      runOnUiThread { finish() }
    }

    @JavascriptInterface
    fun onGameReady() {
      runOnUiThread { isGameReadyState.value = true }
      lifecycleScope.launch(Dispatchers.IO) {
        latestProfileCache?.let { syncProfileToWeb(it) }
          ?: localGameRepository.getCurrentProfile().onSuccess { syncProfileToWeb(it) }
        refreshSocialBundle()
      }
    }

    @JavascriptInterface
    fun requestSyncAll() {
      lifecycleScope.launch(Dispatchers.IO) {
        localGameRepository
          .getCurrentProfile()
          .onSuccess { syncProfileToWeb(it) }
          .onFailure { emitError("requestSyncAll", it) }
        refreshSocialBundle()
      }
    }

    @JavascriptInterface
    fun updateDisplayName(newName: String) {
      lifecycleScope.launch(Dispatchers.IO) {
        localGameRepository
          .updateDisplayName(newName)
          .onSuccess {
            syncProfileToWeb(it)
            refreshSocialBundle()
            emitToWeb("toast", JSONObject().apply { put("message", "Pseudo mis à jour !") })
          }
          .onFailure { emitError("updateDisplayName", it) }
      }
    }

    @JavascriptInterface
    fun equipLoadout(heroId: String, companionId: String) {
      lifecycleScope.launch(Dispatchers.IO) {
        localGameRepository
          .equipLoadout(heroId, companionId)
          .onSuccess {
            syncProfileToWeb(it)
            refreshSocialBundle()
          }
          .onFailure { emitError("equipLoadout", it) }
      }
    }

    @JavascriptInterface
    fun claimFreeChest() {
      lifecycleScope.launch(Dispatchers.IO) {
        localGameRepository
          .claimFreeChest()
          .onSuccess { reward ->
            emitToWeb(
              "chestReward",
              JSONObject().apply {
                put("coins", reward.coins)
                put("gems", reward.gems)
                put("xp", reward.xp)
                put("nextFreeChestAt", reward.nextFreeChestAt)
              },
            )
            localGameRepository.getCurrentProfile().onSuccess {
              syncProfileToWeb(it)
              refreshSocialBundle()
            }
          }
          .onFailure { emitError("claimFreeChest", it) }
      }
    }

    @JavascriptInterface
    fun recordRunResult(
      score: Long,
      distance: Long,
      coinsEarned: Long,
      sakuraTokensEarned: Long,
      jumps: Long,
      slides: Long,
      consumedMagnet: Boolean,
      consumedShield: Boolean,
      consumedMultiplier: Boolean,
      consumedHeadStart: Boolean,
    ) {
      lifecycleScope.launch(Dispatchers.IO) {
        localGameRepository
          .recordRunResult(
            score = score,
            distance = distance,
            coinsEarned = coinsEarned,
            sakuraTokensEarned = sakuraTokensEarned,
            jumps = jumps,
            slides = slides,
            consumedMagnet = consumedMagnet,
            consumedShield = consumedShield,
            consumedMultiplier = consumedMultiplier,
            consumedHeadStart = consumedHeadStart,
          )
          .onSuccess {
            syncProfileToWeb(it)
            refreshSocialBundle()
          }
          .onFailure { emitError("recordRunResult", it) }
      }
    }

    @JavascriptInterface
    fun purchaseShopItem(itemType: String, itemId: String, currency: String, cost: Long) {
      lifecycleScope.launch(Dispatchers.IO) {
        localGameRepository
          .purchaseShopItem(itemType, itemId, currency, cost)
          .onSuccess {
            syncProfileToWeb(it)
            refreshSocialBundle()
            emitToWeb(
              "purchaseSuccess",
              JSONObject().apply {
                put("itemType", itemType)
                put("itemId", itemId)
              },
            )
          }
          .onFailure { emitError("purchaseShopItem", it) }
      }
    }

    @JavascriptInterface
    fun activateMultiplierBoost() {
      lifecycleScope.launch(Dispatchers.IO) {
        localGameRepository
          .activateMultiplierBoost()
          .onSuccess {
            syncProfileToWeb(it)
            emitToWeb("toast", JSONObject().apply { put("message", "Multiplicateur x5 activé !") })
          }
          .onFailure { emitError("activateMultiplierBoost", it) }
      }
    }

    @JavascriptInterface
    fun claimMission(missionId: String) {
      lifecycleScope.launch(Dispatchers.IO) {
        localGameRepository
          .claimMission(missionId)
          .onSuccess {
            syncProfileToWeb(it)
            emitToWeb("toast", JSONObject().apply { put("message", "Récompense de mission reçue !") })
          }
          .onFailure { emitError("claimMission", it) }
      }
    }

    @JavascriptInterface
    fun claimSeasonTier(tier: Long) {
      lifecycleScope.launch(Dispatchers.IO) {
        localGameRepository
          .claimSeasonTier(tier)
          .onSuccess {
            syncProfileToWeb(it)
            emitToWeb("toast", JSONObject().apply { put("message", "Palier $tier réclamé !") })
          }
          .onFailure { emitError("claimSeasonTier", it) }
      }
    }

    @JavascriptInterface
    fun claimEventMilestone(milestoneId: String) {
      lifecycleScope.launch(Dispatchers.IO) {
        localGameRepository
          .claimEventMilestone(milestoneId)
          .onSuccess {
            syncProfileToWeb(it)
            emitToWeb("toast", JSONObject().apply { put("message", "Récompense Sakura réclamée !") })
          }
          .onFailure { emitError("claimEventMilestone", it) }
      }
    }

    @JavascriptInterface
    fun claimAchievement(achievementId: String) {
      lifecycleScope.launch(Dispatchers.IO) {
        localGameRepository
          .claimAchievement(achievementId)
          .onSuccess {
            syncProfileToWeb(it)
            refreshSocialBundle()
            emitToWeb("toast", JSONObject().apply { put("message", "Succès débloqué et réclamé !") })
          }
          .onFailure { emitError("claimAchievement", it) }
      }
    }

    @JavascriptInterface
    fun fetchLeaderboard() {
      lifecycleScope.launch(Dispatchers.IO) {
        localGameRepository
          .fetchLocalLeaderboard()
          .onSuccess { list ->
            emitToWeb(
              "leaderboard",
              JSONObject().apply { put("entries", JSONArray(list.map { it.toJsonObject() })) },
            )
          }
          .onFailure { emitError("fetchLeaderboard", it) }
      }
    }

    @JavascriptInterface
    fun searchPlayers(query: String) {
      emitToWeb("playerSearch", JSONObject().apply { put("entries", JSONArray()) })
    }

    @JavascriptInterface
    fun sendFriendRequest(
      targetUid: String,
      targetDisplayName: String,
      targetLevel: Long,
      targetBestScore: Long,
      targetHeroId: String,
      targetCompanionId: String,
    ) {
      emitToWeb(
        "toast",
        JSONObject().apply { put("message", "Mode local actif : amis désactivés pour le moment.") },
      )
    }

    @JavascriptInterface
    fun acceptFriendRequest(
      requestId: String,
      fromUid: String,
      fromDisplayName: String,
      fromLevel: Long,
    ) {}

    @JavascriptInterface
    fun declineFriendRequest(requestId: String) {}

    @JavascriptInterface
    fun removeFriend(friendUid: String) {}

    @JavascriptInterface
    fun sendFriendGift(friendUid: String) {}

    @JavascriptInterface
    fun claimInboxMessage(messageId: String) {
      lifecycleScope.launch(Dispatchers.IO) {
        localGameRepository
          .claimInboxMessage(messageId)
          .onSuccess {
            localGameRepository.getCurrentProfile().onSuccess { syncProfileToWeb(it) }
            refreshSocialBundle()
            emitToWeb("toast", JSONObject().apply { put("message", "Récompense réclamée !") })
          }
          .onFailure { emitError("claimInboxMessage", it) }
      }
    }

    @JavascriptInterface
    fun claimAllInbox() {
      lifecycleScope.launch(Dispatchers.IO) {
        localGameRepository
          .claimAllInbox()
          .onSuccess { count ->
            localGameRepository.getCurrentProfile().onSuccess { syncProfileToWeb(it) }
            refreshSocialBundle()
            if (count > 0) {
              emitToWeb(
                "toast",
                JSONObject().apply { put("message", "$count récompenses réclamées !") },
              )
            }
          }
          .onFailure { emitError("claimAllInbox", it) }
      }
    }

    @JavascriptInterface
    fun signOut() {
      emitToWeb(
        "toast",
        JSONObject().apply { put("message", "Sauvegarde locale active sur cet appareil.") },
      )
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    localGameRepository = LocalGameRepository(applicationContext)

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
      LocalGameShell(
        localGameRepository = localGameRepository,
        onProfileSynced = { syncProfileToWeb(it) },
        onRefreshSocial = { refreshSocialBundle() },
      )
    }
  }

  @Composable
  private fun LocalGameShell(
    localGameRepository: LocalGameRepository,
    onProfileSynced: (PlayerProfile) -> Unit,
    onRefreshSocial: suspend () -> Unit,
  ) {
    val context = LocalContext.current
    var webViewInstance by remember { mutableStateOf<WebView?>(null) }
    var minSplashElapsed by remember { mutableStateOf(false) }
    var forceDismissSplash by remember { mutableStateOf(false) }
    val gameReady by isGameReadyState
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
      localGameRepository
        .ensurePlayerInitialized()
        .onSuccess { profile ->
          onProfileSynced(profile)
          onRefreshSocial()
        }

      localGameRepository
        .observeProfile()
        .catch { err -> Log.w("AnimeRushProfile", "Profile stream closed: ${err.message}") }
        .collect { profile ->
          if (profile != null) {
            onProfileSynced(profile)
          }
        }
    }

    LaunchedEffect(Unit) {
      delay(1000L)
      minSplashElapsed = true
      delay(2200L)
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
        factory = { viewContext ->
          createGameWebView(viewContext).also { created ->
            webViewRef = created
            webViewInstance = created
          }
        },
      )

      AnimatedVisibility(
        visible = showSplash,
        exit = fadeOut(animationSpec = tween(durationMillis = 360)),
      ) {
        AnimeRushSplashOverlay()
      }
    }
    voidScope(scope, context)
  }

  private fun voidScope(scope: Any, context: Context) {
    // Keeps scope/context parameters referenced cleanly without unused warnings
  }

  @SuppressLint("SetJavaScriptEnabled")
  private fun createGameWebView(context: Context): WebView {
    val assetLoader =
      WebViewAssetLoader.Builder()
        .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(context))
        .build()

    return WebView(context).apply {
      layoutParams =
        ViewGroup.LayoutParams(
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

      webChromeClient =
        object : WebChromeClient() {
          override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean {
            Log.d(
              "AnimeRushWebView",
              "${consoleMessage.messageLevel()}: ${consoleMessage.message()} (${consoleMessage.sourceId()}:${consoleMessage.lineNumber()})",
            )
            return true
          }
        }

      webViewClient =
        object : WebViewClient() {
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
            val mimeType =
              when {
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
        text = "CHARGEMENT DE TOKYO SAKURA...",
        color = ComposeColor(0xFFE2E8F0),
        fontSize = 12.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = 1.6.sp,
      )
    }
  }
}
