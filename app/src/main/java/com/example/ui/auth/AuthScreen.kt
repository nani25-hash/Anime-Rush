package com.example.ui.auth

import android.app.Activity
import android.content.Context
import android.util.Log
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.automirrored.filled.Login
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import com.example.R
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential.Companion.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
import com.google.firebase.Firebase
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.auth.auth
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext

private const val AUTH_TAG = "AnimeRushAuth"

fun attemptAutoSignIn(
  context: Context,
  credentialManager: CredentialManager,
  onAuthSuccess: () -> Unit,
  onUnauthenticated: () -> Unit,
  scope: CoroutineScope,
) {
  if (Firebase.auth.currentUser != null) {
    onAuthSuccess()
    return
  }
  val clientId =
    try {
      context.getString(R.string.default_web_client_id)
    } catch (e: Exception) {
      Log.w(AUTH_TAG, "default_web_client_id indisponible pour auto-sign-in", e)
      onUnauthenticated()
      return
    }

  val googleIdOption =
    GetGoogleIdOption.Builder()
      .setFilterByAuthorizedAccounts(true)
      .setServerClientId(clientId)
      .setAutoSelectEnabled(true)
      .build()

  val request = GetCredentialRequest.Builder().addCredentialOption(googleIdOption).build()

  scope.launch {
    try {
      val result = credentialManager.getCredential(context, request)
      val credential = result.credential
      if (credential is CustomCredential && credential.type == TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
        val googleIdToken = GoogleIdTokenCredential.createFrom(credential.data).idToken
        val authCredential = GoogleAuthProvider.getCredential(googleIdToken, null)
        Firebase.auth.signInWithCredential(authCredential).await()
        onAuthSuccess()
      } else {
        onUnauthenticated()
      }
    } catch (e: Exception) {
      Log.d(AUTH_TAG, "Auto sign-in silencieux ignoré: ${e.message}")
      onUnauthenticated()
    }
  }
}

fun onGoogleSignInClicked(
  context: Context,
  credentialManager: CredentialManager,
  onAuthSuccess: () -> Unit,
  onAuthError: (String) -> Unit,
  scope: CoroutineScope,
  onAuthCancelled: () -> Unit = {},
) {
  val clientId =
    try {
      context.getString(R.string.default_web_client_id)
    } catch (e: Exception) {
      onAuthError("Configuration Google Sign-In manquante (default_web_client_id).")
      return
    }

  val signInOption = GetSignInWithGoogleOption.Builder(serverClientId = clientId).build()
  val request = GetCredentialRequest.Builder().addCredentialOption(signInOption).build()

  scope.launch {
    try {
      val activityContext = context as? Activity ?: context
      val result = credentialManager.getCredential(activityContext, request)
      val credential = result.credential
      if (credential is CustomCredential && credential.type == TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
        val googleIdToken = GoogleIdTokenCredential.createFrom(credential.data).idToken
        val authCredential = GoogleAuthProvider.getCredential(googleIdToken, null)
        Firebase.auth.signInWithCredential(authCredential).await()
        onAuthSuccess()
      } else {
        onAuthError("Type d'identifiant inattendu.")
      }
    } catch (e: GetCredentialCancellationException) {
      Log.w(AUTH_TAG, "Google Sign-In annulé ou ignoré : ${e.message}", e)
      onAuthCancelled()
    } catch (e: Exception) {
      Log.e(AUTH_TAG, "Échec de la connexion Google", e)
      onAuthError(e.localizedMessage ?: "Échec de la connexion Google.")
    }
  }
}

fun signOutGoogle(
  credentialManager: CredentialManager,
  scope: CoroutineScope,
  onSignOutComplete: () -> Unit = {},
) {
  scope.launch {
    withContext(NonCancellable) {
      try {
        credentialManager.clearCredentialState(ClearCredentialStateRequest())
      } catch (e: Exception) {
        Log.w(AUTH_TAG, "Impossible d'effacer l'état CredentialManager : ${e.message}")
      } finally {
        Firebase.auth.signOut()
        onSignOutComplete()
      }
    }
  }
}

