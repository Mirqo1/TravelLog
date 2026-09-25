package expo.modules.travellogdrive

import android.accounts.Account
import android.app.Activity
import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Handler
import android.os.Looper
import com.google.android.gms.auth.api.identity.AuthorizationRequest
import com.google.android.gms.auth.api.identity.AuthorizationResult
import com.google.android.gms.auth.api.identity.ClearTokenRequest
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.common.api.Scope
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.security.MessageDigest

class TravelLogDriveModule : Module() {
  private val scope = "https://www.googleapis.com/auth/drive.appdata"
  private var pending: Promise? = null
  private var requestCode = 47000
  private val handler = Handler(Looper.getMainLooper())
  private val timeout = Runnable { fail("AUTH_REQUIRED", "Pripojenie vypršalo. Skús pripojiť Disk znova.") }

  private fun fail(code: String, message: String) {
    val promise = pending
    pending = null
    handler.removeCallbacks(timeout)
    promise?.reject(code, message, null)
  }
  private fun finish(result: AuthorizationResult) {
    if (result.accessToken.isNullOrBlank() || !result.grantedScopes.contains(scope)) {
      fail("AUTH_REQUIRED", "Prístup k zálohe nebol povolený.")
      return
    }
    val promise = pending
    pending = null
    handler.removeCallbacks(timeout)
    promise?.resolve(result.accessToken)
  }

  override fun definition() = ModuleDefinition {
    Name("TravelLogDrive")
    AsyncFunction("authorize") { email: String?, interactive: Boolean, chooseAccount: Boolean, promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.reject("AUTH_REQUIRED", "Otvor aplikáciu a pripoj Google Disk.", null)
      } else if (pending != null) {
        promise.reject("BUSY", "Pripojenie už prebieha.", null)
      } else {
        pending = promise
        val code = ++requestCode
        handler.postDelayed(timeout, 120000)
        val builder = AuthorizationRequest.builder().setRequestedScopes(listOf(Scope(scope)))
        if (!email.isNullOrBlank()) builder.setAccount(Account(email, "com.google"))
        if (chooseAccount) builder.setPrompt(AuthorizationRequest.Prompt.SELECT_ACCOUNT)
        Identity.getAuthorizationClient(activity).authorize(builder.build())
          .addOnSuccessListener { result ->
            if (pending === promise) {
              if (result.hasResolution()) {
                if (!interactive) fail("AUTH_REQUIRED", "V Profile obnov pripojenie Google Disku.")
                else try {
                  activity.startIntentSenderForResult(result.pendingIntent!!.intentSender, code, null, 0, 0, 0)
                } catch (_: Exception) { fail("AUTH_REQUIRED", "Google Disk sa nepodarilo pripojiť.") }
              } else finish(result)
            }
          }
          .addOnFailureListener { if (pending === promise) fail("AUTH_REQUIRED", "Google Disk sa nepodarilo autorizovať. Skontroluj účet, internet a nastavenie OAuth.") }
      }
    }.runOnQueue(Queues.MAIN)

    OnActivityResult { _, result ->
      if (pending != null && result.requestCode == requestCode) {
        if (result.resultCode != Activity.RESULT_OK) fail("CANCELLED", "Pripojenie bolo zrušené.")
        else try {
          finish(Identity.getAuthorizationClient(appContext.reactContext!!).getAuthorizationResultFromIntent(result.data))
        } catch (_: Exception) { fail("AUTH_REQUIRED", "Prístup k Disku nebol povolený.") }
      }
    }
    AsyncFunction("clearToken") { token: String, promise: Promise ->
      Identity.getAuthorizationClient(appContext.reactContext!!)
        .clearToken(ClearTokenRequest.builder().setToken(token).build())
        .addOnSuccessListener { promise.resolve() }
        .addOnFailureListener { promise.reject("AUTH_REQUIRED", "Obnov pripojenie Disku.", null) }
    }
    Function("sha256") { value: String ->
      MessageDigest.getInstance("SHA-256").digest(value.toByteArray(Charsets.UTF_8))
        .joinToString("") { "%02x".format(it.toInt() and 0xff) }
    }
    Function("network") {
      val manager = appContext.reactContext!!.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
      val caps = manager.getNetworkCapabilities(manager.activeNetwork)
      mapOf("online" to (caps?.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED) == true),
        "wifi" to (caps?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true))
    }
    OnDestroy { handler.post { fail("CANCELLED", "Pripojenie bolo ukončené.") } }
  }
}
