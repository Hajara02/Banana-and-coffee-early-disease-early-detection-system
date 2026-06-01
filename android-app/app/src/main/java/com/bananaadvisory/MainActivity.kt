package com.bananaadvisory

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.location.Location
import android.location.LocationManager
import android.os.Bundle
import android.provider.MediaStore
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.bananaadvisory.data.AppDatabase
import com.bananaadvisory.data.ReportEntity
import com.bananaadvisory.databinding.ActivityMainBinding
import com.bananaadvisory.network.*
import com.bananaadvisory.ui.HistoryActivity
import com.bananaadvisory.ui.LoginActivity
import com.bananaadvisory.utils.SessionManager
import com.google.gson.Gson
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private lateinit var session: SessionManager
    private lateinit var db: AppDatabase
    private var capturedBitmap: Bitmap? = null
    private var userLocation: Location? = null
    private var offlineMode = false

    private val takePicture = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        val bitmap = result.data?.extras?.get("data") as? Bitmap
        if (bitmap != null) {
            capturedBitmap = bitmap
            binding.photoPreview.setImageBitmap(capturedBitmap)
            binding.photoPreview.visibility = android.view.View.VISIBLE
        }
    }

    private val requestPermissionLauncher = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { permissions ->
        val cameraGranted = permissions[Manifest.permission.CAMERA] ?: false
        if (cameraGranted) openCamera()
        if (permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true) getUserLocation()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        session = SessionManager(this)
        db = AppDatabase.getInstance(this)

        if (!session.isLoggedIn()) {
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
            return
        }

        binding.farmerNameInput.setText(session.getFarmerName() ?: "")
        binding.phoneInput.setText(session.getPhone() ?: "")

        binding.cropSpinner.adapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_dropdown_item,
            listOf("Banana", "Coffee")
        )

        binding.capturePhotoButton.setOnClickListener {
            when {
                ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED -> openCamera()
                else -> requestPermissionLauncher.launch(arrayOf(Manifest.permission.CAMERA))
            }
        }

        binding.submitButton.setOnClickListener {
            val symptoms = collectSymptoms()
            if (symptoms.values.none { it }) {
                Toast.makeText(this, "Please select at least one symptom.", Toast.LENGTH_LONG).show()
                return@setOnClickListener
            }
            if (binding.farmerNameInput.text.isNullOrBlank()) {
                Toast.makeText(this, "Please enter farmer name", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            submitReport(symptoms)
        }

        binding.historyButton.setOnClickListener {
            startActivity(Intent(this, HistoryActivity::class.java))
        }

        binding.logoutButton.setOnClickListener {
            AlertDialog.Builder(this)
                .setTitle("Logout")
                .setMessage("Are you sure you want to logout?")
                .setPositiveButton("Yes") { _, _ ->
                    session.logout()
                    startActivity(Intent(this, LoginActivity::class.java))
                    finish()
                }
                .setNegativeButton("No", null)
                .show()
        }

        checkLocationPermission()
    }

    private fun checkLocationPermission() {
        when {
            ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED -> getUserLocation()
            else -> requestPermissionLauncher.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION))
        }
    }

    private fun openCamera() {
        val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
        takePicture.launch(intent)
    }

    private fun getUserLocation() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            val locationManager = getSystemService(LOCATION_SERVICE) as LocationManager
            userLocation = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER) ?: locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
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
            "stuntedGrowth" to binding.stuntedGrowthCheckbox.isChecked,
            "rottenPseudostem" to binding.rottenPseudostemCheckbox.isChecked,
            "leafSpots" to binding.leafSpotsCheckbox.isChecked
        )
    }

    private fun bitmapToBase64(bitmap: Bitmap?): String? {
        if (bitmap == null) return null
        val outputStream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, 70, outputStream)
        return android.util.Base64.encodeToString(outputStream.toByteArray(), android.util.Base64.DEFAULT)
    }

    private fun submitReport(symptoms: Map<String, Boolean>) {
        binding.submitButton.isEnabled = false
        binding.submitButton.text = "Submitting..."

        val crop = binding.cropSpinner.selectedItem.toString().lowercase()
        val comments = binding.commentsInput.text.toString().trim()
        val location = binding.locationInput.text.toString().trim()
        val farmerName = binding.farmerNameInput.text.toString().trim()
        val phone = binding.phoneInput.text.toString().trim()
        val gis = userLocation?.let { GisDto(it.latitude, it.longitude) }
        val photoBase64 = bitmapToBase64(capturedBitmap)

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val request = ReportRequest(
                    crop = crop,
                    symptoms = symptoms,
                    comments = comments,
                    location = location,
                    farmerName = farmerName,
                    phone = phone,
                    gis = gis,
                    photoBase64 = photoBase64
                )

                val token = session.getToken() ?: ""
                val response = ApiClient.apiService.submitReport("Bearer $token", request)

                withContext(Dispatchers.Main) {
                    binding.submitButton.isEnabled = true
                    binding.submitButton.text = "Submit Report"

                    if (response.isSuccessful && response.body() != null) {
                        val report = response.body()!!
                        showAdvisory(report)
                        Toast.makeText(this@MainActivity, "Report submitted successfully", Toast.LENGTH_SHORT).show()
                        clearForm()
                    } else {
                        saveOfflineAndSync(crop, symptoms, comments, location, farmerName, phone, gis, photoBase64)
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    binding.submitButton.isEnabled = true
                    binding.submitButton.text = "Submit Report"
                    saveOfflineAndSync(crop, symptoms, comments, location, farmerName, phone, gis, photoBase64)
                }
            }
        }
    }

    private fun saveOfflineAndSync(
        crop: String, symptoms: Map<String, Boolean>, comments: String,
        location: String, farmerName: String, phone: String,
        gis: GisDto?, photoBase64: String?
    ) {
        CoroutineScope(Dispatchers.IO).launch {
            val entity = ReportEntity(
                userId = session.getUserId(),
                farmerName = farmerName,
                phone = phone,
                location = location,
                crop = crop,
                symptoms = Gson().toJson(symptoms),
                comments = comments,
                photoBase64 = photoBase64,
                gisLat = gis?.lat,
                gisLng = gis?.lng,
                createdAt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).format(Date()),
                synced = false,
                pendingSync = true
            )
            db.reportDao().insert(entity)
            SyncWorker.schedule(this@MainActivity)
        }

        runOnUiThread {
            Toast.makeText(this, "Saved offline. Will sync when online.", Toast.LENGTH_LONG).show()
            clearForm()
        }
    }

    private fun showAdvisory(report: ReportResponse) {
        binding.resultTitle.text = report.diagnosis ?: "Unknown"
        binding.resultConfidence.text = "Confidence: ${String.format("%.1f", (report.confidence ?: 0.0) * 100)}%"
        binding.resultSeverity.text = "Severity: ${report.severity?.replaceFirstChar { it.uppercase() } ?: "Unknown"}"

        val advice = buildString {
            report.advisory?.treatment?.let {
                if (it.isNotEmpty()) {
                    appendLine("TREATMENT:")
                    it.forEachIndexed { i, s -> appendLine("${i + 1}. $s") }
                    appendLine()
                }
            }
            report.advisory?.prevention?.let {
                if (it.isNotEmpty()) {
                    appendLine("PREVENTION:")
                    it.forEachIndexed { i, s -> appendLine("${i + 1}. $s") }
                    appendLine()
                }
            }
            report.advisory?.bestPractices?.let {
                if (it.isNotEmpty()) {
                    appendLine("BEST PRACTICES:")
                    it.forEachIndexed { i, s -> appendLine("${i + 1}. $s") }
                }
            }
        }
        binding.resultList.text = advice
        binding.advisoryCard.visibility = android.view.View.VISIBLE
    }

    private fun clearForm() {
        binding.farmerNameInput.setText(session.getFarmerName() ?: "")
        binding.phoneInput.setText(session.getPhone() ?: "")
        binding.locationInput.text?.clear()
        binding.commentsInput.text?.clear()
        binding.wiltingCheckbox.isChecked = false
        binding.yellowLeavesCheckbox.isChecked = false
        binding.boiledAppearanceCheckbox.isChecked = false
        binding.oozeCheckbox.isChecked = false
        binding.rustSpotsCheckbox.isChecked = false
        binding.defoliationCheckbox.isChecked = false
        binding.powderyDustCheckbox.isChecked = false
        binding.brownNecrosisCheckbox.isChecked = false
        binding.stuntedGrowthCheckbox.isChecked = false
        binding.rottenPseudostemCheckbox.isChecked = false
        binding.leafSpotsCheckbox.isChecked = false
        binding.photoPreview.visibility = android.view.View.GONE
        capturedBitmap = null
        binding.cropSpinner.setSelection(0)
    }
}
