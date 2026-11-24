// iOS 27 SDK ile derlenen uygulamalar UIScene yaşam döngüsünü kullanmak zorunda
// ("UIScene life cycle is required for apps built with this SDK").
// Expo 56 şablonu pencereyi AppDelegate içinde açıyor; bu eklenti:
//  1) Info.plist'e UIApplicationSceneManifest ekler,
//  2) AppDelegate'te pencere oluşturmayı kaldırır (React Native fabrikası yine orada kurulur),
//  3) Aynı dosyaya pencereyi açıp React Native'i başlatan bir SceneDelegate ekler.
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const MARKER = '// canlisat: scene delegate';

const SCENE_DELEGATE = `
${MARKER}
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory else { return }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window
    factory.startReactNative(withModuleName: "main", in: window, launchOptions: appDelegate.launchOptions)

    if let url = connectionOptions.urlContexts.first?.url {
      _ = RCTLinkingManager.application(UIApplication.shared, open: url, options: [:])
    }
    if let activity = connectionOptions.userActivities.first {
      _ = RCTLinkingManager.application(UIApplication.shared, continue: activity, restorationHandler: { _ in })
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      _ = UIApplication.shared.delegate?.application?(UIApplication.shared, open: context.url, options: [:])
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = UIApplication.shared.delegate?.application?(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }
}
`;

const withSceneManifest = (config) =>
  withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return cfg;
  });

const withSceneAppDelegate = (config) =>
  withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== 'swift') {
      throw new Error('withSceneDelegate: yalnızca Swift AppDelegate destekleniyor');
    }
    let src = cfg.modResults.contents;
    if (src.includes(MARKER)) return cfg;

    const windowBlock =
      /#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\(\n\s*withModuleName: "main",\n\s*in: window,\n\s*launchOptions: launchOptions\)\n#endif\n/;
    if (!windowBlock.test(src)) {
      throw new Error('withSceneDelegate: AppDelegate şablonu beklenen biçimde değil, eklentiyi güncelleyin');
    }
    src = src.replace(windowBlock, '    self.launchOptions = launchOptions // pencere SceneDelegate içinde açılır\n');
    src = src.replace(
      'var reactNativeFactory: RCTReactNativeFactory?',
      'var reactNativeFactory: RCTReactNativeFactory?\n  var launchOptions: [UIApplication.LaunchOptionsKey: Any]?',
    );
    cfg.modResults.contents = src + SCENE_DELEGATE;
    return cfg;
  });

module.exports = (config) => withSceneAppDelegate(withSceneManifest(config));
