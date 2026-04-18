import { NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// Auth Stack
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

// Main Tab Navigator
export type MainTabParamList = {
  HomeTab: undefined;
  ReportsTab: undefined;
  LiveTab: undefined;
  DashboardTab: undefined;
};

// App Stack
export type AppStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  ReportDetail: { id: number };
  CreateReport: undefined;
  CreateLive: undefined;
  LiveStream: { streamId: number };
  Profile: { userId?: number };
  Settings: undefined;
  Notifications: undefined;
  MyReports: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  About: undefined;
  Admin: undefined;
};

// Root Stack
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<AppStackParamList>;
};

// Screen Props Types
export type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;
export type RegisterScreenProps = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export type HomeScreenProps = BottomTabScreenProps<MainTabParamList, 'HomeTab'>;
export type ReportsScreenProps = BottomTabScreenProps<MainTabParamList, 'ReportsTab'>;
export type LiveScreenProps = BottomTabScreenProps<MainTabParamList, 'LiveTab'>;
export type DashboardScreenProps = BottomTabScreenProps<MainTabParamList, 'DashboardTab'>;

export type ReportDetailScreenProps = NativeStackScreenProps<AppStackParamList, 'ReportDetail'>;
export type CreateReportScreenProps = NativeStackScreenProps<AppStackParamList, 'CreateReport'>;
export type LiveStreamScreenProps = NativeStackScreenProps<AppStackParamList, 'LiveStream'>;
export type ProfileScreenProps = NativeStackScreenProps<AppStackParamList, 'Profile'>;
export type SettingsScreenProps = NativeStackScreenProps<AppStackParamList, 'Settings'>;
export type NotificationsScreenProps = NativeStackScreenProps<AppStackParamList, 'Notifications'>;

// Global navigation prop type
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}