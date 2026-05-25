package com.bananaadvisory

import android.os.Bundle
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.bananaadvisory.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.cropSpinner.adapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_dropdown_item,
            listOf("Banana", "Coffee")
        )

        binding.submitButton.setOnClickListener {
            val symptoms = collectSymptoms()
            if (symptoms.values.none { it }) {
                Toast.makeText(this, "Please select at least one symptom.", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            val advisory = analyzeReport(
                binding.cropSpinner.selectedItem.toString().lowercase(),
                symptoms
            )

            showAdvisory(advisory)
        }
    }

    private fun collectSymptoms(): Map<String, Boolean> {
        return mapOf(
            "wilting" to binding.wiltingCheckbox.isChecked,
            "yellowLeaves" to binding.yellowLeavesCheckbox.isChecked,
            "boiledAppearance" to binding.boiledAppearanceCheckbox.isChecked,
            "ooze" to binding.oozeCheckbox.isChecked,
            "rustSpots" to binding.rustSpotsCheckbox.isChecked,
            "defoliation" to binding.defoliationCheckbox.isChecked,
            "powderyDust" to binding.powderyDustCheckbox.isChecked,
            "brownNecrosis" to binding.brownNecrosisCheckbox.isChecked,
            "stuntedGrowth" to binding.stuntedGrowthCheckbox.isChecked
        )
    }

    private fun analyzeReport(crop: String, symptoms: Map<String, Boolean>): AdvisoryResult {
        val score = when (crop) {
            "banana" -> listOf(
                symptoms["wilting"].takeIf { it == true }?.let { 3 } ?: 0,
                symptoms["yellowLeaves"].takeIf { it == true }?.let { 2 } ?: 0,
                symptoms["boiledAppearance"].takeIf { it == true }?.let { 3 } ?: 0,
                symptoms["ooze"].takeIf { it == true }?.let { 3 } ?: 0,
                symptoms["stuntedGrowth"].takeIf { it == true }?.let { 1 } ?: 0,
            ).sum()
            "coffee" -> listOf(
                symptoms["rustSpots"].takeIf { it == true }?.let { 3 } ?: 0,
                symptoms["defoliation"].takeIf { it == true }?.let { 2 } ?: 0,
                symptoms["powderyDust"].takeIf { it == true }?.let { 2 } ?: 0,
                symptoms["brownNecrosis"].takeIf { it == true }?.let { 1 } ?: 0,
                symptoms["stuntedGrowth"].takeIf { it == true }?.let { 1 } ?: 0,
            ).sum()
            else -> 0
        }

        return if (crop == "banana") {
            when {
                score >= 7 -> AdvisoryResult(
                    "Banana Bacterial Wilt",
                    "High",
                    "Immediate action needed",
                    listOf(
                        "Remove and destroy infected banana mats.",
                        "Disinfect tools after each use.",
                        "Keep healthy and infected plants separate.",
                        "Report the infection to local extension officers."
                    )
                )
                score >= 4 -> AdvisoryResult(
                    "Possible Banana Bacterial Wilt",
                    "Medium",
                    "High risk",
                    listOf(
                        "Inspect nearby plants for early symptoms.",
                        "Avoid irrigation contact with infected material.",
                        "Clean tools and boots between plots.",
                        "Monitor the farm closely for changes."
                    )
                )
                else -> AdvisoryResult(
                    "No strong banana wilt signal detected",
                    "Low",
                    "Observe closely",
                    listOf(
                        "Continue regular scouting for wilting and oozing.",
                        "Maintain good farm hygiene.",
                        "Update the app if new symptoms appear."
                    )
                )
            }
        } else {
            when {
                score >= 7 -> AdvisoryResult(
                    "Coffee Leaf Rust",
                    "High",
                    "Immediate action needed",
                    listOf(
                        "Prune and remove infected leaves.",
                        "Collect and destroy fallen leaves.",
                        "Apply copper-based fungicide as directed.",
                        "Improve airflow around coffee plants."
                    )
                )
                score >= 4 -> AdvisoryResult(
                    "Possible Coffee Leaf Rust",
                    "Medium",
                    "High risk",
                    listOf(
                        "Check neighbouring plants for rust spots.",
                        "Remove heavily infected leaves.",
                        "Avoid overhead irrigation.",
                        "Monitor the crop daily."
                    )
                )
                else -> AdvisoryResult(
                    "No strong coffee rust signal detected",
                    "Low",
                    "Observe closely",
                    listOf(
                        "Maintain good shade and field sanitation.",
                        "Report new symptoms promptly.",
                        "Keep track of leaf health and weather patterns."
                    )
                )
            }
        }
    }

    private fun showAdvisory(advisory: AdvisoryResult) {
        binding.resultTitle.text = advisory.disease
        binding.resultConfidence.text = "Confidence: ${advisory.confidence}"
        binding.resultRisk.text = "Risk: ${advisory.risk}"
        binding.resultList.text = advisory.advice.joinToString(separator = "\n\n") { "• $it" }
        binding.advisoryCard.visibility = android.view.View.VISIBLE
    }
}

data class AdvisoryResult(
    val disease: String,
    val confidence: String,
    val risk: String,
    val advice: List<String>
)
