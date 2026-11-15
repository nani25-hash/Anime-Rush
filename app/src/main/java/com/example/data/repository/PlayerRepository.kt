package com.example.data.repository

import android.content.Context
import com.example.R
import com.example.data.model.ChestRewardResult
import com.example.data.model.LeaderboardEntry
import com.example.data.model.PlayerProfile
import com.example.data.remote.OperationType
import com.example.data.remote.handleFirestoreError
import com.google.firebase.Firebase
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.auth
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.snapshots
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.emitAll
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.tasks.await

class PlayerRepository(
  private val db: FirebaseFirestore,
  private val auth: FirebaseAuth = Firebase.auth,
) {
  constructor(context: Context) : this(
    FirebaseFirestore.getInstance(
      context.applicationContext.getString(R.string.firestore_database_id)
    ),
    Firebase.auth,
  )

  private fun requireUserId(): String {
    return auth.currentUser?.uid
      ?: throw IllegalStateException("L'utilisateur doit être connecté avec Google.")
  }

  private fun sanitizeDisplayName(raw: String?): String {
    val trimmed = raw?.trim().orEmpty().replace(Regex("\\s+"), " ")
    val safe = if (trimmed.isEmpty()) "NinjaRyu" else trimmed
    return safe.take(24)
  }

  private fun currentDailyResetKey(): String {
    val fmt = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    fmt.timeZone = TimeZone.getTimeZone("UTC")
    return fmt.format(Date())
  }

  private fun currentWeeklyResetKey(): String {
    val cal = Calendar.getInstance(TimeZone.getTimeZone("UTC"), Locale.US)
    val year = cal.get(Calendar.YEAR)
    val week = cal.get(Calendar.WEEK_OF_YEAR)
    return String.format(Locale.US, "%04d-W%02d", year, week)
  }

  fun observeProfile(): Flow<PlayerProfile?> = flow {
    val uid = requireUserId()
    val docRef = db.collection("users").document(uid)
    emitAll(
      docRef
        .snapshots()
        .map { snapshot ->
          snapshot.toObject(
            PlayerProfile::class.java,
            DocumentSnapshot.ServerTimestampBehavior.ESTIMATE,
          )
        }
        .catch { error ->
          val firestoreError =
            generateSequence(error) { it.cause }
              .filterIsInstance<com.google.firebase.firestore.FirebaseFirestoreException>()
              .firstOrNull()
          if (firestoreError == null && error is CancellationException) throw error
          val exceptionToLog = firestoreError ?: (error as? Exception)
          if (exceptionToLog != null && auth.currentUser?.uid == uid) {
            handleFirestoreError(exceptionToLog, OperationType.GET, docRef.path)
          }
          throw error
        }
    )
  }

  suspend fun ensurePlayerInitialized(
    displayNameHint: String? = null,
    photoUrl: String? = null,
  ): Result<PlayerProfile> {
    val uid =
      try {
        requireUserId()
      } catch (e: Exception) {
        return Result.failure(e)
      }

    val userRef = db.collection("users").document(uid)
    return try {
      val existingSnap = userRef.get().await()
      if (existingSnap.exists()) {
        val profile =
          existingSnap.toObject(
            PlayerProfile::class.java,
            DocumentSnapshot.ServerTimestampBehavior.ESTIMATE,
          )
            ?: throw IllegalStateException("Profil introuvable après lecture.")
        val normalized = normalizeCyclesIfNeeded(profile)
        return Result.success(normalized)
      }

      val name = sanitizeDisplayName(displayNameHint ?: auth.currentUser?.displayName)
      val dailyKey = currentDailyResetKey()
      val weeklyKey = currentWeeklyResetKey()
      val newProfile =
        PlayerProfile(
          id = uid,
          uid = uid,
          displayName = name,
          displayNameLower = name.lowercase(Locale.ROOT),
          photoUrl = photoUrl?.takeIf { it.length <= 500 },
          dailyMissionResetKey = dailyKey,
          weeklyMissionResetKey = weeklyKey,
          collectionIds = listOf("card_tokyo_rails"),
        )

      val leaderboardEntry =
        LeaderboardEntry(
          id = uid,
          uid = uid,
          displayName = name,
          displayNameLower = name.lowercase(Locale.ROOT),
          level = newProfile.level,
          bestScore = newProfile.bestScore,
          equippedHeroId = newProfile.equippedHeroId,
          equippedCompanionId = newProfile.equippedCompanionId,
        )

      val batch = db.batch()
      batch.set(userRef, newProfile.toCreateMap())
      batch.set(db.collection("leaderboard").document(uid), leaderboardEntry.toCreateMap())

      val welcomeMsgRef = userRef.collection("inbox").document("welcome_gift")
      batch.set(
        welcomeMsgRef,
        mapOf(
          "senderUid" to uid,
          "senderName" to "Sanctuaire Anime Rush",
          "title" to "Bienvenue à Tokyo Sakura !",
          "body" to "Voici votre pack de bienvenue pour démarrer sur les rails avec Ryu & Shiba.",
          "type" to "reward",
          "rewardCoins" to 300L,
          "rewardGems" to 10L,
          "read" to false,
          "claimed" to false,
          "createdAt" to FieldValue.serverTimestamp(),
          "updatedAt" to FieldValue.serverTimestamp(),
        ),
      )

      val shibaMsgRef = userRef.collection("inbox").document("shiba_companion")
      batch.set(
        shibaMsgRef,
        mapOf(
          "senderUid" to uid,
          "senderName" to "Maître Dojo",
          "title" to "Compagnon Shiba Ninja prêt",
          "body" to "Votre Shiba fidèle court à vos côtés. Récupérez ce bonus d'entraînement !",
          "type" to "system",
          "rewardCoins" to 150L,
          "rewardGems" to 5L,
          "read" to false,
          "claimed" to false,
          "createdAt" to FieldValue.serverTimestamp(),
          "updatedAt" to FieldValue.serverTimestamp(),
        ),
      )

      batch.commit().await()
      val createdSnap = userRef.get().await()
      val created =
        createdSnap.toObject(
          PlayerProfile::class.java,
          DocumentSnapshot.ServerTimestampBehavior.ESTIMATE,
        ) ?: newProfile
      Result.success(created)
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      handleFirestoreError(e, OperationType.WRITE, userRef.path)
      Result.failure(e)
    }
  }

  private suspend fun normalizeCyclesIfNeeded(profile: PlayerProfile): PlayerProfile {
    val today = currentDailyResetKey()
    val thisWeek = currentWeeklyResetKey()
    val needsDailyReset = profile.dailyMissionResetKey != today
    val needsWeeklyReset = profile.weeklyMissionResetKey != thisWeek
    val nowMs = System.currentTimeMillis()
    val multiplierExpired = profile.multiplierExpiresAt > 0L && profile.multiplierExpiresAt <= nowMs

    if (!needsDailyReset && !needsWeeklyReset && !multiplierExpired) {
      return profile
    }

    val updates = mutableMapOf<String, Any>("updatedAt" to FieldValue.serverTimestamp())
    if (needsDailyReset) {
      updates["dailyMissionCoins"] = 0L
      updates["dailyMissionCoinsClaimed"] = false
      updates["dailyMissionRuns"] = 0L
      updates["dailyMissionRunsClaimed"] = false
      updates["dailyMissionResetKey"] = today
    }
    if (needsWeeklyReset) {
      updates["weeklyMissionDistance"] = 0L
      updates["weeklyMissionDistanceClaimed"] = false
      updates["weeklyMissionJumps"] = 0L
      updates["weeklyMissionJumpsClaimed"] = false
      updates["weeklyMissionResetKey"] = thisWeek
    }
    if (multiplierExpired) {
      updates["activeMultiplier"] = 1L
      updates["multiplierExpiresAt"] = 0L
    }

    val userRef = db.collection("users").document(profile.uid)
    userRef.update(updates).await()
    return profile.copy(
      dailyMissionCoins = if (needsDailyReset) 0L else profile.dailyMissionCoins,
      dailyMissionCoinsClaimed = if (needsDailyReset) false else profile.dailyMissionCoinsClaimed,
      dailyMissionRuns = if (needsDailyReset) 0L else profile.dailyMissionRuns,
      dailyMissionRunsClaimed = if (needsDailyReset) false else profile.dailyMissionRunsClaimed,
      dailyMissionResetKey = if (needsDailyReset) today else profile.dailyMissionResetKey,
      weeklyMissionDistance = if (needsWeeklyReset) 0L else profile.weeklyMissionDistance,
      weeklyMissionDistanceClaimed =
        if (needsWeeklyReset) false else profile.weeklyMissionDistanceClaimed,
      weeklyMissionJumps = if (needsWeeklyReset) 0L else profile.weeklyMissionJumps,
      weeklyMissionJumpsClaimed = if (needsWeeklyReset) false else profile.weeklyMissionJumpsClaimed,
      weeklyMissionResetKey = if (needsWeeklyReset) thisWeek else profile.weeklyMissionResetKey,
      activeMultiplier = if (multiplierExpired) 1L else profile.activeMultiplier,
      multiplierExpiresAt = if (multiplierExpired) 0L else profile.multiplierExpiresAt,
    )
  }

  suspend fun getCurrentProfile(): Result<PlayerProfile> {
    val uid =
      try {
        requireUserId()
      } catch (e: Exception) {
        return Result.failure(e)
      }
    val ref = db.collection("users").document(uid)
    return try {
      val snap = ref.get().await()
      val profile =
        snap.toObject(
          PlayerProfile::class.java,
          DocumentSnapshot.ServerTimestampBehavior.ESTIMATE,
        )
      if (profile != null) {
        Result.success(normalizeCyclesIfNeeded(profile))
      } else {
        ensurePlayerInitialized()
      }
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      handleFirestoreError(e, OperationType.GET, ref.path)
      Result.failure(e)
    }
  }

  suspend fun updateDisplayName(newDisplayName: String): Result<PlayerProfile> {
    val uid =
      try {
        requireUserId()
      } catch (e: Exception) {
        return Result.failure(e)
      }
    val clean = sanitizeDisplayName(newDisplayName)
    val userRef = db.collection("users").document(uid)
    val lbRef = db.collection("leaderboard").document(uid)
    return try {
      val batch = db.batch()
      batch.update(
        userRef,
        mapOf(
          "displayName" to clean,
          "displayNameLower" to clean.lowercase(Locale.ROOT),
          "updatedAt" to FieldValue.serverTimestamp(),
        ),
      )
      batch.update(
        lbRef,
        mapOf(
          "displayName" to clean,
          "displayNameLower" to clean.lowercase(Locale.ROOT),
          "updatedAt" to FieldValue.serverTimestamp(),
        ),
      )
      batch.commit().await()
      getCurrentProfile()
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      handleFirestoreError(e, OperationType.UPDATE, userRef.path)
      Result.failure(e)
    }
  }

  suspend fun equipLoadout(heroId: String, companionId: String): Result<PlayerProfile> {
    val uid =
      try {
        requireUserId()
      } catch (e: Exception) {
        return Result.failure(e)
      }
    val profile = getCurrentProfile().getOrElse { return Result.failure(it) }
    if (!profile.unlockedHeroIds.contains(heroId)) {
      return Result.failure(IllegalArgumentException("Héros non débloqué : $heroId"))
    }
    if (!profile.unlockedCompanionIds.contains(companionId)) {
      return Result.failure(IllegalArgumentException("Compagnon non débloqué : $companionId"))
    }

    val userRef = db.collection("users").document(uid)
    val lbRef = db.collection("leaderboard").document(uid)
    return try {
      val batch = db.batch()
      batch.update(
        userRef,
        mapOf(
          "equippedHeroId" to heroId,
          "equippedCompanionId" to companionId,
          "updatedAt" to FieldValue.serverTimestamp(),
        ),
      )
      batch.update(
        lbRef,
        mapOf(
          "equippedHeroId" to heroId,
          "equippedCompanionId" to companionId,
          "updatedAt" to FieldValue.serverTimestamp(),
        ),
      )
      batch.commit().await()
      getCurrentProfile()
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      handleFirestoreError(e, OperationType.UPDATE, userRef.path)
      Result.failure(e)
    }
  }

  suspend fun claimFreeChest(): Result<ChestRewardResult> {
    val uid =
      try {
        requireUserId()
      } catch (e: Exception) {
        return Result.failure(e)
      }
    val profile = getCurrentProfile().getOrElse { return Result.failure(it) }
    val nowMs = System.currentTimeMillis()
    if (profile.nextFreeChestAt > nowMs) {
      return Result.failure(IllegalStateException("Coffre gratuit pas encore prêt."))
    }

    val rewardCoins = 250L + (profile.level * 25L).coerceAtMost(500L)
    val rewardGems = 12L
    val rewardXp = 180L
    val nextChestAt = nowMs + FREE_CHEST_COOLDOWN_MS

    val (newLevel, newXp, newXpToNext) =
      applyAccountXp(profile.level, profile.xp + rewardXp, profile.xpToNextLevel)

    val userRef = db.collection("users").document(uid)
    val lbRef = db.collection("leaderboard").document(uid)
    return try {
      val batch = db.batch()
      batch.update(
        userRef,
        mapOf(
          "coins" to (profile.coins + rewardCoins),
          "gems" to (profile.gems + rewardGems),
          "level" to newLevel,
          "xp" to newXp,
          "xpToNextLevel" to newXpToNext,
          "nextFreeChestAt" to nextChestAt,
          "updatedAt" to FieldValue.serverTimestamp(),
        ),
      )
      batch.update(
        lbRef,
        mapOf(
          "level" to newLevel,
          "updatedAt" to FieldValue.serverTimestamp(),
        ),
      )
      batch.commit().await()
      Result.success(ChestRewardResult(rewardCoins, rewardGems, rewardXp, nextChestAt))
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      handleFirestoreError(e, OperationType.UPDATE, userRef.path)
      Result.failure(e)
    }
  }

  suspend fun recordRunResult(
    score: Long,
    distance: Long,
    coinsEarned: Long,
    sakuraTokensEarned: Long,
    jumps: Long,
    slides: Long,
    consumedMagnet: Boolean = false,
    consumedShield: Boolean = false,
    consumedMultiplier: Boolean = false,
    consumedHeadStart: Boolean = false,
  ): Result<PlayerProfile> {
    val uid =
      try {
        requireUserId()
      } catch (e: Exception) {
        return Result.failure(e)
      }
    val profile = getCurrentProfile().getOrElse { return Result.failure(it) }
    val safeScore = score.coerceAtLeast(0L)
    val safeDistance = distance.coerceAtLeast(0L)
    val safeCoins = coinsEarned.coerceAtLeast(0L)
    val safeSakura = sakuraTokensEarned.coerceAtLeast(0L)
    val safeJumps = jumps.coerceAtLeast(0L)
    val safeSlides = slides.coerceAtLeast(0L)

    val earnedXp = (safeDistance / 8L + safeCoins * 2L + 60L).coerceAtLeast(40L)
    val (newLevel, newXp, newXpToNext) =
      applyAccountXp(profile.level, profile.xp + earnedXp, profile.xpToNextLevel)

    val earnedSeasonXp = (safeDistance / 12L + safeSakura * 5L + 25L).coerceAtLeast(20L)
    val (newSeasonLevel, newSeasonXp) =
      applySeasonXp(profile.seasonLevel, profile.seasonXp + earnedSeasonXp)

    val newBestScore = maxOf(profile.bestScore, safeScore)
    val newTotalDistance = profile.totalDistance + safeDistance
    val newTotalRuns = profile.totalRuns + 1L
    val newCoins = profile.coins + safeCoins
    val newTotalCoins = profile.totalCoinsCollected + safeCoins
    val newDailyCoins = profile.dailyMissionCoins + safeCoins
    val newDailyRuns = profile.dailyMissionRuns + 1L
    val newWeeklyDist = profile.weeklyMissionDistance + safeDistance
    val newWeeklyJumps = profile.weeklyMissionJumps + safeJumps

    val newMagnets = if (consumedMagnet && profile.inventoryMagnets > 0) profile.inventoryMagnets - 1 else profile.inventoryMagnets
    val newShields = if (consumedShield && profile.inventoryShields > 0) profile.inventoryShields - 1 else profile.inventoryShields
    val newMultipliers =
      if (consumedMultiplier && profile.inventoryMultipliers > 0) profile.inventoryMultipliers - 1
      else profile.inventoryMultipliers
    val newHeadStarts =
      if (consumedHeadStart && profile.inventoryHeadStarts > 0) profile.inventoryHeadStarts - 1
      else profile.inventoryHeadStarts

    val nowMs = System.currentTimeMillis()
    val newActiveMult: Long
    val newMultExpiry: Long
    if (consumedMultiplier) {
      newActiveMult = 5L
      newMultExpiry = nowMs + MULTIPLIER_DURATION_MS
    } else if (profile.multiplierExpiresAt > nowMs) {
      newActiveMult = profile.activeMultiplier
      newMultExpiry = profile.multiplierExpiresAt
    } else {
      newActiveMult = 1L
      newMultExpiry = 0L
    }

    val updatedCollection = profile.collectionIds.toMutableSet()
    if (newTotalDistance >= 500L) updatedCollection.add("card_torii_sanctuary")
    if (safeSakura >= 5L || profile.eventSakuraTokens + safeSakura >= 20L) {
      updatedCollection.add("card_sakura_express")
    }
    if (newBestScore >= 5000L) updatedCollection.add("card_fuji_dawn")

    val userRef = db.collection("users").document(uid)
    val lbRef = db.collection("leaderboard").document(uid)
    return try {
      val batch = db.batch()
      batch.update(
        userRef,
        mapOf(
          "level" to newLevel,
          "xp" to newXp,
          "xpToNextLevel" to newXpToNext,
          "coins" to newCoins,
          "bestScore" to newBestScore,
          "totalDistance" to newTotalDistance,
          "totalRuns" to newTotalRuns,
          "totalCoinsCollected" to newTotalCoins,
          "activeMultiplier" to newActiveMult,
          "multiplierExpiresAt" to newMultExpiry,
          "inventoryMagnets" to newMagnets,
          "inventoryShields" to newShields,
          "inventoryMultipliers" to newMultipliers,
          "inventoryHeadStarts" to newHeadStarts,
          "collectionIds" to updatedCollection.toList().take(64),
          "seasonLevel" to newSeasonLevel,
          "seasonXp" to newSeasonXp,
          "eventSakuraTokens" to (profile.eventSakuraTokens + safeSakura),
          "dailyMissionCoins" to newDailyCoins,
          "dailyMissionRuns" to newDailyRuns,
          "weeklyMissionDistance" to newWeeklyDist,
          "weeklyMissionJumps" to newWeeklyJumps,
          "totalJumps" to (profile.totalJumps + safeJumps),
          "totalSlides" to (profile.totalSlides + safeSlides),
          "updatedAt" to FieldValue.serverTimestamp(),
        ),
      )
      batch.update(
        lbRef,
        mapOf(
          "level" to newLevel,
          "bestScore" to newBestScore,
          "updatedAt" to FieldValue.serverTimestamp(),
        ),
      )
      batch.commit().await()
      getCurrentProfile()
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      handleFirestoreError(e, OperationType.UPDATE, userRef.path)
      Result.failure(e)
    }
  }

  suspend fun purchaseShopItem(
    itemType: String,
    itemId: String,
    currency: String,
    cost: Long,
  ): Result<PlayerProfile> {
    val uid =
      try {
        requireUserId()
      } catch (e: Exception) {
        return Result.failure(e)
      }
    if (cost < 0L) return Result.failure(IllegalArgumentException("Prix invalide"))
    val profile = getCurrentProfile().getOrElse { return Result.failure(it) }

    val newCoins: Long
    val newGems: Long
    when (currency) {
      "coins" -> {
        if (profile.coins < cost) return Result.failure(IllegalStateException("Pièces insuffisantes"))
        newCoins = profile.coins - cost
        newGems = profile.gems
      }
      "gems" -> {
        if (profile.gems < cost) return Result.failure(IllegalStateException("Gemmes insuffisantes"))
        newCoins = profile.coins
        newGems = profile.gems - cost
      }
      else -> return Result.failure(IllegalArgumentException("Monnaie inconnue: $currency"))
    }

    val updates =
      mutableMapOf<String, Any>(
        "coins" to newCoins,
        "gems" to newGems,
        "updatedAt" to FieldValue.serverTimestamp(),
      )
    val lbUpdates = mutableMapOf<String, Any>()

    when (itemType) {
      "hero" -> {
        val set = profile.unlockedHeroIds.toMutableSet()
        set.add(itemId)
        updates["unlockedHeroIds"] = set.toList()
        updates["equippedHeroId"] = itemId
        lbUpdates["equippedHeroId"] = itemId
      }
      "companion" -> {
        val set = profile.unlockedCompanionIds.toMutableSet()
        set.add(itemId)
        updates["unlockedCompanionIds"] = set.toList()
        updates["equippedCompanionId"] = itemId
        lbUpdates["equippedCompanionId"] = itemId
      }
      "consumable" -> {
        when (itemId) {
          "magnet" -> updates["inventoryMagnets"] = profile.inventoryMagnets + 1L
          "shield" -> updates["inventoryShields"] = profile.inventoryShields + 1L
          "multiplier_x5" -> updates["inventoryMultipliers"] = profile.inventoryMultipliers + 1L
          "headstart" -> updates["inventoryHeadStarts"] = profile.inventoryHeadStarts + 1L
          "activate_x5_now" -> {
            updates["activeMultiplier"] = 5L
            updates["multiplierExpiresAt"] = System.currentTimeMillis() + MULTIPLIER_DURATION_MS
          }
          else -> return Result.failure(IllegalArgumentException("Consommable inconnu: $itemId"))
        }
      }
      "chest" -> {
        val bonusCoins = if (itemId == "sakura_chest") 800L else 350L
        val bonusGems = if (itemId == "sakura_chest") 30L else 0L
        updates["coins"] = newCoins + bonusCoins
        updates["gems"] = newGems + bonusGems
        updates["inventoryMagnets"] = profile.inventoryMagnets + 1L
        updates["inventoryShields"] = profile.inventoryShields + 1L
      }
      else -> return Result.failure(IllegalArgumentException("Type inconnu: $itemType"))
    }

    val userRef = db.collection("users").document(uid)
    val lbRef = db.collection("leaderboard").document(uid)
    return try {
      val batch = db.batch()
      batch.update(userRef, updates)
      if (lbUpdates.isNotEmpty()) {
        lbUpdates["updatedAt"] = FieldValue.serverTimestamp()
        batch.update(lbRef, lbUpdates)
      }
      batch.commit().await()
      getCurrentProfile()
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      handleFirestoreError(e, OperationType.UPDATE, userRef.path)
      Result.failure(e)
    }
  }

  suspend fun activateMultiplierBoost(): Result<PlayerProfile> {
    val uid =
      try {
        requireUserId()
      } catch (e: Exception) {
        return Result.failure(e)
      }
    val profile = getCurrentProfile().getOrElse { return Result.failure(it) }
    if (profile.inventoryMultipliers <= 0L) {
      return Result.failure(IllegalStateException("Aucun multiplicateur x5 en inventaire"))
    }
    val userRef = db.collection("users").document(uid)
    return try {
      userRef
        .update(
          mapOf(
            "inventoryMultipliers" to (profile.inventoryMultipliers - 1L),
            "activeMultiplier" to 5L,
            "multiplierExpiresAt" to (System.currentTimeMillis() + MULTIPLIER_DURATION_MS),
            "updatedAt" to FieldValue.serverTimestamp(),
          )
        )
        .await()
      getCurrentProfile()
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      handleFirestoreError(e, OperationType.UPDATE, userRef.path)
      Result.failure(e)
    }
  }

  suspend fun claimMission(missionId: String): Result<PlayerProfile> {
    val uid =
      try {
        requireUserId()
      } catch (e: Exception) {
        return Result.failure(e)
      }
    val profile = getCurrentProfile().getOrElse { return Result.failure(it) }
    val updates = mutableMapOf<String, Any>("updatedAt" to FieldValue.serverTimestamp())
    var rewardCoins = 0L
    var rewardGems = 0L
    var rewardSeasonXp = 0L

    when (missionId) {
      "daily_coins" -> {
        if (profile.dailyMissionCoinsClaimed || profile.dailyMissionCoins < 500L) {
          return Result.failure(IllegalStateException("Mission non réclamable"))
        }
        updates["dailyMissionCoinsClaimed"] = true
        rewardCoins = 1000L
        rewardSeasonXp = 40L
      }
      "daily_runs" -> {
        if (profile.dailyMissionRunsClaimed || profile.dailyMissionRuns < 3L) {
          return Result.failure(IllegalStateException("Mission non réclamable"))
        }
        updates["dailyMissionRunsClaimed"] = true
        rewardCoins = 600L
        rewardGems = 10L
        rewardSeasonXp = 50L
      }
      "weekly_distance" -> {
        if (profile.weeklyMissionDistanceClaimed || profile.weeklyMissionDistance < 5000L) {
          return Result.failure(IllegalStateException("Mission hebdo non réclamable"))
        }
        updates["weeklyMissionDistanceClaimed"] = true
        rewardGems = 50L
        rewardSeasonXp = 100L
      }
      "weekly_jumps" -> {
        if (profile.weeklyMissionJumpsClaimed || profile.weeklyMissionJumps < 60L) {
          return Result.failure(IllegalStateException("Mission hebdo non réclamable"))
        }
        updates["weeklyMissionJumpsClaimed"] = true
        rewardCoins = 1500L
        rewardGems = 20L
        rewardSeasonXp = 80L
      }
      else -> return Result.failure(IllegalArgumentException("Mission inconnue: $missionId"))
    }

    val (sLevel, sXp) = applySeasonXp(profile.seasonLevel, profile.seasonXp + rewardSeasonXp)
    updates["coins"] = profile.coins + rewardCoins
    updates["gems"] = profile.gems + rewardGems
    updates["seasonLevel"] = sLevel
    updates["seasonXp"] = sXp

    val userRef = db.collection("users").document(uid)
    return try {
      userRef.update(updates).await()
      getCurrentProfile()
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      handleFirestoreError(e, OperationType.UPDATE, userRef.path)
      Result.failure(e)
    }
  }

  suspend fun claimSeasonTier(tier: Long): Result<PlayerProfile> {
    val uid =
      try {
        requireUserId()
      } catch (e: Exception) {
        return Result.failure(e)
      }
    val profile = getCurrentProfile().getOrElse { return Result.failure(it) }
    if (tier < 1L || tier > profile.seasonLevel || profile.claimedSeasonTiers.contains(tier)) {
      return Result.failure(IllegalStateException("Palier Saison non réclamable"))
    }

    val coinsReward = if (tier % 2L == 1L) 300L + tier * 50L else 0L
    val gemsReward = if (tier % 2L == 0L) 15L + tier * 2L else 5L
    val claimed = (profile.claimedSeasonTiers + tier).distinct().take(100)

    val updates =
      mutableMapOf<String, Any>(
        "claimedSeasonTiers" to claimed,
        "coins" to (profile.coins + coinsReward),
        "gems" to (profile.gems + gemsReward),
        "updatedAt" to FieldValue.serverTimestamp(),
      )
    if (tier == 5L) {
      updates["inventoryMultipliers"] = profile.inventoryMultipliers + 1L
    }

    val userRef = db.collection("users").document(uid)
    return try {
      userRef.update(updates).await()
      getCurrentProfile()
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      handleFirestoreError(e, OperationType.UPDATE, userRef.path)
      Result.failure(e)
    }
  }

  suspend fun claimEventMilestone(milestoneId: String): Result<PlayerProfile> {
    val uid =
      try {
        requireUserId()
      } catch (e: Exception) {
        return Result.failure(e)
      }
    val profile = getCurrentProfile().getOrElse { return Result.failure(it) }
    if (profile.claimedEventMilestones.contains(milestoneId)) {
      return Result.failure(IllegalStateException("Palier déjà réclamé"))
    }

    val (requiredTokens, rewardCoins, rewardGems, rewardCollection) =
      when (milestoneId) {
        "sakura_15" -> Quad(15L, 400L, 10L, null)
        "sakura_40" -> Quad(40L, 800L, 25L, null)
        "sakura_80" -> Quad(80L, 1500L, 50L, "card_sakura_spirit")
        else -> return Result.failure(IllegalArgumentException("Palier inconnu"))
      }

    if (profile.eventSakuraTokens < requiredTokens) {
      return Result.failure(IllegalStateException("Jetons Sakura insuffisants"))
    }

    val collections = profile.collectionIds.toMutableSet()
    if (rewardCollection != null) collections.add(rewardCollection)

    val userRef = db.collection("users").document(uid)
    return try {
      userRef
        .update(
          mapOf(
            "claimedEventMilestones" to (profile.claimedEventMilestones + milestoneId).distinct(),
            "coins" to (profile.coins + rewardCoins),
            "gems" to (profile.gems + rewardGems),
            "collectionIds" to collections.toList().take(64),
            "updatedAt" to FieldValue.serverTimestamp(),
          )
        )
        .await()
      getCurrentProfile()
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      handleFirestoreError(e, OperationType.UPDATE, userRef.path)
      Result.failure(e)
    }
  }

  suspend fun claimAchievement(achievementId: String): Result<PlayerProfile> {
    val uid =
      try {
        requireUserId()
      } catch (e: Exception) {
        return Result.failure(e)
      }
    val profile = getCurrentProfile().getOrElse { return Result.failure(it) }
    if (profile.claimedAchievementIds.contains(achievementId)) {
      return Result.failure(IllegalStateException("Succès déjà réclamé"))
    }

    val (unlocked, rewardGems, rewardXp) =
      when (achievementId) {
        "first_run" -> Triple(profile.totalRuns >= 1L, 15L, 150L)
        "distance_1km" -> Triple(profile.totalDistance >= 1000L, 25L, 250L)
        "coins_1000" -> Triple(profile.totalCoinsCollected >= 1000L, 30L, 300L)
        "acrobat_50" -> Triple((profile.totalJumps + profile.totalSlides) >= 50L, 35L, 350L)
        "score_10k" -> Triple(profile.bestScore >= 10000L, 50L, 500L)
        else -> return Result.failure(IllegalArgumentException("Succès inconnu: $achievementId"))
      }

    if (!unlocked) {
      return Result.failure(IllegalStateException("Condition du succès non atteinte"))
    }

    val (newLevel, newXp, newXpToNext) =
      applyAccountXp(profile.level, profile.xp + rewardXp, profile.xpToNextLevel)

    val userRef = db.collection("users").document(uid)
    val lbRef = db.collection("leaderboard").document(uid)
    return try {
      val batch = db.batch()
      batch.update(
        userRef,
        mapOf(
          "claimedAchievementIds" to (profile.claimedAchievementIds + achievementId).distinct(),
          "gems" to (profile.gems + rewardGems),
          "level" to newLevel,
          "xp" to newXp,
          "xpToNextLevel" to newXpToNext,
          "updatedAt" to FieldValue.serverTimestamp(),
        ),
      )
      batch.update(
        lbRef,
        mapOf("level" to newLevel, "updatedAt" to FieldValue.serverTimestamp()),
      )
      batch.commit().await()
      getCurrentProfile()
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      handleFirestoreError(e, OperationType.UPDATE, userRef.path)
      Result.failure(e)
    }
  }

  private fun applyAccountXp(level: Long, xp: Long, xpToNext: Long): Triple<Long, Long, Long> {
    var curLvl = level.coerceAtLeast(1L)
    var curXp = xp.coerceAtLeast(0L)
    var curReq = xpToNext.coerceAtLeast(100L)
    while (curXp >= curReq && curLvl < 999L) {
      curXp -= curReq
      curLvl += 1L
      curReq = 1000L + (curLvl - 1L) * 400L
    }
    return Triple(curLvl, curXp, curReq)
  }

  private fun applySeasonXp(seasonLevel: Long, seasonXp: Long): Pair<Long, Long> {
    var curLvl = seasonLevel.coerceAtLeast(1L)
    var curXp = seasonXp.coerceAtLeast(0L)
    while (curXp >= 100L && curLvl < 100L) {
      curXp -= 100L
      curLvl += 1L
    }
    return curLvl to curXp
  }

  private data class Quad<A, B, C, D>(val first: A, val second: B, val third: C, val fourth: D)

  companion object {
    const val FREE_CHEST_COOLDOWN_MS = 4L * 60L * 60L * 1000L
    const val MULTIPLIER_DURATION_MS = 15L * 60L * 1000L
  }
}
