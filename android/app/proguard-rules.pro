// Configuration ProGuard/R8 pour optimisation APK Android
// Placer ce contenu dans android/app/proguard-rules.pro

# Conserver les classes de l'API et les interfaces publiques
-keep public class * {
    public protected *;
}

# Conserver les énumérés
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Conserver les lignes de débogage pour plus tard
-keepattributes SourceFile, LineNumberTable
-renamesourcefileattribute SourceFile

# Optimisations
-optimizationpasses 5
-dontusemixedcaseclassnames
-verbose

# Éliminer les logs en production
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}

# Bibliothèques communes
-keep class androidx.** { *; }
-keep class com.google.android.material.** { *; }
-keep class com.facebook.** { *; }
-keep class com.google.firebase.** { *; }

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }

# Expo modules
-keep class expo.modules.** { *; }
-keep class abi** { *; }

# WebRTC
-keep class org.webrtc.** { *; }

# Conserver les annotations
-keepattributes *Annotation*, InnerClasses, EnclosingMethod, Signature, Exceptions

# Désactiver l'optimisation pour certaines classes sensibles
-keep,allowshrinking,allowoptimization class com.denonce.** { *; }
