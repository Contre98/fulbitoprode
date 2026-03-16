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
const LEGAL_ENTITY = "Fulbito Sports";
const LAST_UPDATED = "16 de marzo de 2026";

const sections: Array<{ title: string; paragraphs: string[]; bullets?: string[] }> = [
  {
    title: "1. Aceptacion de estos terminos",
    paragraphs: [
      `Estos Terminos y Condiciones regulan el uso de ${APP_NAME} (la \"App\"), operada por ${LEGAL_ENTITY}.`,
      "Al crear una cuenta, acceder o utilizar la App, aceptas estos terminos."
    ]
  },
  {
    title: "2. Elegibilidad y menores",
    paragraphs: [
      "Debes tener al menos 13 anos para usar la App.",
      "La App no esta dirigida a menores de 13 anos. Si detectamos datos personales de menores de 13 sin autorizacion valida, podremos eliminarlos."
    ]
  },
  {
    title: "3. Cuenta y seguridad",
    paragraphs: [
      "Debes proporcionar informacion veraz y mantenerla actualizada.",
      "Eres responsable del uso de tu cuenta y de mantener confidenciales tus credenciales."
    ]
  },
  {
    title: "4. Uso permitido y prohibiciones",
    paragraphs: ["No puedes usar la App para fines ilegales o que afecten a terceros."],
    bullets: [
      "Violar leyes o derechos de terceros.",
      "Publicar contenido ilicito, difamatorio, fraudulento o que infrinja propiedad intelectual.",
      "Interferir con la seguridad, estabilidad o disponibilidad de la App.",
      "Intentar ingenieria inversa o acceso no autorizado."
    ]
  },
  {
    title: "5. Contenido del usuario",
    paragraphs: [
      "Conservas la titularidad de tu contenido.",
      "Nos otorgas una licencia no exclusiva, mundial y libre de regalias para alojar, reproducir y mostrar ese contenido solo con el fin de operar y mejorar la App."
    ]
  },
  {
    title: "6. Propiedad intelectual",
    paragraphs: [
      "El software, diseno, marca y contenidos de la App (excepto contenido de usuarios) son de nuestra titularidad o de nuestros licenciantes.",
      "No se conceden derechos no expresamente indicados en estos terminos."
    ]
  },
  {
    title: "7. Disponibilidad y cambios del servicio",
    paragraphs: [
      "Podemos modificar funciones, suspender o discontinuar partes de la App por motivos tecnicos, de seguridad, legales o comerciales.",
      "Cuando haya cambios sustanciales, intentaremos notificarte por medios razonables."
    ]
  },
  {
    title: "8. Funciones pagas (futuras)",
    paragraphs: [
      "Actualmente la App no ofrece suscripciones ni planes premium pagos.",
      "Si en el futuro se habilitan funciones pagas, informaremos claramente precio, periodicidad, renovacion, cancelacion, impuestos y politicas de reembolso antes de contratar."
    ]
  },
  {
    title: "9. Servicios de terceros",
    paragraphs: [
      "La App puede integrar servicios de terceros. Esos servicios se rigen por sus propios terminos y politicas, y no controlamos su funcionamiento."
    ]
  },
  {
    title: "10. Exclusion de garantias",
    paragraphs: [
      "En la maxima medida permitida por la ley aplicable, la App se ofrece \"tal cual\" y \"segun disponibilidad\", sin garantias de funcionamiento ininterrumpido ni ausencia total de errores."
    ]
  },
  {
    title: "11. Limitacion de responsabilidad",
    paragraphs: [
      "En la maxima medida permitida por la ley, no seremos responsables por danos indirectos, incidentales, especiales o consecuentes derivados del uso de la App."
    ]
  },
  {
    title: "12. Suspension o terminacion",
    paragraphs: [
      "Podemos suspender o cerrar cuentas ante incumplimientos, fraude, riesgos de seguridad o requerimientos legales.",
      "Puedes dejar de usar la App en cualquier momento."
    ]
  },
  {
    title: "13. Ley aplicable y jurisdiccion",
    paragraphs: [
      "Estos terminos se rigen por las leyes de la Republica Argentina.",
      "Las controversias se someteran a los tribunales competentes de la Ciudad Autonoma de Buenos Aires, sin perjuicio de derechos de consumidores que sean irrenunciables."
    ]
  },
  {
    title: "14. Cambios en estos terminos",
    paragraphs: [
      "Podemos actualizar estos terminos. Si los cambios son relevantes, te lo informaremos por la App, email u otro medio razonable.",
      "El uso continuado de la App luego de la vigencia de cambios implica aceptacion."
    ]
  }
];

export function TerminosCondicionesScreen() {
  const themeColors = useThemeColors();
  activeColors = themeColors;
  styles = useMemo(() => createStyles(), [themeColors]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const backPress = usePressScale(0.93);

  return (
    <ScreenFrame
      title="Terminos y condiciones"
      subtitle={`Ultima actualizacion: ${LAST_UPDATED}`}
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
        <Text allowFontScaling={false} style={styles.introTitle}>Condiciones de uso de {APP_NAME}</Text>
        <Text allowFontScaling={false} style={styles.introText}>
          Este texto es una base legal en espanol para publicar en la App. Completa los campos entre corchetes antes de produccion y validalo con asesoria legal.
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
          Aviso: este contenido es informativo y no constituye asesoramiento legal.
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
