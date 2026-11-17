package com.example.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface LocalGameDao {
  @Query("SELECT * FROM local_profile WHERE id = :id LIMIT 1")
  fun observeProfile(id: String = LOCAL_PLAYER_ID): Flow<LocalProfileEntity?>

  @Query("SELECT * FROM local_profile WHERE id = :id LIMIT 1")
  suspend fun getProfile(id: String = LOCAL_PLAYER_ID): LocalProfileEntity?

  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun upsertProfile(entity: LocalProfileEntity)

  @Query("SELECT * FROM local_inbox ORDER BY createdAtMs DESC")
  suspend fun listInbox(): List<LocalInboxEntity>

  @Query("SELECT * FROM local_inbox WHERE id = :id LIMIT 1")
  suspend fun getInboxMessage(id: String): LocalInboxEntity?

  @Insert(onConflict = OnConflictStrategy.IGNORE)
  suspend fun insertInboxMessages(messages: List<LocalInboxEntity>)

  @Query("UPDATE local_inbox SET read = 1, claimed = 1 WHERE id = :id AND claimed = 0")
  suspend fun markInboxClaimed(id: String): Int
}
