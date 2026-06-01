package com.bananaadvisory.ui

import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import com.bananaadvisory.data.AppDatabase
import com.bananaadvisory.databinding.ActivityReportDetailBinding
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class ReportDetailActivity : AppCompatActivity() {
    private lateinit var binding: ActivityReportDetailBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityReportDetailBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val localId = intent.getLongExtra("localId", -1)
        if (localId < 0) {
            finish()
            return
        }

        binding.backButton.setOnClickListener { finish() }

        CoroutineScope(Dispatchers.IO).launch {
            val db = AppDatabase.getInstance(this@ReportDetailActivity)
            val report = db.reportDao().getReportById(localId)

            if (report != null) {
                runOnUiThread {
                    binding.cropValue.text = report.crop.replaceFirstChar { it.uppercase() }
                    binding.diagnosisValue.text = report.diagnosis ?: "Pending"
                    binding.severityValue.text = report.severity?.replaceFirstChar { it.uppercase() } ?: "Unknown"
                    binding.confidenceValue.text = report.confidence?.let { "${String.format("%.1f", it * 100)}%" } ?: "N/A"
                    binding.farmerValue.text = report.farmerName
                    binding.phoneValue.text = report.phone
                    binding.locationValue.text = report.location.ifEmpty { "Not specified" }
                    binding.dateValue.text = report.createdAt?.substringBefore("T") ?: "Unknown"
                    binding.commentsValue.text = report.comments.ifEmpty { "No comments" }

                    val gson = Gson()
                    val treatment = report.treatment?.let {
                        try {
                            gson.fromJson(it, object : TypeToken<List<String>>() {}.type) as? List<String>
                        } catch (e: Exception) { null }
                    }
                    val prevention = report.prevention?.let {
                        try {
                            gson.fromJson(it, object : TypeToken<List<String>>() {}.type) as? List<String>
                        } catch (e: Exception) { null }
                    }
                    val bestPractices = report.bestPractices?.let {
                        try {
                            gson.fromJson(it, object : TypeToken<List<String>>() {}.type) as? List<String>
                        } catch (e: Exception) { null }
                    }

                    val advice = buildString {
                        if (!treatment.isNullOrEmpty()) {
                            appendLine("TREATMENT:")
                            treatment.forEachIndexed { i, s -> appendLine("${i + 1}. $s") }
                            appendLine()
                        }
                        if (!prevention.isNullOrEmpty()) {
                            appendLine("PREVENTION:")
                            prevention.forEachIndexed { i, s -> appendLine("${i + 1}. $s") }
                            appendLine()
                        }
                        if (!bestPractices.isNullOrEmpty()) {
                            appendLine("BEST PRACTICES:")
                            bestPractices.forEachIndexed { i, s -> appendLine("${i + 1}. $s") }
                        }
                    }
                    binding.adviceValue.text = advice
                    binding.adviceCard.visibility = View.VISIBLE
                }
            }
        }
    }
}
