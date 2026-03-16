import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";
import { getColors } from "@fulbito/design-tokens";
import type { ColorTokens } from "@fulbito/design-tokens";
import { ScreenFrame } from "@/components/ScreenFrame";
import { usePressScale } from "@/lib/usePressScale";
import { useThemeColors } from "@/theme/useThemeColors";

let activeColors: ColorTokens = getColors("light");
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const APP_NAME = "Fulbito Prode";
const LAST_UPDATED = "16 de marzo de 2026";

const sections: Array<{ title: string; paragraphs: string[]; bullets?: string[] }> = [
  {
    title: "1. Objetivo del juego",
    paragraphs: [
      `En ${APP_NAME} cada persona participante pronostica resultados de partidos y suma puntos en una tabla general de su grupo.`,
      "Gana quien acumule mas puntos al finalizar la competencia definida para el grupo."
    ]
  },
  {
    title: "2. Como cargar pronosticos",
    paragraphs: ["Puedes cargar o editar pronosticos solo mientras la fecha del partido este abierta."],
    bullets: [
      "Selecciona el partido.",
      "Ingresa el resultado esperado.",
      "Guarda el pronostico antes del cierre."
    ]
  },
  {
    title: "3. Cierre de pronosticos",
    paragraphs: [
      "Cada partido cierra automaticamente al comenzar el evento segun el horario oficial registrado.",
      "Una vez cerrado, no se admiten cambios para ese partido."
    ]
  },
  {
    title: "4. Sistema de puntaje",
    paragraphs: ["El puntaje se calcula por partido en base al acierto del resultado."],
    bullets: [
      "Resultado exacto: 3 puntos.",
      "Solo signo acertado (gana/local/empate/visita): 1 punto.",
      "Pronostico incorrecto: 0 puntos."
    ]
  },
  {
    title: "5. Tabla y desempates",
    paragraphs: ["La tabla ordena de mayor a menor puntaje total."],
    bullets: [
      "Primer desempate: mas aciertos exactos.",
      "Segundo desempate: mas aciertos de signo.",
      "Si persiste el empate, se mantiene igualdad en la posicion."
    ]
  },
  {
    title: "6. Grupos privados",
    paragraphs: [
      "Las personas administradoras de grupo pueden crear, configurar e invitar participantes.",
      "Los parametros del grupo pueden impactar en el calendario y alcance de la tabla."
    ]
  },
  {
    title: "7. Fair play",
    paragraphs: ["No se permite manipular cuentas, automatizar cargas o explotar fallos para obtener ventaja."],
    bullets: [
      "Actividad sospechosa puede derivar en revision.",
      "Ante abuso comprobado se puede anular puntaje o suspender la cuenta."
    ]
  },
  {
    title: "8. Cambios de reglas",
    paragraphs: [
      "Podemos actualizar estas reglas para mejorar el juego o por motivos operativos.",
      "Cuando haya cambios relevantes, se notificaran por la App."
    ]
  }
];

export function ReglasScreen() {
  const themeColors = useThemeColors();
  activeColors = themeColors;
  styles = useMemo(() => createStyles(), [themeColors]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const backPress = usePressScale(0.93);

  return (
    <ScreenFrame
      title="Reglas"
      subtitle={`Como se juega · Ultima actualizacion: ${LAST_UPDATED}`}
      hideDataModeBadge
      containerStyle={styles.screenContainer}
      contentStyle={styles.screenContent}
      header={
        <View style={[styles.headerCard, { paddingTop: Math.max(insets.top, 10) + 2 }]}>
          <AnimatedPressable
            onPress={() => navigation.goBack()}
            onPressIn={backPress.onPressIn}
            onPressOut={backPress.onPressOut}
            hitSlop={6}
            style={[styles.backButton, backPress.animatedStyle]}
          >
            <Text allowFontScaling={false} style={styles.backButtonText}>←</Text>
          </AnimatedPressable>
        </View>
      }
    >
      <View style={styles.introCard}>
        <Text allowFontScaling={false} style={styles.introTitle}>Guia rapida de juego</Text>
        <Text allowFontScaling={false} style={styles.introText}>
          Estas reglas describen el funcionamiento general del prode en la app. Algunos grupos pueden tener configuraciones especificas adicionales.
        </Text>
      </View>
      {sections.map((section) => (
        <View key={section.title} style={styles.sectionCard}>
          <Text allowFontScaling={false} style={styles.sectionTitle}>{section.title}</Text>
          {section.paragraphs.map((paragraph) => (
            <Text key={paragraph} allowFontScaling={false} style={styles.paragraph}>{paragraph}</Text>
          ))}
          {section.bullets?.map((bullet) => (
            <Text key={bullet} allowFontScaling={false} style={styles.bullet}>• {bullet}</Text>
          ))}
        </View>
      ))}
      <View style={styles.disclaimerCard}>
        <Text allowFontScaling={false} style={styles.disclaimerText}>
          Si una competencia o grupo define condiciones especiales, se aplican esas condiciones para ese contexto.
        </Text>
      </View>
    </ScreenFrame>
  );
}

const createStyles = () => StyleSheet.create({
  screenContainer: {
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: activeColors.canvas
  },
  screenContent: {
    gap: 10
  },
  headerCard: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: activeColors.surfaceSoft,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: activeColors.borderSubtle,
    marginHorizontal: -12,
    flexDirection: "row",
    alignItems: "center"
  },
  backButton: {
    height: 32,
    width: 32,
    borderRadius: 999,
    backgroundColor: activeColors.brandTintAlt,
    alignItems: "center",
    justifyContent: "center"
  },
  backButtonText: {
    color: activeColors.iconStrong,
    fontSize: 16,
    fontWeight: "900"
  },
  introCard: {
    borderRadius: 16,
    backgroundColor: activeColors.surfaceSoft,
    borderWidth: 1,
    borderColor: activeColors.borderSubtle,
    padding: 14,
    gap: 8
  },
  introTitle: {
    color: activeColors.textPrimary,
    fontSize: 16,
    fontWeight: "900"
  },
  introText: {
    color: activeColors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600"
  },
  sectionCard: {
    borderRadius: 16,
    backgroundColor: activeColors.surfaceSoft,
    borderWidth: 1,
    borderColor: activeColors.borderSubtle,
    padding: 14,
    gap: 8
  },
  sectionTitle: {
    color: activeColors.textPrimary,
    fontSize: 14,
    fontWeight: "900"
  },
  paragraph: {
    color: activeColors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600"
  },
  bullet: {
    color: activeColors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600"
  },
  disclaimerCard: {
    borderRadius: 12,
    backgroundColor: activeColors.brandTintAlt,
    borderWidth: 1,
    borderColor: activeColors.borderSubtle,
    padding: 12
  },
  disclaimerText: {
    color: activeColors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700"
  }
});


let styles = createStyles();
