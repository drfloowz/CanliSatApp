// Xcode 27, iOS 15'ten eski deployment target'ları hata sayıyor.
// Bazı pod'lar (ör. RNCAsyncStorage kaynak paketi) hâlâ 13.4 hedeflediği için
// prebuild sonrası Podfile'a tüm pod hedeflerini uygulamanın hedefine çeken bir post_install ekler.
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

const MARKER = '# canlisat: pods deployment target';

module.exports = function withPodsDeploymentTarget(config, { target = '16.4' } = {}) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let src = fs.readFileSync(podfile, 'utf8');
      if (!src.includes(MARKER)) {
        src = src.replace(
          /(post_install do \|installer\|\n)/,
          `$1    ${MARKER}\n` +
            `    installer.pods_project.targets.each do |t|\n` +
            `      t.build_configurations.each do |c|\n` +
            `        if c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < ${target}\n` +
            `          c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${target}'\n` +
            `        end\n` +
            `      end\n` +
            `    end\n`,
        );
        fs.writeFileSync(podfile, src);
      }
      return cfg;
    },
  ]);
};
