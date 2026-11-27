// The shikshalens theme. `astryx experimental theme editor` wrote this file once and never changes it again.
// The checked settings live in shikshalens.settings.json and the generated shikshalens.settings.ts;
// change them with `astryx experimental theme editor set shikshalens ...`. Add your own changes below: they win over the settings.
import {defineTheme} from '@astryxdesign/core/theme';
import {shikshalensSettings} from './shikshalens.settings';

export const shikshalensTheme = defineTheme({
  extends: shikshalensSettings,
  name: 'shikshalens',
});
