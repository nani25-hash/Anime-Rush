package com.example.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Database(
  entities = [LocalProfileEntity::class, LocalInboxEntity::class],
  version = 4,
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

    val MIGRATION_3_4 =
      object : Migration(3, 4) {
        override fun migrate(db: SupportSQLiteDatabase) {
          db.execSQL("ALTER TABLE local_profile ADD COLUMN dailyNearMisses INTEGER NOT NULL DEFAULT 0")
          db.execSQL("ALTER TABLE local_profile ADD COLUMN dailyNearMissesClaimed INTEGER NOT NULL DEFAULT 0")
          db.execSQL("ALTER TABLE local_profile ADD COLUMN dailyShibaUses INTEGER NOT NULL DEFAULT 0")
          db.execSQL("ALTER TABLE local_profile ADD COLUMN dailyShibaUsesClaimed INTEGER NOT NULL DEFAULT 0")
          db.execSQL("ALTER TABLE local_profile ADD COLUMN weeklyCarDistance INTEGER NOT NULL DEFAULT 0")
          db.execSQL("ALTER TABLE local_profile ADD COLUMN weeklyCarDistanceClaimed INTEGER NOT NULL DEFAULT 0")
          db.execSQL("ALTER TABLE local_profile ADD COLUMN weeklyTrainJumps INTEGER NOT NULL DEFAULT 0")
          db.execSQL("ALTER TABLE local_profile ADD COLUMN weeklyTrainJumpsClaimed INTEGER NOT NULL DEFAULT 0")
          db.execSQL("ALTER TABLE local_profile ADD COLUMN rushLettersMask INTEGER NOT NULL DEFAULT 0")
          db.execSQL("ALTER TABLE local_profile ADD COLUMN rushResetKey TEXT NOT NULL DEFAULT ''")
          db.execSQL("ALTER TABLE local_profile ADD COLUMN rushWordsCompleted INTEGER NOT NULL DEFAULT 0")
          db.execSQL("ALTER TABLE local_profile ADD COLUMN loginStreakDay INTEGER NOT NULL DEFAULT 0")
          db.execSQL("ALTER TABLE local_profile ADD COLUMN loginLastClaimKey TEXT NOT NULL DEFAULT ''")
          db.execSQL("ALTER TABLE local_profile ADD COLUMN gachaDraws INTEGER NOT NULL DEFAULT 0")
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
              .addMigrations(MIGRATION_1_2, MIGRATION_2_3, MIGRATION_3_4)
              .build()
              .also { instance = it }
        }
    }
  }
}
