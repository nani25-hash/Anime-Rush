package com.example.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Database(
  entities = [LocalProfileEntity::class, LocalInboxEntity::class],
  version = 3,
  exportSchema = false,
)
abstract class AnimeRushDatabase : RoomDatabase() {
  abstract fun localGameDao(): LocalGameDao

  companion object {
    @Volatile private var instance: AnimeRushDatabase? = null

    val MIGRATION_1_2 =
      object : Migration(1, 2) {
        override fun migrate(db: SupportSQLiteDatabase) {
          db.execSQL(
            "ALTER TABLE local_profile ADD COLUMN equippedCarId TEXT NOT NULL DEFAULT 'yellow_cab_gt'"
          )
          db.execSQL(
            "ALTER TABLE local_profile ADD COLUMN unlockedCarIdsJson TEXT NOT NULL DEFAULT '[\"yellow_cab_gt\"]'"
          )
        }
      }

    val MIGRATION_2_3 =
      object : Migration(2, 3) {
        override fun migrate(db: SupportSQLiteDatabase) {
          db.execSQL("ALTER TABLE local_profile ADD COLUMN upgradeMagnetLevel INTEGER NOT NULL DEFAULT 1")
          db.execSQL("ALTER TABLE local_profile ADD COLUMN upgradeCarLevel INTEGER NOT NULL DEFAULT 1")
          db.execSQL("ALTER TABLE local_profile ADD COLUMN upgradeShieldLevel INTEGER NOT NULL DEFAULT 1")
          db.execSQL("ALTER TABLE local_profile ADD COLUMN upgradeScoreLevel INTEGER NOT NULL DEFAULT 1")
        }
      }

    fun getInstance(context: Context): AnimeRushDatabase {
      return instance
        ?: synchronized(this) {
          instance
            ?: Room.databaseBuilder(
                context.applicationContext,
                AnimeRushDatabase::class.java,
                "anime_rush_local.db",
              )
              .addMigrations(MIGRATION_1_2, MIGRATION_2_3)
              .build()
              .also { instance = it }
        }
    }
  }
}
