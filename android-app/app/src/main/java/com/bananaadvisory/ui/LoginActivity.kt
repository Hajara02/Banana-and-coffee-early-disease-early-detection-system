package com.bananaadvisory.ui

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.bananaadvisory.databinding.ActivityLoginBinding
import com.bananaadvisory.network.ApiClient
import com.bananaadvisory.network.LoginRequest
import com.bananaadvisory.utils.SessionManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class LoginActivity : AppCompatActivity() {
    private lateinit var binding: ActivityLoginBinding
    private lateinit var session: SessionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        session = SessionManager(this)

        if (session.isLoggedIn()) {
            navigateToMain()
            return
        }

        binding.loginButton.setOnClickListener {
            val phone = binding.phoneInput.text.toString().trim()
            val password = binding.passwordInput.text.toString().trim()

            if (phone.isEmpty() || password.isEmpty()) {
                Toast.makeText(this, "Please enter phone and password", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            login(phone, password)
        }

        binding.registerLink.setOnClickListener {
            startActivity(Intent(this, RegisterActivity::class.java))
        }
    }

    private fun login(phone: String, password: String) {
        binding.loginButton.isEnabled = false
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val response = ApiClient.apiService.login(LoginRequest(phone, password))
                withContext(Dispatchers.Main) {
                    binding.loginButton.isEnabled = true
                    if (response.isSuccessful && response.body() != null) {
                        val body = response.body()!!
                        if (body.token != null) {
                            session.saveToken(body.token)
                            session.saveUserId(body.userId ?: -1)
                            body.farmer?.let {
                                session.saveFarmerName(it.farmerName)
                                session.savePhone(it.phone)
                            }
                            Toast.makeText(this@LoginActivity, "Login successful", Toast.LENGTH_SHORT).show()
                            navigateToMain()
                        } else {
                            Toast.makeText(this@LoginActivity, body.error ?: "Login failed", Toast.LENGTH_SHORT).show()
                        }
                    } else {
                        val errorBody = response.errorBody()?.string() ?: "Login failed"
                        Toast.makeText(this@LoginActivity, errorBody, Toast.LENGTH_SHORT).show()
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    binding.loginButton.isEnabled = true
                    Toast.makeText(this@LoginActivity, "Network error: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun navigateToMain() {
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }
}
