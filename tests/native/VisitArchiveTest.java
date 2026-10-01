import expo.modules.travellogdrive.BoundedVisitArchive;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.zip.*;

public class VisitArchiveTest {
  private static byte[] zip(Map<String, byte[]> items) throws IOException {
    ByteArrayOutputStream bytes = new ByteArrayOutputStream();
    try (ZipOutputStream zip = new ZipOutputStream(bytes)) {
      for (Map.Entry<String, byte[]> item : items.entrySet()) {
        zip.putNextEntry(new ZipEntry(item.getKey())); zip.write(item.getValue()); zip.closeEntry();
      }
    }
    return bytes.toByteArray();
  }
  private static Map<String, byte[]> items(String extra, byte[] body) {
    Map<String, byte[]> data = new LinkedHashMap<>();
    data.put("manifest.json", "{\"version\":1}".getBytes()); data.put(extra, body); return data;
  }
  private static void reject(byte[] zip, File directory) throws Exception {
    boolean rejected = false;
    try { BoundedVisitArchive.extract(new ByteArrayInputStream(zip), directory); }
    catch (IOException expected) { rejected = true; }
    if (!rejected) throw new AssertionError("Unsafe archive accepted");
  }
  public static void main(String[] args) throws Exception {
    File root = Files.createTempDirectory("visit-archive-test-").toFile();
    File directory = new File(root, "receive"); directory.mkdir();
    try {
      byte[] original = "PHOTO CONTENT".getBytes();
      Map<String,File> read = BoundedVisitArchive.extract(new ByteArrayInputStream(zip(items("photos/0.jpg", original))), directory);
      if (read.size() != 2 || !Arrays.equals(Files.readAllBytes(read.get("photos/0.jpg").toPath()), original)) throw new AssertionError("Content changed");
      File sentinel = new File(root, "outside.jpg"); Files.writeString(sentinel.toPath(), "KEEP");
      for (String path : new String[]{"../outside.jpg", "/absolute.jpg", "photos/../outside.jpg", "photos/0.jpg/", "photos/10.jpg", "tokens.json"})
        reject(zip(items(path, original)), directory);
      if (!Files.readString(sentinel.toPath()).equals("KEEP")) throw new AssertionError("Outside file changed");
      reject(zip(items("photos/0.jpg", new byte[2 * 1024 * 1024 + 1])), directory); // decompression bomb
      Map<String,byte[]> large = items("photos/0.jpg", original); large.put("manifest.json", new byte[50001]);
      reject(zip(large), directory);
      Map<String,byte[]> missing = new LinkedHashMap<>(); missing.put("photos/0.jpg", original);
      reject(zip(missing), directory);
      Map<String,byte[]> duplicate = items("photos/0.jpg", original); duplicate.put("photos/1.jpg", original);
      byte[] dupeBytes = zip(duplicate); byte[] oldName = "photos/1.jpg".getBytes(), sameName = "photos/0.jpg".getBytes();
      for (int i=0;i<=dupeBytes.length-oldName.length;i++) {
        boolean match=true;for(int j=0;j<oldName.length;j++)if(dupeBytes[i+j]!=oldName[j])match=false;
        if(match)System.arraycopy(sameName,0,dupeBytes,i,sameName.length);
      }
      reject(dupeBytes, directory);
      byte[] broken = zip(items("photos/0.jpg", original));
      // Damage compressed bytes while retaining ZIP headers: CRC/decode must fail.
      broken[50] ^= 0x7f; reject(broken, directory);
      System.out.println("PASS: actual Android ZIP extractor roundtrip, traversal/absolute/directory/unknown paths, duplicate entries, missing/oversized manifest, decompression limit and corrupt archive rejection.");
    } finally {
      try (java.util.stream.Stream<Path> stream = Files.walk(root.toPath())) {
        for(Path path : stream.sorted(Comparator.reverseOrder()).toArray(Path[]::new)) Files.deleteIfExists(path);
      }
    }
  }
}
