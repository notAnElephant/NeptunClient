import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { androidWidgetTaskHandler } from './androidWidgetTask';

export function registerAndroidWidget(): void {
  registerWidgetTaskHandler(androidWidgetTaskHandler);
}
