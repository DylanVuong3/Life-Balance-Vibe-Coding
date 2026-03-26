import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '../theme';

import QueueScreen     from '../screens/QueueScreen';
import TreeScreen      from '../screens/TreeScreen';
import BalanceScreen   from '../screens/BalanceScreen';
import PlacesScreen    from '../screens/PlacesScreen';
import TaskDetailScreen from '../screens/TaskDetailScreen';
import TaskFormScreen  from '../screens/TaskFormScreen';

// ─── Type definitions ──────────────────────────────────────────────────────────

export type RootStackParamList = {
  Tabs:       undefined;
  TaskDetail: { taskId: string };
  TaskForm:   { parentId?: string | null; taskId?: string };
};

export type TabParamList = {
  Queue:   undefined;
  Tree:    undefined;
  Balance: undefined;
  Places:  undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab   = createBottomTabNavigator<TabParamList>();

// ─── Tab bar ───────────────────────────────────────────────────────────────────

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.paper,
          borderTopColor: Colors.rule,
          borderTopWidth: 0.5,
          paddingTop: 4,
        },
        tabBarActiveTintColor: Colors.ink,
        tabBarInactiveTintColor: Colors.ink4,
        tabBarLabelStyle: {
          fontFamily: Fonts.mono,
          fontSize: 10,
          marginBottom: 2,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, [string, string]> = {
            Queue:   ['arrow-forward-circle',    'arrow-forward-circle-outline'],
            Tree:    ['git-branch',              'git-branch-outline'],
            Balance: ['pie-chart',               'pie-chart-outline'],
            Places:  ['location',                'location-outline'],
          };
          const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
          return (
            <Ionicons
              name={(focused ? active : inactive) as any}
              size={22}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Queue"   component={QueueScreen}   />
      <Tab.Screen name="Tree"    component={TreeScreen}    />
      <Tab.Screen name="Balance" component={BalanceScreen} />
      <Tab.Screen name="Places"  component={PlacesScreen}  />
    </Tab.Navigator>
  );
}

// ─── Root stack ────────────────────────────────────────────────────────────────

export default function Navigation() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.paper,
          },
          headerShadowVisible: false,
          headerTitleStyle: {
            fontFamily: Fonts.display,
            fontSize: 18,
            fontWeight: '400',
            color: Colors.ink,
          },
          headerTintColor: Colors.ink,
          headerBackTitle: '',
          contentStyle: { backgroundColor: Colors.paper },
        }}
      >
        <Stack.Screen
          name="Tabs"
          component={Tabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TaskDetail"
          component={TaskDetailScreen}
          options={{ title: 'Task', presentation: 'card' }}
        />
        <Stack.Screen
          name="TaskForm"
          component={TaskFormScreen}
          options={({ route }) => ({
            title: route.params?.taskId ? 'Edit task' : 'Add task',
            presentation: 'modal',
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
    </SafeAreaProvider>
  );
}
