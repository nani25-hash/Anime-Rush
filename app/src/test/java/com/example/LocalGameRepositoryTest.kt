package com.example

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.example.data.local.AnimeRushDatabase
import com.example.data.local.LOCAL_PLAYER_ID
import com.example.data.local.LocalGameRepository
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class LocalGameRepositoryTest {

  private lateinit var db: AnimeRushDatabase
  private lateinit var repository: LocalGameRepository

  @Before
  fun setUp() {
    val context = ApplicationProvider.getApplicationContext<Context>()
    db = Room.inMemoryDatabaseBuilder(context, AnimeRushDatabase::class.java)
      .allowMainThreadQueries()
      .build()
    repository = LocalGameRepository(db)
  }

  @After
  fun tearDown() {
    db.close()
  }

  @Test
  fun `initializes local profile and welcome inbox rewards without google auth`() = runTest {
    val initProfile = repository.ensurePlayerInitialized().getOrThrow()
    assertEquals(LOCAL_PLAYER_ID, initProfile.uid)
    assertEquals("RyuPlayer", initProfile.displayName)
    assertEquals(500L, initProfile.coins)
    assertEquals(25L, initProfile.gems)

    val inbox = repository.listInbox().getOrThrow()
    assertEquals(2, inbox.size)

    val claimedCount = repository.claimAllInbox().getOrThrow()
    assertEquals(2, claimedCount)

    val afterInbox = repository.getCurrentProfile().getOrThrow()
    assertEquals(950L, afterInbox.coins)
    assertEquals(40L, afterInbox.gems)
  }

  @Test
  fun `records runs claims chest buys shop item and updates local leaderboard`() = runTest {
    repository.ensurePlayerInitialized().getOrThrow()

    val chest = repository.claimFreeChest().getOrThrow()
    assertTrue(chest.coins >= 250L)

    val afterRun =
      repository.recordRunResult(
        score = 6200L,
        distance = 650L,
        coinsEarned = 140L,
        sakuraTokensEarned = 6L,
        jumps = 18L,
        slides = 9L,
      ).getOrThrow()

    assertEquals(6200L, afterRun.bestScore)
    assertEquals(650L, afterRun.totalDistance)
    assertEquals(1L, afterRun.totalRuns)
    assertTrue(afterRun.collectionIds.contains("card_torii_sanctuary"))
    assertTrue(afterRun.collectionIds.contains("card_sakura_express"))
    assertTrue(afterRun.collectionIds.contains("card_fuji_dawn"))

    val afterBuy =
      repository.purchaseShopItem(
        itemType = "consumable",
        itemId = "magnet",
        currency = "coins",
        cost = 150L,
      ).getOrThrow()
    assertEquals(2L, afterBuy.inventoryMagnets)

    val renamed = repository.updateDisplayName("AkiraRunner").getOrThrow()
    assertEquals("AkiraRunner", renamed.displayName)

    val lb = repository.fetchLocalLeaderboard().getOrThrow()
    assertEquals(1, lb.size)
    assertEquals("AkiraRunner", lb.first().displayName)
    assertEquals(6200L, lb.first().bestScore)
  }

  @Test
  fun `unlocks and equips canonical and Miss Maia heroes locally`() = runTest {
    repository.ensurePlayerInitialized().getOrThrow()
    repository.claimAllInbox().getOrThrow()

    val withSigma =
      repository.purchaseShopItem(
        itemType = "hero",
        itemId = "sigma",
        currency = "coins",
        cost = 500L,
      ).getOrThrow()
    assertTrue(withSigma.unlockedHeroIds.contains("sigma"))
    assertEquals("sigma", withSigma.equippedHeroId)

    val equippedDefault = repository.equipLoadout("ryu", withSigma.equippedCompanionId).getOrThrow()
    assertEquals("ryu", equippedDefault.equippedHeroId)
  }

  @Test
  fun `unlocks and equips convertible car models locally`() = runTest {
    val initProfile = repository.ensurePlayerInitialized().getOrThrow()
    assertEquals("yellow_cab_gt", initProfile.equippedCarId)
    assertTrue(initProfile.unlockedCarIds.contains("yellow_cab_gt"))

    repository.claimAllInbox().getOrThrow()
    repository.claimFreeChest().getOrThrow()

    val boughtCar =
      repository.purchaseShopItem(
        itemType = "car",
        itemId = "red_dragon_roadster",
        currency = "coins",
        cost = 900L,
      ).getOrThrow()
    assertTrue(boughtCar.unlockedCarIds.contains("red_dragon_roadster"))
    assertEquals("red_dragon_roadster", boughtCar.equippedCarId)

    val reEquipped = repository.equipCar("yellow_cab_gt").getOrThrow()
    assertEquals("yellow_cab_gt", reEquipped.equippedCarId)
  }

  @Test
  fun `purchases permanent power-up upgrades up to level 5 and spends gems for revive`() = runTest {
    val initProfile = repository.ensurePlayerInitialized().getOrThrow()
    assertEquals(1, initProfile.upgradeMagnetLevel)
    assertEquals(1, initProfile.upgradeCarLevel)

    // Earn enough coins for upgrade tests
    repository.claimAllInbox().getOrThrow()
    repository.recordRunResult(
      score = 3000L,
      distance = 400L,
      coinsEarned = 1500L,
      sakuraTokensEarned = 0L,
      jumps = 10L,
      slides = 5L,
    ).getOrThrow()

    val upgradedMagnet = repository.purchaseUpgrade("upgrade_magnet", 600L).getOrThrow()
    assertEquals(2, upgradedMagnet.upgradeMagnetLevel)

    val revived = repository.spendGemsForRevive(15L).getOrThrow()
    assertEquals(25L, revived.gems)
  }

  @Test
  fun `caps seasonLevel at 10 and self-heals out-of-range persisted season tiers`() = runTest {
    repository.ensurePlayerInitialized().getOrThrow()

    repeat(15) {
      repository.recordRunResult(
        score = 15000L,
        distance = 2000L,
        coinsEarned = 300L,
        sakuraTokensEarned = 10L,
        jumps = 20L,
        slides = 15L,
      ).getOrThrow()
    }

    val afterHeavyRuns = repository.getCurrentProfile().getOrThrow()
    assertEquals(LocalGameRepository.MAX_SEASON_TIER, afterHeavyRuns.seasonLevel)
    assertTrue(afterHeavyRuns.seasonXp <= 100L)

    // Simulate legacy out-of-range row (e.g. 14 / 10) and verify normalization heals it
    val currentEntity = db.localGameDao().getProfile()!!
    db.localGameDao().upsertProfile(currentEntity.copy(seasonLevel = 14L, seasonXp = 420L))

    val healed = repository.ensurePlayerInitialized().getOrThrow()
    assertEquals(LocalGameRepository.MAX_SEASON_TIER, healed.seasonLevel)
    assertEquals(100L, healed.seasonXp)
  }

  @Test
  fun `tracks and claims new daily and weekly missions and RUSH word completion`() = runTest {
    repository.ensurePlayerInitialized().getOrThrow()

    val afterRun =
      repository.recordRunResult(
        score = 8500L,
        distance = 900L,
        coinsEarned = 200L,
        sakuraTokensEarned = 4L,
        jumps = 25L,
        slides = 10L,
        nearMisses = 8L,
        shibaActivations = 3L,
        carDistance = 1250L,
        trainJumps = 12L,
        rushLettersMaskEarned = 0x0F,
      ).getOrThrow()

    assertEquals(8L, afterRun.dailyNearMisses)
    assertEquals(3L, afterRun.dailyShibaUses)
    assertEquals(1250L, afterRun.weeklyCarDistance)
    assertEquals(12L, afterRun.weeklyTrainJumps)
    assertEquals(0x0F, afterRun.rushLettersMask)

    val claimedNearMiss = repository.claimMission("daily_nearmiss").getOrThrow()
    assertTrue(claimedNearMiss.dailyNearMissesClaimed)

    val claimedShiba = repository.claimMission("daily_shiba").getOrThrow()
    assertTrue(claimedShiba.dailyShibaUsesClaimed)

    val claimedCarDist = repository.claimMission("weekly_car_dist").getOrThrow()
    assertTrue(claimedCarDist.weeklyCarDistanceClaimed)

    val claimedTrainJumps = repository.claimMission("weekly_train_jumps").getOrThrow()
    assertTrue(claimedTrainJumps.weeklyTrainJumpsClaimed)

    val rushWord = repository.claimRushWordBonus().getOrThrow()
    assertEquals(400L, rushWord.coins)
    assertEquals(25L, rushWord.gems)
    assertEquals(100L, rushWord.seasonXp)
    assertEquals(1L, rushWord.wordsCompleted)

    val afterWord = repository.getCurrentProfile().getOrThrow()
    assertEquals(0, afterWord.rushLettersMask)
    assertEquals(1L, afterWord.rushWordsCompleted)
  }

  @Test
  fun `claims 7-day daily login reward once per day and supports Dojo capsule draws`() = runTest {
    repository.ensurePlayerInitialized().getOrThrow()
    repository.claimAllInbox().getOrThrow()

    val day1 = repository.claimDailyLogin().getOrThrow()
    assertEquals(1, day1.day)
    assertEquals(400L, day1.coins)

    val doubleClaim = repository.claimDailyLogin()
    assertTrue(doubleClaim.isFailure)

    val capsuleOutcome = repository.drawDojoCapsule("coins").getOrThrow()
    assertTrue(capsuleOutcome.title.isNotEmpty())

    val afterCapsule = repository.getCurrentProfile().getOrThrow()
    assertEquals(1L, afterCapsule.gachaDraws)
  }
}
