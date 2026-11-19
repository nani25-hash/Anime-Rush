package com.example.data.local

import android.content.Context
import androidx.room.withTransaction
import com.example.data.model.ChestRewardResult
import com.example.data.model.GachaDrawResult
import com.example.data.model.InboxMessage
import com.example.data.model.LeaderboardEntry
import com.example.data.model.LoginRewardResult
import com.example.data.model.PlayerProfile
import com.example.data.model.RushWordResult
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlin.random.Random
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class LocalGameRepository(private val db: AnimeRushDatabase) {
  constructor(context: Context) : this(AnimeRushDatabase.getInstance(context))

  private val dao: LocalGameDao = db.localGameDao()

  private fun sanitizeDisplayName(raw: String?): String {
    val trimmed = raw?.trim().orEmpty().replace(Regex("\\s+"), " ")
    val safe = if (trimmed.isEmpty()) "RyuPlayer" else trimmed
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

  fun observeProfile(): Flow<PlayerProfile?> =
    dao.observeProfile().map { entity -> entity?.toPlayerProfile() }

  suspend fun ensurePlayerInitialized(): Result<PlayerProfile> {
    return try {
      val profile =
        db.withTransaction {
          val existing = dao.getProfile()
          if (existing != null) {
            normalizeCyclesLocked(existing).toPlayerProfile()
          } else {
            val nowMs = System.currentTimeMillis()
            val fresh =
              LocalProfileEntity(
                id = LOCAL_PLAYER_ID,
                uid = LOCAL_PLAYER_ID,
                displayName = "RyuPlayer",
                displayNameLower = "ryuplayer",
                dailyMissionResetKey = currentDailyResetKey(),
                weeklyMissionResetKey = currentWeeklyResetKey(),
                rushResetKey = currentDailyResetKey(),
                updatedAtMs = nowMs,
              )
            dao.upsertProfile(fresh)
            dao.insertInboxMessages(
              listOf(
                LocalInboxEntity(
                  id = "welcome_gift",
                  senderUid = LOCAL_PLAYER_ID,
                  senderName = "Sanctuaire Anime Rush",
                  title = "Bienvenue à Tokyo Sakura !",
                  body =
                    "Voici votre pack de bienvenue pour démarrer sur les rails avec Ryu & Shiba.",
                  type = "reward",
                  rewardCoins = 300L,
                  rewardGems = 10L,
                  read = false,
                  claimed = false,
                  createdAtMs = nowMs,
                ),
                LocalInboxEntity(
                  id = "shiba_companion",
                  senderUid = LOCAL_PLAYER_ID,
                  senderName = "Maître Dojo",
                  title = "Compagnon Shiba Ninja prêt",
                  body =
                    "Votre Shiba fidèle court à vos côtés. Récupérez ce bonus d'entraînement !",
                  type = "system",
                  rewardCoins = 150L,
                  rewardGems = 5L,
                  read = false,
                  claimed = false,
                  createdAtMs = nowMs - 1000L,
                ),
              )
            )
            fresh.toPlayerProfile()
          }
        }
      Result.success(profile)
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  private suspend fun normalizeCyclesLocked(entity: LocalProfileEntity): LocalProfileEntity {
    val today = currentDailyResetKey()
    val thisWeek = currentWeeklyResetKey()
    val needsDailyReset = entity.dailyMissionResetKey != today
    val needsRushReset = entity.rushResetKey != today
    val needsWeeklyReset = entity.weeklyMissionResetKey != thisWeek
    val nowMs = System.currentTimeMillis()
    val multiplierExpired = entity.multiplierExpiresAt > 0L && entity.multiplierExpiresAt <= nowMs
    val seasonOutOfBounds = entity.seasonLevel < 1L || entity.seasonLevel > MAX_SEASON_TIER

    if (!needsDailyReset && !needsRushReset && !needsWeeklyReset && !multiplierExpired && !seasonOutOfBounds) {
      return entity
    }

    val clampedSeasonLevel = entity.seasonLevel.coerceIn(1L, MAX_SEASON_TIER)
    val clampedSeasonXp =
      if (entity.seasonLevel > MAX_SEASON_TIER) 100L else entity.seasonXp.coerceIn(0L, 100L)

    val updated =
      entity.copy(
        dailyMissionCoins = if (needsDailyReset) 0L else entity.dailyMissionCoins,
        dailyMissionCoinsClaimed =
          if (needsDailyReset) false else entity.dailyMissionCoinsClaimed,
        dailyMissionRuns = if (needsDailyReset) 0L else entity.dailyMissionRuns,
        dailyMissionRunsClaimed = if (needsDailyReset) false else entity.dailyMissionRunsClaimed,
        dailyNearMisses = if (needsDailyReset) 0L else entity.dailyNearMisses,
        dailyNearMissesClaimed =
          if (needsDailyReset) false else entity.dailyNearMissesClaimed,
        dailyShibaUses = if (needsDailyReset) 0L else entity.dailyShibaUses,
        dailyShibaUsesClaimed = if (needsDailyReset) false else entity.dailyShibaUsesClaimed,
        dailyMissionResetKey = if (needsDailyReset) today else entity.dailyMissionResetKey,
        weeklyMissionDistance = if (needsWeeklyReset) 0L else entity.weeklyMissionDistance,
        weeklyMissionDistanceClaimed =
          if (needsWeeklyReset) false else entity.weeklyMissionDistanceClaimed,
        weeklyMissionJumps = if (needsWeeklyReset) 0L else entity.weeklyMissionJumps,
        weeklyMissionJumpsClaimed =
          if (needsWeeklyReset) false else entity.weeklyMissionJumpsClaimed,
        weeklyCarDistance = if (needsWeeklyReset) 0L else entity.weeklyCarDistance,
        weeklyCarDistanceClaimed =
          if (needsWeeklyReset) false else entity.weeklyCarDistanceClaimed,
        weeklyTrainJumps = if (needsWeeklyReset) 0L else entity.weeklyTrainJumps,
        weeklyTrainJumpsClaimed =
          if (needsWeeklyReset) false else entity.weeklyTrainJumpsClaimed,
        weeklyMissionResetKey = if (needsWeeklyReset) thisWeek else entity.weeklyMissionResetKey,
        rushLettersMask = if (needsRushReset) 0 else entity.rushLettersMask,
        rushResetKey = if (needsRushReset) today else entity.rushResetKey,
        activeMultiplier = if (multiplierExpired) 1L else entity.activeMultiplier,
        multiplierExpiresAt = if (multiplierExpired) 0L else entity.multiplierExpiresAt,
        seasonLevel = clampedSeasonLevel,
        seasonXp = clampedSeasonXp,
        updatedAtMs = nowMs,
      )
    dao.upsertProfile(updated)
    return updated
  }

  private suspend fun getNormalizedEntityOrThrow(): LocalProfileEntity {
    val existing = dao.getProfile()
    if (existing != null) {
      return normalizeCyclesLocked(existing)
    }
    ensurePlayerInitialized().getOrThrow()
    return dao.getProfile() ?: throw IllegalStateException("Profil local introuvable")
  }

  suspend fun getCurrentProfile(): Result<PlayerProfile> {
    return try {
      val profile = db.withTransaction { getNormalizedEntityOrThrow().toPlayerProfile() }
      Result.success(profile)
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun updateDisplayName(newDisplayName: String): Result<PlayerProfile> {
    return try {
      val clean = sanitizeDisplayName(newDisplayName)
      val updated =
        db.withTransaction {
          val current = getNormalizedEntityOrThrow()
          val next =
            current.copy(
              displayName = clean,
              displayNameLower = clean.lowercase(Locale.ROOT),
              updatedAtMs = System.currentTimeMillis(),
            )
          dao.upsertProfile(next)
          next.toPlayerProfile()
        }
      Result.success(updated)
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun equipLoadout(heroId: String, companionId: String): Result<PlayerProfile> {
    return try {
      val updated =
        db.withTransaction {
          val current = getNormalizedEntityOrThrow()
          val profile = current.toPlayerProfile()
          if (!profile.unlockedHeroIds.contains(heroId)) {
            throw IllegalArgumentException("Héros non débloqué : $heroId")
          }
          if (!profile.unlockedCompanionIds.contains(companionId)) {
            throw IllegalArgumentException("Compagnon non débloqué : $companionId")
          }
          val next =
            current.copy(
              equippedHeroId = heroId,
              equippedCompanionId = companionId,
              updatedAtMs = System.currentTimeMillis(),
            )
          dao.upsertProfile(next)
          next.toPlayerProfile()
        }
      Result.success(updated)
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun equipCar(carId: String): Result<PlayerProfile> {
    return try {
      val updated =
        db.withTransaction {
          val current = getNormalizedEntityOrThrow()
          val profile = current.toPlayerProfile()
          if (!profile.unlockedCarIds.contains(carId)) {
            throw IllegalArgumentException("Voiture non débloquée : $carId")
          }
          val next =
            current.copy(
              equippedCarId = carId,
              updatedAtMs = System.currentTimeMillis(),
            )
          dao.upsertProfile(next)
          next.toPlayerProfile()
        }
      Result.success(updated)
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun claimFreeChest(): Result<ChestRewardResult> {
    return try {
      val result =
        db.withTransaction {
          val current = getNormalizedEntityOrThrow()
          val nowMs = System.currentTimeMillis()
          if (current.nextFreeChestAt > nowMs) {
            throw IllegalStateException("Coffre gratuit pas encore prêt.")
          }

          val rewardCoins = 250L + (current.level * 25L).coerceAtMost(500L)
          val rewardGems = 12L
          val rewardXp = 180L
          val nextChestAt = nowMs + FREE_CHEST_COOLDOWN_MS

          val (newLevel, newXp, newXpToNext) =
            applyAccountXp(current.level, current.xp + rewardXp, current.xpToNextLevel)

          val next =
            current.copy(
              coins = current.coins + rewardCoins,
              gems = current.gems + rewardGems,
              level = newLevel,
              xp = newXp,
              xpToNextLevel = newXpToNext,
              nextFreeChestAt = nextChestAt,
              updatedAtMs = nowMs,
            )
          dao.upsertProfile(next)
          ChestRewardResult(rewardCoins, rewardGems, rewardXp, nextChestAt)
        }
      Result.success(result)
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
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
    nearMisses: Long = 0L,
    shibaActivations: Long = 0L,
    carDistance: Long = 0L,
    trainJumps: Long = 0L,
    rushLettersMaskEarned: Int = 0,
  ): Result<PlayerProfile> {
    return try {
      val updated =
        db.withTransaction {
          val current = getNormalizedEntityOrThrow()
          val profile = current.toPlayerProfile()

          val safeScore = score.coerceAtLeast(0L)
          val safeDistance = distance.coerceAtLeast(0L)
          val safeCoins = coinsEarned.coerceAtLeast(0L)
          val safeSakura = sakuraTokensEarned.coerceAtLeast(0L)
          val safeJumps = jumps.coerceAtLeast(0L)
          val safeSlides = slides.coerceAtLeast(0L)
          val safeNearMisses = nearMisses.coerceAtLeast(0L)
          val safeShibaUses = shibaActivations.coerceAtLeast(0L)
          val safeCarDist = carDistance.coerceAtLeast(0L)
          val safeTrainJumps = trainJumps.coerceAtLeast(0L)
          val safeRushMask = profile.rushLettersMask or (rushLettersMaskEarned and 0x0F)

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
          val newDailyNearMisses = profile.dailyNearMisses + safeNearMisses
          val newDailyShibaUses = profile.dailyShibaUses + safeShibaUses
          val newWeeklyDist = profile.weeklyMissionDistance + safeDistance
          val newWeeklyJumps = profile.weeklyMissionJumps + safeJumps
          val newWeeklyCarDist = profile.weeklyCarDistance + safeCarDist
          val newWeeklyTrainJumps = profile.weeklyTrainJumps + safeTrainJumps

          val newMagnets =
            if (consumedMagnet && profile.inventoryMagnets > 0) profile.inventoryMagnets - 1
            else profile.inventoryMagnets
          val newShields =
            if (consumedShield && profile.inventoryShields > 0) profile.inventoryShields - 1
            else profile.inventoryShields
          val newMultipliers =
            if (consumedMultiplier && profile.inventoryMultipliers > 0) {
              profile.inventoryMultipliers - 1
            } else {
              profile.inventoryMultipliers
            }
          val newHeadStarts =
            if (consumedHeadStart && profile.inventoryHeadStarts > 0) {
              profile.inventoryHeadStarts - 1
            } else {
              profile.inventoryHeadStarts
            }

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

          val next =
            current.copy(
              level = newLevel,
              xp = newXp,
              xpToNextLevel = newXpToNext,
              coins = newCoins,
              bestScore = newBestScore,
              totalDistance = newTotalDistance,
              totalRuns = newTotalRuns,
              totalCoinsCollected = newTotalCoins,
              activeMultiplier = newActiveMult,
              multiplierExpiresAt = newMultExpiry,
              inventoryMagnets = newMagnets,
              inventoryShields = newShields,
              inventoryMultipliers = newMultipliers,
              inventoryHeadStarts = newHeadStarts,
              collectionIdsJson =
                LocalProfileEntity.encodeStringList(updatedCollection.toList().take(64)),
              seasonLevel = newSeasonLevel,
              seasonXp = newSeasonXp,
              eventSakuraTokens = profile.eventSakuraTokens + safeSakura,
              dailyMissionCoins = newDailyCoins,
              dailyMissionRuns = newDailyRuns,
              dailyNearMisses = newDailyNearMisses,
              dailyShibaUses = newDailyShibaUses,
              weeklyMissionDistance = newWeeklyDist,
              weeklyMissionJumps = newWeeklyJumps,
              weeklyCarDistance = newWeeklyCarDist,
              weeklyTrainJumps = newWeeklyTrainJumps,
              totalJumps = profile.totalJumps + safeJumps,
              totalSlides = profile.totalSlides + safeSlides,
              rushLettersMask = safeRushMask,
              updatedAtMs = nowMs,
            )
          dao.upsertProfile(next)
          next.toPlayerProfile()
        }
      Result.success(updated)
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun purchaseShopItem(
    itemType: String,
    itemId: String,
    currency: String,
    cost: Long,
  ): Result<PlayerProfile> {
    if (cost < 0L) return Result.failure(IllegalArgumentException("Prix invalide"))
    return try {
      val updated =
        db.withTransaction {
          val current = getNormalizedEntityOrThrow()
          val profile = current.toPlayerProfile()

          var newCoins: Long
          var newGems: Long
          when (currency) {
            "coins" -> {
              if (profile.coins < cost) throw IllegalStateException("Pièces insuffisantes")
              newCoins = profile.coins - cost
              newGems = profile.gems
            }
            "gems" -> {
              if (profile.gems < cost) throw IllegalStateException("Gemmes insuffisantes")
              newCoins = profile.coins
              newGems = profile.gems - cost
            }
            else -> throw IllegalArgumentException("Monnaie inconnue: $currency")
          }

          var unlockedHeroes = current.unlockedHeroIdsJson
          var equippedHero = current.equippedHeroId
          var unlockedCompanions = current.unlockedCompanionIdsJson
          var equippedCompanion = current.equippedCompanionId
          var unlockedCars = current.unlockedCarIdsJson
          var equippedCar = current.equippedCarId
          var magnets = profile.inventoryMagnets
          var shields = profile.inventoryShields
          var multipliers = profile.inventoryMultipliers
          var headStarts = profile.inventoryHeadStarts
          var activeMult = profile.activeMultiplier
          var multExpiresAt = profile.multiplierExpiresAt

          when (itemType) {
            "hero" -> {
              val set = profile.unlockedHeroIds.toMutableSet()
              set.add(itemId)
              unlockedHeroes = LocalProfileEntity.encodeStringList(set.toList())
              equippedHero = itemId
            }
            "companion" -> {
              val set = profile.unlockedCompanionIds.toMutableSet()
              set.add(itemId)
              unlockedCompanions = LocalProfileEntity.encodeStringList(set.toList())
              equippedCompanion = itemId
            }
            "car" -> {
              val set = profile.unlockedCarIds.toMutableSet()
              set.add(itemId)
              unlockedCars = LocalProfileEntity.encodeStringList(set.toList())
              equippedCar = itemId
            }
            "consumable" -> {
              when (itemId) {
                "magnet" -> magnets += 1L
                "shield" -> shields += 1L
                "multiplier_x5" -> multipliers += 1L
                "headstart" -> headStarts += 1L
                "activate_x5_now" -> {
                  activeMult = 5L
                  multExpiresAt = System.currentTimeMillis() + MULTIPLIER_DURATION_MS
                }
                else -> throw IllegalArgumentException("Consommable inconnu: $itemId")
              }
            }
            "chest" -> {
              val bonusCoins = if (itemId == "sakura_chest") 800L else 350L
              val bonusGems = if (itemId == "sakura_chest") 30L else 0L
              newCoins += bonusCoins
              newGems += bonusGems
              magnets += 1L
              shields += 1L
            }
            else -> throw IllegalArgumentException("Type inconnu: $itemType")
          }

          val next =
            current.copy(
              coins = newCoins,
              gems = newGems,
              unlockedHeroIdsJson = unlockedHeroes,
              equippedHeroId = equippedHero,
              unlockedCompanionIdsJson = unlockedCompanions,
              equippedCompanionId = equippedCompanion,
              unlockedCarIdsJson = unlockedCars,
              equippedCarId = equippedCar,
              inventoryMagnets = magnets,
              inventoryShields = shields,
              inventoryMultipliers = multipliers,
              inventoryHeadStarts = headStarts,
              activeMultiplier = activeMult,
              multiplierExpiresAt = multExpiresAt,
              updatedAtMs = System.currentTimeMillis(),
            )
          dao.upsertProfile(next)
          next.toPlayerProfile()
        }
      Result.success(updated)
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun activateMultiplierBoost(): Result<PlayerProfile> {
    return try {
      val updated =
        db.withTransaction {
          val current = getNormalizedEntityOrThrow()
          if (current.inventoryMultipliers <= 0L) {
            throw IllegalStateException("Aucun multiplicateur x5 en inventaire")
          }
          val nowMs = System.currentTimeMillis()
          val next =
            current.copy(
              inventoryMultipliers = current.inventoryMultipliers - 1L,
              activeMultiplier = 5L,
              multiplierExpiresAt = nowMs + MULTIPLIER_DURATION_MS,
              updatedAtMs = nowMs,
            )
          dao.upsertProfile(next)
          next.toPlayerProfile()
        }
      Result.success(updated)
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun claimMission(missionId: String): Result<PlayerProfile> {
    return try {
      val updated =
        db.withTransaction {
          val current = getNormalizedEntityOrThrow()
          var rewardCoins = 0L
          var rewardGems = 0L
          var rewardSeasonXp = 0L

          var dailyCoinsClaimed = current.dailyMissionCoinsClaimed
          var dailyRunsClaimed = current.dailyMissionRunsClaimed
          var dailyNearMissesClaimed = current.dailyNearMissesClaimed
          var dailyShibaUsesClaimed = current.dailyShibaUsesClaimed
          var weeklyDistanceClaimed = current.weeklyMissionDistanceClaimed
          var weeklyJumpsClaimed = current.weeklyMissionJumpsClaimed
          var weeklyCarDistClaimed = current.weeklyCarDistanceClaimed
          var weeklyTrainJumpsClaimed = current.weeklyTrainJumpsClaimed

          when (missionId) {
            "daily_coins" -> {
              if (current.dailyMissionCoinsClaimed || current.dailyMissionCoins < 500L) {
                throw IllegalStateException("Mission non réclamable")
              }
              dailyCoinsClaimed = true
              rewardCoins = 1000L
              rewardSeasonXp = 40L
            }
            "daily_runs" -> {
              if (current.dailyMissionRunsClaimed || current.dailyMissionRuns < 3L) {
                throw IllegalStateException("Mission non réclamable")
              }
              dailyRunsClaimed = true
              rewardCoins = 600L
              rewardGems = 10L
              rewardSeasonXp = 50L
            }
            "daily_nearmiss" -> {
              if (current.dailyNearMissesClaimed || current.dailyNearMisses < 8L) {
                throw IllegalStateException("Mission non réclamable")
              }
              dailyNearMissesClaimed = true
              rewardCoins = 900L
              rewardGems = 10L
              rewardSeasonXp = 50L
            }
            "daily_shiba" -> {
              if (current.dailyShibaUsesClaimed || current.dailyShibaUses < 3L) {
                throw IllegalStateException("Mission non réclamable")
              }
              dailyShibaUsesClaimed = true
              rewardCoins = 1200L
              rewardSeasonXp = 60L
            }
            "weekly_distance" -> {
              if (current.weeklyMissionDistanceClaimed || current.weeklyMissionDistance < 5000L) {
                throw IllegalStateException("Mission hebdo non réclamable")
              }
              weeklyDistanceClaimed = true
              rewardGems = 50L
              rewardSeasonXp = 100L
            }
            "weekly_jumps" -> {
              if (current.weeklyMissionJumpsClaimed || current.weeklyMissionJumps < 60L) {
                throw IllegalStateException("Mission hebdo non réclamable")
              }
              weeklyJumpsClaimed = true
              rewardCoins = 1500L
              rewardGems = 20L
              rewardSeasonXp = 80L
            }
            "weekly_car_dist" -> {
              if (current.weeklyCarDistanceClaimed || current.weeklyCarDistance < 1200L) {
                throw IllegalStateException("Mission hebdo non réclamable")
              }
              weeklyCarDistClaimed = true
              rewardGems = 35L
              rewardSeasonXp = 90L
            }
            "weekly_train_jumps" -> {
              if (current.weeklyTrainJumpsClaimed || current.weeklyTrainJumps < 12L) {
                throw IllegalStateException("Mission hebdo non réclamable")
              }
              weeklyTrainJumpsClaimed = true
              rewardCoins = 1800L
              rewardGems = 25L
              rewardSeasonXp = 90L
            }
            else -> throw IllegalArgumentException("Mission inconnue: $missionId")
          }

          val (sLevel, sXp) = applySeasonXp(current.seasonLevel, current.seasonXp + rewardSeasonXp)
          val next =
            current.copy(
              dailyMissionCoinsClaimed = dailyCoinsClaimed,
              dailyMissionRunsClaimed = dailyRunsClaimed,
              dailyNearMissesClaimed = dailyNearMissesClaimed,
              dailyShibaUsesClaimed = dailyShibaUsesClaimed,
              weeklyMissionDistanceClaimed = weeklyDistanceClaimed,
              weeklyMissionJumpsClaimed = weeklyJumpsClaimed,
              weeklyCarDistanceClaimed = weeklyCarDistClaimed,
              weeklyTrainJumpsClaimed = weeklyTrainJumpsClaimed,
              coins = current.coins + rewardCoins,
              gems = current.gems + rewardGems,
              seasonLevel = sLevel,
              seasonXp = sXp,
              updatedAtMs = System.currentTimeMillis(),
            )
          dao.upsertProfile(next)
          next.toPlayerProfile()
        }
      Result.success(updated)
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun claimDailyLogin(): Result<LoginRewardResult> {
    return try {
      val result =
        db.withTransaction {
          val current = getNormalizedEntityOrThrow()
          val today = currentDailyResetKey()
          if (current.loginLastClaimKey == today) {
            throw IllegalStateException("Récompense quotidienne déjà réclamée aujourd'hui.")
          }
          val nextDay =
            if (current.loginStreakDay <= 0 || current.loginStreakDay >= 7) 1
            else current.loginStreakDay + 1

          val reward =
            when (nextDay) {
              1 -> LoginRewardResult(1, "Jour 1 · Échauffement", "+400 Pièces", 400L, 0L, 0L, 0L, 0L, 0L, 0L)
              2 -> LoginRewardResult(2, "Jour 2 · Éclat Neko", "+15 Gemmes", 0L, 15L, 0L, 0L, 0L, 0L, 0L)
              3 -> LoginRewardResult(3, "Jour 3 · Kit Tactique", "+300 Pièces + 1 Aimant + 1 Bouclier", 300L, 0L, 1L, 1L, 0L, 0L, 0L)
              4 -> LoginRewardResult(4, "Jour 4 · Trésor Dojo", "+1 000 Pièces + 10 Gemmes", 1000L, 10L, 0L, 0L, 0L, 0L, 0L)
              5 -> LoginRewardResult(5, "Jour 5 · Nitro & Boost", "+1 Mult x5 + 1 Turbo Départ", 0L, 0L, 0L, 0L, 1L, 1L, 0L)
              6 -> LoginRewardResult(6, "Jour 6 · Coffre Diamant", "+500 Pièces + 30 Gemmes", 500L, 30L, 0L, 0L, 0L, 0L, 0L)
              else -> LoginRewardResult(7, "Jour 7 · Pacte Impérial", "+2 500 Pièces + 50 Gemmes + 15 Sakura", 2500L, 50L, 0L, 0L, 0L, 0L, 15L)
            }

          val next =
            current.copy(
              coins = current.coins + reward.coins,
              gems = current.gems + reward.gems,
              inventoryMagnets = current.inventoryMagnets + reward.magnets,
              inventoryShields = current.inventoryShields + reward.shields,
              inventoryMultipliers = current.inventoryMultipliers + reward.multipliers,
              inventoryHeadStarts = current.inventoryHeadStarts + reward.headStarts,
              eventSakuraTokens = current.eventSakuraTokens + reward.sakuraTokens,
              loginStreakDay = nextDay,
              loginLastClaimKey = today,
              updatedAtMs = System.currentTimeMillis(),
            )
          dao.upsertProfile(next)
          reward
        }
      Result.success(result)
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun claimRushWordBonus(): Result<RushWordResult> {
    return try {
      val result =
        db.withTransaction {
          val current = getNormalizedEntityOrThrow()
          if ((current.rushLettersMask and 0x0F) != 0x0F) {
            throw IllegalStateException("Collectez les 4 lettres R-U-S-H sur les rails d'abord.")
          }
          val coinsBonus = 400L
          val gemsBonus = 25L
          val seasonXpBonus = 100L
          val (sLevel, sXp) = applySeasonXp(current.seasonLevel, current.seasonXp + seasonXpBonus)
          val nextCompleted = current.rushWordsCompleted + 1L
          val next =
            current.copy(
              coins = current.coins + coinsBonus,
              gems = current.gems + gemsBonus,
              seasonLevel = sLevel,
              seasonXp = sXp,
              rushLettersMask = 0,
              rushWordsCompleted = nextCompleted,
              updatedAtMs = System.currentTimeMillis(),
            )
          dao.upsertProfile(next)
          RushWordResult(coinsBonus, gemsBonus, seasonXpBonus, nextCompleted)
        }
      Result.success(result)
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun drawDojoCapsule(currencyMode: String): Result<GachaDrawResult> {
    return try {
      val result =
        db.withTransaction {
          val current = getNormalizedEntityOrThrow()
          val profile = current.toPlayerProfile()

          val coinsAfterCost: Long
          val sakuraAfterCost: Long
          when (currencyMode) {
            "coins" -> {
              if (profile.coins < CAPSULE_COIN_COST) {
                throw IllegalStateException("Il faut $CAPSULE_COIN_COST pièces pour lancer une Capsule Dojo.")
              }
              coinsAfterCost = profile.coins - CAPSULE_COIN_COST
              sakuraAfterCost = profile.eventSakuraTokens
            }
            "sakura" -> {
              if (profile.eventSakuraTokens < CAPSULE_SAKURA_COST) {
                throw IllegalStateException("Il faut $CAPSULE_SAKURA_COST jetons Sakura pour lancer une Capsule Dojo.")
              }
              coinsAfterCost = profile.coins
              sakuraAfterCost = profile.eventSakuraTokens - CAPSULE_SAKURA_COST
            }
            else -> throw IllegalArgumentException("Mode capsule inconnu: $currencyMode")
          }

          val roll = Random.nextInt(100)
          var nextCoins = coinsAfterCost
          var nextGems = profile.gems
          var nextSakura = sakuraAfterCost
          var magnets = profile.inventoryMagnets
          var shields = profile.inventoryShields
          var mults = profile.inventoryMultipliers
          var headStarts = profile.inventoryHeadStarts
          var unlockedHeroes = current.unlockedHeroIdsJson
          var unlockedComps = current.unlockedCompanionIdsJson
          var unlockedCars = current.unlockedCarIdsJson
          var equippedHero = current.equippedHeroId
          var equippedComp = current.equippedCompanionId
          var equippedCar = current.equippedCarId

          val outcome: GachaDrawResult =
            when {
              roll < 25 -> {
                magnets += 1L
                shields += 1L
                headStarts += 1L
                GachaDrawResult(
                  rewardId = "boost_pack",
                  title = "Pack Dojo Tactique",
                  rarity = "Rare",
                  description = "+1 Aimant Neko, +1 Bouclier Dojo et +1 Turbo Départ !",
                  coinsAdded = 0L,
                  gemsAdded = 0L,
                  sakuraAdded = 0L,
                  unlockedType = null,
                  unlockedId = null,
                )
              }
              roll < 45 -> {
                mults += 1L
                nextCoins += 300L
                GachaDrawResult(
                  rewardId = "mult_x5_pack",
                  title = "Surcharge Score x5",
                  rarity = "Épique",
                  description = "+1 Multiplicateur x5 et +300 Pièces bonus !",
                  coinsAdded = 300L,
                  gemsAdded = 0L,
                  sakuraAdded = 0L,
                  unlockedType = null,
                  unlockedId = null,
                )
              }
              roll < 65 -> {
                nextCoins += 1200L
                GachaDrawResult(
                  rewardId = "coins_jackpot",
                  title = "Pluie d'Or Shibuya",
                  rarity = "Rare",
                  description = "+1 200 Pièces ajoutées à votre coffre !",
                  coinsAdded = 1200L,
                  gemsAdded = 0L,
                  sakuraAdded = 0L,
                  unlockedType = null,
                  unlockedId = null,
                )
              }
              roll < 83 -> {
                nextGems += 18L
                GachaDrawResult(
                  rewardId = "gems_crate",
                  title = "Cristaux Néon",
                  rarity = "Épique",
                  description = "+18 Gemmes étincelantes pour le Showroom !",
                  coinsAdded = 0L,
                  gemsAdded = 18L,
                  sakuraAdded = 0L,
                  unlockedType = null,
                  unlockedId = null,
                )
              }
              roll < 93 -> {
                nextSakura += 10L
                nextCoins += 400L
                GachaDrawResult(
                  rewardId = "sakura_bless",
                  title = "Bénédiction Sakura",
                  rarity = "Épique",
                  description = "+10 Jetons Sakura et +400 Pièces !",
                  coinsAdded = 400L,
                  gemsAdded = 0L,
                  sakuraAdded = 10L,
                  unlockedType = null,
                  unlockedId = null,
                )
              }
              else -> {
                val lockedCandidates =
                  listOf(
                    Triple("companion", "sakura_shiba", "Shiba Sakura"),
                    Triple("companion", "shiba_cyber", "Cyber Shiba"),
                    Triple("car", "sakura_spider", "Sakura Spider"),
                    Triple("car", "cyber_kitsune", "Cyber Kitsune EV"),
                    Triple("hero", "dragnir", "Dragnir"),
                    Triple("hero", "sigma", "Sigma"),
                  ).filter { (type, id, _) ->
                    when (type) {
                      "hero" -> !profile.unlockedHeroIds.contains(id)
                      "car" -> !profile.unlockedCarIds.contains(id)
                      else -> !profile.unlockedCompanionIds.contains(id)
                    }
                  }

                if (lockedCandidates.isNotEmpty()) {
                  val pick = lockedCandidates[Random.nextInt(lockedCandidates.size)]
                  when (pick.first) {
                    "hero" -> {
                      unlockedHeroes = LocalProfileEntity.encodeStringList((profile.unlockedHeroIds + pick.second).distinct())
                      equippedHero = pick.second
                    }
                    "car" -> {
                      unlockedCars = LocalProfileEntity.encodeStringList((profile.unlockedCarIds + pick.second).distinct())
                      equippedCar = pick.second
                    }
                    else -> {
                      unlockedComps = LocalProfileEntity.encodeStringList((profile.unlockedCompanionIds + pick.second).distinct())
                      equippedComp = pick.second
                    }
                  }
                  GachaDrawResult(
                    rewardId = "unlock_${pick.second}",
                    title = "DÉBLOCAGE : ${pick.third}",
                    rarity = "Légendaire",
                    description = "Incroyable ! ${pick.third} est débloqué et équipé automatiquement !",
                    coinsAdded = 0L,
                    gemsAdded = 0L,
                    sakuraAdded = 0L,
                    unlockedType = pick.first,
                    unlockedId = pick.second,
                  )
                } else {
                  nextGems += 35L
                  nextCoins += 1500L
                  GachaDrawResult(
                    rewardId = "mythic_refund",
                    title = "Jackpot Impérial",
                    rarity = "Légendaire",
                    description = "Lot mystère déjà possédé : +35 Gemmes et +1 500 Pièces !",
                    coinsAdded = 1500L,
                    gemsAdded = 35L,
                    sakuraAdded = 0L,
                    unlockedType = null,
                    unlockedId = null,
                  )
                }
              }
            }

          val next =
            current.copy(
              coins = nextCoins,
              gems = nextGems,
              eventSakuraTokens = nextSakura,
              inventoryMagnets = magnets,
              inventoryShields = shields,
              inventoryMultipliers = mults,
              inventoryHeadStarts = headStarts,
              unlockedHeroIdsJson = unlockedHeroes,
              equippedHeroId = equippedHero,
              unlockedCompanionIdsJson = unlockedComps,
              equippedCompanionId = equippedComp,
              unlockedCarIdsJson = unlockedCars,
              equippedCarId = equippedCar,
              gachaDraws = current.gachaDraws + 1L,
              updatedAtMs = System.currentTimeMillis(),
            )
          dao.upsertProfile(next)
          outcome
        }
      Result.success(result)
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun claimSeasonTier(tier: Long): Result<PlayerProfile> {
    return try {
      val updated =
        db.withTransaction {
          val current = getNormalizedEntityOrThrow()
          val profile = current.toPlayerProfile()
          if (
            tier < 1L || tier > profile.seasonLevel || profile.claimedSeasonTiers.contains(tier)
          ) {
            throw IllegalStateException("Palier Saison non réclamable")
          }

          val coinsReward = if (tier % 2L == 1L) 300L + tier * 50L else 0L
          val gemsReward = if (tier % 2L == 0L) 15L + tier * 2L else 5L
          val claimed = (profile.claimedSeasonTiers + tier).distinct().take(100)
          val extraMultipliers = if (tier == 5L) 1L else 0L

          val next =
            current.copy(
              claimedSeasonTiersJson = LocalProfileEntity.encodeLongList(claimed),
              coins = current.coins + coinsReward,
              gems = current.gems + gemsReward,
              inventoryMultipliers = current.inventoryMultipliers + extraMultipliers,
              updatedAtMs = System.currentTimeMillis(),
            )
          dao.upsertProfile(next)
          next.toPlayerProfile()
        }
      Result.success(updated)
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun claimEventMilestone(milestoneId: String): Result<PlayerProfile> {
    return try {
      val updated =
        db.withTransaction {
          val current = getNormalizedEntityOrThrow()
          val profile = current.toPlayerProfile()
          if (profile.claimedEventMilestones.contains(milestoneId)) {
            throw IllegalStateException("Palier déjà réclamé")
          }

          val (requiredTokens, rewardCoins, rewardGems, rewardCollection) =
            when (milestoneId) {
              "sakura_15" -> Quad(15L, 400L, 10L, null)
              "sakura_40" -> Quad(40L, 800L, 25L, null)
              "sakura_80" -> Quad(80L, 1500L, 50L, "card_sakura_spirit")
              else -> throw IllegalArgumentException("Palier inconnu")
            }

          if (profile.eventSakuraTokens < requiredTokens) {
            throw IllegalStateException("Jetons Sakura insuffisants")
          }

          val collections = profile.collectionIds.toMutableSet()
          if (rewardCollection != null) collections.add(rewardCollection)

          val next =
            current.copy(
              claimedEventMilestonesJson =
                LocalProfileEntity.encodeStringList(
                  (profile.claimedEventMilestones + milestoneId).distinct()
                ),
              coins = profile.coins + rewardCoins,
              gems = profile.gems + rewardGems,
              collectionIdsJson = LocalProfileEntity.encodeStringList(collections.toList().take(64)),
              updatedAtMs = System.currentTimeMillis(),
            )
          dao.upsertProfile(next)
          next.toPlayerProfile()
        }
      Result.success(updated)
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun claimAchievement(achievementId: String): Result<PlayerProfile> {
    return try {
      val updated =
        db.withTransaction {
          val current = getNormalizedEntityOrThrow()
          val profile = current.toPlayerProfile()
          if (profile.claimedAchievementIds.contains(achievementId)) {
            throw IllegalStateException("Succès déjà réclamé")
          }

          val (unlocked, rewardGems, rewardXp) =
            when (achievementId) {
              "first_run" -> Triple(profile.totalRuns >= 1L, 15L, 150L)
              "distance_1km" -> Triple(profile.totalDistance >= 1000L, 25L, 250L)
              "coins_1000" -> Triple(profile.totalCoinsCollected >= 1000L, 30L, 300L)
              "acrobat_50" -> Triple((profile.totalJumps + profile.totalSlides) >= 50L, 35L, 350L)
              "score_10k" -> Triple(profile.bestScore >= 10000L, 50L, 500L)
              else -> throw IllegalArgumentException("Succès inconnu: $achievementId")
            }

          if (!unlocked) {
            throw IllegalStateException("Condition du succès non atteinte")
          }

          val (newLevel, newXp, newXpToNext) =
            applyAccountXp(profile.level, profile.xp + rewardXp, profile.xpToNextLevel)

          val next =
            current.copy(
              claimedAchievementIdsJson =
                LocalProfileEntity.encodeStringList(
                  (profile.claimedAchievementIds + achievementId).distinct()
                ),
              gems = profile.gems + rewardGems,
              level = newLevel,
              xp = newXp,
              xpToNextLevel = newXpToNext,
              updatedAtMs = System.currentTimeMillis(),
            )
          dao.upsertProfile(next)
          next.toPlayerProfile()
        }
      Result.success(updated)
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun listInbox(): Result<List<InboxMessage>> {
    return try {
      Result.success(dao.listInbox().map { it.toInboxMessage() })
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun fetchLocalLeaderboard(): Result<List<LeaderboardEntry>> {
    return try {
      val profile = getCurrentProfile().getOrThrow()
      Result.success(
        listOf(
          LeaderboardEntry(
            id = profile.uid,
            uid = profile.uid,
            displayName = profile.displayName,
            displayNameLower = profile.displayNameLower,
            level = profile.level,
            bestScore = profile.bestScore,
            equippedHeroId = profile.equippedHeroId,
            equippedCompanionId = profile.equippedCompanionId,
          )
        )
      )
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun claimInboxMessage(messageId: String): Result<Unit> {
    return try {
      db.withTransaction {
        val msg =
          dao.getInboxMessage(messageId)
            ?: throw IllegalStateException("Message introuvable.")
        if (msg.claimed) {
          throw IllegalStateException("Récompense déjà réclamée.")
        }
        val rowsUpdated = dao.markInboxClaimed(messageId)
        if (rowsUpdated == 0) {
          throw IllegalStateException("Récompense déjà réclamée.")
        }
        if (msg.rewardCoins > 0L || msg.rewardGems > 0L) {
          val current = getNormalizedEntityOrThrow()
          dao.upsertProfile(
            current.copy(
              coins = current.coins + msg.rewardCoins.coerceAtLeast(0L),
              gems = current.gems + msg.rewardGems.coerceAtLeast(0L),
              updatedAtMs = System.currentTimeMillis(),
            )
          )
        }
      }
      Result.success(Unit)
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun claimAllInbox(): Result<Int> {
    return try {
      val claimedCount =
        db.withTransaction {
          val messages = dao.listInbox().filter { !it.claimed }
          if (messages.isEmpty()) return@withTransaction 0
          var totalCoins = 0L
          var totalGems = 0L
          var claimedNow = 0
          for (msg in messages) {
            if (dao.markInboxClaimed(msg.id) > 0) {
              claimedNow++
              totalCoins += msg.rewardCoins.coerceAtLeast(0L)
              totalGems += msg.rewardGems.coerceAtLeast(0L)
            }
          }
          if (totalCoins > 0L || totalGems > 0L) {
            val current = getNormalizedEntityOrThrow()
            dao.upsertProfile(
              current.copy(
                coins = current.coins + totalCoins,
                gems = current.gems + totalGems,
                updatedAtMs = System.currentTimeMillis(),
              )
            )
          }
          claimedNow
        }
      Result.success(claimedCount)
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun purchaseUpgrade(upgradeId: String, cost: Long): Result<PlayerProfile> {
    return try {
      require(cost > 0L) { "Coût invalide" }
      val updated =
        db.withTransaction {
          val current = getNormalizedEntityOrThrow()
          if (current.coins < cost) {
            throw IllegalStateException("Pièces insuffisantes")
          }
          val next =
            when (upgradeId) {
              "upgrade_magnet" -> {
                if (current.upgradeMagnetLevel >= 5) throw IllegalStateException("Amélioration déjà au niveau max")
                current.copy(
                  upgradeMagnetLevel = current.upgradeMagnetLevel + 1,
                  coins = current.coins - cost,
                  updatedAtMs = System.currentTimeMillis(),
                )
              }
              "upgrade_car" -> {
                if (current.upgradeCarLevel >= 5) throw IllegalStateException("Amélioration déjà au niveau max")
                current.copy(
                  upgradeCarLevel = current.upgradeCarLevel + 1,
                  coins = current.coins - cost,
                  updatedAtMs = System.currentTimeMillis(),
                )
              }
              "upgrade_shield" -> {
                if (current.upgradeShieldLevel >= 5) throw IllegalStateException("Amélioration déjà au niveau max")
                current.copy(
                  upgradeShieldLevel = current.upgradeShieldLevel + 1,
                  coins = current.coins - cost,
                  updatedAtMs = System.currentTimeMillis(),
                )
              }
              "upgrade_score" -> {
                if (current.upgradeScoreLevel >= 5) throw IllegalStateException("Amélioration déjà au niveau max")
                current.copy(
                  upgradeScoreLevel = current.upgradeScoreLevel + 1,
                  coins = current.coins - cost,
                  updatedAtMs = System.currentTimeMillis(),
                )
              }
              else -> throw IllegalArgumentException("Amélioration inconnue: $upgradeId")
            }
          dao.upsertProfile(next)
          next.toPlayerProfile()
        }
      Result.success(updated)
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun spendGemsForRevive(cost: Long): Result<PlayerProfile> {
    return try {
      require(cost > 0L) { "Coût invalide" }
      val updated =
        db.withTransaction {
          val current = getNormalizedEntityOrThrow()
          if (current.gems < cost) {
            throw IllegalStateException("Gemmes insuffisantes pour la seconde chance")
          }
          val next =
            current.copy(
              gems = current.gems - cost,
              updatedAtMs = System.currentTimeMillis(),
            )
          dao.upsertProfile(next)
          next.toPlayerProfile()
        }
      Result.success(updated)
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
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
    var curLvl = seasonLevel.coerceIn(1L, MAX_SEASON_TIER)
    var curXp = seasonXp.coerceAtLeast(0L)
    while (curXp >= 100L && curLvl < MAX_SEASON_TIER) {
      curXp -= 100L
      curLvl += 1L
    }
    if (curLvl >= MAX_SEASON_TIER) {
      curLvl = MAX_SEASON_TIER
      curXp = curXp.coerceAtMost(100L)
    }
    return curLvl to curXp
  }

  private data class Quad<A, B, C, D>(val first: A, val second: B, val third: C, val fourth: D)

  companion object {
    const val MAX_SEASON_TIER = 10L
    const val FREE_CHEST_COOLDOWN_MS = 4L * 60L * 60L * 1000L
    const val MULTIPLIER_DURATION_MS = 15L * 60L * 1000L
    const val CAPSULE_COIN_COST = 600L
    const val CAPSULE_SAKURA_COST = 12L
  }
}
