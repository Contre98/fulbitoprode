import { useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "@fulbito/design-tokens";

type TeamCrestProps = {
  teamName: string;
  code: string;
  logoUrl?: string;
  size?: number;
};

export function TeamCrest({ teamName, code, logoUrl, size = 30 }: TeamCrestProps) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const shouldRenderLogo = Boolean(logoUrl) && logoUrl !== failedImageUrl;
  const stripeHeight = Math.max(2, Math.round(size * 0.24));
  const textSize = Math.max(8, Math.round(size * 0.31));
  const logoSource = useMemo(() => (logoUrl ? { uri: logoUrl } : undefined), [logoUrl]);

  return (
    <View style={[styles.root, { width: size, height: size }]}>
      {shouldRenderLogo && logoSource ? (
        <Image
          source={logoSource}
          resizeMode="contain"
          style={styles.logo}
          accessibilityLabel={`${teamName} logo`}
          onError={() => {
            setFailedImageUrl(logoUrl ?? null);
          }}
        />
      ) : (
        <View style={styles.fallbackWrap}>
          <View style={[styles.stripe, { height: stripeHeight, marginTop: Math.round(stripeHeight / -2) }]} />
          <Text allowFontScaling={false} style={[styles.code, { fontSize: textSize }]}>
            {code.slice(0, 2)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center"
  },
  logo: {
    width: "100%",
    height: "100%"
  },
  fallbackWrap: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent"
  },
  stripe: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    backgroundColor: colors.textSlateSoft
  },
  code: {
    color: colors.textSlateStrong,
    fontWeight: "900",
    letterSpacing: -0.2
  }
});
