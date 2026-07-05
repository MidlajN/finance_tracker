const { withAppBuildGradle } = require("expo/config-plugins");

const MARKER = "// Finance release signing is configured by apps/mobile/plugins/withAndroidReleaseSigning.cjs";

function applyAndroidReleaseSigning(contents) {
  if (contents.includes(MARKER)) {
    return contents;
  }

  const signingEnvBlock = `${MARKER}
def financeReleaseKeystoreFile = System.getenv("FINANCE_ANDROID_KEYSTORE_FILE")
def financeReleaseKeystorePassword = System.getenv("FINANCE_ANDROID_KEYSTORE_PASSWORD")
def financeReleaseKeyAlias = System.getenv("FINANCE_ANDROID_KEY_ALIAS")
def financeReleaseKeyPassword = System.getenv("FINANCE_ANDROID_KEY_PASSWORD")
def financeHasReleaseSigning = [
    financeReleaseKeystoreFile,
    financeReleaseKeystorePassword,
    financeReleaseKeyAlias,
    financeReleaseKeyPassword
].every { value -> value != null && value.trim().length() > 0 }
`;

  const jscFlavorLine =
    "def jscFlavor = 'io.github.react-native-community:jsc-android:2026004.+'";

  if (!contents.includes(jscFlavorLine)) {
    throw new Error("Could not find the Expo Android Gradle JSC marker.");
  }

  let updated = contents.replace(
    jscFlavorLine,
    `${jscFlavorLine}\n\n${signingEnvBlock}`
  );

  const signingConfigsBlock = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`;

  const releaseSigningConfigsBlock = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (financeHasReleaseSigning) {
                storeFile file(financeReleaseKeystoreFile)
                storePassword financeReleaseKeystorePassword
                keyAlias financeReleaseKeyAlias
                keyPassword financeReleaseKeyPassword
            }
        }
    }`;

  if (!updated.includes(signingConfigsBlock)) {
    throw new Error("Could not find the Expo Android Gradle signingConfigs block.");
  }

  updated = updated.replace(signingConfigsBlock, releaseSigningConfigsBlock);

  const releaseBuildTypeSigning = `        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`;

  const releaseBuildTypeEnvSigning = `        release {
            if (financeHasReleaseSigning) {
                signingConfig signingConfigs.release
            }`;

  if (!updated.includes(releaseBuildTypeSigning)) {
    throw new Error("Could not find the Expo Android Gradle release buildType signing block.");
  }

  return updated.replace(releaseBuildTypeSigning, releaseBuildTypeEnvSigning);
}

function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (gradleConfig) => {
    if (gradleConfig.modResults.language !== "groovy") {
      throw new Error("Android release signing config expects Groovy build.gradle.");
    }

    gradleConfig.modResults.contents = applyAndroidReleaseSigning(
      gradleConfig.modResults.contents
    );

    return gradleConfig;
  });
}

module.exports = withAndroidReleaseSigning;
