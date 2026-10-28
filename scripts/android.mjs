import { spawn } from 'node:child_process';
import { access, readdir, mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const resolve = (...parts) => path.join(root, ...parts);
const exists = async target => { try { await access(target); return true; } catch { return false; } };
const command = process.argv[2] || 'sync';
if (!['sync', 'build', 'open'].includes(command)) throw new Error('用法：node scripts/android.mjs sync|build|open');
process.chdir(root);
const environment = { ...process.env, PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH || ''}` };
function run(binary, args, cwd = root) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { cwd, env: environment, stdio: 'inherit', windowsHide: true });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`${path.basename(binary)} 退出码 ${code}`)));
  });
}

await build({ configFile: resolve('vite.config.js') });
const cli = resolve('node_modules/@capacitor/cli/bin/capacitor');
if (!await exists(resolve('android'))) await run(process.execPath, [cli, 'add', 'android']);
await run(process.execPath, [cli, 'sync', 'android']);

if (command === 'open') await run(process.execPath, [cli, 'open', 'android']);
if (command === 'build') {
  // Portable local toolchains are optional. Standard Android Studio environment
  // variables continue to work, and no machine-specific path is committed.
  if (!environment.JAVA_HOME && await exists(resolve('.tools/java21'))) {
    const candidates = await readdir(resolve('.tools/java21'), { withFileTypes: true });
    const jdk = candidates.find(entry => entry.isDirectory() && entry.name.startsWith('jdk-'));
    if (jdk) environment.JAVA_HOME = resolve('.tools/java21', jdk.name);
  }
  if (!environment.ANDROID_HOME && !environment.ANDROID_SDK_ROOT && await exists(resolve('.tools/android-sdk/platforms/android-36'))) {
    environment.ANDROID_HOME = resolve('.tools/android-sdk');
  }
  if (!environment.JAVA_HOME) throw new Error('APK 编译需要 JDK 21。请安装 Android Studio 或设置 JAVA_HOME，见 docs/android.md。');
  if (!environment.ANDROID_HOME && !environment.ANDROID_SDK_ROOT) throw new Error('请安装 Android SDK 36 并设置 ANDROID_HOME，见 docs/android.md。');
  environment.GRADLE_USER_HOME ||= resolve('.tools/gradle-cache');
  const args = ['assembleDebug', '--no-daemon', '--console=plain'];
  const portableGradle = resolve('.tools/gradle/gradle-8.14.3/bin/gradle.bat');
  if (process.platform === 'win32' && await exists(portableGradle)) await run('cmd.exe', ['/d', '/c', portableGradle, ...args], resolve('android'));
  else if (process.platform === 'win32') await run('cmd.exe', ['/d', '/c', 'gradlew.bat', ...args], resolve('android'));
  else await run(resolve('android/gradlew'), args, resolve('android'));
  await mkdir(resolve('artifacts/apk'), { recursive: true });
  await copyFile(resolve('android/app/build/outputs/apk/debug/app-debug.apk'), resolve('artifacts/apk/halfcourt-debug.apk'));
  const { version } = JSON.parse(await readFile(resolve('package.json'), 'utf8'));
  if (!/^\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?$/.test(version)) throw new Error('安装包版本号无效');
  const versionedName = `hoopal-${version}.apk`;
  await copyFile(resolve('artifacts/apk/halfcourt-debug.apk'), resolve('artifacts/apk', versionedName));
  const sha256 = createHash('sha256').update(await readFile(resolve('artifacts/apk', versionedName))).digest('hex');
  await writeFile(resolve('artifacts/apk', `${versionedName}.sha256`), `${sha256}  ${versionedName}\n`);
  await writeFile(resolve('artifacts/apk/halfcourt-debug.apk.sha256'), `${sha256}  halfcourt-debug.apk\n`);
  console.log(`APK 已生成：${resolve('artifacts/apk/halfcourt-debug.apk')}`);
  console.log(`版本安装包：${resolve('artifacts/apk', versionedName)}`);
}
