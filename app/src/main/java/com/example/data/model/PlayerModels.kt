package com.example.data.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentId
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.IgnoreExtraProperties
import com.google.firebase.firestore.ServerTimestamp
import org.json.JSONArray
import org.json.JSONObject

@IgnoreExtraProperties
data class PlayerProfile(
  @DocumentId val id: String = "",
  val uid: String = "",
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
  val equippedCarId: String = "yellow_cab_gt",
  val unlockedHeroIds: List<String> = listOf("ryu"),
  val unlockedCompanionIds: List<String> = listOf("shiba_classic"),
  val unlockedCarIds: List<String> = listOf("yellow_cab_gt"),
  val upgradeMagnetLevel: Int = 1,
  val upgradeCarLevel: Int = 1,
  val upgradeShieldLevel: Int = 1,
  val upgradeScoreLevel: Int = 1,
  val collectionIds: List<String> = listOf("card_tokyo_rails"),
  val inventoryMagnets: Long = 1L,
  val inventoryShields: Long = 1L,
  val inventoryMultipliers: Long = 0L,
  val inventoryHeadStarts: Long = 0L,
  val nextFreeChestAt: Long = 0L,
  val seasonLevel: Long = 1L,
  val seasonXp: Long = 0L,
  val claimedSeasonTiers: List<Long> = emptyList(),
  val eventSakuraTokens: Long = 0L,
  val claimedEventMilestones: List<String> = emptyList(),
  val claimedAchievementIds: List<String> = emptyList(),
  val dailyMissionCoins: Long = 0L,
  val dailyMissionCoinsClaimed: Boolean = false,
  val dailyMissionRuns: Long = 0L,
  val dailyMissionRunsClaimed: Boolean = false,
  val dailyNearMisses: Long = 0L,
  val dailyNearMissesClaimed: Boolean = false,
  val dailyShibaUses: Long = 0L,
  val dailyShibaUsesClaimed: Boolean = false,
  val dailyMissionResetKey: String = "",
  val weeklyMissionDistance: Long = 0L,
  val weeklyMissionDistanceClaimed: Boolean = false,
  val weeklyMissionJumps: Long = 0L,
  val weeklyMissionJumpsClaimed: Boolean = false,
  val weeklyCarDistance: Long = 0L,
  val weeklyCarDistanceClaimed: Boolean = false,
  val weeklyTrainJumps: Long = 0L,
  val weeklyTrainJumpsClaimed: Boolean = false,
  val weeklyMissionResetKey: String = "",
  val totalJumps: Long = 0L,
  val totalSlides: Long = 0L,
  val rushLettersMask: Int = 0,
  val rushResetKey: String = "",
  val rushWordsCompleted: Long = 0L,
  val loginStreakDay: Int = 0,
  val loginLastClaimKey: String = "",
  val gachaDraws: Long = 0L,
  @ServerTimestamp val createdAt: Timestamp? = null,
  @ServerTimestamp val updatedAt: Timestamp? = null,
) {
  @Suppress("UNCHECKED_CAST")
  fun toCreateMap(): Map<String, Any> {
    return mapOf(
        "uid" to uid,
        "displayName" to displayName,
        "displayNameLower" to displayNameLower,
        "photoUrl" to photoUrl,
        "level" to level,
        "xp" to xp,
        "xpToNextLevel" to xpToNextLevel,
        "coins" to coins,
        "gems" to gems,
        "bestScore" to bestScore,
        "totalDistance" to totalDistance,
        "totalRuns" to totalRuns,
        "totalCoinsCollected" to totalCoinsCollected,
        "activeMultiplier" to activeMultiplier,
        "multiplierExpiresAt" to multiplierExpiresAt,
        "equippedHeroId" to equippedHeroId,
        "equippedCompanionId" to equippedCompanionId,
        "equippedCarId" to equippedCarId,
        "unlockedHeroIds" to unlockedHeroIds,
        "unlockedCompanionIds" to unlockedCompanionIds,
        "unlockedCarIds" to unlockedCarIds,
        "upgradeMagnetLevel" to upgradeMagnetLevel,
        "upgradeCarLevel" to upgradeCarLevel,
        "upgradeShieldLevel" to upgradeShieldLevel,
        "upgradeScoreLevel" to upgradeScoreLevel,
        "collectionIds" to collectionIds,
        "inventoryMagnets" to inventoryMagnets,
        "inventoryShields" to inventoryShields,
        "inventoryMultipliers" to inventoryMultipliers,
        "inventoryHeadStarts" to inventoryHeadStarts,
        "nextFreeChestAt" to nextFreeChestAt,
        "seasonLevel" to seasonLevel,
        "seasonXp" to seasonXp,
        "claimedSeasonTiers" to claimedSeasonTiers,
        "eventSakuraTokens" to eventSakuraTokens,
        "claimedEventMilestones" to claimedEventMilestones,
        "claimedAchievementIds" to claimedAchievementIds,
        "dailyMissionCoins" to dailyMissionCoins,
        "dailyMissionCoinsClaimed" to dailyMissionCoinsClaimed,
        "dailyMissionRuns" to dailyMissionRuns,
        "dailyMissionRunsClaimed" to dailyMissionRunsClaimed,
        "dailyNearMisses" to dailyNearMisses,
        "dailyNearMissesClaimed" to dailyNearMissesClaimed,
        "dailyShibaUses" to dailyShibaUses,
        "dailyShibaUsesClaimed" to dailyShibaUsesClaimed,
        "dailyMissionResetKey" to dailyMissionResetKey,
        "weeklyMissionDistance" to weeklyMissionDistance,
        "weeklyMissionDistanceClaimed" to weeklyMissionDistanceClaimed,
        "weeklyMissionJumps" to weeklyMissionJumps,
        "weeklyMissionJumpsClaimed" to weeklyMissionJumpsClaimed,
        "weeklyCarDistance" to weeklyCarDistance,
        "weeklyCarDistanceClaimed" to weeklyCarDistanceClaimed,
        "weeklyTrainJumps" to weeklyTrainJumps,
        "weeklyTrainJumpsClaimed" to weeklyTrainJumpsClaimed,
        "weeklyMissionResetKey" to weeklyMissionResetKey,
        "totalJumps" to totalJumps,
        "totalSlides" to totalSlides,
        "rushLettersMask" to rushLettersMask,
        "rushResetKey" to rushResetKey,
        "rushWordsCompleted" to rushWordsCompleted,
        "loginStreakDay" to loginStreakDay,
        "loginLastClaimKey" to loginLastClaimKey,
        "gachaDraws" to gachaDraws,
        "createdAt" to (createdAt ?: FieldValue.serverTimestamp()),
        "updatedAt" to FieldValue.serverTimestamp(),
      )
      .filterValues { it != null } as Map<String, Any>
  }

  fun toJsonObject(): JSONObject =
    JSONObject().apply {
      put("uid", uid)
      put("displayName", displayName)
      put("photoUrl", photoUrl ?: "")
      put("level", level)
      put("xp", xp)
      put("xpToNextLevel", xpToNextLevel)
      put("coins", coins)
      put("gems", gems)
      put("bestScore", bestScore)
      put("totalDistance", totalDistance)
      put("totalRuns", totalRuns)
      put("totalCoinsCollected", totalCoinsCollected)
      put("activeMultiplier", activeMultiplier)
      put("multiplierExpiresAt", multiplierExpiresAt)
      put("equippedHeroId", equippedHeroId)
      put("equippedCompanionId", equippedCompanionId)
      put("equippedCarId", equippedCarId)
      put("unlockedHeroIds", JSONArray(unlockedHeroIds))
      put("unlockedCompanionIds", JSONArray(unlockedCompanionIds))
      put("unlockedCarIds", JSONArray(unlockedCarIds))
      put("upgradeMagnetLevel", upgradeMagnetLevel)
      put("upgradeCarLevel", upgradeCarLevel)
      put("upgradeShieldLevel", upgradeShieldLevel)
      put("upgradeScoreLevel", upgradeScoreLevel)
      put("collectionIds", JSONArray(collectionIds))
      put("inventoryMagnets", inventoryMagnets)
      put("inventoryShields", inventoryShields)
      put("inventoryMultipliers", inventoryMultipliers)
      put("inventoryHeadStarts", inventoryHeadStarts)
      put("nextFreeChestAt", nextFreeChestAt)
      put("seasonLevel", seasonLevel)
      put("seasonXp", seasonXp)
      put("claimedSeasonTiers", JSONArray(claimedSeasonTiers))
      put("eventSakuraTokens", eventSakuraTokens)
      put("claimedEventMilestones", JSONArray(claimedEventMilestones))
      put("claimedAchievementIds", JSONArray(claimedAchievementIds))
      put("dailyMissionCoins", dailyMissionCoins)
      put("dailyMissionCoinsClaimed", dailyMissionCoinsClaimed)
      put("dailyMissionRuns", dailyMissionRuns)
      put("dailyMissionRunsClaimed", dailyMissionRunsClaimed)
      put("dailyNearMisses", dailyNearMisses)
      put("dailyNearMissesClaimed", dailyNearMissesClaimed)
      put("dailyShibaUses", dailyShibaUses)
      put("dailyShibaUsesClaimed", dailyShibaUsesClaimed)
      put("dailyMissionResetKey", dailyMissionResetKey)
      put("weeklyMissionDistance", weeklyMissionDistance)
      put("weeklyMissionDistanceClaimed", weeklyMissionDistanceClaimed)
      put("weeklyMissionJumps", weeklyMissionJumps)
      put("weeklyMissionJumpsClaimed", weeklyMissionJumpsClaimed)
      put("weeklyCarDistance", weeklyCarDistance)
      put("weeklyCarDistanceClaimed", weeklyCarDistanceClaimed)
      put("weeklyTrainJumps", weeklyTrainJumps)
      put("weeklyTrainJumpsClaimed", weeklyTrainJumpsClaimed)
      put("weeklyMissionResetKey", weeklyMissionResetKey)
      put("totalJumps", totalJumps)
      put("totalSlides", totalSlides)
      put("rushLettersMask", rushLettersMask)
      put("rushResetKey", rushResetKey)
      put("rushWordsCompleted", rushWordsCompleted)
      put("loginStreakDay", loginStreakDay)
      put("loginLastClaimKey", loginLastClaimKey)
      put("gachaDraws", gachaDraws)
    }
}

