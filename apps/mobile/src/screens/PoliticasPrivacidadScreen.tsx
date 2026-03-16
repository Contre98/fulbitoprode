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
const PRIVACY_EMAIL = "contact@wano.media";
const LAST_UPDATED = "16 de marzo de 2026";

const sections: Array<{ title: string; paragraphs: string[]; bullets?: string[] }> = [
  {
    title: "1. Alcance",
    paragraphs: [
      `Esta Politica de Privacidad explica como ${LEGAL_ENTITY} recopila, usa, comparte y protege datos personales en ${APP_NAME}.`
    ]
  },
  {
    title: "2. Datos que podemos recopilar",
    paragraphs: ["Dependiendo del uso, podemos tratar las siguientes categorias de datos:"],
    bullets: [
      "Datos de cuenta: nombre, email, usuario y datos de perfil.",
      "Datos tecnicos y de uso: interacciones, identificadores de dispositivo, logs y diagnosticos.",
      "Datos de soporte: mensajes y solicitudes que envies.",
      "Datos opcionales que compartas voluntariamente."
    ]
  },
  {
    title: "3. Finalidades del tratamiento",
    bullets: [
      "Prestar y mantener la App.",
      "Autenticar usuarios y prevenir fraude.",
      "Mejorar funcionalidades y rendimiento.",
      "Brindar soporte y responder consultas.",
      "Cumplir obligaciones legales y hacer valer nuestros terminos."
    ],
    paragraphs: []
  },
  {
    title: "4. Base legal (segun jurisdiccion)",
    paragraphs: [
      "Cuando corresponda, tratamos datos con base en la ejecucion del servicio, interes legitimo, consentimiento o cumplimiento de obligaciones legales."
    ]
  },
  {
    title: "5. Comparticion de datos",
    paragraphs: ["Podemos compartir datos con:"],
    bullets: [
      "Proveedores que prestan infraestructura, analitica o soporte.",
      "Asesores profesionales bajo deber de confidencialidad.",
      "Autoridades cuando exista requerimiento legal.",
      "Terceros en procesos societarios (fusion, adquisicion o reorganizacion), con las salvaguardas correspondientes."
    ]
  },
  {
    title: "6. Transferencias internacionales",
    paragraphs: [
      "Si se realizan transferencias internacionales, aplicaremos medidas razonables de resguardo exigidas por la normativa aplicable."
    ]
  },
  {
    title: "7. Conservacion",
    paragraphs: [
      "Conservamos datos durante el tiempo necesario para las finalidades indicadas, obligaciones legales, resolucion de disputas y defensa de derechos. Luego los eliminamos o anonimizamos."
    ]
  },
  {
    title: "8. Seguridad",
    paragraphs: [
      "Aplicamos medidas tecnicas y organizativas razonables para proteger la informacion. Ningun sistema es completamente infalible."
    ]
  },
  {
    title: "9. Derechos de las personas usuarias",
    paragraphs: [
      "Segun la normativa aplicable, puedes solicitar acceso, rectificacion, actualizacion, supresion y, cuando corresponda, oposicion, restriccion o portabilidad.",
      `Para ejercer derechos, escribenos a: ${PRIVACY_EMAIL}.`
    ]
  },
  {
    title: "10. Aviso especifico para Argentina",
    paragraphs: [
      "En los terminos de la Ley 25.326, la persona titular de los datos personales tiene la facultad de ejercer el derecho de acceso, rectificacion, actualizacion y supresion de sus datos.",
      "La Agencia de Acceso a la Informacion Publica (AAIP), en su caracter de organo de control, tiene atribucion para atender denuncias y reclamos."
    ]
  },
  {
    title: "11. Menores de edad",
    paragraphs: [
      "La App no esta dirigida a menores de 13 anos. Si tomamos conocimiento de datos de menores de 13 anos sin base valida, procederemos a su eliminacion."
    ]
  },
  {
    title: "12. Cambios en esta politica",
    paragraphs: [
      "Podemos actualizar esta Politica de Privacidad. Si hay cambios relevantes, los informaremos por la App, email u otro medio razonable."
    ]
  }
];

export function PoliticasPrivacidadScreen() {
  const themeColors = useThemeColors();
  activeColors = themeColors;
  styles = useMemo(() => createStyles(), [themeColors]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const backPress = usePressScale(0.93);

  return (
    <ScreenFrame
      title="Politica de privacidad"
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
        <Text allowFontScaling={false} style={styles.introTitle}>Privacidad en {APP_NAME}</Text>
        <Text allowFontScaling={false} style={styles.introText}>
          Esta politica esta redactada en espanol para uso inicial. Completa los campos entre corchetes y validala legalmente antes de publicarla.
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
