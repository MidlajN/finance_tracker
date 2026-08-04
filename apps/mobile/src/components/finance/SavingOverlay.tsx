import { useEffect, useMemo } from "react";
import {
  Animated,
  Easing,
  Image,
  Modal,
  StyleSheet,
  Text,
  View,
} from "react-native";

import appMark from "../../../assets/icon.png";

import { premiumTheme } from "../../theme/premiumTheme";

export function SavingOverlay({
  subtitle,
  title,
  visible,
}: {
  subtitle: string;
  title: string;
  visible: boolean;
}) {
  const entrance = useMemo(() => new Animated.Value(0), []);
  const pulse = useMemo(() => new Animated.Value(0), []);
  const dotValues = useMemo(
    () => [new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)],
    []
  );
  const entranceScale = useMemo(
    () =>
      entrance.interpolate({
        inputRange: [0, 1],
        outputRange: [0.94, 1],
      }),
    [entrance]
  );
  const entranceShift = useMemo(
    () =>
      entrance.interpolate({
        inputRange: [0, 1],
        outputRange: [10, 0],
      }),
    [entrance]
  );
  const pulseScale = useMemo(
    () =>
      pulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.97, 1.05],
      }),
    [pulse]
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    entrance.setValue(0);
    pulse.setValue(0);
    dotValues.forEach((value) => value.setValue(0));

    Animated.spring(entrance, {
      damping: 16,
      mass: 0.8,
      stiffness: 190,
      toValue: 1,
      useNativeDriver: true,
    }).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          duration: 850,
          easing: Easing.inOut(Easing.quad),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          duration: 850,
          easing: Easing.inOut(Easing.quad),
          toValue: 0,
          useNativeDriver: true,
        }),
      ])
    );
    const dotLoop = Animated.loop(
      Animated.stagger(
        140,
        dotValues.map((value) =>
          Animated.sequence([
            Animated.timing(value, {
              duration: 320,
              easing: Easing.out(Easing.quad),
              toValue: 1,
              useNativeDriver: true,
            }),
            Animated.timing(value, {
              duration: 320,
              easing: Easing.in(Easing.quad),
              toValue: 0,
              useNativeDriver: true,
            }),
          ])
        )
      )
    );

    pulseLoop.start();
    dotLoop.start();

    return () => {
      pulseLoop.stop();
      dotLoop.stop();
    };
  }, [dotValues, entrance, pulse, visible]);

  if (!visible) {
    return null;
  }

  return (
    <Modal animationType="fade" statusBarTranslucent transparent visible>
      <View style={styles.screen}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: entrance,
              transform: [
                { scale: entranceScale },
                { translateY: entranceShift },
              ],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.markTile,
              {
                transform: [{ scale: pulseScale }],
              },
            ]}
          >
            <Image source={appMark} style={styles.mark} />
          </Animated.View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <View style={styles.dots}>
            {dotValues.map((value, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    opacity: value.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.25, 1],
                    }),
                    transform: [
                      {
                        translateY: value.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -4],
                        }),
                      },
                    ],
                  },
                ]}
              />
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
  },
  dot: {
    backgroundColor: premiumTheme.colors.ink,
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  dots: {
    flexDirection: "row",
    gap: 8,
    marginTop: 26,
  },
  mark: {
    borderRadius: 20,
    height: 76,
    width: 76,
  },
  markTile: {
    borderRadius: 20,
    marginBottom: 22,
    ...premiumTheme.shadow.soft,
  },
  screen: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    flex: 1,
    justifyContent: "center",
  },
  subtitle: {
    color: premiumTheme.colors.secondary,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 5,
  },
  title: {
    color: premiumTheme.colors.ink,
    fontSize: 17,
    fontWeight: "800",
  },
});
