package com.bananaadvisory.ui

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.bananaadvisory.databinding.ActivityRegisterBinding
import com.bananaadvisory.network.ApiClient
import com.bananaadvisory.network.RegisterRequest
import com.bananaadvisory.utils.SessionManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class RegisterActivity : AppCompatActivity() {
    private lateinit var binding: ActivityRegisterBinding
    private lateinit var session: SessionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityRegisterBinding.inflate(layoutInflater)
        setContentView(binding.root)

        session = SessionManager(this)

        binding.registerButton.setOnClickListener {
            val name = binding.farmerNameInput.text.toString().trim()
            val phone = binding.phoneInput.text.toString().trim()
            val password = binding.passwordInput.text.toString().trim()
            val location = binding.locationInput.text.toString().trim()

            if (name.isEmpty() || phone.isEmpty() || password.isEmpty()) {
                Toast.makeText(this, "Name, phone, and password are required", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            if (password.length < 4) {
                Toast.makeText(this, "Password must be at least 4 characters", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            register(name, phone, password, location)
        }

        binding.loginLink.setOnClickListener {
            finish()
        }
    }

    private fun register(name: String, phone: String, password: String, location: String) {
        binding.registerButton.isEnabled = false
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val response = ApiClient.apiService.register(
                    RegisterRequest(farmerName = name, phone = phone, password = password, location = location)
                )
                withContext(Dispatchers.Main) {
                    binding.registerButton.isEnabled = true
                    if (response.isSuccessful && response.body() != null) {
                        val body = response.body()!!
                        if (body.token != null) {
                            session.saveToken(body.token)
                            session.saveUserId(body.userId ?: -1)
                            body.farmer?.let {
                                session.saveFarmerName(it.farmerName)
                                session.savePhone(it.phone)
                            }
                            Toast.makeText(this@RegisterActivity, "Registration successful", Toast.LENGTH_SHORT).show()
                            startActivity(Intent(this@RegisterActivity, MainActivity::class.java))
                            finish()
                        } else {
                            Toast.makeText(this@RegisterActivity, body.error ?: "Registration failed", Toast.LENGTH_SHORT).show()
                        }
                    } else {
                        val errorBody = response.errorBody()?.string() ?: "Registration failed"
                        Toast.makeText(this@RegisterActivity, errorBody, Toast.LENGTH_SHORT).show()
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    binding.registerButton.isEnabled = true
                    Toast.makeText(this@RegisterActivity, "Network error: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
}
