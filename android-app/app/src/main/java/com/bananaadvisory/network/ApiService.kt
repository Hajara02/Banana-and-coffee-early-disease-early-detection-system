package com.bananaadvisory.network

import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    @POST("api/register")
    suspend fun register(@Body request: RegisterRequest): Response<AuthResponse>

    @POST("api/login")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>

    @GET("api/profile")
    suspend fun getProfile(@Header("Authorization") token: String): Response<ProfileResponse>

    @POST("api/report/json")
    suspend fun submitReport(
        @Header("Authorization") token: String,
        @Body request: ReportRequest
    ): Response<ReportResponse>

    @GET("api/reports")
    suspend fun getReports(
        @Header("Authorization") token: String
    ): Response<ReportListResponse>

    @GET("api/reports/{id}")
    suspend fun getReport(
        @Header("Authorization") token: String,
        @Path("id") id: Int
    ): Response<ReportResponse>

    @POST("api/reports/batch")
    suspend fun batchSync(
        @Header("Authorization") token: String,
        @Body request: BatchSyncRequest
    ): Response<BatchSyncResponse>
}
