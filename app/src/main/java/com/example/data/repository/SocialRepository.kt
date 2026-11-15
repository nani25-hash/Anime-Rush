package com.example.data.repository

import android.content.Context
import com.example.R
import com.example.data.model.FriendLink
import com.example.data.model.FriendRequest
import com.example.data.model.InboxMessage
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
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.snapshots
import java.util.Locale
import java.util.UUID
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.emitAll
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.tasks.await

class SocialRepository(
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

  suspend fun fetchLeaderboard(limitCount: Long = 30L): Result<List<LeaderboardEntry>> {
    val safeLimit = limitCount.coerceIn(1L, 50L)
    val path = "leaderboard"
    return try {
      val snap =
        db.collection(path)
          .orderBy("bestScore", Query.Direction.DESCENDING)
          .limit(safeLimit)
          .get()
          .await()
      val entries =
        snap.documents.mapNotNull {
          it.toObject(LeaderboardEntry::class.java, DocumentSnapshot.ServerTimestampBehavior.ESTIMATE)
        }
      Result.success(entries)
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      handleFirestoreError(e, OperationType.LIST, path)
      Result.failure(e)
    }
  }

  suspend fun searchPlayers(query: String): Result<List<LeaderboardEntry>> {
    val uid =
      try {
        requireUserId()
      } catch (e: Exception) {
        return Result.failure(e)
      }
    val q = query.trim().lowercase(Locale.ROOT)
    val path = "leaderboard"
    return try {
      val snap =
        if (q.isEmpty()) {
          db.collection(path)
            .orderBy("bestScore", Query.Direction.DESCENDING)
            .limit(20L)
            .get()
            .await()
        } else {
          db.collection(path)
            .orderBy("displayNameLower")
            .startAt(q)
            .endAt(q + "\uf8ff")
            .limit(20L)
            .get()
            .await()
        }
      val entries =
        snap.documents
          .mapNotNull {
            it.toObject(
              LeaderboardEntry::class.java,
              DocumentSnapshot.ServerTimestampBehavior.ESTIMATE,
            )
          }
          .filter { it.uid != uid }
      Result.success(entries)
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      handleFirestoreError(e, OperationType.LIST, path)
      Result.failure(e)
    }
  }

  fun observeFriends(): Flow<List<FriendLink>> = flow {
    val uid = requireUserId()
    val path = "users/$uid/friends"
    emitAll(
      db.collection("users")
        .document(uid)
        .collection("friends")
        .snapshots()
        .map { snap ->
          snap.toObjects(
            FriendLink::class.java,
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
            handleFirestoreError(exceptionToLog, OperationType.LIST, path)
          }
          throw error
        }
    )
  }

  suspend fun listFriends(): Result<List<FriendLink>> {
    val uid =
      try {
        requireUserId()
      } catch (e: Exception) {
        return Result.failure(e)
      }
    val path = "users/$uid/friends"
    return try {
      val snap = db.collection("users").document(uid).collection("friends").get().await()
      Result.success(
        snap.toObjects(FriendLink::class.java, DocumentSnapshot.ServerTimestampBehavior.ESTIMATE)
      )
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      handleFirestoreError(e, OperationType.LIST, path)
      Result.failure(e)
    }
  }

  suspend fun listFriendRequests(): Result<List<FriendRequest>> {
    val uid =
      try {
        requireUserId()
      } catch (e: Exception) {
        return Result.failure(e)
      }
    val path = "friendRequests"
    return try {
      val snap =
        db.collection(path)
          .whereArrayContains("participants", uid)
          .get()
          .await()
      val items =
        snap.toObjects(
            FriendRequest::class.java,
            DocumentSnapshot.ServerTimestampBehavior.ESTIMATE,
          )
          .filter { it.status == "pending" }
      Result.success(items)
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      handleFirestoreError(e, OperationType.LIST, path)
      Result.failure(e)
    }
  }

  suspend fun sendFriendRequest(
    target: LeaderboardEntry,
    myProfile: PlayerProfile,
  ): Result<String> {
    val uid =
      try {
        requireUserId()
      } catch (e: Exception) {
        return Result.failure(e)
      }
    if (target.uid == uid) {
      return Result.failure(IllegalArgumentException("Impossible de s'ajouter soi-même."))
    }

    val requestId = UUID.randomUUID().toString()
    val reqRef = db.collection("friendRequests").document(requestId)
    return try {
      reqRef
        .set(
          mapOf(
            "fromUid" to uid,
            "fromDisplayName" to myProfile.displayName,
            "fromLevel" to myProfile.level,
            "toUid" to target.uid,
            "toDisplayName" to target.displayName,
            "participants" to listOf(uid, target.uid),
            "status" to "pending",
            "createdAt" to FieldValue.serverTimestamp(),
            "updatedAt" to FieldValue.serverTimestamp(),
          )
        )
        .await()
      Result.success(requestId)
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      handleFirestoreError(e, OperationType.CREATE, reqRef.path)
      Result.failure(e)
    }
  }

  suspend fun acceptFriendRequest(
    request: FriendRequest,
    myProfile: PlayerProfile,
  ): Result<Unit> {
    val uid =
      try {
        requireUserId()
      } catch (e: Exception) {
        return Result.failure(e)
      }
    if (request.toUid != uid || request.id.isBlank()) {
      return Result.failure(IllegalArgumentException("Demande d'ami invalide."))
    }

    val reqRef = db.collection("friendRequests").document(request.id)
    val myFriendRef =
      db.collection("users").document(uid).collection("friends").document(request.fromUid)
    val theirFriendRef =
      db.collection("users").document(request.fromUid).collection("friends").document(uid)

    return try {
      val batch = db.batch()
      batch.update(
        reqRef,
        mapOf("status" to "accepted", "updatedAt" to FieldValue.serverTimestamp()),
      )
      batch.set(
        myFriendRef,
        mapOf(
          "friendUid" to request.fromUid,
          "displayName" to request.fromDisplayName,
          "level" to request.fromLevel,
          "bestScore" to 0L,
          "equippedHeroId" to "ryu",
          "requestId" to request.id,
          "createdAt" to FieldValue.serverTimestamp(),
        ),
      )
      batch.set(
        theirFriendRef,
        mapOf(
          "friendUid" to uid,
          "displayName" to myProfile.displayName,
          "level" to myProfile.level,
          "bestScore" to myProfile.bestScore,
          "equippedHeroId" to myProfile.equippedHeroId,
          "requestId" to request.id,
          "createdAt" to FieldValue.serverTimestamp(),
        ),
      )
      batch.commit().await()
      Result.success(Unit)
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      handleFirestoreError(e, OperationType.WRITE, reqRef.path)
      Result.failure(e)
    }
  }

  suspend fun declineFriendRequest(requestId: String): Result<Unit> {
    try {
      requireUserId()
    } catch (e: Exception) {
      return Result.failure(e)
    }
    val reqRef = db.collection("friendRequests").document(requestId)
    return try {
      reqRef
        .update(mapOf("status" to "declined", "updatedAt" to FieldValue.serverTimestamp()))
        .await()
      Result.success(Unit)
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      handleFirestoreError(e, OperationType.UPDATE, reqRef.path)
      Result.failure(e)
    }
  }

  suspend fun removeFriend(friendUid: String): Result<Unit> {
    val uid =
      try {
        requireUserId()
      } catch (e: Exception) {
        return Result.failure(e)
      }
    val myFriendRef = db.collection("users").document(uid).collection("friends").document(friendUid)
    val theirFriendRef =
      db.collection("users").document(friendUid).collection("friends").document(uid)
    return try {
      val batch = db.batch()
      batch.delete(myFriendRef)
      batch.delete(theirFriendRef)
      batch.commit().await()
      Result.success(Unit)
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      handleFirestoreError(e, OperationType.DELETE, myFriendRef.path)
      Result.failure(e)
    }
  }

  suspend fun sendFriendGift(friendUid: String, myDisplayName: String): Result<Unit> {
    val uid =
      try {
        requireUserId()
      } catch (e: Exception) {
        return Result.failure(e)
      }
    val msgId = UUID.randomUUID().toString()
    val inboxRef = db.collection("users").document(friendUid).collection("inbox").document(msgId)
    return try {
      inboxRef
        .set(
          mapOf(
            "senderUid" to uid,
            "senderName" to myDisplayName,
            "title" to "Cadeau de $myDisplayName",
            "body" to "Votre ami vous envoie 50 pièces pour votre prochaine course !",
            "type" to "friend_gift",
            "rewardCoins" to 50L,
            "rewardGems" to 0L,
            "read" to false,
            "claimed" to false,
            "createdAt" to FieldValue.serverTimestamp(),
            "updatedAt" to FieldValue.serverTimestamp(),
          )
        )
        .await()
      Result.success(Unit)
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      handleFirestoreError(e, OperationType.CREATE, inboxRef.path)
      Result.failure(e)
    }
  }

  suspend fun listInbox(): Result<List<InboxMessage>> {
    val uid =
      try {
        requireUserId()
      } catch (e: Exception) {
        return Result.failure(e)
      }
    val path = "users/$uid/inbox"
    return try {
      val snap =
        db.collection("users")
          .document(uid)
          .collection("inbox")
          .orderBy("createdAt", Query.Direction.DESCENDING)
          .limit(30L)
          .get()
          .await()
      Result.success(
        snap.toObjects(InboxMessage::class.java, DocumentSnapshot.ServerTimestampBehavior.ESTIMATE)
      )
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      handleFirestoreError(e, OperationType.LIST, path)
      Result.failure(e)
    }
  }

  suspend fun claimInboxMessage(messageId: String): Result<InboxMessage> {
    val uid =
      try {
        requireUserId()
      } catch (e: Exception) {
        return Result.failure(e)
      }
    val userRef = db.collection("users").document(uid)
    val msgRef = userRef.collection("inbox").document(messageId)
    return try {
      val msgSnap = msgRef.get().await()
      val msg =
        msgSnap.toObject(InboxMessage::class.java, DocumentSnapshot.ServerTimestampBehavior.ESTIMATE)
          ?: return Result.failure(IllegalStateException("Message introuvable"))
      if (msg.claimed) {
        return Result.success(msg)
      }
      val profileSnap = userRef.get().await()
      val profile =
        profileSnap.toObject(
          PlayerProfile::class.java,
          DocumentSnapshot.ServerTimestampBehavior.ESTIMATE,
        ) ?: return Result.failure(IllegalStateException("Profil introuvable"))

      val batch = db.batch()
      batch.update(
        msgRef,
        mapOf(
          "read" to true,
          "claimed" to true,
          "updatedAt" to FieldValue.serverTimestamp(),
        ),
      )
      batch.update(
        userRef,
        mapOf(
          "coins" to (profile.coins + msg.rewardCoins),
          "gems" to (profile.gems + msg.rewardGems),
          "updatedAt" to FieldValue.serverTimestamp(),
        ),
      )
      batch.commit().await()
      Result.success(msg.copy(read = true, claimed = true))
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      handleFirestoreError(e, OperationType.UPDATE, msgRef.path)
      Result.failure(e)
    }
  }

  suspend fun claimAllInbox(): Result<Int> {
    val uid =
      try {
        requireUserId()
      } catch (e: Exception) {
        return Result.failure(e)
      }
    val messages = listInbox().getOrElse { return Result.failure(it) }
    val pending = messages.filter { !it.claimed }
    if (pending.isEmpty()) return Result.success(0)

    val userRef = db.collection("users").document(uid)
    return try {
      val profileSnap = userRef.get().await()
      val profile =
        profileSnap.toObject(
          PlayerProfile::class.java,
          DocumentSnapshot.ServerTimestampBehavior.ESTIMATE,
        ) ?: return Result.failure(IllegalStateException("Profil introuvable"))

      val totalCoins = pending.sumOf { it.rewardCoins }
      val totalGems = pending.sumOf { it.rewardGems }

      val batch = db.batch()
      for (msg in pending) {
        batch.update(
          userRef.collection("inbox").document(msg.id),
          mapOf("read" to true, "claimed" to true, "updatedAt" to FieldValue.serverTimestamp()),
        )
      }
      batch.update(
        userRef,
        mapOf(
          "coins" to (profile.coins + totalCoins),
          "gems" to (profile.gems + totalGems),
          "updatedAt" to FieldValue.serverTimestamp(),
        ),
      )
      batch.commit().await()
      Result.success(pending.size)
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      handleFirestoreError(e, OperationType.UPDATE, userRef.path)
      Result.failure(e)
    }
  }
}
