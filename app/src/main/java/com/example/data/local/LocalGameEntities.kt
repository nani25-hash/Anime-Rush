package com.example.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.example.data.model.InboxMessage
import com.example.data.model.PlayerProfile
import com.google.firebase.Timestamp
import java.util.Date
import org.json.JSONArray

const val LOCAL_PLAYER_ID = "local_player"

@Entity(tableName = "local_profile")
data class LocalProfileEntity(
  @PrimaryKey val id: String = LOCAL_PLAYER_ID,
  val uid: String = LOCAL_PLAYER_ID,
  val displayName: String = "RyuPlayer",
  val displayNameLower: String = "ryuplayer",
  val photoUrl: String? = null,
  val level: Long = 1L,
  val xp: Long = 0L,
  val xpToNextLevel: Long = 1000L,
  val coins: Long = 500L,
  val gems: Long = 25L,
  val bestScore: Long = 0L,
  val totalDistance: Long = 0L,
  val totalRuns: Long = 0L,
  val totalCoinsCollected: Long = 0L,
  val activeMultiplier: Long = 1L,
  val multiplierExpiresAt: Long = 0L,
  val equippedHeroId: String = "ryu",
  val equippedCompanionId: String = "shiba_classic",
  val unlockedHeroIdsJson: String = "[\"ryu\"]",
  val unlockedCompanionIdsJson: String = "[\"shiba_classic\"]",
  val collectionIdsJson: String = "[\"card_tokyo_rails\"]",
  val inventoryMagnets: Long = 1L,
  val inventoryShields: Long = 1L,
  val inventoryMultipliers: Long = 0L,
  val inventoryHeadStarts: Long = 0L,
  val nextFreeChestAt: Long = 0L,
  val seasonLevel: Long = 1L,
  val seasonXp: Long = 0L,
  val claimedSeasonTiersJson: String = "[]",
  val eventSakuraTokens: Long = 0L,
  val claimedEventMilestonesJson: String = "[]",
  val claimedAchievementIdsJson: String = "[]",
  val dailyMissionCoins: Long = 0L,
  val dailyMissionCoinsClaimed: Boolean = false,
  val dailyMissionRuns: Long = 0L,
  val dailyMissionRunsClaimed: Boolean = false,
  val dailyMissionResetKey: String = "",
  val weeklyMissionDistance: Long = 0L,
  val weeklyMissionDistanceClaimed: Boolean = false,
  val weeklyMissionJumps: Long = 0L,
  val weeklyMissionJumpsClaimed: Boolean = false,
  val weeklyMissionResetKey: String = "",
  val totalJumps: Long = 0L,
  val totalSlides: Long = 0L,
  val updatedAtMs: Long = 0L,
) {
  fun toPlayerProfile(): PlayerProfile =
    PlayerProfile(
      id = id,
      uid = uid,
      displayName = displayName,
      displayNameLower = displayNameLower,
      photoUrl = photoUrl,
      level = level,
      xp = xp,
      xpToNextLevel = xpToNextLevel,
      coins = coins,
      gems = gems,
      bestScore = bestScore,
      totalDistance = totalDistance,
      totalRuns = totalRuns,
      totalCoinsCollected = totalCoinsCollected,
      activeMultiplier = activeMultiplier,
      multiplierExpiresAt = multiplierExpiresAt,
      equippedHeroId = equippedHeroId,
      equippedCompanionId = equippedCompanionId,
      unlockedHeroIds = decodeStringList(unlockedHeroIdsJson, listOf("ryu")),
      unlockedCompanionIds = decodeStringList(unlockedCompanionIdsJson, listOf("shiba_classic")),
      collectionIds = decodeStringList(collectionIdsJson, listOf("card_tokyo_rails")),
      inventoryMagnets = inventoryMagnets,
      inventoryShields = inventoryShields,
      inventoryMultipliers = inventoryMultipliers,
      inventoryHeadStarts = inventoryHeadStarts,
      nextFreeChestAt = nextFreeChestAt,
      seasonLevel = seasonLevel,
      seasonXp = seasonXp,
      claimedSeasonTiers = decodeLongList(claimedSeasonTiersJson),
      eventSakuraTokens = eventSakuraTokens,
      claimedEventMilestones = decodeStringList(claimedEventMilestonesJson, emptyList()),
      claimedAchievementIds = decodeStringList(claimedAchievementIdsJson, emptyList()),
      dailyMissionCoins = dailyMissionCoins,
      dailyMissionCoinsClaimed = dailyMissionCoinsClaimed,
      dailyMissionRuns = dailyMissionRuns,
      dailyMissionRunsClaimed = dailyMissionRunsClaimed,
      dailyMissionResetKey = dailyMissionResetKey,
      weeklyMissionDistance = weeklyMissionDistance,
      weeklyMissionDistanceClaimed = weeklyMissionDistanceClaimed,
      weeklyMissionJumps = weeklyMissionJumps,
      weeklyMissionJumpsClaimed = weeklyMissionJumpsClaimed,
      weeklyMissionResetKey = weeklyMissionResetKey,
      totalJumps = totalJumps,
      totalSlides = totalSlides,
    )

  companion object {
    fun encodeStringList(items: List<String>): String = JSONArray(items).toString()

    fun encodeLongList(items: List<Long>): String = JSONArray(items).toString()

    fun decodeStringList(raw: String, fallback: List<String>): List<String> {
      return try {
        val arr = JSONArray(raw)
        val result = ArrayList<String>(arr.length())
        for (i in 0 until arr.length()) {
          val value = arr.optString(i, "")
          if (value.isNotEmpty()) result.add(value)
        }
        if (result.isEmpty() && fallback.isNotEmpty()) fallback else result
      } catch (_: Exception) {
        fallback
      }
    }

    fun decodeLongList(raw: String): List<Long> {
      return try {
        val arr = JSONArray(raw)
        val result = ArrayList<Long>(arr.length())
        for (i in 0 until arr.length()) {
          result.add(arr.optLong(i, 0L))
        }
        result
      } catch (_: Exception) {
        emptyList()
      }
    }
  }
}

@Entity(tableName = "local_inbox")
data class LocalInboxEntity(
  @PrimaryKey val id: String,
  val senderUid: String,
  val senderName: String,
  val title: String,
  val body: String,
  val type: String,
  val rewardCoins: Long,
  val rewardGems: Long,
  val read: Boolean,
  val claimed: Boolean,
  val createdAtMs: Long,
) {
  fun toInboxMessage(): InboxMessage =
    InboxMessage(
      id = id,
      senderUid = senderUid,
      senderName = senderName,
      title = title,
      body = body,
      type = type,
      rewardCoins = rewardCoins,
      rewardGems = rewardGems,
      read = read,
      claimed = claimed,
      createdAt = if (createdAtMs > 0L) Timestamp(Date(createdAtMs)) else null,
    )
}
