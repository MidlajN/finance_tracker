import { useCallback, useEffect, useMemo, useState } from "react";
import { MotiView } from "moti";
import { ChevronRight, ReceiptText } from "lucide-react-native";
import { Animated, PanResponder, StyleSheet, Text } from "react-native";

import { premiumTheme } from "../../theme/premiumTheme";

export function SlideToSaveButton({
  disabled,
  loading,
  onComplete,
}: {
  disabled: boolean;
  loading: boolean;
  onComplete: () => void;
}) {
  const [translateX] = useState(() => new Animated.Value(0));
  const [trackWidth, setTrackWidth] = useState(0);
  const thumbSize = 42;
  const trackPadding = 5;
  const maxTravel = Math.max(
    trackWidth - thumbSize - trackPadding * 2,
    0
  );
  const animationRange = Math.max(maxTravel, 1);

  const resetThumb = useCallback(() => {
    Animated.spring(translateX, {
      damping: 18,
      mass: 0.7,
      stiffness: 210,
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, [translateX]);

  useEffect(() => {
    if (!loading && disabled) {
      resetThumb();
    }
  }, [disabled, loading, resetThumb]);

  const completeSlide = useCallback(() => {
    if (disabled || loading || maxTravel <= 0) {
      resetThumb();
      return;
    }

    Animated.timing(translateX, {
      duration: 140,
      toValue: maxTravel,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        onComplete();
      }
    });
  }, [
    disabled,
    loading,
    maxTravel,
    onComplete,
    resetThumb,
    translateX,
  ]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          !disabled &&
          !loading &&
          Math.abs(gesture.dx) > 7 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderGrant: () => {
          translateX.stopAnimation();
        },
        onPanResponderMove: (_, gesture) => {
          translateX.setValue(
            Math.max(0, Math.min(gesture.dx, maxTravel))
          );
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx >= maxTravel * 0.72) {
            completeSlide();
          } else {
            resetThumb();
          }
        },
        onPanResponderTerminate: resetThumb,
      }),
    [
      completeSlide,
      disabled,
      loading,
      maxTravel,
      resetThumb,
      translateX,
    ]
  );

  const labelOpacity = translateX.interpolate({
    inputRange: [0, animationRange * 0.62, animationRange],
    outputRange: [1, 0.35, 0],
    extrapolate: "clamp",
  });

  return (
    <Animated.View
      accessibilityActions={[
        {
          label: "Save transaction",
          name: "activate",
        },
      ]}
      accessibilityHint="Swipe the handle to the right to save"
      accessibilityLabel={
        disabled
          ? "Enter an amount and merchant before saving"
          : "Slide to save transaction"
      }
      accessibilityRole="adjustable"
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "activate") {
          completeSlide();
        }
      }}
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      style={[
        styles.slideSaveTrack,
        disabled && styles.slideSaveTrackDisabled,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.slideSaveLabelWrap,
          {
            opacity: labelOpacity,
          },
        ]}
      >
        <Text
          style={[
            styles.slideSaveLabel,
            disabled && styles.slideSaveLabelDisabled,
          ]}
        >
          {loading
            ? "Saving transaction..."
            : disabled
              ? "Add amount and merchant"
              : "Slide to save"}
        </Text>
        {!disabled && !loading ? (
          <MotiView
            animate={{ opacity: 0.45, translateX: 4 }}
            from={{ opacity: 1, translateX: 0 }}
            transition={{
              duration: 760,
              loop: true,
              type: "timing",
            }}
          >
            <ChevronRight
              color="rgba(255, 255, 255, 0.55)"
              size={17}
              strokeWidth={2.8}
            />
          </MotiView>
        ) : null}
      </Animated.View>

      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.slideSaveThumb,
          disabled && styles.slideSaveThumbDisabled,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        {loading ? (
          <MotiView
            animate={{ rotate: "360deg" }}
            from={{ rotate: "0deg" }}
            transition={{
              duration: 850,
              loop: true,
              type: "timing",
            }}
          >
            <ReceiptText
              color={premiumTheme.colors.ink}
              size={18}
              strokeWidth={2.5}
            />
          </MotiView>
        ) : (
          <ChevronRight
            color={premiumTheme.colors.ink}
            size={20}
            strokeWidth={3}
          />
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  slideSaveLabel: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.1,
  },
  slideSaveLabelDisabled: {
    color: "#64748b",
  },
  slideSaveLabelWrap: {
    alignItems: "center",
    bottom: 0,
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    left: 55,
    position: "absolute",
    right: 18,
    top: 0,
  },
  slideSaveThumb: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    height: 42,
    justifyContent: "center",
    shadowColor: "#101828",
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    width: 42,
  },
  slideSaveThumbDisabled: {
    backgroundColor: "#cbd5e1",
    shadowOpacity: 0,
  },
  slideSaveTrack: {
    backgroundColor: "#0f172a",
    borderRadius: 18,
    height: 52,
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: 5,
    shadowColor: "#0f172a",
    shadowOffset: { height: 7, width: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
  },
  slideSaveTrackDisabled: {
    backgroundColor: "#eef2f7",
    shadowOpacity: 0,
  },
});
