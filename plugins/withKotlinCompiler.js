const { withProjectBuildGradle } = require('expo/config-plugins');

// SDK 57 propagates android.kotlinVersion to Expo's catalog, but leaves
// the root compiler classpath unversioned (React Native supplies 2.1.20).
module.exports = function withKotlinCompiler(config, { kotlinVersion }) {
  if (!/^\d+\.\d+\.\d+$/.test(kotlinVersion)) {
    throw new Error('withKotlinCompiler requires an explicit Kotlin version.');
  }
  return withProjectBuildGradle(config, (config) => {
    const dependency = /classpath\(\s*(['"])org\.jetbrains\.kotlin:kotlin-gradle-plugin(?::[^'"]+)?\1\s*\)/g;
    if (config.modResults.language !== 'groovy' ||
        !dependency.test(config.modResults.contents)) {
      throw new Error('Cannot locate Kotlin compiler classpath in Android root build.gradle.');
    }
    dependency.lastIndex = 0;
    config.modResults.contents = config.modResults.contents.replace(
      dependency,
      `classpath('org.jetbrains.kotlin:kotlin-gradle-plugin:${kotlinVersion}')`
    );
    return config;
  });
};
