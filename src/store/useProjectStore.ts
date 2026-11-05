import { create } from 'zustand';
import { getDb, type DroidProject } from '../lib/db';

interface ProjectStoreState {
  projects: DroidProject[];
  activeProject: DroidProject | null;
  isLoading: boolean;
  error: string | null;

  loadProjects: () => Promise<void>;
  createProject: (params: {
    name: string;
    idea: string;
    packageName?: string;
    architecture?: string;
  }) => Promise<DroidProject>;
  renameProject: (id: string, newName: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  selectProject: (id: string) => Promise<DroidProject | null>;
  updateProjectIdea: (id: string, idea: string) => Promise<void>;
  updateProjectFiles: (id: string, files: Record<string, string>, notes?: string[]) => Promise<void>;
}

function sanitizePackageName(name: string): string {
  const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `com.droidforge.${clean || 'app'}`;
}

function generateInitialAndroidFiles(name: string, pkg: string): Record<string, string> {
  const pkgPath = pkg.replace(/\./g, '/');

  return {
    'settings.gradle.kts': `pluginManagement {
    repositories {
        google()
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
`,
    'build.gradle.kts': `// Top-level build file
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
}
`,
    'app/build.gradle.kts': `plugins {
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
    implementation(platform("androidx.compose:compose-bom:2024.10.01"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.navigation:navigation-compose:2.8.4")
    implementation("androidx.core:core-ktx:1.15.0")
    debugImplementation("androidx.compose.ui:ui-tooling")
}
`,
    'app/src/main/AndroidManifest.xml': `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="${name}"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.DroidForgeApp">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@style/Theme.DroidForgeApp">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>
`,
    [`app/src/main/java/${pkgPath}/MainActivity.kt`]: `package ${pkg}

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.ui.Modifier
import ${pkg}.ui.theme.${name.replace(/[^a-zA-Z0-9]/g, '')}Theme
import ${pkg}.ui.screens.HomeScreen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            ${name.replace(/[^a-zA-Z0-9]/g, '')}Theme {
                Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
                    HomeScreen(modifier = Modifier.padding(innerPadding))
                }
            }
        }
    }
}
`,
    [`app/src/main/java/${pkgPath}/ui/screens/HomeScreen.kt`]: `package ${pkg}.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun HomeScreen(modifier: Modifier = Modifier) {
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
            Text(
                text = "${name}",
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.onBackground
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = "Native Android Jetpack Compose Architecture",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
`,
    [`app/src/main/java/${pkgPath}/ui/theme/Theme.kt`]: `package ${pkg}.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFF3DDC84),
    secondary = Color(0xFF22D3EE),
    tertiary = Color(0xFF8B5CF6),
    background = Color(0xFF07080B),
    surface = Color(0xFF0E1016),
)

private val LightColorScheme = lightColorScheme(
    primary = Color(0xFF1B8748),
    secondary = Color(0xFF0284C7),
    tertiary = Color(0xFF7C3AED),
)

@Composable
fun ${name.replace(/[^a-zA-Z0-9]/g, '')}Theme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
`,
  };
}

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  projects: [],
  activeProject: null,
  isLoading: true,
  error: null,

  loadProjects: async () => {
    if (typeof window === 'undefined') return;
    try {
      set({ isLoading: true, error: null });
      const db = getDb();
      const allProjects = await db.projects.orderBy('updatedAt').reverse().toArray();
      set({ projects: allProjects, isLoading: false });
    } catch (err: any) {
      console.error('Failed to load projects from Dexie:', err);
      set({ error: err.message, isLoading: false });
    }
  },

  createProject: async ({ name, idea, packageName, architecture }) => {
    const db = getDb();
    const id = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const pkg = packageName || sanitizePackageName(name);
    const initialFiles = generateInitialAndroidFiles(name, pkg);

    const newProject: DroidProject = {
      id,
      name: name.trim(),
      packageName: pkg,
      idea: idea.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      files: initialFiles,
      memory: {
        architecture: architecture || 'Clean Architecture + MVI + Jetpack Compose',
        composeBom: '2024.10.01',
        minSdk: 26,
        targetSdk: 35,
        notes: [
          'Initialized with standard Kotlin Multiplatform & Android Compose conventions.',
          'Configured for Android 15 (Target SDK 35) with Edge-to-Edge display.',
        ],
      },
      settings: {
        targetSdk: 35,
        minSdk: 26,
        composeVersion: 'BOM 2024.10.01',
      },
    };

    await db.projects.add(newProject);
    const all = await db.projects.orderBy('updatedAt').reverse().toArray();
    set({ projects: all, activeProject: newProject });
    return newProject;
  },

  renameProject: async (id: string, newName: string) => {
    const db = getDb();
    const existing = await db.projects.get(id);
    if (!existing) return;

    const updated: DroidProject = {
      ...existing,
      name: newName.trim(),
      updatedAt: Date.now(),
    };

    await db.projects.put(updated);
    const all = await db.projects.orderBy('updatedAt').reverse().toArray();
    set({
      projects: all,
      activeProject: get().activeProject?.id === id ? updated : get().activeProject,
    });
  },

  deleteProject: async (id: string) => {
    const db = getDb();
    await db.projects.delete(id);
    const all = await db.projects.orderBy('updatedAt').reverse().toArray();
    set({
      projects: all,
      activeProject: get().activeProject?.id === id ? null : get().activeProject,
    });
  },

  selectProject: async (id: string) => {
    const db = getDb();
    const proj = await db.projects.get(id);
    if (proj) {
      set({ activeProject: proj });
      return proj;
    }
    return null;
  },

  updateProjectIdea: async (id: string, idea: string) => {
    const db = getDb();
    const existing = await db.projects.get(id);
    if (!existing) return;

    const updated: DroidProject = {
      ...existing,
      idea,
      updatedAt: Date.now(),
    };

    await db.projects.put(updated);
    const all = await db.projects.orderBy('updatedAt').reverse().toArray();
    set({
      projects: all,
      activeProject: get().activeProject?.id === id ? updated : get().activeProject,
    });
  },

  updateProjectFiles: async (id: string, files: Record<string, string>, notes?: string[]) => {
    const db = getDb();
    const existing = await db.projects.get(id);
    if (!existing) return;

    const updated: DroidProject = {
      ...existing,
      files: { ...existing.files, ...files },
      memory: {
        ...existing.memory,
        notes: notes ? [...existing.memory.notes, ...notes] : existing.memory.notes,
      },
      updatedAt: Date.now(),
    };

    await db.projects.put(updated);
    const all = await db.projects.orderBy('updatedAt').reverse().toArray();
    set({
      projects: all,
      activeProject: get().activeProject?.id === id ? updated : get().activeProject,
    });
  },
}));
