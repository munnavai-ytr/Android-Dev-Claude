/**
 * DroidForge Standard Android Template Generator
 * 
 * Versions chosen (latest stable & mutually compatible):
 * - Android Gradle Plugin (AGP): 8.7.2
 * - Kotlin: 2.0.21 (with official Kotlin 2.0 Compose compiler plugin)
 * - Jetpack Compose BOM: 2024.10.01
 * - Target SDK: 35 (Android 15)
 * - Min SDK: 26 (Android 8.0 Oreo)
 * - Java / JVM: 17
 * 
 * Note: All versions are defined strictly inside gradle/libs.versions.toml.
 * Zero binary files: app icons are 100% Android Vector Drawables (XML).
 */

export interface TemplateParams {
  name: string;
  packageName: string;
  idea?: string;
  architecture?: string;
}

export function sanitizePackageName(name: string): string {
  const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `com.droidforge.${clean || 'app'}`;
}

export function sanitizeClassName(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9]/g, '');
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : 'DroidApp';
}

export function generateAndroidTemplate(params: TemplateParams): Record<string, string> {
  const { name, packageName } = params;
  const pkg = packageName.trim();
  const pkgPath = pkg.replace(/\./g, '/');
  const appClassName = sanitizeClassName(name);

  const files: Record<string, string> = {};

  // 1. Version Catalog: gradle/libs.versions.toml
  files['gradle/libs.versions.toml'] = `[versions]
agp = "8.7.2"
kotlin = "2.0.21"
coreKtx = "1.15.0"
lifecycleRuntimeKtx = "2.8.7"
activityCompose = "1.9.3"
composeBom = "2024.10.01"
navigationCompose = "2.8.4"
junit = "4.13.2"
junitVersion = "1.2.1"
espressoCore = "3.6.1"

[libraries]
androidx-core-ktx = { group = "androidx.core", name = "core-ktx", version.ref = "coreKtx" }
androidx-lifecycle-runtime-ktx = { group = "androidx.lifecycle", name = "lifecycle-runtime-ktx", version.ref = "lifecycleRuntimeKtx" }
androidx-lifecycle-viewmodel-compose = { group = "androidx.lifecycle", name = "lifecycle-viewmodel-compose", version.ref = "lifecycleRuntimeKtx" }
androidx-activity-compose = { group = "androidx.activity", name = "activity-compose", version.ref = "activityCompose" }
androidx-compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "composeBom" }
androidx-compose-ui = { group = "androidx.compose.ui", name = "ui" }
androidx-compose-ui-graphics = { group = "androidx.compose.ui", name = "ui-graphics" }
androidx-compose-ui-tooling = { group = "androidx.compose.ui", name = "ui-tooling" }
androidx-compose-ui-tooling-preview = { group = "androidx.compose.ui", name = "ui-tooling-preview" }
androidx-compose-ui-test-manifest = { group = "androidx.compose.ui", name = "ui-test-manifest" }
androidx-compose-ui-test-junit4 = { group = "androidx.compose.ui", name = "ui-test-junit4" }
androidx-compose-material3 = { group = "androidx.compose.material3", name = "material3" }
androidx-navigation-compose = { group = "androidx.navigation", name = "navigation-compose", version.ref = "navigationCompose" }
junit = { group = "junit", name = "junit", version.ref = "junit" }
androidx-junit = { group = "androidx.test.ext", name = "junit", version.ref = "junitVersion" }
androidx-espresso-core = { group = "androidx.test.espresso", name = "espresso-core", version.ref = "espressoCore" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
kotlin-compose = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
`;

  // 2. settings.gradle.kts
  files['settings.gradle.kts'] = `pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\\\.android.*")
                includeGroupByRegex("com\\\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "${name}"
include(":app")
`;

  // 3. build.gradle.kts (root)
  files['build.gradle.kts'] = `// Top-level build file where plugins are declared without versions (delegated to libs.versions.toml)
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
}
`;

  // 4. app/build.gradle.kts
  files['app/build.gradle.kts'] = `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "${pkg}"
    compileSdk = 35

    defaultConfig {
        applicationId = "${pkg}"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.navigation.compose)

    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    debugImplementation(libs.androidx.compose.ui.tooling)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
}
`;

  // 5. app/proguard-rules.pro
  files['app/proguard-rules.pro'] = `# ProGuard rules for ${name}
# Keep Compose and Kotlin Reflection essentials
-keepattributes *Annotation*
-dontwarn java.lang.invoke.**
`;

  // 6. .gitignore
  files['.gitignore'] = `*.iml
.gradle
/local.properties
/.idea/
.DS_Store
/build
/captures
.externalNativeBuild
.cxx
local.properties
`;

  // 7. README.md
  files['README.md'] = `# ${name}

Native Android application built with Jetpack Compose & Material 3.

## Tech Stack
- **Language**: Kotlin 2.0.21
- **UI Toolkit**: Jetpack Compose (BOM 2024.10.01) + Material 3
- **Architecture**: Clean Architecture + MVI / Unidirectional Data Flow
- **Build System**: Gradle 8.7+ with Kotlin DSL & Version Catalogs (\`gradle/libs.versions.toml\`)
- **Compatibility**: Min SDK 26 (Android 8.0) | Target SDK 35 (Android 15)

## Opening in Android Studio
1. Open Android Studio (Ladybug or newer).
2. Choose **Open Project** and select this directory.
3. Allow Gradle Sync to resolve dependencies.
4. Run on an emulator or physical device running Android 8.0+.
`;

  // 8. AndroidManifest.xml
  files['app/src/main/AndroidManifest.xml'] = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher"
        android:supportsRtl="true"
        android:theme="@style/Theme.${appClassName}">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:label="@string/app_name"
            android:theme="@style/Theme.${appClassName}">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>
`;

  // 9. XML Vector Icon Drawables (zero PNG binaries!)
  files['app/src/main/res/drawable/ic_launcher_background.xml'] = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#07080B"
        android:pathData="M0,0h108v108h-108z" />
    <path
        android:fillColor="#0E1016"
        android:pathData="M9,9h90v90h-90z" />
</vector>
`;

  files['app/src/main/res/drawable/ic_launcher_foreground.xml'] = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <!-- Android Head Arch & Antennae -->
    <path
        android:fillColor="#3DDC84"
        android:pathData="M44,40 L40,32 M64,40 L68,32"
        android:strokeColor="#3DDC84"
        android:strokeWidth="3"
        android:strokeLineCap="round" />
    <path
        android:fillColor="#3DDC84"
        android:pathData="M34,54 A20,20 0 0,1 74,54 Z" />
    <path
        android:fillColor="#07080B"
        android:pathData="M44,48 A2,2 0 1,1 44,47.9 Z M64,48 A2,2 0 1,1 64,47.9 Z" />
    <!-- Forge Base -->
    <path
        android:fillColor="#22D3EE"
        android:pathData="M30,58 L78,58 L72,74 L36,74 Z" />
</vector>
`;

  files['app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml'] = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
`;

  // 10. Values (strings, colors, themes)
  files['app/src/main/res/values/strings.xml'] = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${name}</string>
</resources>
`;

  files['app/src/main/res/values/colors.xml'] = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="primary">#3DDC84</color>
    <color name="secondary">#22D3EE</color>
    <color name="background">#07080B</color>
</resources>
`;

  files['app/src/main/res/values/themes.xml'] = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.${appClassName}" parent="android:Theme.Material.NoActionBar">
        <item name="android:statusBarColor">@android:color/transparent</item>
        <item name="android:navigationBarColor">@android:color/transparent</item>
    </style>
</resources>
`;

  // 11. Kotlin UI Theme
  files[`app/src/main/java/${pkgPath}/ui/theme/Color.kt`] = `package ${pkg}.ui.theme

import androidx.compose.ui.graphics.Color

val AndroidGreen = Color(0xFF3DDC84)
val CyanAccent = Color(0xFF22D3EE)
val PurpleGlow = Color(0xFF8B5CF6)

val DarkBackground = Color(0xFF07080B)
val DarkSurface = Color(0xFF0E1016)
val DarkSurfaceVariant = Color(0xFF141722)
val TextPrimary = Color(0xFFF2F4F8)
val TextMuted = Color(0xFF8B93A7)
`;

  files[`app/src/main/java/${pkgPath}/ui/theme/Type.kt`] = `package ${pkg}.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

val Typography = Typography(
    headlineMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Bold,
        fontSize = 28.sp,
        lineHeight = 36.sp,
        letterSpacing = 0.sp
    ),
    titleLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize = 20.sp,
        lineHeight = 26.sp,
        letterSpacing = 0.sp
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.25.sp
    )
)
`;

  files[`app/src/main/java/${pkgPath}/ui/theme/Theme.kt`] = `package ${pkg}.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = AndroidGreen,
    secondary = CyanAccent,
    tertiary = PurpleGlow,
    background = DarkBackground,
    surface = DarkSurface,
    onPrimary = DarkBackground,
    onSecondary = DarkBackground,
    onBackground = TextPrimary,
    onSurface = TextPrimary
)

