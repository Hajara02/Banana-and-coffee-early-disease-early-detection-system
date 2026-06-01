package com.bananaadvisory.ui

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.bananaadvisory.data.AppDatabase
import com.bananaadvisory.data.ReportEntity
import com.bananaadvisory.databinding.ActivityHistoryBinding
import com.bananaadvisory.network.ApiClient
import com.bananaadvisory.utils.SessionManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class HistoryActivity : AppCompatActivity() {
    private lateinit var binding: ActivityHistoryBinding
    private lateinit var session: SessionManager
    private lateinit var db: AppDatabase
    private lateinit var adapter: ReportAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityHistoryBinding.inflate(layoutInflater)
        setContentView(binding.root)

        session = SessionManager(this)
        db = AppDatabase.getInstance(this)

        adapter = ReportAdapter { report -> openReportDetail(report) }
        binding.recyclerView.layoutManager = LinearLayoutManager(this)
        binding.recyclerView.adapter = adapter

        binding.backButton.setOnClickListener { finish() }
        binding.refreshButton.setOnClickListener { loadReports() }
        binding.syncButton.setOnClickListener { syncPending() }

        loadReports()
    }

    private fun loadReports() {
        val userId = session.getUserId()
        if (userId < 0) return

        lifecycleScope.launch {
            binding.progressBar.visibility = View.VISIBLE

            db.reportDao().getReportsByUser(userId).collect { localReports ->
                val merged = localReports.toMutableList()
                binding.progressBar.visibility = View.GONE

                if (merged.isEmpty()) {
                    fetchFromServer(userId)
                } else {
                    adapter.submitList(merged.sortedByDescending { it.localId })
                }
            }
        }
    }

    private fun fetchFromServer(userId: Int) {
        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val token = session.getToken() ?: return@launch
                val response = ApiClient.apiService.getReports("Bearer $token")
                withContext(Dispatchers.Main) {
                    if (response.isSuccessful && response.body() != null) {
                        val serverReports = response.body()!!.reports
                        lifecycleScope.launch(Dispatchers.IO) {
                            for (sr in serverReports) {
                                val existing = db.reportDao().getReportById(sr.id.toLong())
                                if (existing == null) {
                                    db.reportDao().insert(
                                        ReportEntity(
                                            serverId = sr.id,
                                            userId = userId,
                                            farmerName = sr.farmerName ?: "",
                                            phone = sr.phone ?: "",
                                            location = sr.location ?: "",
                                            crop = sr.crop ?: "",
                                            symptoms = sr.symptoms?.let { com.google.gson.Gson().toJson(it) } ?: "{}",
                                            comments = sr.comments ?: "",
                                            diagnosis = sr.diagnosis,
                                            severity = sr.severity,
                                            confidence = sr.confidence,
                                            mlConfidence = sr.mlConfidence,
                                            treatment = sr.treatment,
                                            prevention = sr.prevention,
                                            bestPractices = sr.bestPractices,
                                            createdAt = sr.createdAt,
                                            synced = true,
                                            pendingSync = false
                                        )
                                    )
                                }
                            }
                            withContext(Dispatchers.Main) {
                                binding.progressBar.visibility = View.GONE
                            }
                        }
                    } else {
                        binding.progressBar.visibility = View.GONE
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    binding.progressBar.visibility = View.GONE
                    Toast.makeText(this@HistoryActivity, "Offline — showing local data", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun syncPending() {
        Toast.makeText(this, "Starting sync...", Toast.LENGTH_SHORT).show()
        com.bananaadvisory.network.SyncWorker.schedule(this)
        AlertDialog.Builder(this)
            .setTitle("Sync Scheduled")
            .setMessage("Pending reports will be synced when network is available.")
            .setPositiveButton("OK", null)
            .show()
    }

    private fun openReportDetail(report: ReportEntity) {
        val intent = Intent(this, ReportDetailActivity::class.java)
        intent.putExtra("localId", report.localId)
        startActivity(intent)
    }

    override fun onResume() {
        super.onResume()
        loadReports()
    }
}
