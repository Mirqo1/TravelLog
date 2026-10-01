package expo.modules.travellogdrive

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.security.MessageDigest
import java.util.UUID
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

/** All incoming content stays in a private, disposable cache until JS acceptance. */
internal class VisitPackageIO(private val context: Context) {
  private val root = File(context.cacheDir, "travellog-visit-packages")
  private val photoLimit = 2 * 1024 * 1024L
  private val manifestLimit = 50000L
  private val totalLimit = 10 * photoLimit + manifestLimit

  private fun ready() {
    root.mkdirs()
    root.listFiles()?.filter { it.lastModified() < System.currentTimeMillis() - 86400000L }
      ?.forEach { it.deleteRecursively() }
  }
  private fun sha256(file: File): String {
    val digest = MessageDigest.getInstance("SHA-256")
    file.inputStream().use { stream ->
      val bytes = ByteArray(8192)
      while (true) { val count = stream.read(bytes); if (count < 0) break; digest.update(bytes, 0, count) }
    }
    return digest.digest().joinToString("") { "%02x".format(it.toInt() and 0xff) }
  }
  private fun dimensions(file: File): Pair<Int, Int> {
    val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeFile(file.absolutePath, options)
    require(options.outMimeType == "image/jpeg" && options.outWidth in 1..2000 && options.outHeight in 1..2000)
      { "Fotografia v súbore má neplatný formát alebo rozmery." }
    require(file.length() in 1..photoLimit) { "Fotografia je príliš veľká." }
    return Pair(options.outWidth, options.outHeight)
  }
  fun create(manifest: String, urls: List<String>): String {
    require(urls.size <= 10) { "Vyber najviac 10 fotografií." }
    ready()
    val data = JSONObject(manifest)
    require(data.getString("format") == "travellog-visit" && data.getInt("version") == 1)
    val metadata = JSONArray()
    // Snapshot the bytes, so a concurrent local change cannot invalidate checksums.
    val staging = File(root, "send-${UUID.randomUUID()}").apply { mkdirs() }
    val output = File(root, "TravelLog-visit-${UUID.randomUUID()}.zip")
    try {
      val sources = urls.mapIndexed { i, url ->
        val uri = Uri.parse(url)
        require(uri.scheme == "file") { "Zdieľať môžeš iba lokálne fotografie." }
        val original = File(uri.path ?: "").canonicalFile
        require(original.isFile && original.path.startsWith(context.filesDir.canonicalPath + File.separator)
          && original.parentFile?.name == "visit-photos" && Regex("photo-[a-z0-9-]+\\.jpg").matches(original.name))
          { "Fotografia nepatrí do úložiska aplikácie." }
        require(original.length() in 1..photoLimit) { "Fotografia je príliš veľká." }
        val copied = File(staging, "$i.jpg")
        original.copyTo(copied)
        val (width, height) = dimensions(copied)
        metadata.put(JSONObject().put("entry", "photos/$i.jpg").put("bytes", copied.length())
          .put("width", width).put("height", height).put("sha256", sha256(copied)))
        copied
      }
      data.put("photos", metadata)
      val bytes = data.toString().toByteArray(Charsets.UTF_8)
      require(bytes.size <= manifestLimit) { "Text návštevy je príliš dlhý." }
      ZipOutputStream(output.outputStream()).use { zip ->
        zip.putNextEntry(ZipEntry("manifest.json")); zip.write(bytes); zip.closeEntry()
        sources.forEachIndexed { i, file ->
          zip.putNextEntry(ZipEntry("photos/$i.jpg")); file.inputStream().use { it.copyTo(zip) }; zip.closeEntry()
        }
      }
      return Uri.fromFile(output).toString()
    } catch (error: Exception) { output.delete(); throw error }
    finally { staging.deleteRecursively() }
  }
  fun read(uri: Uri): Map<String, Any> {
    require(uri.scheme == "content") { "Vyber súbor cez systémový výber súborov." }
    ready()
    val directory = File(root, "receive-${UUID.randomUUID()}").apply { mkdirs() }
    val archive = File(directory, "input.zip")
    try {
      context.contentResolver.openInputStream(uri)?.use { input ->
        archive.outputStream().use { out ->
          val buffer = ByteArray(8192); var count = 0L
          while (true) {
            val n = input.read(buffer); if (n < 0) break
            count += n; require(count <= totalLimit + 100000) { "Súbor návštevy je príliš veľký." }; out.write(buffer, 0, n)
          }
        }
      } ?: throw IllegalArgumentException("Súbor sa nepodarilo otvoriť.")
      val entries = BoundedVisitArchive.extract(archive.inputStream(), directory)
      archive.delete()
      val manifest = entries["manifest.json"]?.readText(Charsets.UTF_8) ?: throw IllegalArgumentException("Chýba záznam návštevy.")
      val data = JSONObject(manifest)
      require(data.getString("format") == "travellog-visit" && data.getInt("version") == 1)
      val photos = data.getJSONArray("photos")
      require(photos.length() <= 10 && entries.size == photos.length() + 1) { "Počet fotografií nesúhlasí." }
      val files = (0 until photos.length()).map { i ->
        val photo = photos.getJSONObject(i); val name = "photos/$i.jpg"
        require(photo.getString("entry") == name) { "Fotografia má neplatný názov." }
        val file = entries[name] ?: throw IllegalArgumentException("Chýba fotografia.")
        val (width, height) = dimensions(file); val hash = sha256(file)
        require(photo.getLong("bytes") == file.length() && photo.getInt("width") == width
          && photo.getInt("height") == height && photo.getString("sha256") == hash) { "Kontrola fotografie zlyhala." }
        val thumbnail = File(directory, "$i-thumb.jpg")
        val bitmap = BitmapFactory.decodeFile(file.absolutePath, BitmapFactory.Options().apply { inSampleSize = 4 })
        try { if (bitmap != null) thumbnail.outputStream().use { bitmap.compress(Bitmap.CompressFormat.JPEG, 72, it) } }
        finally { bitmap?.recycle() }
        mapOf("thumbUri" to Uri.fromFile(if (thumbnail.isFile) thumbnail else file).toString(), "entry" to name, "uri" to Uri.fromFile(file).toString(), "bytes" to file.length(),
          "width" to width, "height" to height, "sha256" to hash)
      }
      return mapOf("manifest" to manifest, "photos" to files, "directory" to Uri.fromFile(directory).toString())
    } catch (error: Exception) { directory.deleteRecursively(); throw error }
  }
  fun discard(url: String) {
    val uri = Uri.parse(url)
    require(uri.scheme == "file")
    val file = File(uri.path ?: "").canonicalFile
    // Only remove a single package/receiving directory owned by this module.
    require(file.parentFile == root.canonicalFile)
    file.deleteRecursively()
  }
}
