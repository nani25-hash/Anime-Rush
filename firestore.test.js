const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require("@firebase/rules-unit-testing");
const { test, before, after, beforeEach } = require("node:test");
const fs = require("node:fs");

const serverTimestamp = () => new Date(Date.now() - 2000);

let testEnv;
const PROJECT_ID = process.env.GCP_PROJECT || "demo-no-project";
const ALICE_UID = "alice_123";
const BOB_UID = "bob_456";
const CHARLIE_UID = "charlie_789";

const [emulatorHost, emulatorPortStr] = (
  process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8085"
).split(":");
const emulatorPort = parseInt(emulatorPortStr, 10);

function validUserProfile(uid, name = "RyuPlayer") {
  return {
    uid,
    displayName: name,
    displayNameLower: name.toLowerCase(),
    level: 1,
    xp: 0,
    xpToNextLevel: 1000,
    coins: 500,
    gems: 20,
    bestScore: 0,
    totalDistance: 0,
    totalRuns: 0,
    totalCoinsCollected: 0,
    activeMultiplier: 1,
    multiplierExpiresAt: 0,
    equippedHeroId: "ryu",
    equippedCompanionId: "shiba_classic",
    unlockedHeroIds: ["ryu"],
    unlockedCompanionIds: ["shiba_classic"],
    collectionIds: [],
    inventoryMagnets: 1,
    inventoryShields: 1,
    inventoryMultipliers: 0,
    inventoryHeadStarts: 0,
    nextFreeChestAt: 0,
    seasonLevel: 1,
    seasonXp: 0,
    claimedSeasonTiers: [],
    eventSakuraTokens: 0,
    claimedEventMilestones: [],
    claimedAchievementIds: [],
    dailyMissionCoins: 0,
    dailyMissionCoinsClaimed: false,
    dailyMissionRuns: 0,
    dailyMissionRunsClaimed: false,
    dailyMissionResetKey: "2026-11-15",
    weeklyMissionDistance: 0,
    weeklyMissionDistanceClaimed: false,
    weeklyMissionJumps: 0,
    weeklyMissionJumpsClaimed: false,
    weeklyMissionResetKey: "2026-W46",
    totalJumps: 0,
    totalSlides: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function validLeaderboard(uid, name = "RyuPlayer", bestScore = 1500) {
  return {
    uid,
    displayName: name,
    displayNameLower: name.toLowerCase(),
    level: 1,
    bestScore,
    equippedHeroId: "ryu",
    equippedCompanionId: "shiba_classic",
    updatedAt: serverTimestamp(),
  };
}

before(async () => {
  const rules = fs.readFileSync("./firestore.rules", "utf8");
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: emulatorHost,
      port: emulatorPort,
    },
  });
});