@IgnoreExtraProperties
data class LeaderboardEntry(
  @DocumentId val id: String = "",
  val uid: String = "",
  val displayName: String = "",
  val displayNameLower: String = "",
  val level: Long = 1L,
  val bestScore: Long = 0L,
  val equippedHeroId: String = "ryu",
  val equippedCompanionId: String = "shiba_classic",
  @ServerTimestamp val updatedAt: Timestamp? = null,
) {
  fun toCreateMap(): Map<String, Any> =
    mapOf(
      "uid" to uid,
      "displayName" to displayName,
      "displayNameLower" to displayNameLower,
      "level" to level,
      "bestScore" to bestScore,
      "equippedHeroId" to equippedHeroId,
      "equippedCompanionId" to equippedCompanionId,
      "updatedAt" to FieldValue.serverTimestamp(),
    )

  fun toJsonObject(): JSONObject =
    JSONObject().apply {
      put("uid", uid)
      put("displayName", displayName)
      put("level", level)
      put("bestScore", bestScore)
      put("equippedHeroId", equippedHeroId)
      put("equippedCompanionId", equippedCompanionId)
    }
}

@IgnoreExtraProperties
data class FriendLink(
  @DocumentId val id: String = "",
  val friendUid: String = "",
  val displayName: String = "",
  val level: Long = 1L,
  val bestScore: Long = 0L,
  val equippedHeroId: String = "ryu",
  val requestId: String = "",
  @ServerTimestamp val createdAt: Timestamp? = null,
) {
  fun toJsonObject(): JSONObject =
    JSONObject().apply {
      put("friendUid", friendUid)
      put("displayName", displayName)
      put("level", level)
      put("bestScore", bestScore)
      put("equippedHeroId", equippedHeroId)
      put("requestId", requestId)
    }
}

