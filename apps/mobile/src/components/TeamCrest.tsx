import { StyleSheet, Text, View } from "react-native";

type TeamCrestProps = {
  teamName: string;
  code: string;
  size?: number;
};

type CrestPalette = {
  primary: string;
  secondary: string;
};

const TEAM_PALETTES: Record<string, CrestPalette> = {
  "argentinos juniors": { primary: "#D51F2A", secondary: "#1E4DAA" },
  "lanús": { primary: "#8B1D5E", secondary: "#B14787" },
  "defensa y justicia": { primary: "#1FA85A", secondary: "#D3D63A" },
  "belgrano cordoba": { primary: "#26A1E0", secondary: "#8FD0F1" },
  "estudiantes l.p.": { primary: "#D93A43", secondary: "#FFFFFF" },
  "sarmiento junin": { primary: "#1B7A4E", secondary: "#91D0B4" },
  "boca juniors": { primary: "#1E3A8A", secondary: "#F59E0B" },
  "racing club": { primary: "#2F9DD7", secondary: "#9ED4F0" },
  "instituto cordoba": { primary: "#F97316", secondary: "#FED7AA" },
  "atletico tucuman": { primary: "#5AA7DB", secondary: "#D5EAF8" },
  "rosario central": { primary: "#1F4BA5", secondary: "#F6D34A" },
  "talleres cordoba": { primary: "#1E3A8A", secondary: "#E2E8F0" },
  "gimnasia m": { primary: "#2B57C9", secondary: "#98B4F0" },
  "gimnasia l. p.": { primary: "#334155", secondary: "#CBD5E1" }
};

function normalizeTeamName(value: string) {
  return value.trim().toLowerCase();
}

function fallbackPalette(teamName: string): CrestPalette {
  const palette: CrestPalette[] = [
    { primary: "#1D4ED8", secondary: "#93C5FD" },
    { primary: "#DC2626", secondary: "#FCA5A5" },
    { primary: "#16A34A", secondary: "#86EFAC" },
    { primary: "#9333EA", secondary: "#D8B4FE" },
    { primary: "#EA580C", secondary: "#FDBA74" }
  ];
  const hash = teamName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palette[hash % palette.length] ?? palette[0];
}

function paletteForTeam(teamName: string): CrestPalette {
  return TEAM_PALETTES[normalizeTeamName(teamName)] ?? fallbackPalette(teamName);
}

export function TeamCrest({ teamName, code, size = 30 }: TeamCrestProps) {
  const palette = paletteForTeam(teamName);
  const innerSize = Math.max(12, Math.round(size * 0.68));
  const stripeHeight = Math.max(2, Math.round(innerSize * 0.24));
  const textSize = Math.max(8, Math.round(size * 0.31));

  return (
    <View
      style={[
        styles.outer,
        {
          width: size,
          height: size,
          borderColor: palette.primary
        }
      ]}
    >
      <View
        style={[
          styles.inner,
          {
            width: innerSize,
            height: innerSize,
            backgroundColor: palette.secondary
          }
        ]}
      >
        <View
          style={[
            styles.stripe,
            {
              height: stripeHeight,
              backgroundColor: palette.primary
            }
          ]}
        />
        <Text allowFontScaling={false} style={[styles.code, { fontSize: textSize }]}>
          {code.slice(0, 2)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: 999,
    borderWidth: 2,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center"
  },
  inner: {
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  stripe: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    marginTop: -1
  },
  code: {
    color: "#0F172A",
    fontWeight: "900",
    letterSpacing: -0.2
  }
});
