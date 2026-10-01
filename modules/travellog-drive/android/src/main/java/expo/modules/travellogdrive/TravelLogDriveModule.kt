package expo.modules.travellogdrive

import android.accounts.Account
import android.app.Activity
import android.content.Context
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Intent
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Handler
import android.os.Looper
import com.google.android.gms.auth.api.identity.AuthorizationRequest
import com.google.android.gms.auth.api.identity.AuthorizationResult
import com.google.android.gms.auth.api.identity.ClearTokenRequest
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.common.api.Scope
import androidx.core.content.FileProvider
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.security.MessageDigest
import java.io.File

class TravelLogDriveModule : Module() {
  private var filePicker: Promise? = null
  private val fileRequestCode = 48050
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

    AsyncFunction("createVisitPackage") { manifest: String, photos: List<String> ->
      VisitPackageIO(appContext.reactContext!!).create(manifest, photos)
    }
    AsyncFunction("discardVisitPackage") { url: String ->
      VisitPackageIO(appContext.reactContext!!).discard(url)
    }
    AsyncFunction("pickVisitPackage") { promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null || filePicker != null) {
        promise.reject("PACKAGE_BUSY", "Výber súboru už prebieha alebo aplikácia nie je otvorená.", null)
      } else {
        filePicker = promise
        try {
          activity.startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "*/*"
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
          }, fileRequestCode)
        } catch (error: Exception) {
          filePicker = null
          promise.reject("PACKAGE_FAILED", "Výber súboru sa nepodarilo otvoriť.", error)
        }
      }
    }.runOnQueue(Queues.MAIN)

    OnActivityResult { _, result ->
      if (result.requestCode == fileRequestCode) {
        val promise = filePicker
        filePicker = null
        if (promise != null) {
          val uri = result.data?.data
          if (result.resultCode != Activity.RESULT_OK || uri == null) promise.resolve(null)
          else {
            // ZIP parsing/checksums must not block the UI thread.
            val context = appContext.reactContext
            Thread {
              try {
                if (context == null) throw IllegalStateException("Aplikácia nie je otvorená.")
                promise.resolve(VisitPackageIO(context).read(uri))
              } catch (error: Exception) {
                promise.reject("INVALID_PACKAGE", "Súbor návštevy je neplatný, poškodený alebo príliš veľký.", error)
              }
            }.start()
          }
        }
      }
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
    AsyncFunction("shareImageWithText") { fileUrl: String, text: String, promise: Promise ->
      try {
        val activity = appContext.currentActivity ?: throw IllegalStateException("Aplikácia nie je otvorená.")
        val uri = Uri.parse(fileUrl)
        if (uri.scheme != "file") throw IllegalArgumentException("Fotografia musí byť lokálny súbor.")
        val original = File(uri.path ?: throw IllegalArgumentException("Chýba cesta k fotografii."))
        if (!original.isFile) throw IllegalArgumentException("Fotografia už nie je dostupná.")
        val directory = File(activity.cacheDir, "travellog-share")
        directory.mkdirs()
        directory.listFiles()?.filter { it.lastModified() < System.currentTimeMillis() - 24 * 60 * 60 * 1000L }
          ?.forEach { it.delete() }
        val shared = File(directory, "visit-${System.currentTimeMillis()}.jpg")
        original.copyTo(shared, overwrite = true)
        val content = FileProvider.getUriForFile(activity, activity.packageName + ".SharingFileProvider", shared)
        val intent = Intent(Intent.ACTION_SEND).apply {
          type = "image/jpeg"
          putExtra(Intent.EXTRA_STREAM, content)
          putExtra(Intent.EXTRA_TEXT, text)
          clipData = ClipData.newRawUri("TravelLog", content)
          addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        // Some receivers (including some Messenger flows) ignore EXTRA_TEXT
        // when an image is attached. Keep the user's text available to paste.
        val clipboard = activity.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        clipboard.setPrimaryClip(ClipData.newPlainText("Sprievodný text návštevy", text))
        activity.startActivity(Intent.createChooser(intent, "Zdieľať návštevu"))
        promise.resolve(null)
      } catch (error: Exception) {
        promise.reject("SHARE_FAILED", error.message ?: "Zdieľanie zlyhalo.", error)
      }
    }.runOnQueue(Queues.MAIN)
    OnDestroy { handler.post {
      fail("CANCELLED", "Pripojenie bolo ukončené.")
      filePicker?.reject("CANCELLED", "Výber súboru bol ukončený.", null)
      filePicker = null
    } }
  }
}