@IgnoreExtraProperties
data class FriendRequest(
  @DocumentId val id: String = "",
  val fromUid: String = "",
  val fromDisplayName: String = "",
  val fromLevel: Long = 1L,
  val toUid: String = "",
  val toDisplayName: String = "",
  val participants: List<String> = emptyList(),
  val status: String = "pending",
  @ServerTimestamp val createdAt: Timestamp? = null,
  @ServerTimestamp val updatedAt: Timestamp? = null,
) {
  fun toJsonObject(): JSONObject =
    JSONObject().apply {
      put("id", id)
      put("fromUid", fromUid)
      put("fromDisplayName", fromDisplayName)
      put("fromLevel", fromLevel)
      put("toUid", toUid)
      put("toDisplayName", toDisplayName)
      put("status", status)
    }
}

@IgnoreExtraProperties
data class InboxMessage(
  @DocumentId val id: String = "",
  val senderUid: String = "",
  val senderName: String = "",
  val title: String = "",
  val body: String = "",
  val type: String = "system",
  val rewardCoins: Long = 0L,
  val rewardGems: Long = 0L,
  val read: Boolean = false,
  val claimed: Boolean = false,
  @ServerTimestamp val createdAt: Timestamp? = null,
  @ServerTimestamp val updatedAt: Timestamp? = null,
) {
  fun toJsonObject(): JSONObject =
    JSONObject().apply {
      put("id", id)
      put("senderUid", senderUid)
      put("senderName", senderName)
      put("title", title)
      put("body", body)
      put("type", type)
      put("rewardCoins", rewardCoins)
      put("rewardGems", rewardGems)
      put("read", read)
      put("claimed", claimed)
      put("createdAtMs", createdAt?.toDate()?.time ?: 0L)
    }
}

