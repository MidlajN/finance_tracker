import "./global.css";
import "react-native-gesture-handler";
import "react-native-url-polyfill/auto";

import { registerRootComponent } from "expo";
import { AppRegistry } from "react-native";

import App from "./src/App";
import { financeNotificationCaptureTask } from "./src/tasks/financeNotificationCaptureTask";

// Headless capture pipeline — must be registered before the app mounts
// so Android can run it with the UI closed. The name matches
// FinanceNotificationHeadlessTaskService.TASK_NAME.
AppRegistry.registerHeadlessTask(
  "FinanceNotificationCapture",
  () => financeNotificationCaptureTask
);

registerRootComponent(App);
