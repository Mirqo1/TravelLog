package expo.modules.travellogdrive;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/** Structural ZIP validation used by Android, testable without the Android SDK. */
public final class BoundedVisitArchive {
  private BoundedVisitArchive() {}
  public static Map<String, File> extract(InputStream input, File directory) throws IOException {
    final long photoLimit = 2L * 1024 * 1024;
    final long manifestLimit = 50000;
    final long totalLimit = 10 * photoLimit + manifestLimit;
    Map<String, File> entries = new LinkedHashMap<>();
    long total = 0;
    try (ZipInputStream zip = new ZipInputStream(input)) {
      ZipEntry entry;
      while ((entry = zip.getNextEntry()) != null) {
        String name = entry.getName();
        if (entry.isDirectory() || !(name.equals("manifest.json") || name.matches("photos/[0-9]\\.jpg"))
            || entries.containsKey(name) || entries.size() >= 11)
          throw new IOException("Unexpected or duplicate archive entry");
        // The output name is derived from our whitelist, never from a path in ZIP.
        String outputName = name.equals("manifest.json") ? "manifest.json" : name.substring(7);
        File file = new File(directory, outputName).getCanonicalFile();
        if (!file.getParentFile().equals(directory.getCanonicalFile())) throw new IOException("Invalid archive path");
        long limit = name.equals("manifest.json") ? manifestLimit : photoLimit;
        long size = 0;
        try (FileOutputStream out = new FileOutputStream(file)) {
          byte[] buffer = new byte[8192];
          int count;
          while ((count = zip.read(buffer)) != -1) {
            size += count; total += count;
            if (size > limit || total > totalLimit) throw new IOException("Archive content too large");
            out.write(buffer, 0, count);
          }
        }
        entries.put(name, file);
        zip.closeEntry();
      }
    }
    if (!entries.containsKey("manifest.json")) throw new IOException("Missing manifest");
    return entries;
  }
}
