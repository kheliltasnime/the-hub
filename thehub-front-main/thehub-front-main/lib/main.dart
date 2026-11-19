import 'package:flutter/material.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:go_router/go_router.dart';

import 'core/theme/app_theme.dart';

import 'features/splash/splash_screen.dart';

import 'features/auth/login_screen.dart';

import 'features/auth/register_screen.dart';

import 'features/auth/forgot_password_screen.dart';
import 'features/auth/reset_password_screen.dart';

import 'features/home/home_screen.dart';

import 'features/explore/explore_screen.dart';

import 'features/placeholder/placeholder_screen.dart';

import 'features/orders/commander_screen.dart';

import 'features/orders/menu_screen.dart';

import 'features/orders/item_detail_screen.dart';

import 'features/orders/cart_screen.dart';

import 'features/orders/order_confirmation_screen.dart';

import 'features/orders/order_tracking_screen.dart';

import 'features/orders/models/order_models.dart';

import 'features/wallet/wallet_screen.dart';
import 'features/rooftop/rooftop_screen.dart';
import 'features/profile/profile_screen.dart';
import 'features/home/event_detail_screen.dart';
import 'features/home/models/home_models.dart';

void main() {
  runApp(const ProviderScope(child: HubGhazelaApp()));
}

final _router = GoRouter(
  initialLocation: '/splash',
  routes: [
    GoRoute(path: '/splash', builder: (context, state) => const SplashScreen()),

    GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),

    GoRoute(
        path: '/register', builder: (context, state) => const RegisterScreen()),

    GoRoute(
      path: '/forgot-password',
      builder: (context, state) => const ForgotPasswordScreen(),
    ),

    GoRoute(
      path: '/reset-password',
      builder: (context, state) => ResetPasswordScreen(
        email: state.uri.queryParameters['email'],
      ),
    ),

    GoRoute(path: '/home', builder: (context, state) => const HomeScreen()),

    GoRoute(
      path: '/event',
      builder: (context, state) => EventDetailScreen(
        event: state.extra as UpcomingEvent,
      ),
    ),

    GoRoute(
      path: '/profile',
      builder: (context, state) => const ProfileScreen(),
    ),

    GoRoute(
      path: '/explore',
      builder: (context, state) => const ExploreScreen(),
    ),

    GoRoute(
      path: '/rooftop',
      builder: (context, state) => const RooftopScreen(),
    ),

    // Module Commander

    GoRoute(
        path: '/order', builder: (context, state) => const CommanderScreen()),

    GoRoute(
      path: '/order/menu/:enseigneId',
      builder: (context, state) =>
          MenuScreen(enseigneId: state.pathParameters['enseigneId']!),
    ),

    GoRoute(
      path: '/order/item',
      builder: (context, state) =>
          ItemDetailScreen(item: state.extra as MenuItem),
    ),

    GoRoute(
        path: '/order/cart', builder: (context, state) => const CartScreen()),

    GoRoute(
      path: '/order/confirmation',
      builder: (context, state) =>
          OrderConfirmationScreen(result: state.extra as CheckoutResult),
    ),

    GoRoute(
      path: '/order/tracking/:orderId',
      builder: (context, state) => OrderTrackingScreen(
        orderId: state.pathParameters['orderId']!,
        initialResult: state.extra as CheckoutResult?,
      ),
    ),

    GoRoute(
      path: '/community',
      builder: (context, state) => const PlaceholderScreen(
          title: 'Communauté', navIndex: 3, icon: Icons.groups_outlined),
    ),

    // Après

    GoRoute(
      path: '/card',
      builder: (context, state) => const WalletScreen(),
    ),
  ],
);

class HubGhazelaApp extends StatelessWidget {
  const HubGhazelaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'The Hub Ghazela',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: _router,
    );
  }
}