data class ChestRewardResult(
  val coins: Long,
  val gems: Long,
  val xp: Long,
  val nextFreeChestAt: Long,
)

data class LoginRewardResult(
  val day: Int,
  val title: String,
  val summary: String,
  val coins: Long,
  val gems: Long,
  val magnets: Long,
  val shields: Long,
  val multipliers: Long,
  val headStarts: Long,
  val sakuraTokens: Long,
) {
  fun toJsonObject(): JSONObject =
    JSONObject().apply {
      put("day", day)
      put("title", title)
      put("summary", summary)
      put("coins", coins)
      put("gems", gems)
      put("magnets", magnets)
      put("shields", shields)
      put("multipliers", multipliers)
      put("headStarts", headStarts)
      put("sakuraTokens", sakuraTokens)
    }
}

data class RushWordResult(
  val coins: Long,
  val gems: Long,
  val seasonXp: Long,
  val wordsCompleted: Long,
) {
  fun toJsonObject(): JSONObject =
    JSONObject().apply {
      put("coins", coins)
      put("gems", gems)
      put("seasonXp", seasonXp)
      put("wordsCompleted", wordsCompleted)
    }
}

data class GachaDrawResult(
  val rewardId: String,
  val title: String,
  val rarity: String,
  val description: String,
  val coinsAdded: Long,
  val gemsAdded: Long,
  val sakuraAdded: Long,
  val unlockedType: String?,
  val unlockedId: String?,
) {
  fun toJsonObject(): JSONObject =
    JSONObject().apply {
      put("rewardId", rewardId)
      put("title", title)
      put("rarity", rarity)
      put("description", description)
      put("coinsAdded", coinsAdded)
      put("gemsAdded", gemsAdded)
      put("sakuraAdded", sakuraAdded)
      put("unlockedType", unlockedType ?: "")
      put("unlockedId", unlockedId ?: "")
    }
}
