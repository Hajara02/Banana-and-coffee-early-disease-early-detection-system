package com.bananaadvisory.network

import com.google.gson.annotations.SerializedName

data class LoginRequest(val phone: String, val password: String)

data class RegisterRequest(
    @SerializedName("farmerName") val farmerName: String,
    val phone: String,
    val password: String,
    val location: String = ""
)

data class AuthResponse(
    val message: String,
    val userId: Int? = null,
    val token: String? = null,
    val farmer: FarmerDto? = null,
    val error: String? = null
)

data class FarmerDto(
    val id: Int,
    @SerializedName("farmerName") val farmerName: String,
    val phone: String,
    val location: String? = null,
    val createdAt: String? = null
)

data class ProfileResponse(val farmer: FarmerDto, val error: String? = null)

data class ReportRequest(
    val crop: String,
    val symptoms: Map<String, Boolean>,
    val comments: String = "",
    val location: String = "",
    @SerializedName("farmerName") val farmerName: String = "",
    val phone: String = "",
    val gis: GisDto? = null,
    @SerializedName("photoBase64") val photoBase64: String? = null
)

data class GisDto(val lat: Double, val lng: Double)

data class ReportResponse(
    val id: Int,
    val userId: Int? = null,
    @SerializedName("farmerName") val farmerName: String? = null,
    val phone: String? = null,
    val location: String? = null,
    val crop: String? = null,
    val symptoms: Map<String, Boolean>? = null,
    val comments: String? = null,
    val photoPath: String? = null,
    val gis: GisDto? = null,
    val diagnosis: String? = null,
    val severity: String? = null,
    val confidence: Double? = null,
    @SerializedName("mlConfidence") val mlConfidence: Double? = null,
    val treatment: String? = null,
    val prevention: String? = null,
    @SerializedName("bestPractices") val bestPractices: String? = null,
    val createdAt: String? = null,
    val synced: Boolean? = null,
    val advisory: AdvisoryDto? = null,
    val error: String? = null
)

data class AdvisoryDto(
    val treatment: List<String>? = null,
    val prevention: List<String>? = null,
    @SerializedName("bestPractices") val bestPractices: List<String>? = null
)

data class ReportListResponse(
    val count: Int,
    val reports: List<ReportResponse>,
    val error: String? = null
)

data class BatchSyncRequest(val reports: List<ReportRequestWithExtras>)

data class ReportRequestWithExtras(
    val crop: String,
    val symptoms: Map<String, Boolean>,
    val comments: String = "",
    val location: String = "",
    @SerializedName("farmerName") val farmerName: String = "",
    val phone: String = "",
    val gis: GisDto? = null,
    @SerializedName("photoBase64") val photoBase64: String? = null
)

data class BatchSyncResponse(
    val synced: Int,
    val reports: List<ReportResponse>,
    val error: String? = null
)
