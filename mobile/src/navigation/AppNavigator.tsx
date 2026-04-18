import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabNavigator from './MainTabNavigator';
import ReportDetailScreen from '../screens/ReportDetailScreen';
import CreateReportScreen from '../screens/CreateReportScreen';
import CreateLiveScreen from '../screens/CreateLiveScreen';
import LiveStreamScreen from '../screens/LiveStreamScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import MyReportsScreen from '../screens/MyReportsScreen';
import AboutScreen from '../screens/AboutScreen';
import ContactScreen from '../screens/ContactScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import InformationScreen from '../screens/InformationScreen';
import { AppStackParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="ReportDetail" component={ReportDetailScreen} />
      <Stack.Screen 
        name="CreateReport" 
        component={CreateReportScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen 
        name="CreateLive" 
        component={CreateLiveScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen 
        name="LiveStream" 
        component={LiveStreamScreen}
        options={{ orientation: 'landscape' }}
      />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="MyReports" component={MyReportsScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="Contact" component={ContactScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="Information" component={InformationScreen} />
    </Stack.Navigator>
  );
}