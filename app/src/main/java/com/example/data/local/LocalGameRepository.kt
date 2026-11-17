package com.example.data.local

import android.content.Context
import androidx.room.withTransaction
import com.example.data.model.ChestRewardResult
import com.example.data.model.InboxMessage
import com.example.data.model.LeaderboardEntry
import com.example.data.model.PlayerProfile
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone
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
    val needsWeeklyReset = entity.weeklyMissionResetKey != thisWeek
    val nowMs = System.currentTimeMillis()
    val multiplierExpired = entity.multiplierExpiresAt > 0L && entity.multiplierExpiresAt <= nowMs

    if (!needsDailyReset && !needsWeeklyReset && !multiplierExpired) {
      return entity
    }

    val updated =
      entity.copy(
        dailyMissionCoins = if (needsDailyReset) 0L else entity.dailyMissionCoins,
        dailyMissionCoinsClaimed =
          if (needsDailyReset) false else entity.dailyMissionCoinsClaimed,
        dailyMissionRuns = if (needsDailyReset) 0L else entity.dailyMissionRuns,
        dailyMissionRunsClaimed = if (needsDailyReset) false else entity.dailyMissionRunsClaimed,
        dailyMissionResetKey = if (needsDailyReset) today else entity.dailyMissionResetKey,
        weeklyMissionDistance = if (needsWeeklyReset) 0L else entity.weeklyMissionDistance,
        weeklyMissionDistanceClaimed =
          if (needsWeeklyReset) false else entity.weeklyMissionDistanceClaimed,
        weeklyMissionJumps = if (needsWeeklyReset) 0L else entity.weeklyMissionJumps,
        weeklyMissionJumpsClaimed =
          if (needsWeeklyReset) false else entity.weeklyMissionJumpsClaimed,
        weeklyMissionResetKey = if (needsWeeklyReset) thisWeek else entity.weeklyMissionResetKey,
        activeMultiplier = if (multiplierExpired) 1L else entity.activeMultiplier,
        multiplierExpiresAt = if (multiplierExpired) 0L else entity.multiplierExpiresAt,
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
              weeklyMissionDistance = newWeeklyDist,
              weeklyMissionJumps = newWeeklyJumps,
              totalJumps = profile.totalJumps + safeJumps,
              totalSlides = profile.totalSlides + safeSlides,
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
          var weeklyDistanceClaimed = current.weeklyMissionDistanceClaimed
          var weeklyJumpsClaimed = current.weeklyMissionJumpsClaimed

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
            else -> throw IllegalArgumentException("Mission inconnue: $missionId")
          }

          val (sLevel, sXp) = applySeasonXp(current.seasonLevel, current.seasonXp + rewardSeasonXp)
          val next =
            current.copy(
              dailyMissionCoinsClaimed = dailyCoinsClaimed,
              dailyMissionRunsClaimed = dailyRunsClaimed,
              weeklyMissionDistanceClaimed = weeklyDistanceClaimed,
              weeklyMissionJumpsClaimed = weeklyJumpsClaimed,
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
