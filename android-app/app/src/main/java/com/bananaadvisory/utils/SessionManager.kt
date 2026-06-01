package com.bananaadvisory.utils

import android.content.Context
import android.content.SharedPreferences

class SessionManager(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)

    fun saveToken(token: String) {
        prefs.edit().putString(KEY_TOKEN, token).apply()
    }

    fun getToken(): String? = prefs.getString(KEY_TOKEN, null)

    fun saveUserId(userId: Int) {
        prefs.edit().putInt(KEY_USER_ID, userId).apply()
    }

    fun getUserId(): Int = prefs.getInt(KEY_USER_ID, -1)

    fun saveFarmerName(name: String) {
        prefs.edit().putString(KEY_FARMER_NAME, name).apply()
    }

    fun getFarmerName(): String? = prefs.getString(KEY_FARMER_NAME, null)

    fun savePhone(phone: String) {
        prefs.edit().putString(KEY_PHONE, phone).apply()
    }

    fun getPhone(): String? = prefs.getString(KEY_PHONE, null)

    fun isLoggedIn(): Boolean = getToken() != null

    fun logout() {
        prefs.edit().clear().apply()
    }

    companion object {
        private const val PREF_NAME = "farm_advisory_session"
        private const val KEY_TOKEN = "auth_token"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_FARMER_NAME = "farmer_name"
        private const val KEY_PHONE = "phone"
    }
}
