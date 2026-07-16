import 'expo-router/entry';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { androidWidgetTaskHandler } from './src/widgets/androidWidgetTask';

registerWidgetTaskHandler(androidWidgetTaskHandler);
