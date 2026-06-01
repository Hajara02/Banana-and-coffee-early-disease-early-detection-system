package com.bananaadvisory.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "reports")
data class ReportEntity(
    @PrimaryKey(autoGenerate = true)
    val localId: Long = 0,
    val serverId: Int? = null,
    val userId: Int,
    val farmerName: String,
    val phone: String,
    val location: String = "",
    val crop: String,
    val symptoms: String,
    val comments: String = "",
    val photoPath: String? = null,
    val photoBase64: String? = null,
    val gisLat: Double? = null,
    val gisLng: Double? = null,
    val diagnosis: String? = null,
    val severity: String? = null,
    val confidence: Double? = null,
    val mlConfidence: Double? = null,
    val treatment: String? = null,
    val prevention: String? = null,
    val bestPractices: String? = null,
    val createdAt: String? = null,
    val synced: Boolean = false,
    val pendingSync: Boolean = true
)
