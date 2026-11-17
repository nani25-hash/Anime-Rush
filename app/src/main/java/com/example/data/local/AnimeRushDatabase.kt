package com.example.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
  entities = [LocalProfileEntity::class, LocalInboxEntity::class],
  version = 1,
  exportSchema = false,
)
abstract class AnimeRushDatabase : RoomDatabase() {
  abstract fun localGameDao(): LocalGameDao

  companion object {
    @Volatile private var instance: AnimeRushDatabase? = null

    fun getInstance(context: Context): AnimeRushDatabase {
      return instance
        ?: synchronized(this) {
          instance
            ?: Room.databaseBuilder(
                context.applicationContext,
                AnimeRushDatabase::class.java,
                "anime_rush_local.db",
              )
              .build()
              .also { instance = it }
        }
    }
  }
}
