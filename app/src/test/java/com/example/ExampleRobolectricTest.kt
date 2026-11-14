package com.example

import android.content.Context
import android.net.Uri
import androidx.test.core.app.ApplicationProvider
import androidx.webkit.WebViewAssetLoader
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class ExampleRobolectricTest {

  @Test
  fun `read string from context`() {
    val context = ApplicationProvider.getApplicationContext<Context>()
    val appName = context.getString(R.string.app_name)
    assertEquals("Anime Rush", appName)
  }

  @Test
  fun `bundled web game assets exist and load via WebViewAssetLoader`() {
    val context = ApplicationProvider.getApplicationContext<Context>()
    val files = context.assets.list("www")?.toList().orEmpty()
    assertTrue("index.html should exist in assets/www", files.contains("index.html"))

    val assetFiles = context.assets.list("www/assets")?.toList().orEmpty()
    val jsFile = assetFiles.firstOrNull { it.endsWith(".js") }
    assertNotNull("Bundled JS file should exist in assets/www/assets", jsFile)

    val loader = WebViewAssetLoader.Builder()
      .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(context))
      .build()

    val htmlResp = loader.shouldInterceptRequest(
      Uri.parse("https://appassets.androidplatform.net/assets/www/index.html"),
    )
    assertNotNull("index.html must resolve via WebViewAssetLoader", htmlResp)

    val jsResp = loader.shouldInterceptRequest(
      Uri.parse("https://appassets.androidplatform.net/assets/www/assets/$jsFile"),
    )
    assertNotNull("JS bundle must resolve via WebViewAssetLoader", jsResp)
  }
}
