package com.bananaadvisory.network

import android.content.Context
import android.util.Base64
import androidx.work.*
import com.bananaadvisory.data.AppDatabase
import com.bananaadvisory.utils.SessionManager
import com.google.gson.Gson
import java.io.File
import java.util.concurrent.TimeUnit

class SyncWorker(
    context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result {
        val session = SessionManager(applicationContext)
        val token = session.getToken() ?: return Result.success()

        val db = AppDatabase.getInstance(applicationContext)
        val pending = db.reportDao().getPendingSyncReports()

        if (pending.isEmpty()) return Result.success()

        val syncedIds = mutableListOf<Long>()

        for (report in pending) {
            try {
                val photoBase64 = if (report.photoPath != null) {
                    try {
                        val file = File(report.photoPath)
                        if (file.exists()) {
                            val bytes = file.readBytes()
                            Base64.encodeToString(bytes, Base64.DEFAULT)
                        } else null
                    } catch (e: Exception) { null }
                } else report.photoBase64

                val gis = if (report.gisLat != null && report.gisLng != null) {
                    GisDto(report.gisLat, report.gisLng)
                } else null

                val symptoms = try {
                    Gson().fromJson(report.symptoms, Map::class.java) as? Map<String, Boolean>
                        ?: emptyMap()
                } catch (e: Exception) { emptyMap() }

                val request = ReportRequest(
                    crop = report.crop,
                    symptoms = symptoms,
                    comments = report.comments,
                    location = report.location,
                    farmerName = report.farmerName,
                    phone = report.phone,
                    gis = gis,
                    photoBase64 = photoBase64
                )

                val response = ApiClient.apiService.submitReport("Bearer $token", request)
                if (response.isSuccessful && response.body() != null) {
                    val serverId = response.body()!!.id
                    db.reportDao().markSynced(report.localId, serverId)
                    syncedIds.add(report.localId)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        return if (syncedIds.isNotEmpty()) Result.success() else Result.retry()
    }

    companion object {
        private const val WORK_NAME = "report_sync_worker"

        fun schedule(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val request = OneTimeWorkRequestBuilder<SyncWorker>()
                .setConstraints(constraints)
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    30,
                    TimeUnit.SECONDS
                )
                .build()

            WorkManager.getInstance(context)
                .enqueueUniqueWork(WORK_NAME, ExistingWorkPolicy.REPLACE, request)
        }
    }
}
