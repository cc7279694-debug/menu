# APK-5A dependency boundary

Only added production dependency: `com.squareup.okhttp3:okhttp:4.12.0`, Apache-2.0; test-only `com.squareup.okhttp3:mockwebserver:4.12.0`, same license. Explicit version, not a transitive accident. Tagged upstream README requires Android API21+ / Java8+, compatible with existing min24 / Java21. Existing Okio/Kotlin dependencies are reused/resolved by Gradle; no unrelated upgrades.

Sources: [tagged requirements and license](https://github.com/square/okhttp/blob/parent-4.12.0/README.md), [custom DNS contract](https://github.com/square/okhttp/blob/parent-4.12.0/okhttp/src/main/kotlin/okhttp3/Dns.kt), [client configuration](https://github.com/square/okhttp/blob/parent-4.12.0/okhttp/src/main/kotlin/okhttp3/OkHttpClient.kt).

Existing Cheerio1.1.2 (MIT), imported via `cheerio/slim`, handles inert client-side parsing without Node HTTP/undici. No jsoup, recipe-scrapers, headless browser, new npm package or server. MockWebServer is never bundled into the application. Test socket mapping to a local fake server belongs only to test code; production always uses validated public addresses and system TLS.
