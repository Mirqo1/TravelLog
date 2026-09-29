import React, { useEffect, useRef } from 'react';
import { Keyboard, PanResponder, View } from 'react-native';
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import { adjacentTab, swipeDirection } from '../utils/tabSwipe';

const routes = [{ name: 'Home' }, { name: 'Trips' }, { name: 'Map' }, { name: 'Profile' }];
function useSwipe(onSwipe) {
  const latest = useRef(onSwipe); latest.current = onSwipe;
  const keyboard = useRef(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => { keyboard.current = true; });
    const hide = Keyboard.addListener('keyboardDidHide', () => { keyboard.current = false; });
    return () => { show.remove(); hide.remove(); };
  }, []);
  const allowed = gesture => !keyboard.current && !Keyboard.isVisible?.() && !!swipeDirection(gesture);
  return useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => allowed(gesture),
    onMoveShouldSetPanResponderCapture: (_, gesture) => allowed(gesture),
    onPanResponderRelease: (_, gesture) => {
      if (!keyboard.current && !Keyboard.isVisible?.()) latest.current(swipeDirection(gesture, true));
    },
    onPanResponderTerminationRequest: () => true,
  })).current.panHandlers;
}
export function SwipeScreen({ children, navigation, route, style = { flex: 1 } }) {
  const handlers = useSwipe(direction => {
    const name = adjacentTab(routes, route.name, direction);
    if (name) navigation.navigate(name);
  });
  return <View style={style} {...handlers}>{children}</View>;
}
export function SwipeTabBar(props) {
  const handlers = useSwipe(direction => {
    const name = adjacentTab(props.state.routes, props.state.routes[props.state.index].name, direction);
    if (name) props.navigation.navigate(name);
  });
  return <View {...handlers}><BottomTabBar {...props} /></View>;
}