@Composable
fun AuthScreen(
  onAuthSuccess: () -> Unit,
) {
  val context = LocalContext.current
  val coroutineScope = rememberCoroutineScope()
  val credentialManager = remember(context) { CredentialManager.create(context) }

  var isCheckingAuto by remember { mutableStateOf(true) }
  var isSigningIn by remember { mutableStateOf(false) }
  var errorMessage by remember { mutableStateOf<String?>(null) }

  LaunchedEffect(Unit) {
    attemptAutoSignIn(
      context = context,
      credentialManager = credentialManager,
      onAuthSuccess = {
        isCheckingAuto = false
        onAuthSuccess()
      },
      onUnauthenticated = {
        isCheckingAuto = false
      },
      scope = coroutineScope,
    )
  }

  Box(
    modifier =
      Modifier.fillMaxSize()
        .background(
          Brush.verticalGradient(
            colors =
              listOf(
                Color(0xFF060B21),
                Color(0xFF131B45),
                Color(0xFF28123C),
                Color(0xFF090D1D),
              )
          )
        )
        .statusBarsPadding()
        .navigationBarsPadding()
        .padding(horizontal = 20.dp, vertical = 20.dp)
  ) {
    Column(
      modifier = Modifier.fillMaxSize().widthIn(max = 520.dp).align(Alignment.Center),
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalArrangement = Arrangement.SpaceBetween,
    ) {
      Spacer(modifier = Modifier.height(8.dp))

      Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Image(
          painter = painterResource(id = R.drawable.splash_anime_rush),
          contentDescription = "Anime Rush",
          contentScale = ContentScale.Fit,
          modifier =
            Modifier.fillMaxWidth(0.86f)
              .height(210.dp)
              .clip(RoundedCornerShape(24.dp))
              .border(1.5.dp, Color(0x66F472B6), RoundedCornerShape(24.dp)),
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
          text = "TOKYO SAKURA RAILS",
          color = Color(0xFFF9A8D4),
          fontSize = 13.sp,
          fontWeight = FontWeight.ExtraBold,
          letterSpacing = 2.4.sp,
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
          text = "Courez sur les rails avec votre Shiba Ninja",
          color = Color(0xFFF8FAFC),
          fontSize = 19.sp,
          fontWeight = FontWeight.Bold,
          textAlign = TextAlign.Center,
        )
      }

      Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xCC0F1735)),
      ) {
        Column(
          modifier =
            Modifier.fillMaxWidth()
              .border(1.dp, Color(0x4438BDF8), RoundedCornerShape(24.dp))
              .padding(20.dp),
          verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
          FeatureRow(
            icon = Icons.Filled.CloudDone,
            tint = Color(0xFF38BDF8),
            title = "Sauvegarde Cloud Firebase",
            subtitle = "Niveau, pièces, gemmes, héros, missions et coffre synchronisés.",
          )
          FeatureRow(
            icon = Icons.Filled.EmojiEvents,
            tint = Color(0xFFFACC15),
            title = "Classement Mondial & Saison 1",
            subtitle = "Affrontez les meilleurs coureurs et débloquez des paliers.",
          )
          FeatureRow(
            icon = Icons.Filled.Groups,
            tint = Color(0xFFF472B6),
            title = "Amis & Messagerie en Ligne",
            subtitle = "Ajoutez des joueurs, envoyez des cadeaux et réclamez vos récompenses.",
          )

          if (errorMessage != null) {
            Text(
              text = errorMessage!!,
              color = Color(0xFFFCA5A5),
              style = MaterialTheme.typography.bodySmall,
              fontWeight = FontWeight.Medium,
            )
          }

          Button(
            onClick = {
              errorMessage = null
              isSigningIn = true
              onGoogleSignInClicked(
                context = context,
                credentialManager = credentialManager,
                onAuthSuccess = {
                  isSigningIn = false
                  onAuthSuccess()
                },
                onAuthError = { msg ->
                  isSigningIn = false
                  errorMessage = msg
                },
                scope = coroutineScope,
                onAuthCancelled = { isSigningIn = false },
              )
            },
            enabled = !isSigningIn && !isCheckingAuto,
            shape = RoundedCornerShape(16.dp),
            colors =
              ButtonDefaults.buttonColors(
                containerColor = Color(0xFFFACC15),
                contentColor = Color(0xFF1E1B18),
              ),
            modifier =
              Modifier.fillMaxWidth()
                .height(56.dp)
                .testTag("google_sign_in_button"),
          ) {
            if (isSigningIn || isCheckingAuto) {
              CircularProgressIndicator(
                modifier = Modifier.size(22.dp),
                color = Color(0xFF1E1B18),
                strokeWidth = 2.5.dp,
              )
              Spacer(modifier = Modifier.size(10.dp))
              Text(
                text = if (isCheckingAuto) "VÉRIFICATION..." else "CONNEXION EN COURS...",
                fontWeight = FontWeight.ExtraBold,
                fontSize = 15.sp,
              )
            } else {
              Icon(
                imageVector = Icons.AutoMirrored.Filled.Login,
                contentDescription = "Connexion Google",
                modifier = Modifier.size(22.dp),
              )
              Spacer(modifier = Modifier.size(10.dp))
              Text(
                text = "SE CONNECTER AVEC GOOGLE",
                fontWeight = FontWeight.ExtraBold,
                fontSize = 15.sp,
              )
            }
          }
        }
      }

      Text(
        text = "Connexion requise pour accéder au cloud Anime Rush",
        color = Color(0xFF94A3B8),
        fontSize = 12.sp,
        textAlign = TextAlign.Center,
      )
    }
  }
}

@Composable
private fun FeatureRow(
  icon: ImageVector,
  tint: Color,
  title: String,
  subtitle: String,
) {
  Row(
    verticalAlignment = Alignment.CenterVertically,
    horizontalArrangement = Arrangement.spacedBy(12.dp),
  ) {
    Box(
      modifier =
        Modifier.size(40.dp)
          .clip(RoundedCornerShape(12.dp))
          .background(tint.copy(alpha = 0.16f)),
      contentAlignment = Alignment.Center,
    ) {
      Icon(
        imageVector = icon,
        contentDescription = title,
        tint = tint,
        modifier = Modifier.size(22.dp),
      )
    }
    Column(modifier = Modifier.weight(1f)) {
      Text(
        text = title,
        color = Color(0xFFF8FAFC),
        fontWeight = FontWeight.Bold,
        fontSize = 14.sp,
      )
      Text(
        text = subtitle,
        color = Color(0xFFCBD5E1),
        fontSize = 12.sp,
        lineHeight = 16.sp,
      )
    }
  }
}