after(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

beforeEach(async () => {
  if (testEnv) {
    await testEnv.clearFirestore();
  }
});

test("Unauthenticated caller cannot read or write any collection", async () => {
  const unauthDb = testEnv.unauthenticatedContext().firestore();
  await assertFails(unauthDb.collection("users").doc(ALICE_UID).get());
  await assertFails(unauthDb.collection("leaderboard").limit(10).get());
  await assertFails(
    unauthDb.collection("friendRequests").where("participants", "array-contains", ALICE_UID).get()
  );
  await assertFails(
    unauthDb.collection("users").doc(ALICE_UID).set(validUserProfile(ALICE_UID))
  );
});

test("Owner can create, read, and update their own profile, but cannot add ghost fields or negative coins", async () => {
  const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
  const aliceRef = aliceDb.collection("users").doc(ALICE_UID);

  await assertSucceeds(aliceRef.set(validUserProfile(ALICE_UID, "Alice")));
  await assertSucceeds(aliceRef.get());

  // Valid Action 1 update: rename displayName
  await assertSucceeds(
    aliceRef.update({
      displayName: "AliceNinja",
      displayNameLower: "aliceninja",
      updatedAt: serverTimestamp(),
    })
  );

  // Valid Action 3 update: record run telemetry
  await assertSucceeds(
    aliceRef.update({
      bestScore: 12500,
      totalRuns: 1,
      totalDistance: 850,
      coins: 650,
      totalCoinsCollected: 150,
      updatedAt: serverTimestamp(),
    })
  );

  // Ghost field shadow update must fail
  await assertFails(
    aliceRef.update({
      isAdmin: true,
      updatedAt: serverTimestamp(),
    })
  );

  // Negative currency must fail
  await assertFails(
    aliceRef.update({
      coins: -10,
      updatedAt: serverTimestamp(),
    })
  );
});

test("Cross-user isolation: Bob cannot read or write Alice's private user document", async () => {
  const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
  await assertSucceeds(
    aliceDb.collection("users").doc(ALICE_UID).set(validUserProfile(ALICE_UID, "Alice"))
  );

  const bobDb = testEnv.authenticatedContext(BOB_UID).firestore();
  await assertFails(bobDb.collection("users").doc(ALICE_UID).get());
  await assertFails(
    bobDb.collection("users").doc(ALICE_UID).update({
      coins: 99999,
      updatedAt: serverTimestamp(),
    })
  );
});

test("Leaderboard enforces ownership on write and bounded page size on list", async () => {
  const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
  const bobDb = testEnv.authenticatedContext(BOB_UID).firestore();

  await assertSucceeds(
    aliceDb.collection("leaderboard").doc(ALICE_UID).set(validLeaderboard(ALICE_UID, "Alice", 4200))
  );

  // Bob cannot overwrite Alice's leaderboard entry
  await assertFails(
    bobDb.collection("leaderboard").doc(ALICE_UID).set(validLeaderboard(ALICE_UID, "Fake", 999999))
  );

  // Unbounded list query fails
  await assertFails(bobDb.collection("leaderboard").get());

  // Oversized limit (>50) fails
  await assertFails(bobDb.collection("leaderboard").limit(51).get());

  // Bounded query succeeds
  await assertSucceeds(
    bobDb.collection("leaderboard").orderBy("bestScore", "desc").limit(20).get()
  );
});

test("Friend request + atomic mutual friendship + friend gift inbox flow", async () => {
  const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
  const bobDb = testEnv.authenticatedContext(BOB_UID).firestore();
  const charlieDb = testEnv.authenticatedContext(CHARLIE_UID).firestore();

  // Seed leaderboard profiles required by existence check
  await assertSucceeds(
    aliceDb.collection("leaderboard").doc(ALICE_UID).set(validLeaderboard(ALICE_UID, "Alice", 1000))
  );
  await assertSucceeds(
    bobDb.collection("leaderboard").doc(BOB_UID).set(validLeaderboard(BOB_UID, "Bob", 2000))
  );

  // Alice sends friend request to Bob
  const reqId = "req_alice_bob";
  await assertSucceeds(
    aliceDb.collection("friendRequests").doc(reqId).set({
      fromUid: ALICE_UID,
      fromDisplayName: "Alice",
      fromLevel: 1,
      toUid: BOB_UID,
      toDisplayName: "Bob",
      participants: [ALICE_UID, BOB_UID],
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );

  // Charlie cannot read Alice<->Bob request or list without matching participants filter
  await assertFails(charlieDb.collection("friendRequests").doc(reqId).get());
  await assertFails(charlieDb.collection("friendRequests").get());

  // Bob cannot accept without creating valid status / Alice cannot accept own sent request
  await assertFails(
    aliceDb.collection("friendRequests").doc(reqId).update({
      status: "accepted",
      updatedAt: serverTimestamp(),
    })
  );

  // Bob cannot create fake friend link without updating friendRequest in the same batch
  await assertFails(
    bobDb.collection("users").doc(BOB_UID).collection("friends").doc(ALICE_UID).set({
      friendUid: ALICE_UID,
      displayName: "Alice",
      level: 1,
      bestScore: 1000,
      equippedHeroId: "ryu",
      requestId: reqId,
      createdAt: serverTimestamp(),
    })
  );

  // Atomic batch acceptance by Bob
  const batch = bobDb.batch();
  batch.update(bobDb.collection("friendRequests").doc(reqId), {
    status: "accepted",
    updatedAt: serverTimestamp(),
  });
  batch.set(bobDb.collection("users").doc(BOB_UID).collection("friends").doc(ALICE_UID), {
    friendUid: ALICE_UID,
    displayName: "Alice",
    level: 1,
    bestScore: 1000,
    equippedHeroId: "ryu",
    requestId: reqId,
    createdAt: serverTimestamp(),
  });
  batch.set(bobDb.collection("users").doc(ALICE_UID).collection("friends").doc(BOB_UID), {
    friendUid: BOB_UID,
    displayName: "Bob",
    level: 1,
    bestScore: 2000,
    equippedHeroId: "ryu",
    requestId: reqId,
    createdAt: serverTimestamp(),
  });
  await assertSucceeds(batch.commit());

  // Terminal state lock: Bob cannot revert status back to pending after accepted
  await assertFails(
    bobDb.collection("friendRequests").doc(reqId).update({
      status: "pending",
      updatedAt: serverTimestamp(),
    })
  );

  // Friend Bob can send a gift <= 100 coins to Alice's inbox, but non-friend Charlie cannot
  await assertSucceeds(
    bobDb.collection("users").doc(ALICE_UID).collection("inbox").doc("gift_1").set({
      senderUid: BOB_UID,
      senderName: "Bob",
      title: "Cadeau d'ami",
      body: "Bon run sur Anime Rush !",
      type: "friend_gift",
      rewardCoins: 50,
      rewardGems: 0,
      read: false,
      claimed: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );

  await assertFails(
    charlieDb.collection("users").doc(ALICE_UID).collection("inbox").doc("gift_spam").set({
      senderUid: CHARLIE_UID,
      senderName: "Charlie",
      title: "Spam",
      body: "Hacked",
      type: "friend_gift",
      rewardCoins: 50,
      rewardGems: 0,
      read: false,
      claimed: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );

  // Alice can claim inbox message once, cannot unclaim
  await assertSucceeds(
    aliceDb.collection("users").doc(ALICE_UID).collection("inbox").doc("gift_1").update({
      read: true,
      claimed: true,
      updatedAt: serverTimestamp(),
    })
  );
  await assertFails(
    aliceDb.collection("users").doc(ALICE_UID).collection("inbox").doc("gift_1").update({
      claimed: false,
      updatedAt: serverTimestamp(),
    })
  );
});
