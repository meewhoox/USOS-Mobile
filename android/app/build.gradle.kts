import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "app.usosmobile"
    compileSdk = 36

    defaultConfig {
        applicationId = "app.usosmobile"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"))
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin {
    compilerOptions { jvmTarget.set(JvmTarget.JVM_17) }
}

dependencies {
    implementation("androidx.core:core-ktx:1.16.0")
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("androidx.webkit:webkit:1.14.0")
}

// The injected scripts (assets/usm*.js) are built from ../src by a Node script.
val webRoot: File = rootProject.projectDir.parentFile
val buildWebAssets by tasks.registering(Exec::class) {
    description = "Builds assets/usm.js and assets/usm-cas.js from ../src (node scripts/build.mjs)"
    workingDir = webRoot
    commandLine("node", "scripts/build.mjs")
    inputs.dir(webRoot.resolve("src"))
    inputs.file(webRoot.resolve("scripts/build.mjs"))
    outputs.files(file("src/main/assets/usm.js"), file("src/main/assets/usm-cas.js"))
}
tasks.named("preBuild") { dependsOn(buildWebAssets) }
