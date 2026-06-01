package com.bananaadvisory.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface ReportDao {
    @Query("SELECT * FROM reports WHERE userId = :userId ORDER BY localId DESC")
    fun getReportsByUser(userId: Int): Flow<List<ReportEntity>>

    @Query("SELECT * FROM reports WHERE localId = :localId")
    suspend fun getReportById(localId: Long): ReportEntity?

    @Query("SELECT * FROM reports WHERE pendingSync = 1")
    suspend fun getPendingSyncReports(): List<ReportEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(report: ReportEntity): Long

    @Update
    suspend fun update(report: ReportEntity)

    @Query("UPDATE reports SET synced = 1, pendingSync = 0, serverId = :serverId WHERE localId = :localId")
    suspend fun markSynced(localId: Long, serverId: Int)

    @Query("DELETE FROM reports WHERE localId = :localId")
    suspend fun delete(localId: Long)
}