private val LightColorScheme = lightColorScheme(
    primary = AndroidGreen,
    secondary = CyanAccent,
    tertiary = PurpleGlow
)

@Composable
fun ${appClassName}Theme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
`;

  // 12. MainActivity.kt
  files[`app/src/main/java/${pkgPath}/MainActivity.kt`] = `package ${pkg}

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.ui.Modifier
import ${pkg}.ui.theme.${appClassName}Theme
import ${pkg}.ui.screens.MainScreen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            ${appClassName}Theme {
                Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
                    MainScreen(modifier = Modifier.padding(innerPadding))
                }
            }
        }
    }
}
`;

  // 13. Sample Screen: MainScreen.kt
  files[`app/src/main/java/${pkgPath}/ui/screens/MainScreen.kt`] = `package ${pkg}.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
fun MainScreen(modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "${name}",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Native Jetpack Compose App",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "${params.idea || 'Ready to forge screens, models, and features.'}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}
`;

  // 14. Initial .builder/memory.json
  const memoryData = {
    appName: name,
    packageName: pkg,
    architectureSummary: params.architecture || 'Clean Architecture + MVI + Jetpack Compose',
    screens: [
      { name: 'MainScreen', route: 'main', purpose: 'Primary dashboard view with Material 3 card container' }
    ],
    dataModels: [],
    dependencies: [
      'androidx.compose.material3:material3',
      'androidx.navigation:navigation-compose:2.8.4',
      'androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7'
    ],
    permissions: [],
    decisions: [
      'Initialized with standard Kotlin Multiplatform & Android Compose conventions.',
      'Configured for Android 15 (Target SDK 35) with Edge-to-Edge display.',
      'Adopted Gradle version catalogs (libs.versions.toml) with zero binary dependencies.'
    ],
    fileIndex: {
      'gradle/libs.versions.toml': 'Centralized Gradle version catalog',
      'settings.gradle.kts': 'Gradle plugin repositories & project inclusion',
      'build.gradle.kts': 'Root project build script',
      'app/build.gradle.kts': 'App module build script and dependencies',
      [`app/src/main/java/${pkgPath}/MainActivity.kt`]: 'Entry activity with Edge-to-Edge setup',
      [`app/src/main/java/${pkgPath}/ui/screens/MainScreen.kt`]: 'Default entry Compose screen',
      [`app/src/main/java/${pkgPath}/ui/theme/Theme.kt`]: 'Material 3 Dark/Light color scheme',
    },
    lastUpdated: Date.now()
  };

  files['.builder/memory.json'] = JSON.stringify(memoryData, null, 2);

  return files;
}
