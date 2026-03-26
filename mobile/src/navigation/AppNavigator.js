import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useTranslation } from 'react-i18next';
import { FontAwesome } from '@expo/vector-icons';

// Imports des écrans (inchangés)
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import MyReportsScreen from '../screens/MyReportsScreen';
import CreateReportScreen from '../screens/CreateReportScreen';
import ReportDetailScreen from '../screens/ReportDetailScreen';
import StatisticsScreen from '../screens/StatisticsScreen';
import NewsScreen from '../screens/NewsScreen';
import LiveScreen from '../screens/LiveScreen';
import CreateLiveScreen from '../screens/CreateLiveScreen';
import SettingsScreen from '../screens/SettingsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SubscribeScreen from '../screens/SubscribeScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import TermsScreen from '../screens/TermsScreen';
import PrivacyScreen from '../screens/PrivacyScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function HomeTabs() {
  const { t } = useTranslation();
  const { darkMode } = useTheme();
  const { unreadCount } = useNotifications();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#e63946',
        tabBarInactiveTintColor: darkMode ? '#aaa' : '#666',
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          switch (route.name) {
            case 'Accueil':
              iconName = 'home';
              break;
            case 'MesSignalements':
              iconName = 'file-text';
              break;
            case 'Statistiques':
              iconName = 'bar-chart';
              break;
            case 'Actualités':
              iconName = 'newspaper-o';
              break;
            case 'Notifications':
              iconName = 'bell';
              break;
            case 'Paramètres':
              iconName = 'cog';
              break;
            default:
              iconName = 'circle';
          }
          return <FontAwesome name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Accueil" component={HomeScreen} options={{ tabBarLabel: t('nav.home') }} />
      <Tab.Screen name="MesSignalements" component={MyReportsScreen} options={{ tabBarLabel: t('nav.myReports') }} />
      <Tab.Screen name="Statistiques" component={StatisticsScreen} options={{ tabBarLabel: t('nav.statistics') }} />
      <Tab.Screen name="Actualités" component={NewsScreen} options={{ tabBarLabel: t('nav.news') }} />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarLabel: t('nav.notifications'),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#e63946' }
        }}
      />
      <Tab.Screen name="Paramètres" component={SettingsScreen} options={{ tabBarLabel: t('nav.settings') }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#e63946' }, headerTintColor: '#fff' }}>
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Mot de passe oublié' }} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ title: 'Réinitialisation' }} />
          <Stack.Screen name="Terms" component={TermsScreen} options={{ title: 'Règles d\'utilisation' }} />
          <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ title: 'Confidentialité' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={HomeTabs} options={{ headerShown: false }} />
          <Stack.Screen name="CreateReport" component={CreateReportScreen} options={{ title: 'Nouveau signalement' }} />
          <Stack.Screen name="ReportDetail" component={ReportDetailScreen} options={{ title: 'Détail du signalement' }} />
          <Stack.Screen name="Live" component={LiveScreen} options={{ title: 'Live' }} />
          <Stack.Screen name="CreateLive" component={CreateLiveScreen} options={{ title: 'Créer un live' }} />
          <Stack.Screen name="Subscribe" component={SubscribeScreen} options={{ title: 'Devenir Premium' }} />
        </>
      )}
    </Stack.Navigator>
  );
}