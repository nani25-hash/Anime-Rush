package com.example.data.repository

import com.example.base.FirestoreEmulatorTestBase
import com.google.firebase.firestore.FirebaseFirestoreException
import java.util.UUID
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeout
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PlayerAndSocialRepositoryRuleTest : FirestoreEmulatorTestBase() {

  @Test
  fun initializeProfile_recordRun_andPurchase_passesSecurityRules() = runBlocking {
    val uniqueSuffix = UUID.randomUUID().toString().take(8)
    val uid = signInTestUser("ryu_$uniqueSuffix@test.com")
    val playerRepo = PlayerRepository(firestore, auth)

    val initProfile = withTimeout(DEFAULT_TIMEOUT_MS) {
      playerRepo.ensurePlayerInitialized("Ryu_$uniqueSuffix", null).getOrThrow()
    }
    assertEquals(uid, initProfile.uid)
    assertEquals(500L, initProfile.coins)

    val afterChest = withTimeout(DEFAULT_TIMEOUT_MS) {
      playerRepo.claimFreeChest().getOrThrow()
    }
    assertTrue(afterChest.coins > 0L)

    val afterRun = withTimeout(DEFAULT_TIMEOUT_MS) {
      playerRepo.recordRunResult(
        score = 4200L,
        distance = 620L,
        coinsEarned = 140L,
        sakuraTokensEarned = 18L,
        jumps = 22L,
        slides = 9L,
      ).getOrThrow()
    }
    assertEquals(4200L, afterRun.bestScore)
    assertTrue(afterRun.totalRuns >= 1L)

    val afterShop = withTimeout(DEFAULT_TIMEOUT_MS) {
      playerRepo.purchaseShopItem("consumable", "magnet", "coins", 200L).getOrThrow()
    }
    assertTrue(afterShop.inventoryMagnets >= 2L)
  }

  @Test
  fun crossUserAccess_andUnauthenticatedRead_failsWithPermissionDenied() = runBlocking {
    val suffix = UUID.randomUUID().toString().take(8)
    val aliceUid = signInTestUser("alice_$suffix@test.com")
    val alicePlayerRepo = PlayerRepository(firestore, auth)
    withTimeout(DEFAULT_TIMEOUT_MS) {
      alicePlayerRepo.ensurePlayerInitialized("Alice_$suffix", null).getOrThrow()
    }

    // Bob cannot read Alice's private user document directly
    signInTestUser("bob_$suffix@test.com")
    var crossUserDenied = false
    try {
      withTimeout(DEFAULT_TIMEOUT_MS) {
        firestore.collection("users").document(aliceUid).get().await()
      }
    } catch (e: Exception) {
      crossUserDenied = e.unwrapFirestoreException()?.code == FirebaseFirestoreException.Code.PERMISSION_DENIED
    }
    assertTrue("Expected PERMISSION_DENIED on cross-user read", crossUserDenied)

    // Unauthenticated observeProfile fails with PERMISSION_DENIED on snapshot or throws IllegalStateException
    auth.signOut()
    val unauthSocial = SocialRepository(firestore, auth)
    val lbFailure = runCatching {
      withTimeout(DEFAULT_TIMEOUT_MS) { unauthSocial.fetchLeaderboard(10L).getOrThrow() }
    }.exceptionOrNull()
    assertTrue(
      "Expected PERMISSION_DENIED on unauthenticated leaderboard fetch, got $lbFailure",
      lbFailure?.unwrapFirestoreException()?.code == FirebaseFirestoreException.Code.PERMISSION_DENIED,
    )
  }

  @Test
  fun friendRequest_mutualAcceptance_andInboxGift_worksAtomically() = runBlocking {
    val suffix = UUID.randomUUID().toString().take(8)
    val aliceUid = signInTestUser("fa_$suffix@test.com")
    val alicePlayer = PlayerRepository(firestore, auth)
    val aliceProfile = withTimeout(DEFAULT_TIMEOUT_MS) {
      alicePlayer.ensurePlayerInitialized("Alice_$suffix", null).getOrThrow()
    }

    val bobUid = signInTestUser("fb_$suffix@test.com")
    val bobPlayer = PlayerRepository(firestore, auth)
    val bobProfile = withTimeout(DEFAULT_TIMEOUT_MS) {
      bobPlayer.ensurePlayerInitialized("Bob_$suffix", null).getOrThrow()
    }
    val bobSocial = SocialRepository(firestore, auth)

    // Alice signs in and sends request to Bob
    signInTestUser("fa_$suffix@test.com")
    val aliceSocial = SocialRepository(firestore, auth)
    val aliceLeaderboard = withTimeout(DEFAULT_TIMEOUT_MS) {
      aliceSocial.fetchLeaderboard(20L).getOrThrow()
    }
    val bobEntry = aliceLeaderboard.first { it.uid == bobUid }
    withTimeout(DEFAULT_TIMEOUT_MS) {
      aliceSocial.sendFriendRequest(bobEntry, aliceProfile).getOrThrow()
    }

    // Bob signs in, accepts friend request, and sends a gift to Alice
    signInTestUser("fb_$suffix@test.com")
    val requests = withTimeout(DEFAULT_TIMEOUT_MS) {
      bobSocial.listFriendRequests().getOrThrow()
    }
    val incomingReq = requests.first { it.fromUid == aliceUid && it.toUid == bobUid }
    withTimeout(DEFAULT_TIMEOUT_MS) {
      bobSocial.acceptFriendRequest(incomingReq, bobProfile).getOrThrow()
    }

    val bobFriends = withTimeout(FLOW_TIMEOUT_MS) {
      bobSocial.observeFriends().first { list -> list.any { it.friendUid == aliceUid } }
    }
    assertTrue(bobFriends.any { it.friendUid == aliceUid })

    withTimeout(DEFAULT_TIMEOUT_MS) {
      bobSocial.sendFriendGift(aliceUid, bobProfile.displayName).getOrThrow()
    }

    // Alice verifies gift in inbox and claims it
    signInTestUser("fa_$suffix@test.com")
    val aliceInbox = withTimeout(DEFAULT_TIMEOUT_MS) {
      aliceSocial.listInbox().getOrThrow()
    }
    val giftMsg = aliceInbox.first { it.senderUid == bobUid && it.type == "friend_gift" }
    val claimed = withTimeout(DEFAULT_TIMEOUT_MS) {
      aliceSocial.claimInboxMessage(giftMsg.id).getOrThrow()
    }
    assertTrue(claimed.claimed)
  }

  private companion object {
    const val DEFAULT_TIMEOUT_MS = 5000L
    const val FLOW_TIMEOUT_MS = 3000L
  }
}
