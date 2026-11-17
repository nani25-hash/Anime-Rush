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
}
